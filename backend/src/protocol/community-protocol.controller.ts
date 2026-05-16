import { Body, Controller, Get, Inject, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { WalletAddress } from "../auth/wallet-address.decorator";
import { WalletAuthGuard } from "../auth/wallet-auth.guard";
import { CommunityProtocolService } from "./community-protocol.service";
import { StrategyExecutionGuard } from "./strategy-execution.guard";
import { StrategyEngineService } from "./strategy-engine.service";

const createCommunitySchema = z.object({
  tokenMint: z.string().min(20),
  accessMethod: z.enum(["CREATION_FEE_SOL", "WHALE_HOLDER", "SUBSCRIPTION_STUDIO", "ADMIN_GRANT"]).optional(),
  paymentSignature: z.string().optional(),
  idempotencyKey: z.string().min(8).optional(),
  slug: z.string().optional(),
  name: z.string().optional()
});

const strategySchema = z.object({
  type: z.enum(["PASSIVE", "LIQUIDITY", "BUYBACK", "BURN", "HYBRID"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "DISABLED"]).optional(),
  feeAllocationBps: z.object({
    treasury: z.number().int().min(0).max(10000).optional(),
    buyback: z.number().int().min(0).max(10000).optional(),
    liquidity: z.number().int().min(0).max(10000).optional(),
    rewards: z.number().int().min(0).max(10000).optional(),
    safetyReserve: z.number().int().min(0).max(10000).optional()
  }).optional(),
  executionConfig: z.object({
    intervalSeconds: z.number().int().nonnegative().optional(),
    maxSlippageBps: z.number().int().min(0).max(10000).optional(),
    maxSpendPerExecution: z.string().regex(/^\d+$/).optional(),
    maxDailySpend: z.string().regex(/^\d+$/).optional(),
    minReserveRatioBps: z.number().int().min(0).max(10000).optional(),
    minLiquidityUsd: z.number().nonnegative().optional(),
    emergencyPauseThreshold: z.number().int().min(0).max(10000).optional()
  }).optional(),
  approvedByCreator: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

const executionSchema = z.object({
  action: z.enum(["COLLECT_FEES", "ADD_LIQUIDITY", "BUYBACK", "BURN", "DISTRIBUTE_REWARDS"]),
  inputAmount: z.string().regex(/^\d+$/).optional(),
  expectedSlippageBps: z.number().int().min(0).max(10000).optional(),
  idempotencyKey: z.string().min(8).optional()
});

@Controller()
export class CommunityProtocolController {
  constructor(
    @Inject(CommunityProtocolService) private readonly communities: CommunityProtocolService,
    @Inject(StrategyEngineService) private readonly strategies: StrategyEngineService
  ) {}

  @Post("communities/from-token")
  @UseGuards(WalletAuthGuard)
  createFromToken(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.communities.createFromToken({ ...createCommunitySchema.parse(body), walletAddress });
  }

  @Get("collections/:id/strategy")
  getStrategy(@Param("id") id: string) {
    return this.strategies.getStrategy(id);
  }

  @Post("collections/:id/strategy")
  @UseGuards(WalletAuthGuard)
  createStrategy(@Param("id") id: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.strategies.configureStrategy(id, strategySchema.parse(body), walletAddress);
  }

  @Patch("collections/:id/strategy")
  @UseGuards(WalletAuthGuard)
  updateStrategy(@Param("id") id: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.strategies.configureStrategy(id, strategySchema.parse(body), walletAddress);
  }

  @Get("collections/:id/strategy/events")
  strategyEvents(@Param("id") id: string) {
    return this.strategies.events(id);
  }

  @Get("collections/:id/strategy/jobs")
  strategyJobs(@Param("id") id: string) {
    return this.strategies.jobs(id);
  }

  @Post("collections/:id/strategy/preview-execution")
  @UseGuards(WalletAuthGuard)
  previewExecution(@Param("id") id: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.strategies.previewExecution(id, executionSchema.parse(body), walletAddress);
  }

  @Post("collections/:id/strategy/execute")
  @UseGuards(StrategyExecutionGuard)
  execute(@Param("id") id: string, @Body() body: unknown, @Req() request: any) {
    return this.strategies.execute(id, executionSchema.parse(body), request.strategyActor ?? { walletAddress: request.walletAddress });
  }
}
