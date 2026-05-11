import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../db/prisma.service";
import { SolanaTransactionAdapterService } from "../vault-mint/solana-transaction-adapter.service";
import { ProtocolAccountingService } from "./protocol-accounting.service";

type ProofIssue = string | null | undefined | false;

@Injectable()
export class ProtocolService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SolanaTransactionAdapterService) private readonly solana: SolanaTransactionAdapterService,
    @Inject(ProtocolAccountingService) private readonly accounting: ProtocolAccountingService
  ) {}

  async health() {
    const [collections, activeCommunities, vaults, reserveCount, insolvent, paused, sales, minted, staked, redeemed] = await Promise.all([
      this.prisma.collection.count(),
      this.prisma.collection.count({ where: { status: "ACTIVE", launchStatus: "CONFIRMED" } }),
      this.prisma.vaultNFT.count(),
      this.prisma.reserveVault.count(),
      this.prisma.reserveVault.count({ where: { status: "INSOLVENT" } }),
      this.prisma.reserveVault.count({ where: { status: { in: ["PAUSED", "EMERGENCY"] } } }),
      this.prisma.sale.count(),
      this.prisma.mintTransaction.count({ where: { status: "CONFIRMED" } }),
      this.prisma.vaultNFT.count({ where: { status: "STAKED" } }),
      this.prisma.vaultNFT.count({ where: { status: "REDEEMED" } })
    ]);
    return {
      ok: insolvent === 0,
      productionReady: this.productionProofAvailable(),
      mode: this.mode(),
      protocol: "phew-run-token-backed-nft-vaults",
      stats: {
        collections,
        activeCommunities,
        vaults,
        reserveVaults: reserveCount,
        phewsMinted: minted,
        stakedVaults: staked,
        redeemedVaults: redeemed,
        totalTrades: sales
      },
      reserveHealth: {
        status: insolvent > 0 ? "INSOLVENT" : paused > 0 ? "DEGRADED" : "OK",
        insolvent,
        pausedOrEmergency: paused
      },
      issues: this.productionProofAvailable() ? [] : [`${this.mode()} mode does not provide production-grade live reserve proof.`],
      lastCheckedAt: new Date().toISOString()
    };
  }

  async reserves() {
    const collections = await this.prisma.collection.findMany({
      orderBy: { createdAt: "desc" },
      include: { token: true, reserveVault: true, vaultNfts: { select: { id: true, status: true, amount: true } } }
    });
    return {
      ok: true,
      productionReady: this.productionProofAvailable(),
      reserves: collections.map((collection) => this.reserveDto(collection, collection.reserveVault))
    };
  }

  async collectionReserve(idOrSlug: string) {
    const collection = await this.collection(idOrSlug, { token: true, reserveVault: true, vaultNfts: { select: { id: true, status: true, amount: true } } });
    return {
      ok: true,
      productionReady: this.productionProofAvailable(),
      reserve: this.reserveDto(collection, collection.reserveVault)
    };
  }

  async collectionVaults(idOrSlug: string) {
    const collection = await this.collection(idOrSlug, { token: true, reserveVault: true });
    const vaults = await this.prisma.vaultNFT.findMany({
      where: { collectionId: collection.id },
      orderBy: { createdAt: "desc" },
      include: { owner: true, vaultPosition: true, mintTransaction: true }
    });
    return {
      ok: true,
      collectionId: collection.id,
      collectionName: collection.name,
      tokenMint: collection.token.mint,
      tokenSymbol: collection.token.symbol,
      vaults: vaults.map((vault) => this.vaultSummary(vault, collection))
    };
  }

  async vaultProof(mintOrId: string) {
    const nft = await this.vault(mintOrId);
    const proof = await this.proofForNft(nft);
    return { ok: true, proof };
  }

  async redeemability(mintOrId: string) {
    const nft = await this.vault(mintOrId);
    const proof = await this.proofForNft(nft);
    const now = new Date();
    const issues = [
      ...proof.issues,
      proof.status === "REDEEMED" ? "Vault NFT has already been redeemed." : null,
      proof.staked ? "Staked Vault NFTs cannot be redeemed." : null,
      now < nft.unlocksAt ? "Vault NFT is still locked." : null,
      !proof.verificationResult.ownerVerificationAvailable ? "Live owner proof is unavailable; redeem can only proceed in dev/mock fallback when DB ownership matches." : null
    ].filter(Boolean) as string[];
    return {
      ok: true,
      canRedeem: issues.length === 0,
      redeemableAt: nft.unlocksAt.toISOString(),
      issues,
      proof
    };
  }

  async owner(mintOrId: string) {
    const nft = await this.vault(mintOrId);
    const proof = await this.proofForNft(nft);
    return {
      ok: true,
      nftMint: proof.nftMint,
      currentOwner: proof.currentOwner,
      dbOwnerSnapshot: proof.dbOwnerSnapshot,
      verificationResult: proof.verificationResult,
      issues: proof.issues,
      lastVerifiedAt: proof.lastVerifiedAt
    };
  }

  async history(mintOrId: string) {
    const nft = await this.vault(mintOrId);
    const [stakingPositions, listings, sales, redeemTransactions] = await Promise.all([
      this.prisma.stakingPosition.findMany({ where: { vaultNftId: nft.id }, orderBy: { stakedAt: "desc" } }),
      this.prisma.listing.findMany({ where: { vaultNftId: nft.id }, orderBy: { createdAt: "desc" } }),
      this.prisma.sale.findMany({ where: { vaultNftId: nft.id }, orderBy: { createdAt: "desc" } }),
      this.prisma.redeemTransaction.findMany({ where: { vaultNftId: nft.id }, orderBy: { createdAt: "desc" } })
    ]);
    return {
      ok: true,
      nftMint: nft.mint,
      events: [
        nft.mintTransaction
          ? {
              type: "MINT",
              status: nft.mintTransaction.status,
              txSignature: nft.mintTransaction.txSignature,
              at: nft.mintTransaction.confirmedAt ?? nft.mintTransaction.createdAt
            }
          : null,
        ...stakingPositions.map((position) => ({ type: "STAKE", status: position.status, at: position.stakedAt, stakingPositionId: position.id })),
        ...listings.map((listing) => ({ type: "LISTING", status: listing.status, priceSol: listing.priceSol.toString(), at: listing.createdAt, listingId: listing.id })),
        ...sales.map((sale) => ({ type: "SALE", priceSol: sale.priceSol.toString(), txSignature: sale.txSignature, at: sale.createdAt, saleId: sale.id })),
        ...redeemTransactions.map((tx) => ({ type: "REDEEM", status: tx.status, txSignature: tx.txSignature, at: tx.confirmedAt ?? tx.createdAt, redeemTransactionId: tx.id }))
      ]
        .filter(Boolean)
        .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
    };
  }

  async refreshOwnerSnapshot(nft: any, expectedOwner?: string) {
    const collection = nft.collection;
    if (!collection?.collectionAssetAddress) {
      return {
        verificationAvailable: false,
        currentOwner: null as string | null,
        ownerMatchesExpected: null as boolean | null,
        collectionMatches: null as boolean | null,
        issues: ["Collection has no verified Core collection asset address."]
      };
    }
    let proof: Awaited<ReturnType<SolanaTransactionAdapterService["getCoreAssetProof"]>>;
    try {
      proof = await this.solana.getCoreAssetProof({
        assetAddress: nft.mint,
        collectionAssetAddress: collection.collectionAssetAddress
      });
    } catch (error) {
      return {
        verificationAvailable: false,
        currentOwner: null as string | null,
        ownerMatchesExpected: null as boolean | null,
        collectionMatches: null as boolean | null,
        issues: [`Live Core asset verification failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
    if (!proof.verificationAvailable) {
      return {
        verificationAvailable: false,
        currentOwner: null as string | null,
        ownerMatchesExpected: null as boolean | null,
        collectionMatches: null as boolean | null,
        issues: proof.issues
      };
    }
    if (proof.currentOwner) await this.setOwnerSnapshot(nft.id, proof.currentOwner);
    return {
      verificationAvailable: true,
      currentOwner: proof.currentOwner,
      ownerMatchesExpected: expectedOwner ? proof.currentOwner === expectedOwner : null,
      collectionMatches: proof.collectionMatches,
      issues: proof.issues
    };
  }

  async assertCurrentOwner(input: { nft: any; walletAddress: string; allowDbFallback?: boolean }) {
    const proof = await this.refreshOwnerSnapshot(input.nft, input.walletAddress);
    if (proof.verificationAvailable) {
      if (!proof.ownerMatchesExpected) throw new BadRequestException("Wallet does not own the live Core asset.");
      if (proof.collectionMatches === false) throw new BadRequestException("Core asset does not belong to the expected collection.");
      return proof;
    }
    if (this.productionMode()) throw new BadRequestException("Production owner-gated actions require live NFT ownership verification.");
    if (input.allowDbFallback !== false && input.nft.owner?.walletAddress === input.walletAddress) return proof;
    throw new BadRequestException("Live NFT ownership verification is unavailable and the DB owner snapshot does not match this wallet.");
  }

  private async proofForNft(nft: any) {
    await this.accounting.syncVaultPosition(nft.id);
    const refreshed = await this.prisma.vaultNFT.findUnique({
      where: { id: nft.id },
      include: {
        owner: true,
        vaultPosition: true,
        collection: { include: { token: true, reserveVault: true } },
        stakingPositions: { where: { status: "ACTIVE" }, take: 1 }
      }
    });
    if (!refreshed) throw new NotFoundException("Vault NFT not found");
    const ownership = await this.refreshOwnerSnapshot(refreshed);
    const dbOwnerSnapshot = refreshed.owner?.walletAddress ?? refreshed.vaultPosition?.ownerWalletSnapshot ?? null;
    const ownerMatchesDb = ownership.verificationAvailable && ownership.currentOwner && dbOwnerSnapshot ? ownership.currentOwner === dbOwnerSnapshot : null;
    const issues = [
      ...ownership.issues,
      refreshed.collection.reserveVault?.status === "INSOLVENT" ? "Reserve vault is marked insolvent." : null,
      refreshed.collection.reserveVault?.status === "PAUSED" ? "Reserve vault is paused." : null,
      refreshed.collection.emergencyFlag ? "Collection emergency flag is active." : null,
      ownerMatchesDb === false ? "Live owner differs from DB owner snapshot; local ownership cache was refreshed where possible." : null
    ].filter(Boolean) as string[];

    return {
      nftMint: refreshed.mint,
      coreAsset: refreshed.mint,
      collectionAsset: refreshed.collection.collectionAssetAddress,
      collectionId: refreshed.collectionId,
      collectionName: refreshed.collection.name,
      tokenMint: refreshed.collection.token.mint,
      tokenSymbol: refreshed.collection.token.symbol,
      lockedAmount: refreshed.amount.toString(),
      reserveVaultPda: refreshed.collection.reserveVault?.reserveVaultPda ?? refreshed.collection.tokenVaultPda ?? null,
      positionPda: refreshed.positionPda,
      currentOwner: ownership.currentOwner,
      dbOwnerSnapshot,
      status: refreshed.status,
      redeemable: refreshed.redeemable || (refreshed.status === "REDEEMABLE" && !refreshed.redeemedAt),
      staked: refreshed.status === "STAKED" || refreshed.stakingPositions.length > 0,
      lockDurationDays: refreshed.lockDurationDays,
      unlocksAt: refreshed.unlocksAt.toISOString(),
      redeemedAt: refreshed.redeemedAt?.toISOString() ?? null,
      verificationResult: {
        ownerVerificationAvailable: ownership.verificationAvailable,
        ownerMatchesDb,
        collectionMatches: ownership.collectionMatches,
        positionPda: refreshed.positionPda,
        reserveVaultStatus: refreshed.collection.reserveVault?.status ?? "UNINITIALIZED",
        productionReady: this.productionProofAvailable() && ownership.verificationAvailable && ownership.collectionMatches !== false
      },
      issues,
      lastVerifiedAt: ownership.verificationAvailable ? new Date().toISOString() : refreshed.vaultPosition?.lastVerifiedAt?.toISOString() ?? null
    };
  }

  private async setOwnerSnapshot(vaultNftId: string, walletAddress: string) {
    const user = await this.prisma.user.upsert({
      where: { walletAddress },
      update: {},
      create: { walletAddress, username: walletAddress.slice(0, 6) }
    });
    await this.prisma.vaultNFT.update({ where: { id: vaultNftId }, data: { ownerUserId: user.id } });
    await this.accounting.syncVaultPosition(vaultNftId, { ownerWallet: walletAddress, verified: true, metadata: { source: "live-core-owner-refresh" } });
  }

  private async collection(idOrSlug: string, include: Prisma.CollectionInclude) {
    const collection = await this.prisma.collection.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include
    });
    if (!collection) throw new NotFoundException("Collection not found");
    return collection as any;
  }

  private async vault(mintOrId: string) {
    const nft = await this.prisma.vaultNFT.findFirst({
      where: { OR: [{ id: mintOrId }, { mint: mintOrId }] },
      include: {
        owner: true,
        vaultPosition: true,
        mintTransaction: true,
        collection: { include: { token: true, reserveVault: true } }
      }
    });
    if (!nft) throw new NotFoundException("Vault NFT not found");
    return nft;
  }

  private reserveDto(collection: any, reserve: any) {
    const localTotals = this.localReserveTotals(collection.vaultNfts ?? []);
    return {
      collectionId: collection.id,
      collectionSlug: collection.slug,
      collectionName: collection.name,
      tokenMint: collection.token?.mint ?? reserve?.tokenMint ?? "",
      tokenSymbol: collection.token?.symbol ?? "",
      reserveVaultPda: reserve?.reserveVaultPda ?? collection.tokenVaultPda ?? null,
      feeVaultPda: collection.feeVaultPda ?? null,
      totalLocked: reserve?.totalLocked?.toString?.() ?? localTotals.totalLocked,
      totalRedeemed: reserve?.totalRedeemed?.toString?.() ?? localTotals.totalRedeemed,
      totalStaked: reserve?.totalStaked?.toString?.() ?? localTotals.totalStaked,
      availableBacking: reserve?.availableBacking?.toString?.() ?? localTotals.availableBacking,
      reserveRatioBps: reserve?.reserveRatioBps ?? localTotals.reserveRatioBps,
      status: reserve?.status ?? (collection.emergencyFlag ? "EMERGENCY" : "ACTIVE"),
      launchStatus: collection.launchStatus,
      riskStatus: collection.emergencyFlag ? "EMERGENCY" : collection.status,
      lastOnChainVerifiedAt: reserve?.lastOnChainVerifiedAt?.toISOString?.() ?? null,
      verificationMetadata: reserve?.verificationMetadata ?? {
        source: "local-derived",
        warning: "Reserve row has not been initialized yet; values are derived from local VaultNFT records."
      },
      productionReady: this.productionProofAvailable() && Boolean(reserve?.lastOnChainVerifiedAt)
    };
  }

  private vaultSummary(vault: any, collection: any) {
    return {
      id: vault.id,
      mint: vault.mint,
      collectionId: vault.collectionId,
      collectionName: collection.name,
      tokenMint: collection.token.mint,
      tokenSymbol: collection.token.symbol,
      lockedAmount: vault.amount.toString(),
      positionPda: vault.positionPda,
      ownerWalletSnapshot: vault.owner?.walletAddress ?? vault.vaultPosition?.ownerWalletSnapshot ?? null,
      status: vault.status,
      redeemable: vault.redeemable,
      unlocksAt: vault.unlocksAt.toISOString(),
      proofUrl: `/vaults/${vault.mint}/proof`
    };
  }

  private localReserveTotals(vaults: Array<{ status: string; amount: unknown }>) {
    const sum = (filter: (vault: { status: string }) => boolean) =>
      vaults.filter(filter).reduce((total, vault) => total + BigInt(String(vault.amount ?? 0)), 0n);
    const totalLocked = sum(() => true);
    const totalRedeemed = sum((vault) => vault.status === "REDEEMED");
    const totalStaked = sum((vault) => vault.status === "STAKED");
    const availableBacking = sum((vault) => vault.status !== "REDEEMED");
    return {
      totalLocked: totalLocked.toString(),
      totalRedeemed: totalRedeemed.toString(),
      totalStaked: totalStaked.toString(),
      availableBacking: availableBacking.toString(),
      reserveRatioBps: 10000
    };
  }

  private productionProofAvailable() {
    return (process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock") === "devnet" && (process.env.APP_ENV ?? process.env.NODE_ENV ?? "development") === "production";
  }

  private productionMode() {
    return (process.env.APP_ENV ?? process.env.NODE_ENV ?? "development") === "production";
  }

  private mode() {
    return process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
  }
}
