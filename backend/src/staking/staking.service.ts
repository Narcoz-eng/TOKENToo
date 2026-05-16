import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { PrismaService } from "../db/prisma.service";
import { ProtocolAccountingService } from "../protocol/protocol-accounting.service";
import { ProtocolService } from "../protocol/protocol.service";
import { SolanaTransactionAdapterService } from "../vault-mint/solana-transaction-adapter.service";

@Injectable()
export class StakingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProtocolService) private readonly protocol: ProtocolService,
    @Inject(ProtocolAccountingService) private readonly accounting: ProtocolAccountingService,
    @Optional() @Inject(SolanaTransactionAdapterService) private readonly solana?: SolanaTransactionAdapterService
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
    const positionProof = await this.verifyVaultPosition(nft, input.walletAddress, { expectedRedeemed: false, expectedStaked: false });
    if (!this.localStakingAccountingEnabled() && !this.productionStakingAdapterAvailable()) {
      if (this.productionStakingRequired()) {
        throw new BadRequestException("Production staking requires an audited on-chain custody/freeze adapter; local staking mutation is forbidden.");
      }
      return {
        ok: true,
        action: "STAKE_VAULT",
        status: "SKIPPED",
        idempotencyKey: input.idempotencyKey,
        verification: ownership,
        vaultPositionVerification: positionProof,
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
      vaultPositionVerification: positionProof,
      productionReady: ownership.verificationAvailable && positionProof.verificationAvailable && this.productionStakingAdapterAvailable(),
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
    const positionProof = await this.verifyVaultPosition(position.vaultNft, input.walletAddress, { expectedRedeemed: false, expectedStaked: true });
    if (!this.localStakingAccountingEnabled() && !this.productionStakingAdapterAvailable()) {
      if (this.productionStakingRequired()) {
        throw new BadRequestException("Production unstake requires an audited on-chain custody/freeze adapter; local staking mutation is forbidden.");
      }
      return {
        ok: true,
        action: "UNSTAKE_VAULT",
        status: "SKIPPED",
        idempotencyKey: input.idempotencyKey,
        verification: ownership,
        vaultPositionVerification: positionProof,
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
      vaultPositionVerification: positionProof,
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
    const positionProof = await this.verifyVaultPosition(position.vaultNft, input.walletAddress, { expectedRedeemed: false, expectedStaked: true });
    if (!this.productionStakingAdapterAvailable()) {
      if (this.productionStakingRequired()) {
        throw new BadRequestException("Production reward claims require an audited reward payout adapter; no reward payout is faked.");
      }
      return {
        ok: true,
        action: "CLAIM_REWARDS",
        status: "SKIPPED",
        idempotencyKey: input.idempotencyKey,
        stakingPositionId: position.id,
        rewardsAccruedSol: position.rewardsAccruedSol.toString(),
        xpAccrued: position.xpAccrued,
        verification: ownership,
        vaultPositionVerification: positionProof,
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
      vaultPositionVerification: positionProof,
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

  private productionStakingRequired() {
    return (process.env.ENABLE_PRODUCTION_STAKING ?? "false") === "true" || (process.env.APP_ENV ?? process.env.NODE_ENV ?? "development") === "production";
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

  private async verifyVaultPosition(nft: any, walletAddress: string, expectations: { expectedRedeemed: boolean; expectedStaked: boolean }) {
    if (!this.solana?.verifyVaultPositionPda) {
      const unavailable = {
        verificationAvailable: false,
        passed: false,
        issues: ["Vault position PDA verification adapter is unavailable."]
      };
      if (this.productionStakingRequired()) {
        throw new BadRequestException("Production staking requires live VaultPosition PDA verification.");
      }
      return unavailable;
    }
    const proof = await this.solana.verifyVaultPositionPda({
      walletAddress,
      tokenMint: nft.collection?.token?.mint ?? nft.token?.mint,
      nftAssetAddress: nft.mint,
      vaultPositionPda: nft.positionPda,
      expectedAmount: String(nft.amount),
      expectedRedeemed: expectations.expectedRedeemed,
      expectedStaked: expectations.expectedStaked
    });
    if (proof.verificationAvailable && !proof.passed) {
      throw new BadRequestException(`Vault position verification failed: ${proof.issues.join(" ")}`);
    }
    if (!proof.verificationAvailable && this.productionStakingRequired()) {
      throw new BadRequestException(`Production staking requires live VaultPosition PDA verification: ${proof.issues.join(" ")}`);
    }
    return proof;
  }
}
