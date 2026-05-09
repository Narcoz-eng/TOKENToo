import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { WalletAddress } from "../auth/wallet-address.decorator";
import { WalletAuthGuard } from "../auth/wallet-auth.guard";
import { StakingService } from "./staking.service";

const stakeSchema = z.object({
  vaultNftId: z.string().min(1),
  idempotencyKey: z.string().optional()
});

const positionSchema = z.object({
  stakingPositionId: z.string().min(1),
  idempotencyKey: z.string().optional()
});

@Controller("staking")
@UseGuards(WalletAuthGuard)
export class StakingController {
  constructor(@Inject(StakingService) private readonly staking: StakingService) {}

  @Post("stake/intents")
  createStakeIntent(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.staking.createStakeIntent({ ...stakeSchema.parse(body), walletAddress });
  }

  @Post("unstake/intents")
  createUnstakeIntent(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.staking.createUnstakeIntent({ ...positionSchema.parse(body), walletAddress });
  }

  @Post("claim-rewards/intents")
  createClaimIntent(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.staking.createClaimIntent({ ...positionSchema.parse(body), walletAddress });
  }
}
