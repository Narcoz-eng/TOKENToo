import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { PrismaService } from "../db/prisma.service";

type StrategyType = "PASSIVE" | "LIQUIDITY" | "BUYBACK" | "BURN" | "HYBRID";
type StrategyStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "DISABLED";
type StrategyAction = "COLLECT_FEES" | "ADD_LIQUIDITY" | "BUYBACK" | "BURN" | "DISTRIBUTE_REWARDS";

type FeeAllocation = {
  treasury: number;
  buyback: number;
  liquidity: number;
  rewards: number;
  safetyReserve: number;
};

type ExecutionConfig = {
  intervalSeconds: number;
  maxSlippageBps: number;
  maxSpendPerExecution: string;
  maxDailySpend: string;
  minReserveRatioBps: number;
  minLiquidityUsd: number;
  emergencyPauseThreshold: number;
};

type StrategyConfigInput = {
  type?: StrategyType;
  status?: StrategyStatus;
  feeAllocationBps?: Partial<FeeAllocation>;
  executionConfig?: Partial<ExecutionConfig>;
  approvedByCreator?: boolean;
  metadata?: Record<string, unknown>;
};

type ExecutionInput = {
  action: StrategyAction;
  inputAmount?: string;
  expectedSlippageBps?: number;
  idempotencyKey?: string;
};

const DEFAULT_FEE_ALLOCATION: FeeAllocation = {
  treasury: 0,
  buyback: 0,
  liquidity: 0,
  rewards: 0,
  safetyReserve: 10000
};

const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  intervalSeconds: 86_400,
  maxSlippageBps: 50,
  maxSpendPerExecution: "0",
  maxDailySpend: "0",
  minReserveRatioBps: 10000,
  minLiquidityUsd: 0,
  emergencyPauseThreshold: 9000
};

@Injectable()
export class StrategyEngineService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async ensureDefaultStrategy(collectionId: string) {
    return this.prisma.vaultStrategy.upsert({
      where: { collectionId },
      update: {},
      create: {
        collectionId,
        type: "PASSIVE",
        status: "DRAFT",
        feeAllocationBps: this.json(DEFAULT_FEE_ALLOCATION),
        executionConfig: this.json(DEFAULT_EXECUTION_CONFIG),
        approvedByCreator: false,
        metadata: this.json({
          source: "default-passive-strategy",
          warning: "Passive reserve only. No buyback, burn, liquidity, or rewards execution is enabled by default."
        })
      }
    });
  }

  async getStrategy(idOrSlug: string) {
    const collection = await this.collection(idOrSlug);
    const strategy = collection.vaultStrategy ?? (await this.ensureDefaultStrategy(collection.id));
    return {
      ok: true,
      strategy: this.strategyDto(strategy, collection),
      reserve: this.reserveSummary(collection),
      defaults: {
        type: "PASSIVE",
        automaticExecution: false,
        buybackEnabledByDefault: false,
        burnEnabledByDefault: false
      }
    };
  }

  async configureStrategy(idOrSlug: string, input: StrategyConfigInput, walletAddress: string) {
    const collection = await this.collection(idOrSlug);
    this.assertCreatorOrAdmin(collection, walletAddress);
    const existing = collection.vaultStrategy ?? (await this.ensureDefaultStrategy(collection.id));
    const type = input.type ?? existing.type;
    const status = input.status ?? existing.status;
    const currentAllocation = this.normalizeFeeAllocation(this.record(existing.feeAllocationBps));
    const currentExecutionConfig = this.normalizeExecutionConfig(this.record(existing.executionConfig));
    const feeAllocationBps = this.normalizeFeeAllocation({ ...currentAllocation, ...(input.feeAllocationBps ?? {}) });
    const executionConfig = this.normalizeExecutionConfig({ ...currentExecutionConfig, ...(input.executionConfig ?? {}) });
    const approvedByCreator = input.approvedByCreator ?? existing.approvedByCreator;
    if (status === "ACTIVE" && type !== "PASSIVE" && !approvedByCreator) {
      throw new BadRequestException("Active liquidity, buyback, burn, or hybrid strategies require explicit creator/admin approval.");
    }
    const updated = await this.prisma.vaultStrategy.update({
      where: { collectionId: collection.id },
      data: {
        type,
        status,
        feeAllocationBps: this.json(feeAllocationBps),
        executionConfig: this.json(executionConfig),
        approvedByCreator,
        approvedAt: approvedByCreator && !existing.approvedAt ? new Date() : existing.approvedAt,
        metadata: this.json({ ...this.record(existing.metadata), ...(input.metadata ?? {}), updatedBy: walletAddress })
      }
    });
    await this.logEvent({
      collectionId: collection.id,
      strategyId: updated.id,
      eventType: "STRATEGY_CONFIG_UPDATED",
      tokenMint: collection.token.mint,
      beforeState: this.strategyDto(existing, collection),
      afterState: this.strategyDto(updated, collection)
    });
    return { ok: true, strategy: this.strategyDto(updated, collection) };
  }

  async events(idOrSlug: string) {
    const collection = await this.collection(idOrSlug);
    const events = await this.prisma.strategyEventLog.findMany({
      where: { collectionId: collection.id },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return { ok: true, collectionId: collection.id, events: events.map((event) => this.eventDto(event)) };
  }

  async jobs(idOrSlug: string) {
    const collection = await this.collection(idOrSlug);
    const jobs = await this.prisma.strategyExecutionJob.findMany({
      where: { collectionId: collection.id },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return { ok: true, collectionId: collection.id, jobs: jobs.map((job) => this.jobDto(job)) };
  }

  async previewExecution(idOrSlug: string, input: ExecutionInput, walletAddress?: string) {
    const collection = await this.collection(idOrSlug);
    if (walletAddress) this.assertCreatorOrAdmin(collection, walletAddress);
    const strategy = collection.vaultStrategy ?? (await this.ensureDefaultStrategy(collection.id));
    const preview = await this.executionPreview(collection, strategy, this.normalizeExecutionInput(input));
    return { ok: true, preview };
  }

  async execute(idOrSlug: string, input: ExecutionInput, actor: { walletAddress?: string; worker?: boolean }) {
    const collection = await this.collection(idOrSlug);
    if (!actor.worker) this.assertAdmin(actor.walletAddress);
    const strategy = collection.vaultStrategy ?? (await this.ensureDefaultStrategy(collection.id));
    const normalized = this.normalizeExecutionInput(input);
    const requestHash = this.hash({ collectionId: collection.id, strategyId: strategy.id, ...normalized });
    if (normalized.idempotencyKey) {
      const existing = await this.prisma.strategyExecutionJob.findUnique({ where: { idempotencyKey: normalized.idempotencyKey } });
      if (existing) {
        if (existing.requestHash && existing.requestHash !== requestHash) throw new ConflictException("idempotencyKey was already used for another strategy execution.");
        return { ok: true, idempotent: true, job: this.jobDto(existing) };
      }
    }
    const preview = await this.executionPreview(collection, strategy, normalized);
    if (!preview.allowed) throw new BadRequestException({ code: preview.errorCode ?? "STRATEGY_EXECUTION_BLOCKED", message: "Strategy execution blocked by safety checks.", issues: preview.issues });

    const adapterReady = this.executionAdapterReady();
    const status = adapterReady ? "PENDING" : "SKIPPED";
    const errorCode = adapterReady ? undefined : "STRATEGY_EXECUTION_ADAPTER_NOT_CONFIGURED";
    const errorMessage = adapterReady ? undefined : "No production strategy transaction adapter is configured; execution is logged as skipped, not faked.";
    const job = await this.prisma.strategyExecutionJob.create({
      data: {
        strategyId: strategy.id,
        collectionId: collection.id,
        action: normalized.action,
        status,
        inputAmount: normalized.inputAmount,
        outputAmount: adapterReady ? undefined : "0",
        errorCode,
        errorMessage,
        idempotencyKey: normalized.idempotencyKey || undefined,
        requestHash,
        executedAt: adapterReady ? undefined : new Date()
      }
    });
    await this.logEvent({
      collectionId: collection.id,
      strategyId: strategy.id,
      eventType: adapterReady ? "STRATEGY_EXECUTION_QUEUED" : "STRATEGY_EXECUTION_SKIPPED_NO_ADAPTER",
      tokenMint: collection.token.mint,
      amountIn: normalized.inputAmount,
      amountOut: adapterReady ? undefined : "0",
      slippageBps: normalized.expectedSlippageBps,
      beforeState: preview.beforeState,
      afterState: { ...preview.beforeState, jobStatus: status, errorCode }
    });
    return {
      ok: true,
      productionExecution: adapterReady,
      job: this.jobDto(job),
      preview,
      message: adapterReady ? "Strategy execution queued for production adapter." : errorMessage
    };
  }

  private async executionPreview(collection: any, strategy: any, input: Required<ExecutionInput>) {
    const allocation = this.normalizeFeeAllocation(this.record(strategy.feeAllocationBps));
    const config = this.normalizeExecutionConfig(this.record(strategy.executionConfig));
    const treasury = await this.strategyTreasuryAvailable(collection.id, input.action);
    const dailySpent = await this.dailySpend(strategy.id);
    const inputAmount = BigInt(input.inputAmount);
    const maxPerExecution = BigInt(config.maxSpendPerExecution);
    const maxDaily = BigInt(config.maxDailySpend);
    const reserve = collection.reserveVault;
    const actionAllowed = this.actionAllowed(strategy.type, input.action);
    const issues = [
      strategy.status !== "ACTIVE" ? "Strategy is not ACTIVE." : null,
      !strategy.approvedByCreator ? "Strategy is not explicitly approved by the creator/admin." : null,
      !actionAllowed ? `${input.action} is not allowed for ${strategy.type} strategy.` : null,
      collection.emergencyFlag ? "Collection emergency pause is active." : null,
      reserve?.status && reserve.status !== "ACTIVE" ? `Reserve vault is ${reserve.status}.` : null,
      Number(reserve?.reserveRatioBps ?? 0) < config.minReserveRatioBps ? "Reserve ratio is below the configured minimum." : null,
      Number(collection.token?.liquidityUsd ?? 0) < config.minLiquidityUsd ? "Token liquidity is below the configured minimum." : null,
      input.expectedSlippageBps > config.maxSlippageBps ? "Expected slippage exceeds configured maxSlippageBps." : null,
      maxPerExecution === 0n && inputAmount > 0n ? "Strategy maxSpendPerExecution is zero; spending is disabled." : null,
      maxPerExecution > 0n && inputAmount > maxPerExecution ? "Input amount exceeds maxSpendPerExecution." : null,
      maxDaily > 0n && dailySpent + inputAmount > maxDaily ? "Input amount exceeds remaining maxDailySpend." : null,
      inputAmount > treasury ? "Input amount exceeds allocated strategy treasury; locked backing cannot be spent." : null
    ].filter(Boolean) as string[];
    return {
      allowed: issues.length === 0,
      errorCode: issues.length ? "STRATEGY_SAFETY_CHECK_FAILED" : undefined,
      collectionId: collection.id,
      strategyId: strategy.id,
      action: input.action,
      inputAmount: input.inputAmount,
      expectedSlippageBps: input.expectedSlippageBps,
      strategyType: strategy.type,
      strategyStatus: strategy.status,
      approvedByCreator: strategy.approvedByCreator,
      feeAllocationBps: allocation,
      executionConfig: config,
      treasuryAvailable: treasury.toString(),
      dailySpent: dailySpent.toString(),
      reserveStatus: reserve?.status ?? "UNINITIALIZED",
      reserveRatioBps: reserve?.reserveRatioBps ?? 0,
      issues,
      beforeState: {
        reserve: this.reserveSummary(collection),
        treasuryAvailable: treasury.toString(),
        dailySpent: dailySpent.toString()
      }
    };
  }

  private async collection(idOrSlug: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: { token: true, creator: true, reserveVault: true, vaultStrategy: true }
    });
    if (!collection) throw new NotFoundException("Collection not found.");
    return collection as any;
  }

  private async strategyTreasuryAvailable(collectionId: string, action: StrategyAction) {
    const bucket = this.bucketForAction(action);
    if (!bucket) return 0n;
    const row = await this.prisma.communityTreasuryBucket.findUnique({
      where: { collectionId_bucket: { collectionId, bucket } }
    }).catch(() => null);
    return this.decimalSolToLamports(row?.balanceSol);
  }

  private async dailySpend(strategyId: string) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const aggregate = await this.prisma.strategyExecutionJob.aggregate({
      where: {
        strategyId,
        createdAt: { gte: since },
        status: { in: ["RUNNING", "CONFIRMED"] }
      },
      _sum: { inputAmount: true }
    });
    return this.bigint(aggregate._sum.inputAmount);
  }

  private actionAllowed(type: StrategyType, action: StrategyAction) {
    if (type === "PASSIVE") return action === "COLLECT_FEES";
    if (type === "LIQUIDITY") return action === "COLLECT_FEES" || action === "ADD_LIQUIDITY";
    if (type === "BUYBACK") return action === "COLLECT_FEES" || action === "BUYBACK";
    if (type === "BURN") return action === "COLLECT_FEES" || action === "BURN";
    if (type === "HYBRID") return true;
    return false;
  }

  private bucketForAction(action: StrategyAction) {
    if (action === "ADD_LIQUIDITY") return "METEORA_LIQUIDITY";
    if (action === "BUYBACK" || action === "BURN") return "BUYBACK_BACKING";
    if (action === "DISTRIBUTE_REWARDS") return "RAID_REWARDS";
    if (action === "COLLECT_FEES") return null;
    return null;
  }

  private assertCreatorOrAdmin(collection: any, walletAddress: string) {
    if (collection.creator?.walletAddress === walletAddress || this.isAdmin(walletAddress)) return;
    throw new ForbiddenException("Only the collection creator or protocol admin can configure this strategy.");
  }

  private assertAdmin(walletAddress?: string) {
    if (walletAddress && this.isAdmin(walletAddress)) return;
    throw new ForbiddenException("Strategy execution requires a protocol admin wallet or worker secret.");
  }

  private isAdmin(walletAddress: string) {
    return new Set((process.env.PROTOCOL_ADMIN_WALLETS ?? process.env.ADMIN_WALLETS ?? "").split(/[,\s]+/).filter(Boolean)).has(walletAddress);
  }

  private executionAdapterReady() {
    return (process.env.STRATEGY_EXECUTION_PROVIDER ?? "disabled") !== "disabled" && (process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock") !== "mock";
  }

  private normalizeExecutionInput(input: ExecutionInput): Required<ExecutionInput> {
    if (!input.action) throw new BadRequestException("Strategy action is required.");
    const amount = input.inputAmount?.replace(/,/g, "").trim() ?? "0";
    if (!/^\d+$/.test(amount)) throw new BadRequestException("inputAmount must be a non-negative integer string.");
    const slippage = input.expectedSlippageBps ?? 0;
    if (!Number.isInteger(slippage) || slippage < 0 || slippage > 10_000) throw new BadRequestException("expectedSlippageBps must be between 0 and 10000.");
    return { action: input.action, inputAmount: amount, expectedSlippageBps: slippage, idempotencyKey: input.idempotencyKey?.trim() ?? "" };
  }

  private normalizeFeeAllocation(input: Record<string, unknown>): FeeAllocation {
    const allocation = {
      ...DEFAULT_FEE_ALLOCATION,
      ...Object.fromEntries(Object.entries(input).filter(([key]) => key in DEFAULT_FEE_ALLOCATION))
    } as Record<keyof FeeAllocation, unknown>;
    const normalized = Object.fromEntries(Object.entries(allocation).map(([key, value]) => [key, this.bps(value, key)])) as FeeAllocation;
    const sum = Object.values(normalized).reduce((total, value) => total + value, 0);
    if (sum !== 10000) throw new BadRequestException("feeAllocationBps must sum to exactly 10000 bps.");
    return normalized;
  }

  private normalizeExecutionConfig(input: Record<string, unknown>): ExecutionConfig {
    const config = { ...DEFAULT_EXECUTION_CONFIG, ...input };
    return {
      intervalSeconds: this.nonNegativeInt(config.intervalSeconds, "intervalSeconds"),
      maxSlippageBps: this.bps(config.maxSlippageBps, "maxSlippageBps"),
      maxSpendPerExecution: this.amount(config.maxSpendPerExecution, "maxSpendPerExecution"),
      maxDailySpend: this.amount(config.maxDailySpend, "maxDailySpend"),
      minReserveRatioBps: this.bps(config.minReserveRatioBps, "minReserveRatioBps"),
      minLiquidityUsd: this.nonNegativeNumber(config.minLiquidityUsd, "minLiquidityUsd"),
      emergencyPauseThreshold: this.bps(config.emergencyPauseThreshold, "emergencyPauseThreshold")
    };
  }

  private bps(value: unknown, label: string) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0 || number > 10_000) throw new BadRequestException(`${label} must be between 0 and 10000.`);
    return number;
  }

  private nonNegativeInt(value: unknown, label: string) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) throw new BadRequestException(`${label} must be a non-negative integer.`);
    return number;
  }

  private nonNegativeNumber(value: unknown, label: string) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new BadRequestException(`${label} must be a non-negative number.`);
    return number;
  }

  private amount(value: unknown, label: string) {
    const amount = String(value ?? "0").replace(/,/g, "").trim();
    if (!/^\d+$/.test(amount)) throw new BadRequestException(`${label} must be a non-negative integer string.`);
    return amount;
  }

  private reserveSummary(collection: any) {
    return {
      status: collection.reserveVault?.status ?? "UNINITIALIZED",
      reserveRatioBps: collection.reserveVault?.reserveRatioBps ?? 0,
      availableBacking: collection.reserveVault?.availableBacking?.toString?.() ?? "0",
      totalLocked: collection.reserveVault?.totalLocked?.toString?.() ?? "0",
      emergencyFlag: collection.emergencyFlag
    };
  }

  private strategyDto(strategy: any, collection?: any) {
    return {
      id: strategy.id,
      collectionId: strategy.collectionId,
      type: strategy.type,
      status: strategy.status,
      feeAllocationBps: this.normalizeFeeAllocation(this.record(strategy.feeAllocationBps)),
      executionConfig: this.normalizeExecutionConfig(this.record(strategy.executionConfig)),
      approvedByCreator: strategy.approvedByCreator,
      approvedAt: strategy.approvedAt?.toISOString?.() ?? null,
      metadata: strategy.metadata ?? {},
      tokenMint: collection?.token?.mint,
      automaticExecution: false
    };
  }

  private jobDto(job: any) {
    return {
      id: job.id,
      strategyId: job.strategyId,
      collectionId: job.collectionId,
      action: job.action,
      status: job.status,
      inputAmount: job.inputAmount?.toString?.() ?? null,
      outputAmount: job.outputAmount?.toString?.() ?? null,
      txSignature: job.txSignature,
      errorCode: job.errorCode,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt?.toISOString?.() ?? job.createdAt,
      executedAt: job.executedAt?.toISOString?.() ?? null
    };
  }

  private eventDto(event: any) {
    return {
      id: event.id,
      collectionId: event.collectionId,
      strategyId: event.strategyId,
      eventType: event.eventType,
      txSignature: event.txSignature,
      tokenMint: event.tokenMint,
      amountIn: event.amountIn?.toString?.() ?? null,
      amountOut: event.amountOut?.toString?.() ?? null,
      slippageBps: event.slippageBps,
      beforeState: event.beforeState,
      afterState: event.afterState,
      createdAt: event.createdAt?.toISOString?.() ?? event.createdAt
    };
  }

  private async logEvent(input: {
    collectionId: string;
    strategyId?: string;
    eventType: string;
    tokenMint: string;
    txSignature?: string;
    amountIn?: string;
    amountOut?: string;
    slippageBps?: number;
    beforeState?: unknown;
    afterState?: unknown;
  }) {
    return this.prisma.strategyEventLog.create({
      data: {
        collectionId: input.collectionId,
        strategyId: input.strategyId,
        eventType: input.eventType,
        txSignature: input.txSignature,
        tokenMint: input.tokenMint,
        amountIn: input.amountIn,
        amountOut: input.amountOut,
        slippageBps: input.slippageBps,
        beforeState: this.json(input.beforeState ?? {}),
        afterState: this.json(input.afterState ?? {})
      }
    });
  }

  private bigint(value: unknown) {
    if (value === null || value === undefined) return 0n;
    const text = String(value);
    if (!/^-?\d+$/.test(text)) return 0n;
    return BigInt(text);
  }

  private decimalSolToLamports(value: unknown) {
    if (value === null || value === undefined) return 0n;
    const text = String(value);
    const [wholeRaw, fractionRaw = ""] = text.split(".");
    const whole = /^-?\d+$/.test(wholeRaw) ? BigInt(wholeRaw) : 0n;
    const fraction = BigInt((fractionRaw.replace(/\D/g, "").slice(0, 9).padEnd(9, "0") || "0"));
    return whole * 1_000_000_000n + fraction;
  }

  private record(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private hash(value: unknown) {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
}
