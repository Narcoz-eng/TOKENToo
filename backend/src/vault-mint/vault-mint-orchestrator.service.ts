import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { AssetProductionLayerService } from "../generator/asset-production-layer.service";
import { AssetStorageService } from "../generator/asset-storage.service";
import type { GeneratedStyleProfile, TraitPackPlan } from "../generator/generator.types";
import { PrismaService } from "../db/prisma.service";
import { SolanaTransactionAdapterService } from "./solana-transaction-adapter.service";
import type { CreateMintIntentInput, SubmitMintTransactionInput } from "./vault-mint.types";

@Injectable()
export class VaultMintOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetProduction: AssetProductionLayerService,
    private readonly storage: AssetStorageService,
    private readonly solana: SolanaTransactionAdapterService
  ) {}

  async createOrResumeMint(input: CreateMintIntentInput) {
    const normalized = this.normalizeMint(input);
    const requestHash = this.hash(normalized);
    const existing = await this.prisma.mintTransaction.findUnique({ where: { idempotencyKey: normalized.idempotencyKey } });
    if (existing && existing.requestHash !== requestHash) throw new ConflictException("idempotencyKey was already used for a different mint request");
    if (existing && existing.status === "CONFIRMED") return existing;

    const collection = await this.prisma.collection.findUnique({
      where: { id: normalized.collectionId },
      include: { token: true }
    });
    if (!collection) throw new NotFoundException("Collection not found");
    if (!collection.identityLockedAt || !collection.approvedGenerationRunId || !collection.styleProfileVersion) {
      throw new BadRequestException("Collection must be launched from an approved immutable generator profile before minting.");
    }
    if (collection.launchStatus !== "CONFIRMED" || !collection.collectionAssetAddress) {
      throw new BadRequestException("Collection Core asset launch must be confirmed before minting Vault NFTs.");
    }
    if (collection.status !== "ACTIVE" || collection.emergencyFlag || collection.instantSellDisabled) {
      throw new BadRequestException("Collection is paused, risk disabled, or under emergency controls.");
    }
    if (collection.token.mint !== normalized.tokenMint) throw new BadRequestException("Token mint does not match the collection profile.");
    if (this.productionMintRequested() && (process.env.FINAL_ASSET_STORAGE_PROVIDER ?? "mock") === "mock") {
      throw new BadRequestException("Production minting is blocked until FINAL_ASSET_STORAGE_PROVIDER is immutable storage.");
    }
    if (this.productionMintRequested() && (process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock") === "mock") {
      throw new BadRequestException("Production minting is blocked until SOLANA_TRANSACTION_PROVIDER is real devnet/mainnet adapter.");
    }

    const profile = await this.approvedProfile(collection.approvedGenerationRunId, collection.styleProfileVersion);
    const quality = profile.qualityReports[0];
    const distinctiveness = profile.distinctivenessReports[0];
    if (!quality?.passed || quality.tier === "BASIC" || !distinctiveness?.passed) throw new BadRequestException("Collection profile does not satisfy Premium+ launch gates.");

    const mintTx =
      existing ??
      (await this.prisma.mintTransaction.create({
        data: {
          idempotencyKey: normalized.idempotencyKey,
          requestHash,
          walletAddress: normalized.walletAddress,
          collectionId: normalized.collectionId,
          tokenMint: normalized.tokenMint,
          amount: normalized.amount,
          lockDuration: normalized.lockDurationDays,
          status: "PENDING"
        }
      }));

    const style = this.styleFromRecord(profile);
    const pack = this.packFromRecord(profile.traitPack);
    const finalAsset = this.assetProduction.produceFinalVaultAsset({
      style,
      pack,
      seedKey: mintTx.id,
      lockedAmount: normalized.amount,
      lockDurationDays: normalized.lockDurationDays,
      ownerWallet: normalized.walletAddress,
      qualityTier: quality.tier
    });
    const assetUri = await this.storage.storeFinalNftAsset(`${mintTx.id}/image.svg`, finalAsset.imageDataUri);
    const metadata = { ...finalAsset.metadata, image: assetUri, assetProduction: finalAsset.manifest };
    const metadataUri = await this.storage.storeFinalNftMetadata(`${mintTx.id}/metadata.json`, metadata);
    return this.prisma.mintTransaction.update({
      where: { id: mintTx.id },
      data: {
        assetUri,
        metadataUri,
        status: "ASSET_UPLOADED",
        retries: existing ? { increment: 1 } : 0,
        errorCode: null,
        errorMessage: null
      }
    });
  }

  async buildMintTransaction(id: string, walletAddress?: string) {
    const tx = await this.prisma.mintTransaction.findUnique({ where: { id }, include: { collection: true } });
    if (!tx) throw new NotFoundException("Mint transaction not found");
    if (tx.walletAddress !== walletAddress) throw new ConflictException("Wallet does not own this mint transaction.");
    if (!tx.metadataUri) throw new BadRequestException("Mint transaction has no uploaded metadata URI.");
    if (!["ASSET_UPLOADED", "TX_BUILT", "FAILED"].includes(tx.status)) throw new ConflictException(`Mint transaction cannot be built from ${tx.status}`);

    const unsignedTransaction = await this.solana.buildVaultMintTransaction({
      transactionId: tx.id,
      walletAddress: tx.walletAddress,
      collectionId: tx.collectionId,
      tokenMint: tx.tokenMint,
      amount: tx.amount.toString(),
      lockDurationDays: tx.lockDuration,
      metadataUri: tx.metadataUri,
      collectionName: tx.collection.name,
      collectionAssetAddress: tx.collection.collectionAssetAddress
    });

    return this.prisma.mintTransaction.update({
      where: { id: tx.id },
      data: {
        unsignedTransaction: this.json(unsignedTransaction),
        nftMint: unsignedTransaction.nftAssetAddress ?? tx.nftMint,
        vaultPositionPda: unsignedTransaction.vaultPositionPda ?? tx.vaultPositionPda,
        status: "TX_BUILT",
        errorCode: null,
        errorMessage: null
      }
    });
  }

  async getMintTransaction(id: string, walletAddress?: string) {
    const tx = await this.prisma.mintTransaction.findUnique({ where: { id }, include: { vaultNft: true, collection: true } });
    if (!tx) throw new NotFoundException("Mint transaction not found");
    if (tx.walletAddress !== walletAddress) throw new ConflictException("Wallet does not own this mint transaction.");
    return tx;
  }

  async submitMintTransaction(id: string, input: SubmitMintTransactionInput, walletAddress?: string) {
    const tx = await this.prisma.mintTransaction.findUnique({ where: { id }, include: { collection: { include: { token: true } }, vaultNft: true } });
    if (!tx) throw new NotFoundException("Mint transaction not found");
    if (tx.walletAddress !== walletAddress) throw new ConflictException("Wallet does not own this mint transaction.");
    if (!["TX_BUILT", "SUBMITTED", "FAILED"].includes(tx.status)) throw new ConflictException(`Mint transaction cannot be submitted from ${tx.status}`);

    const result = await this.solana.submitAndConfirm({ transactionId: id, txSignature: input.txSignature ?? undefined, signedTransaction: input.signedTransaction, confirmMock: this.mockMintEnabled() ? input.confirmMock : false });
    const mockOutputRequested = !tx.nftMint || !tx.vaultPositionPda;
    if (result.confirmed && mockOutputRequested && !this.mockMintEnabled()) {
      throw new BadRequestException("Confirmed mint cannot finalize without real nftMint/coreAssetAddress and vaultPositionPda from the built transaction.");
    }
    const finalizedNftMint = input.nftMint ?? tx.nftMint ?? (result.confirmed && this.mockMintEnabled() ? `mock_nft_${id.replace(/-/g, "").slice(0, 32)}` : undefined);
    const finalizedVaultPosition = input.vaultPositionPda ?? tx.vaultPositionPda ?? (result.confirmed && this.mockMintEnabled() ? `mock_position_${id.replace(/-/g, "").slice(0, 32)}` : undefined);
    if (result.confirmed && finalizedNftMint && finalizedVaultPosition && tx.collection.collectionAssetAddress) {
      const finalization = await this.solana.verifyMintFinalization({
        walletAddress: tx.walletAddress,
        tokenMint: tx.tokenMint,
        expectedAmount: tx.amount.toString(),
        nftAssetAddress: finalizedNftMint,
        collectionAssetAddress: tx.collection.collectionAssetAddress,
        vaultPositionPda: finalizedVaultPosition
      });
      if (!finalization.passed) {
        await this.prisma.mintTransaction.update({
          where: { id },
          data: {
            status: "FAILED",
            txSignature: result.txSignature,
            errorCode: "POST_CONFIRM_CHECK_FAILED",
            errorMessage: JSON.stringify(finalization.issues ?? finalization)
          }
        });
        throw new BadRequestException("Mint transaction confirmed but post-confirmation chain checks failed.");
      }
    }
    const updated = await this.prisma.mintTransaction.update({
      where: { id },
      data: {
        status: result.status,
        txSignature: result.txSignature,
        nftMint: finalizedNftMint,
        vaultPositionPda: finalizedVaultPosition,
        confirmedAt: result.confirmed ? new Date() : undefined
      }
    });

    if (!result.confirmed || tx.vaultNft) return updated;
    const unlocksAt = new Date(Date.now() + tx.lockDuration * 24 * 60 * 60 * 1000);
    await this.prisma.vaultNFT.create({
      data: {
        collectionId: tx.collectionId,
        tokenId: tx.collection.tokenId,
        mintTransactionId: tx.id,
        mint: updated.nftMint ?? `pending_${tx.id}`,
        metadataUri: updated.metadataUri ?? "",
        imageUri: updated.assetUri ?? "",
        positionPda: updated.vaultPositionPda ?? `pending_${tx.id}`,
        amount: tx.amount,
        lockDurationDays: tx.lockDuration,
        unlocksAt,
        tier: "Vault Raider",
        vaultType: "COMMUNITY",
        redeemable: false,
        status: "LOCKED",
        traits: this.json({ source: "mint-orchestrator", metadataUri: updated.metadataUri })
      }
    });

    return this.getMintTransaction(id, walletAddress);
  }

  private async approvedProfile(generationRunId: string, version: number) {
    const profile = await this.prisma.styleProfile.findFirst({
      where: { generationRunId, version, isApproved: true },
      include: {
        traitPack: { include: { traits: true, compatibilityRules: true } },
        qualityReports: { orderBy: { createdAt: "desc" }, take: 1 },
        distinctivenessReports: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
    if (!profile?.traitPack) throw new NotFoundException("Approved collection style profile not found");
    return profile;
  }

  private normalizeMint(input: CreateMintIntentInput): CreateMintIntentInput {
    if (!input.idempotencyKey?.trim()) throw new BadRequestException("idempotencyKey is required");
    if (!input.walletAddress?.trim()) throw new BadRequestException("walletAddress is required");
    if (!input.collectionId?.trim()) throw new BadRequestException("collectionId is required");
    if (!input.tokenMint?.trim()) throw new BadRequestException("tokenMint is required");
    const amount = input.amount?.replace(/,/g, "").trim();
    if (!amount || !/^\d+$/.test(amount) || BigInt(amount) <= 0n) throw new BadRequestException("amount must be a positive integer token amount");
    if (![0, 30, 90, 180].includes(Number(input.lockDurationDays))) throw new BadRequestException("lockDurationDays must be one of 0, 30, 90, or 180");
    return {
      idempotencyKey: input.idempotencyKey.trim(),
      walletAddress: input.walletAddress.trim(),
      collectionId: input.collectionId.trim(),
      tokenMint: input.tokenMint.trim(),
      amount,
      lockDurationDays: Number(input.lockDurationDays)
    };
  }

  private hash(value: unknown) {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
  }

  private styleFromRecord(record: any): GeneratedStyleProfile {
    return {
      collection: record.collection,
      theme: record.theme,
      mascot: record.mascot,
      artStyle: record.artStyle,
      colors: this.strings(record.colors),
      backgroundWorld: record.backgroundWorld,
      traitLanguage: this.strings(record.traitLanguage),
      rarityStructure: this.record(record.rarityStructure) as Record<string, number>,
      legendaryTheme: record.legendaryTheme,
      animationStyle: record.animationStyle,
      raidTheme: record.raidTheme,
      lore: record.lore,
      roleNames: this.strings(record.roleNames),
      brandDna: this.record(record.brandDna) as GeneratedStyleProfile["brandDna"],
      visualFingerprint: this.record(record.visualFingerprint),
      assetPackId: record.assetPackId ?? "unknown",
      artSource: record.artSource ?? "PROCEDURAL_FALLBACK",
      tenKReadiness: this.record(record.tenKReadinessReport) as GeneratedStyleProfile["tenKReadiness"]
    };
  }

  private packFromRecord(record: any): TraitPackPlan {
    return {
      collectionSize: record.collectionSize,
      categories: this.record(record.categories) as Record<string, string[]>,
      rarityWeights: this.record(record.rarityWeights) as Record<string, number>,
      unlockSchedule: this.record(record.unlockSchedule) as Record<string, string[]>,
      uniquenessRules: this.record(record.uniquenessRules) as unknown as TraitPackPlan["uniquenessRules"],
      traits: record.traits.map((trait: any) => ({
        category: trait.category,
        name: trait.name,
        rarity: trait.rarity,
        weightBps: trait.weightBps,
        unlockLevel: trait.unlockLevel,
        compatibilityTags: this.strings(trait.compatibilityTags),
        visualDescription: trait.visualDescription
      }))
    };
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private strings(value: unknown) {
    return Array.isArray(value) ? value.map(String) : [];
  }

  private record(value: unknown) {
    return (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
  }

  private mockMintEnabled() {
    return (process.env.ENABLE_MOCK_MINT ?? "true") === "true" && (process.env.APP_ENV ?? process.env.NODE_ENV ?? "development") !== "production";
  }

  private productionMintRequested() {
    return (process.env.APP_ENV ?? process.env.NODE_ENV) === "production" || process.env.ENABLE_PRODUCTION_MINT === "true";
  }
}
