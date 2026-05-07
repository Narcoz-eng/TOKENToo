import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { FeeAllocationPlan, FeeAllocationPreset, FeeType, Prisma, TreasuryBucketType } from "@prisma/client";
import { PrismaService } from "../db/prisma.service";

const PLATFORM_FEE_BPS = 100;
const COMMUNITY_BPS_TOTAL = 10_000;

const presetPlans: Record<FeeAllocationPreset, Omit<RoutePlan, "preset">> = {
  BALANCED: {
    creatorBps: 1000,
    raidRewardsBps: 3000,
    meteoraLiquidityBps: 1500,
    instantSellPoolBps: 1000,
    safetyReserveBps: 500,
    buybackBackingBps: 3000
  },
  LIQUIDITY_FIRST: {
    creatorBps: 800,
    raidRewardsBps: 1800,
    meteoraLiquidityBps: 3000,
    instantSellPoolBps: 2000,
    safetyReserveBps: 400,
    buybackBackingBps: 2000
  },
  RAID_FIRST: {
    creatorBps: 1000,
    raidRewardsBps: 4500,
    meteoraLiquidityBps: 1000,
    instantSellPoolBps: 800,
    safetyReserveBps: 700,
    buybackBackingBps: 2000
  },
  DEFENSIVE: {
    creatorBps: 700,
    raidRewardsBps: 1800,
    meteoraLiquidityBps: 1200,
    instantSellPoolBps: 800,
    safetyReserveBps: 1500,
    buybackBackingBps: 4000
  },
  CUSTOM: {
    creatorBps: 1000,
    raidRewardsBps: 3000,
    meteoraLiquidityBps: 1500,
    instantSellPoolBps: 1000,
    safetyReserveBps: 500,
    buybackBackingBps: 3000
  }
};

type RoutePlan = {
  preset: FeeAllocationPreset;
  creatorBps: number;
  raidRewardsBps: number;
  meteoraLiquidityBps: number;
  instantSellPoolBps: number;
  safetyReserveBps: number;
  buybackBackingBps: number;
};

@Injectable()
export class CommunityFeeRouterService {
  constructor(private readonly prisma: PrismaService) {}

  planForPreset(preset: FeeAllocationPreset): RoutePlan {
    return { preset, ...presetPlans[preset] };
  }

  validatePlan(plan: RoutePlan | FeeAllocationPlan) {
    const total =
      plan.creatorBps +
      plan.raidRewardsBps +
      plan.meteoraLiquidityBps +
      plan.instantSellPoolBps +
      plan.safetyReserveBps +
      plan.buybackBackingBps;
    const issues: string[] = [];
    if ("platformFeeBps" in plan && plan.platformFeeBps !== PLATFORM_FEE_BPS) issues.push("platformFeeBps must be exactly 100 in V1.");
    if (plan.creatorBps > 2000) issues.push("creatorBps cannot exceed 2000.");
    if (plan.raidRewardsBps < 1000) issues.push("raidRewardsBps must be at least 1000.");
    if (plan.meteoraLiquidityBps + plan.instantSellPoolBps < 1000) issues.push("liquidity routing must be at least 1000 bps.");
    if (plan.safetyReserveBps < 300) issues.push("safetyReserveBps must be at least 300.");
    if (total !== COMMUNITY_BPS_TOTAL) issues.push("Community allocation bps must total 10000.");
    if (issues.length) throw new BadRequestException(issues.join(" "));
  }

  async setPlan(collectionId: string, input: Partial<RoutePlan> & { preset: FeeAllocationPreset }) {
    const collection = await this.prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection) throw new NotFoundException("Collection not found");
    const base = this.planForPreset(input.preset);
    const plan = { ...base, ...input };
    this.validatePlan(plan);
    await this.prisma.feeAllocationPlan.updateMany({ where: { collectionId, isActive: true }, data: { isActive: false } });
    return this.prisma.feeAllocationPlan.create({
      data: {
        collectionId,
        preset: plan.preset,
        platformFeeBps: PLATFORM_FEE_BPS,
        creatorBps: plan.creatorBps,
        raidRewardsBps: plan.raidRewardsBps,
        meteoraLiquidityBps: plan.meteoraLiquidityBps,
        instantSellPoolBps: plan.instantSellPoolBps,
        safetyReserveBps: plan.safetyReserveBps,
        buybackBackingBps: plan.buybackBackingBps
      }
    });
  }

  async routeFee(input: { collectionId: string; sourceType: FeeType; grossSol: number; txSignature?: string; metadata?: Prisma.InputJsonValue }) {
    if (!Number.isFinite(input.grossSol) || input.grossSol <= 0) throw new BadRequestException("grossSol must be positive.");
    const collection = await this.prisma.collection.findUnique({ where: { id: input.collectionId } });
    if (!collection) throw new NotFoundException("Collection not found");
    const plan =
      (await this.prisma.feeAllocationPlan.findFirst({ where: { collectionId: input.collectionId, isActive: true }, orderBy: { createdAt: "desc" } })) ??
      (await this.setPlan(input.collectionId, { preset: "BALANCED" }));
    this.validatePlan(plan);

    const gross = this.round(input.grossSol);
    const platformFee = this.round(gross * (PLATFORM_FEE_BPS / 10_000));
    const netCommunity = this.round(gross - platformFee);
    const allocations = {
      creatorSol: this.allocate(netCommunity, plan.creatorBps),
      raidRewardsSol: this.allocate(netCommunity, plan.raidRewardsBps),
      meteoraLiquiditySol: this.allocate(netCommunity, plan.meteoraLiquidityBps),
      instantSellPoolSol: this.allocate(netCommunity, plan.instantSellPoolBps),
      safetyReserveSol: this.allocate(netCommunity, plan.safetyReserveBps),
      buybackBackingSol: this.allocate(netCommunity, plan.buybackBackingBps)
    };

    return this.prisma.$transaction(async (tx) => {
      const ledger = await tx.feeLedger.create({
        data: {
          collectionId: input.collectionId,
          sourceType: input.sourceType,
          grossSol: gross.toString(),
          platformFeeSol: platformFee.toString(),
          netCommunitySol: netCommunity.toString(),
          allocatedSol: netCommunity.toString(),
          allocationPreset: plan.preset,
          ...this.decimalAllocations(allocations),
          txSignature: input.txSignature,
          metadata: input.metadata,
          routedAt: new Date()
        }
      });
      await Promise.all([
        this.incrementBucket(tx, input.collectionId, "PROTOCOL", platformFee),
        this.incrementBucket(tx, input.collectionId, "CREATOR", allocations.creatorSol),
        this.incrementBucket(tx, input.collectionId, "RAID_REWARDS", allocations.raidRewardsSol),
        this.incrementBucket(tx, input.collectionId, "METEORA_LIQUIDITY", allocations.meteoraLiquiditySol),
        this.incrementBucket(tx, input.collectionId, "INSTANT_SELL_POOL", allocations.instantSellPoolSol),
        this.incrementBucket(tx, input.collectionId, "SAFETY_RESERVE", allocations.safetyReserveSol),
        this.incrementBucket(tx, input.collectionId, "BUYBACK_BACKING", allocations.buybackBackingSol)
      ]);
      return ledger;
    });
  }

  private decimalAllocations(allocations: Record<string, number>) {
    return Object.fromEntries(Object.entries(allocations).map(([key, value]) => [key, value.toString()]));
  }

  private async incrementBucket(tx: Prisma.TransactionClient, collectionId: string, bucket: TreasuryBucketType, amount: number) {
    return tx.communityTreasuryBucket.upsert({
      where: { collectionId_bucket: { collectionId, bucket } },
      update: { balanceSol: { increment: amount.toString() } },
      create: { collectionId, bucket, balanceSol: amount.toString() }
    });
  }

  private allocate(value: number, bps: number) {
    return this.round(value * (bps / COMMUNITY_BPS_TOTAL));
  }

  private round(value: number) {
    return Math.round(value * 1_000_000_000) / 1_000_000_000;
  }
}
