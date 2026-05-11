import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../db/prisma.service";

type TxLike = Pick<
  PrismaService,
  "collection" | "reserveVault" | "vaultNFT" | "vaultPosition"
>;

@Injectable()
export class ProtocolAccountingService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async syncVaultPosition(vaultNftId: string, options: { ownerWallet?: string; verified?: boolean; metadata?: Record<string, unknown> } = {}) {
    const nft = await this.prisma.vaultNFT.findUnique({
      where: { id: vaultNftId },
      include: { owner: true, collection: { include: { token: true } } }
    });
    if (!nft) return null;
    const ownerWalletSnapshot = options.ownerWallet ?? nft.owner?.walletAddress ?? null;
    const status = this.positionStatus(nft.status, nft.redeemedAt);
    const position = await this.prisma.vaultPosition.upsert({
      where: { vaultNftId: nft.id },
      update: {
        collectionId: nft.collectionId,
        tokenMint: nft.collection.token.mint,
        positionPda: nft.positionPda,
        nftMint: nft.mint,
        ownerWalletSnapshot,
        lockedAmount: nft.amount,
        lockDurationDays: nft.lockDurationDays,
        unlocksAt: nft.unlocksAt,
        redeemedAt: nft.redeemedAt,
        stakedAt: status === "STAKED" ? new Date() : undefined,
        status,
        lastVerifiedAt: options.verified ? new Date() : undefined,
        verificationMetadata: this.json(options.metadata ?? {})
      },
      create: {
        vaultNftId: nft.id,
        collectionId: nft.collectionId,
        tokenMint: nft.collection.token.mint,
        positionPda: nft.positionPda,
        nftMint: nft.mint,
        ownerWalletSnapshot,
        lockedAmount: nft.amount,
        lockDurationDays: nft.lockDurationDays,
        unlocksAt: nft.unlocksAt,
        redeemedAt: nft.redeemedAt,
        stakedAt: status === "STAKED" ? new Date() : undefined,
        status,
        lastVerifiedAt: options.verified ? new Date() : undefined,
        verificationMetadata: this.json(options.metadata ?? {})
      }
    });
    await this.recalculateReserve(nft.collectionId);
    return position;
  }

  async recalculateReserve(collectionId: string, tx: TxLike = this.prisma) {
    const collection = await tx.collection.findUnique({ where: { id: collectionId }, include: { token: true } });
    if (!collection) return null;
    const [all, redeemed, staked, active] = await Promise.all([
      tx.vaultNFT.aggregate({ where: { collectionId }, _sum: { amount: true } }),
      tx.vaultNFT.aggregate({ where: { collectionId, status: "REDEEMED" }, _sum: { amount: true } }),
      tx.vaultNFT.aggregate({ where: { collectionId, status: "STAKED" }, _sum: { amount: true } }),
      tx.vaultNFT.aggregate({ where: { collectionId, status: { not: "REDEEMED" } }, _sum: { amount: true } })
    ]);
    const totalLocked = this.decimalString(all._sum.amount);
    const totalRedeemed = this.decimalString(redeemed._sum.amount);
    const totalStaked = this.decimalString(staked._sum.amount);
    const availableBacking = this.decimalString(active._sum.amount);
    const obligations = BigInt(availableBacking);
    const ratio = obligations === 0n ? 10000 : Math.min(10000, Number((BigInt(availableBacking) * 10000n) / obligations));
    const reserveVaultPda = collection.tokenVaultPda ?? this.pendingReservePda(collection.id);

    return tx.reserveVault.upsert({
      where: { collectionId },
      update: {
        tokenMint: collection.token.mint,
        reserveVaultPda,
        totalLocked,
        totalRedeemed,
        totalStaked,
        availableBacking,
        reserveRatioBps: ratio,
        status: collection.emergencyFlag ? "EMERGENCY" : collection.status === "PAUSED" || collection.status === "RISK_DISABLED" ? "PAUSED" : "ACTIVE",
        verificationMetadata: this.json({
          source: "db-accounting",
          warning: "Reserve totals are local accounting until live on-chain reserve verification succeeds."
        })
      },
      create: {
        collectionId,
        tokenMint: collection.token.mint,
        reserveVaultPda,
        totalLocked,
        totalRedeemed,
        totalStaked,
        availableBacking,
        reserveRatioBps: ratio,
        status: collection.emergencyFlag ? "EMERGENCY" : collection.status === "PAUSED" || collection.status === "RISK_DISABLED" ? "PAUSED" : "ACTIVE",
        verificationMetadata: this.json({
          source: "db-accounting",
          warning: "Reserve totals are local accounting until live on-chain reserve verification succeeds."
        })
      }
    });
  }

  async recalculateAllReserves() {
    const collections = await this.prisma.collection.findMany({ select: { id: true } });
    return Promise.all(collections.map((collection) => this.recalculateReserve(collection.id)));
  }

  private positionStatus(status: string, redeemedAt?: Date | null) {
    if (redeemedAt || status === "REDEEMED") return "REDEEMED" as const;
    if (status === "STAKED") return "STAKED" as const;
    if (status === "REDEEMABLE") return "REDEEMABLE" as const;
    return "LOCKED" as const;
  }

  private pendingReservePda(collectionId: string) {
    return `pending_reserve_${collectionId.replace(/-/g, "").slice(0, 32)}`;
  }

  private decimalString(value: unknown) {
    if (value === null || value === undefined) return "0";
    return String(value);
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
}
