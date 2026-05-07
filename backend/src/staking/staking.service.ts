import { Injectable, NotImplementedException } from "@nestjs/common";

type UnsupportedAction = {
  action: "STAKE_VAULT" | "UNSTAKE_VAULT" | "CLAIM_REWARDS";
  walletAddress: string;
  vaultNftId?: string;
  stakingPositionId?: string;
  idempotencyKey?: string;
};

@Injectable()
export class StakingService {
  createStakeIntent(input: { walletAddress: string; vaultNftId: string; idempotencyKey?: string }) {
    return this.unsupported({ action: "STAKE_VAULT", ...input });
  }

  createUnstakeIntent(input: { walletAddress: string; stakingPositionId: string; idempotencyKey?: string }) {
    return this.unsupported({ action: "UNSTAKE_VAULT", ...input });
  }

  createClaimIntent(input: { walletAddress: string; stakingPositionId: string; idempotencyKey?: string }) {
    return this.unsupported({ action: "CLAIM_REWARDS", ...input });
  }

  private unsupported(input: UnsupportedAction): never {
    throw new NotImplementedException({
      code: "ACTION_NOT_IMPLEMENTED",
      action: input.action,
      message: `${input.action} is not implemented on the backend yet.`,
      nextStep: "Wire this endpoint to the staking program/orchestrator before enabling production success states.",
      walletAddress: input.walletAddress,
      vaultNftId: input.vaultNftId,
      stakingPositionId: input.stakingPositionId,
      idempotencyKey: input.idempotencyKey
    });
  }
}
