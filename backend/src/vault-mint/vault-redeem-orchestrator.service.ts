import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { PrismaService } from "../db/prisma.service";
import { ProtocolAccountingService } from "../protocol/protocol-accounting.service";
import { ProtocolService } from "../protocol/protocol.service";
import { SolanaTransactionAdapterService } from "./solana-transaction-adapter.service";

@Injectable()
export class VaultRedeemOrchestratorService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProtocolAccountingService) private readonly accounting: ProtocolAccountingService,
    @Inject(ProtocolService) private readonly protocol: ProtocolService,
    @Inject(SolanaTransactionAdapterService) private readonly solana: SolanaTransactionAdapterService
  ) {}

  async createRedeem(input: { idempotencyKey: string; vaultNftId: string; walletAddress: string }) {
    const requestHash = this.hash(input);
    const existing = await this.prisma.redeemTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing && existing.requestHash !== requestHash) throw new ConflictException("idempotencyKey was already used for another redeem request");
    if (existing) return existing;
    const nft = await this.nftForRedeem(input.vaultNftId, input.walletAddress);
    if (new Date() < nft.unlocksAt) throw new BadRequestException("Vault NFT is still locked.");
    if (nft.status === "REDEEMED" || nft.redeemedAt) throw new BadRequestException("Vault NFT has already been redeemed.");
    if (nft.status === "STAKED") throw new BadRequestException("Staked Vault NFTs cannot be redeemed.");
    return this.prisma.redeemTransaction.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        requestHash,
        walletAddress: input.walletAddress,
        vaultNftId: input.vaultNftId,
        vaultPositionId: nft.positionPda,
        status: "PENDING"
      }
    });
  }

  async buildRedeem(id: string, walletAddress: string) {
    const tx = await this.prisma.redeemTransaction.findUnique({ where: { id }, include: { vaultNft: { include: { collection: { include: { token: true } } } } } });
    if (!tx) throw new NotFoundException("Redeem transaction not found");
    if (tx.walletAddress !== walletAddress) throw new ConflictException("Wallet does not own this redeem transaction.");
    const nft = tx.vaultNft;
    if (!nft.collection.collectionAssetAddress || nft.collection.launchStatus !== "CONFIRMED") throw new BadRequestException("Collection launch is not confirmed.");

    const verification = await this.solana.verifyCoreAssetOwnerAndCollection({
      assetAddress: nft.mint,
      owner: walletAddress,
      collectionAssetAddress: nft.collection.collectionAssetAddress
    });
    if (!verification.verificationAvailable && this.productionMode()) throw new BadRequestException("Production redeem build requires live NFT ownership and collection verification.");
    if (!verification.ownerMatches) throw new BadRequestException("Wallet does not own the Core asset.");
    if (!verification.collectionMatches) throw new BadRequestException("Core asset does not belong to the expected collection.");

    const unsignedTransaction = await this.solana.buildRedeemTransaction({
      transactionId: tx.id,
      walletAddress,
      tokenMint: nft.collection.token.mint,
      nftAssetAddress: nft.mint,
      collectionAssetAddress: nft.collection.collectionAssetAddress,
      vaultPositionPda: nft.positionPda,
      lockedAmount: nft.amount.toString()
    });

    return this.prisma.redeemTransaction.update({
      where: { id },
      data: { unsignedTransaction: this.json(unsignedTransaction), status: "TX_BUILT" }
    });
  }

  async submitRedeem(id: string, input: { signedTransaction?: string; txSignature?: string }, walletAddress: string) {
    const tx = await this.prisma.redeemTransaction.findUnique({ where: { id }, include: { vaultNft: { include: { collection: { include: { token: true } } } } } });
    if (!tx) throw new NotFoundException("Redeem transaction not found");
    if (tx.walletAddress !== walletAddress) throw new ConflictException("Wallet does not own this redeem transaction.");
    if (!["TX_BUILT", "SUBMITTED", "FAILED"].includes(tx.status)) throw new ConflictException(`Redeem cannot be submitted from ${tx.status}`);
    const result = await this.solana.submitAndConfirm({ transactionId: id, signedTransaction: input.signedTransaction, txSignature: input.txSignature });
    if (result.confirmed) {
      const unsigned = this.record(tx.unsignedTransaction);
      const summary = this.record(unsigned.transactionSummary);
      const finalization = await this.solana.verifyRedeemFinalization({
        walletAddress,
        tokenMint: tx.vaultNft.collection.token.mint,
        nftAssetAddress: tx.vaultNft.mint,
        vaultPositionPda: tx.vaultNft.positionPda,
        lockedAmount: tx.vaultNft.amount.toString(),
        preRedeemUserTokenBalance: typeof summary.preRedeemUserTokenBalance === "string" ? summary.preRedeemUserTokenBalance : undefined,
        preRedeemVaultTokenBalance: typeof summary.preRedeemVaultTokenBalance === "string" ? summary.preRedeemVaultTokenBalance : undefined
      });
      if (!finalization.passed) {
        const coreUnverified = !finalization.coreAssetInvalidated;
        return this.prisma.redeemTransaction.update({
          where: { id },
          data: {
            status: coreUnverified ? "NEEDS_CORE_VERIFY" : "FAILED",
            txSignature: result.txSignature,
            errorCode: coreUnverified ? "CORE_INVALIDATION_UNVERIFIED" : "POST_CONFIRM_CHECK_FAILED",
            errorMessage: JSON.stringify(finalization.issues ?? finalization)
          }
        });
      }
    }
    const updated = await this.prisma.redeemTransaction.update({
      where: { id },
      data: {
        status: result.status,
        txSignature: result.txSignature,
        confirmedAt: result.confirmed ? new Date() : undefined
      }
    });
    if (result.confirmed) {
      await this.prisma.vaultNFT.update({
        where: { id: tx.vaultNftId },
        data: { status: "REDEEMED", redeemedAt: new Date(), redeemable: false }
      });
      await this.accounting.syncVaultPosition(tx.vaultNftId, {
        ownerWallet: walletAddress,
        verified: (process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock") === "devnet",
        metadata: { source: "redeem-post-confirm" }
      });
    }
    return updated;
  }

  private async nftForRedeem(id: string, walletAddress: string) {
    const nft = await this.prisma.vaultNFT.findUnique({ where: { id }, include: { owner: true, collection: { include: { token: true } } } });
    if (!nft) throw new NotFoundException("Vault NFT not found");
    const ownership = await this.protocol.assertCurrentOwner({ nft, walletAddress });
    if (!ownership.verificationAvailable && nft.owner?.walletAddress !== walletAddress) throw new ConflictException("Wallet does not own this Vault NFT.");
    return nft;
  }

  private hash(value: unknown) {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private record(value: unknown) {
    return (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
  }

  private productionMode() {
    return (process.env.APP_ENV ?? process.env.NODE_ENV ?? "development") === "production";
  }
}
