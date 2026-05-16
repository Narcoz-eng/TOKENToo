import { BadRequestException, Inject, Injectable, NotFoundException, NotImplementedException } from "@nestjs/common";
import { FeeEngineService } from "../fee-engine/fee-engine.service";
import { ProtocolService } from "../protocol/protocol.service";
import { PrismaService } from "../db/prisma.service";
import { RiskService } from "../risk/risk.service";
import type { TokenScan } from "../types";

@Injectable()
export class MarketplaceEngineService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FeeEngineService) private readonly fees: FeeEngineService,
    @Inject(RiskService) private readonly risk: RiskService,
    @Inject(ProtocolService) private readonly protocol: ProtocolService
  ) {}

  async createListing(input: { vaultNftId: string; sellerUserId: string; priceSol: number; idempotencyKey?: string; walletAddress?: string }) {
    const vault = await this.prisma.vaultNFT.findUnique({ where: { id: input.vaultNftId }, include: { owner: true, collection: { include: { token: true } } } });
    if (!vault) throw new NotFoundException("Vault NFT not found");
    const seller = await this.prisma.user.findUnique({ where: { id: input.sellerUserId } });
    if (!seller || seller.walletAddress !== input.walletAddress) throw new BadRequestException("Wallet does not own the seller profile.");
    const ownership = await this.protocol.assertCurrentOwner({ nft: vault, walletAddress: input.walletAddress ?? seller.walletAddress });
    if (!ownership.verificationAvailable && vault.ownerUserId && vault.ownerUserId !== input.sellerUserId) throw new BadRequestException("Seller does not own this Vault NFT.");
    if (vault.status === "REDEEMED") throw new BadRequestException("Redeemed Vault NFTs cannot be listed.");
    if (input.priceSol <= 0) throw new BadRequestException("priceSol must be positive");

    const backingValueSol = this.estimateBackingValue(vault.amount.toString(), vault.collection.floorPriceSol.toString());
    const premiumBps = this.premiumBps(input.priceSol, backingValueSol);
    const listing = await this.prisma.listing.create({
      data: {
        vaultNftId: input.vaultNftId,
        sellerUserId: input.sellerUserId,
        collectionId: vault.collectionId,
        priceSol: input.priceSol,
        backingValueSol,
        premiumBps,
        riskTier: this.riskTier(vault.collection.token.riskScore),
        unlocksAtSnapshot: vault.unlocksAt
      }
    });

    if (input.idempotencyKey && input.walletAddress) {
      await this.prisma.listingTransaction.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          requestHash: `${input.vaultNftId}:${input.priceSol}`,
          walletAddress: input.walletAddress,
          listingId: listing.id,
          vaultNftId: input.vaultNftId,
          status: "PENDING"
        }
      });
    }

    return {
      ...listing,
      fee: this.fees.quote(input.priceSol, "marketplace"),
      valueComparison: this.valueComparison(input.priceSol, backingValueSol)
    };
  }

  floorPrice(prices: number[]) {
    return prices.length ? Math.min(...prices) : 0;
  }

  backingValue(tokenPriceSol: number, amountUi: number) {
    return Math.round(tokenPriceSol * amountUi * 1_000_000_000) / 1_000_000_000;
  }

  valueComparison(priceSol: number, backingValueSol: number) {
    const premiumBps = this.premiumBps(priceSol, backingValueSol);
    return {
      priceSol,
      backingValueSol,
      premiumBps,
      premiumPct: Math.round(premiumBps / 100),
      indicator: premiumBps > 2500 ? "HIGH_PREMIUM" : premiumBps >= 0 ? "PREMIUM" : "DISCOUNT"
    };
  }

  instantSellQuote(scan: TokenScan, backingValueSol: number, emergencyFlag = false) {
    return this.risk.quoteInstantSell(scan, backingValueSol, emergencyFlag);
  }

  async persistInstantSellQuote(input: { vaultNftId: string; walletAddress: string; backingValueSol: number }) {
    const vault = await this.prisma.vaultNFT.findUnique({ where: { id: input.vaultNftId }, include: { owner: true, collection: { include: { token: true } } } });
    if (!vault) throw new NotFoundException("Vault NFT not found");
    const ownership = await this.protocol.assertCurrentOwner({ nft: vault, walletAddress: input.walletAddress });
    if (!ownership.verificationAvailable && vault.ownerUserId) {
      const owner = await this.prisma.user.findUnique({ where: { id: vault.ownerUserId } });
      if (owner?.walletAddress !== input.walletAddress) throw new BadRequestException("Wallet does not own this Vault NFT.");
    }
    const scan: TokenScan = {
      mint: vault.collection.token.mint,
      symbol: vault.collection.token.symbol,
      name: vault.collection.token.name,
      decimals: vault.collection.token.decimals,
      metadataUri: vault.collection.token.metadataUri ?? undefined,
      imageUri: vault.collection.token.imageUri ?? undefined,
      provider: "helius",
      indexed: true,
      riskNotes: ["market_data_loaded_from_persisted_token_record"],
      ageHours: vault.collection.token.ageHours,
      liquidityUsd: Number(vault.collection.token.liquidityUsd),
      marketCapUsd: Number(vault.collection.token.marketCapUsd),
      holders: vault.collection.token.holders,
      volume24hUsd: Number(vault.collection.token.volume24hUsd),
      riskScore: vault.collection.token.riskScore,
      activeVolume: Number(vault.collection.token.volume24hUsd) > 0,
      reasons: ["market_data_loaded_from_persisted_token_record"]
    };
    const quote = this.instantSellQuote(scan, input.backingValueSol, vault.collection.emergencyFlag);
    if (!quote.enabled) throw new BadRequestException(quote.reason ?? "Instant sell is disabled for this collection");

    return this.prisma.instantSellQuote.create({
      data: {
        collectionId: vault.collectionId,
        vaultNftId: vault.id,
        walletAddress: input.walletAddress,
        backingValueSol: input.backingValueSol,
        discountBps: quote.discountBps,
        quoteSol: quote.quoteSol,
        riskScore: vault.collection.token.riskScore,
        riskTier: this.riskTier(vault.collection.token.riskScore),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });
  }

  async refreshOwnerSnapshots(input: { walletAddress: string; limit?: number }) {
    if (!this.isAdmin(input.walletAddress)) throw new BadRequestException("Marketplace owner refresh requires a protocol admin wallet.");
    const listings = await this.prisma.listing.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(input.limit ?? 50, 1), 200),
      include: {
        seller: true,
        vaultNft: { include: { owner: true, collection: { include: { token: true } } } }
      }
    });
    const refreshed = [];
    for (const listing of listings) {
      const proof = await this.protocol.refreshOwnerSnapshot(listing.vaultNft, listing.seller.walletAddress);
      const staleSeller = proof.verificationAvailable && proof.currentOwner && proof.currentOwner !== listing.seller.walletAddress;
      if (staleSeller) {
        await this.prisma.listing.update({ where: { id: listing.id }, data: { status: "CANCELLED" } });
      }
      refreshed.push({
        listingId: listing.id,
        vaultNftId: listing.vaultNftId,
        sellerWallet: listing.seller.walletAddress,
        currentOwner: proof.currentOwner,
        verificationAvailable: proof.verificationAvailable,
        collectionMatches: proof.collectionMatches,
        staleSeller,
        listingStatus: staleSeller ? "CANCELLED" : listing.status,
        issues: proof.issues
      });
    }
    return {
      ok: true,
      checked: refreshed.length,
      cancelled: refreshed.filter((item) => item.staleSeller).length,
      refreshed
    };
  }

  createPurchaseIntent(input: { listingId: string; walletAddress: string; idempotencyKey?: string }): never {
    throw new NotImplementedException({
      code: "ACTION_NOT_IMPLEMENTED",
      action: "PURCHASE_LISTING",
      message: "PURCHASE_LISTING is not implemented on the backend yet.",
      nextStep: "Wire listing purchase escrow/transfer orchestration before enabling production success states.",
      listingId: input.listingId,
      walletAddress: input.walletAddress,
      idempotencyKey: input.idempotencyKey
    });
  }

  private estimateBackingValue(amount: string, floorPriceSol: string) {
    const tokenAmount = Number(amount) / 1_000_000;
    const proxyPrice = Number(floorPriceSol) || 0.000001;
    return Math.round(tokenAmount * proxyPrice * 1_000_000_000) / 1_000_000_000;
  }

  private premiumBps(priceSol: number, backingValueSol: number) {
    if (!backingValueSol) return 0;
    return Math.round(((priceSol - backingValueSol) / backingValueSol) * 10_000);
  }

  private riskTier(score: number) {
    if (score >= 75) return "SAFE";
    if (score >= 60) return "MEDIUM";
    return "HIGH_RISK";
  }

  private isAdmin(walletAddress: string) {
    return new Set((process.env.PROTOCOL_ADMIN_WALLETS ?? process.env.ADMIN_WALLETS ?? "").split(/[,\s]+/).filter(Boolean)).has(walletAddress);
  }
}
