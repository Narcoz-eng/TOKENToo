import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../db/prisma.service";
import { ProtocolAccountingService } from "../protocol/protocol-accounting.service";
import { ProtocolService } from "../protocol/protocol.service";

@Injectable()
export class StakingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProtocolService) private readonly protocol: ProtocolService,
    @Inject(ProtocolAccountingService) private readonly accounting: ProtocolAccountingService
  ) {}

  async createStakeIntent(input: { walletAddress: string; vaultNftId: string; idempotencyKey?: string }) {
    const nft = await this.prisma.vaultNFT.findUnique({
      where: { id: input.vaultNftId },
      include: { owner: true, collection: { include: { token: true, reserveVault: true } }, stakingPositions: { where: { status: "ACTIVE" }, take: 1 } }
    });
    if (!nft) throw new NotFoundException("Vault NFT not found");
    if (nft.status === "REDEEMED" || nft.redeemedAt) throw new BadRequestException("Redeemed Vault NFTs cannot be staked.");
    if (!this.hasStakeableProof(nft)) throw new BadRequestException("Only confirmed live Vault NFTs can be staked.");
    if (nft.status === "STAKED" || nft.stakingPositions.length) {
      return {
        ok: true,
        idempotent: true,
        action: "STAKE_VAULT",
        position: nft.stakingPositions[0],
        message: "Vault NFT is already staked."
      };
    }
    const ownership = await this.protocol.assertCurrentOwner({ nft, walletAddress: input.walletAddress });
    if (!this.localStakingAccountingEnabled() && !this.productionStakingAdapterAvailable()) {
      return {
        ok: true,
        action: "STAKE_VAULT",
        status: "SKIPPED",
        idempotencyKey: input.idempotencyKey,
        verification: ownership,
        productionReady: false,
        message: "Staking transaction adapter is not implemented; no local staking state was mutated."
      };
    }
    const user = await this.prisma.user.upsert({
      where: { walletAddress: input.walletAddress },
      update: {},
      create: { walletAddress: input.walletAddress, username: input.walletAddress.slice(0, 6) }
    });
    const position = await this.prisma.$transaction(async (tx) => {
      const created = await tx.stakingPosition.create({
        data: {
          vaultNftId: nft.id,
          collectionId: nft.collectionId,
          userId: user.id,
          durationDays: Math.max(30, nft.lockDurationDays || 30),
          apyBps: this.apyBps(nft.collection.communityLevel),
          boostBps: nft.lockDurationDays >= 180 ? 250 : nft.lockDurationDays >= 90 ? 100 : 0,
          rewardsAccruedSol: 0,
          xpAccrued: 0,
          status: "ACTIVE"
        }
      });
      await tx.vaultNFT.update({ where: { id: nft.id }, data: { status: "STAKED", redeemable: false, ownerUserId: user.id } });
      return created;
    });
    await this.accounting.syncVaultPosition(nft.id, {
      ownerWallet: input.walletAddress,
      verified: ownership.verificationAvailable,
      metadata: { source: "stake-intent", idempotencyKey: input.idempotencyKey }
    });
    return {
      ok: true,
      action: "STAKE_VAULT",
      idempotencyKey: input.idempotencyKey,
      position,
      verification: ownership,
      productionReady: ownership.verificationAvailable && this.productionStakingAdapterAvailable(),
      message: ownership.verificationAvailable ? "Vault NFT owner verified and staked in protocol accounting." : "Dev/mock staking recorded with DB owner fallback; not production-ready proof."
    };
  }

  async createUnstakeIntent(input: { walletAddress: string; stakingPositionId: string; idempotencyKey?: string }) {
    const position = await this.prisma.stakingPosition.findUnique({
      where: { id: input.stakingPositionId },
      include: { user: true, vaultNft: { include: { owner: true, collection: { include: { token: true } } } } }
    });
    if (!position) throw new NotFoundException("Staking position not found");
    if (position.user.walletAddress !== input.walletAddress) throw new ConflictException("Wallet does not own this staking position.");
    if (position.status !== "ACTIVE") {
      return { ok: true, idempotent: true, action: "UNSTAKE_VAULT", position, message: "Staking position is already inactive." };
    }
    const ownership = await this.protocol.assertCurrentOwner({ nft: position.vaultNft, walletAddress: input.walletAddress });
    if (!this.localStakingAccountingEnabled() && !this.productionStakingAdapterAvailable()) {
      return {
        ok: true,
        action: "UNSTAKE_VAULT",
        status: "SKIPPED",
        idempotencyKey: input.idempotencyKey,
        verification: ownership,
        message: "Unstake transaction adapter is not implemented; no local staking state was mutated."
      };
    }
    const nextStatus = position.vaultNft.redeemedAt ? "REDEEMED" : new Date() >= position.vaultNft.unlocksAt ? "REDEEMABLE" : "LOCKED";
    const updated = await this.prisma.$transaction(async (tx) => {
      const unstaked = await tx.stakingPosition.update({
        where: { id: position.id },
        data: { status: "UNSTAKED", unstakedAt: new Date() }
      });
      await tx.vaultNFT.update({
        where: { id: position.vaultNftId },
        data: { status: nextStatus, redeemable: nextStatus === "REDEEMABLE" }
      });
      return unstaked;
    });
    await this.accounting.syncVaultPosition(position.vaultNftId, {
      ownerWallet: input.walletAddress,
      verified: ownership.verificationAvailable,
      metadata: { source: "unstake-intent", idempotencyKey: input.idempotencyKey }
    });
    return {
      ok: true,
      action: "UNSTAKE_VAULT",
      idempotencyKey: input.idempotencyKey,
      position: updated,
      vaultStatus: nextStatus,
      verification: ownership,
      message: "Vault NFT unstaked; backing remains locked until redeem."
    };
  }

  async createClaimIntent(input: { walletAddress: string; stakingPositionId: string; idempotencyKey?: string }) {
    const position = await this.prisma.stakingPosition.findUnique({
      where: { id: input.stakingPositionId },
      include: { user: true, vaultNft: { include: { owner: true, collection: { include: { token: true } } } } }
    });
    if (!position) throw new NotFoundException("Staking position not found");
    if (position.user.walletAddress !== input.walletAddress) throw new ConflictException("Wallet does not own this staking position.");
    if (position.status !== "ACTIVE") throw new BadRequestException("Only active staking positions can claim rewards.");
    const ownership = await this.protocol.assertCurrentOwner({ nft: position.vaultNft, walletAddress: input.walletAddress });
    if (!this.productionStakingAdapterAvailable()) {
      return {
        ok: true,
        action: "CLAIM_REWARDS",
        status: "SKIPPED",
        idempotencyKey: input.idempotencyKey,
        stakingPositionId: position.id,
        rewardsAccruedSol: position.rewardsAccruedSol.toString(),
        xpAccrued: position.xpAccrued,
        verification: ownership,
        payoutStatus: "SKIPPED_NO_ADAPTER",
        message: "Rewards payout adapter is not implemented; accrued accounting is reported but no payout is faked."
      };
    }
    return {
      ok: true,
      action: "CLAIM_REWARDS",
      idempotencyKey: input.idempotencyKey,
      stakingPositionId: position.id,
      rewardsAccruedSol: position.rewardsAccruedSol.toString(),
      xpAccrued: position.xpAccrued,
      verification: ownership,
      payoutStatus: "ACCOUNTED_NOT_PAID",
      message: "Reward claim is idempotent and reports accrued accounting only until a rewards payout adapter is wired."
    };
  }

  private apyBps(level: number) {
    return Math.min(1500, 400 + Math.max(0, level - 1) * 50);
  }

  private productionStakingAdapterAvailable() {
    return (process.env.STAKING_TRANSACTION_PROVIDER ?? "disabled") !== "disabled" && false;
  }

  private localStakingAccountingEnabled() {
    return (process.env.ENABLE_LOCAL_STAKING_ACCOUNTING ?? "false") === "true" && (process.env.APP_ENV ?? process.env.NODE_ENV ?? "development") !== "production";
  }

  private hasStakeableProof(nft: any) {
    const mint = String(nft.mint ?? "");
    const positionPda = String(nft.positionPda ?? "");
    return (
      !mint.startsWith("pending_") &&
      !mint.startsWith("mock_") &&
      !positionPda.startsWith("pending_") &&
      !positionPda.startsWith("mock_") &&
      nft.collection?.launchStatus === "CONFIRMED" &&
      Boolean(nft.collection?.collectionAssetAddress) &&
      (nft.collection?.reserveVault?.status ?? "ACTIVE") === "ACTIVE"
    );
  }
}
