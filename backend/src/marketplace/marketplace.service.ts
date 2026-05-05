import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FeeEngineService } from "../fee-engine/fee-engine.service";
import { PrismaService } from "../db/prisma.service";
import { RiskService } from "../risk/risk.service";
import type { TokenScan } from "../types";

@Injectable()
export class MarketplaceEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fees: FeeEngineService,
    private readonly risk: RiskService
  ) {}

  async createListing(input: { vaultNftId: string; sellerUserId: string; priceSol: number; idempotencyKey?: string; walletAddress?: string }) {
    const vault = await this.prisma.vaultNFT.findUnique({ where: { id: input.vaultNftId }, include: { collection: { include: { token: true } } } });
    if (!vault) throw new NotFoundException("Vault NFT not found");
    const seller = await this.prisma.user.findUnique({ where: { id: input.sellerUserId } });
    if (!seller || seller.walletAddress !== input.walletAddress) throw new BadRequestException("Wallet does not own the seller profile.");
    if (vault.ownerUserId && vault.ownerUserId !== input.sellerUserId) throw new BadRequestException("Seller does not own this Vault NFT.");
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
    const vault = await this.prisma.vaultNFT.findUnique({ where: { id: input.vaultNftId }, include: { collection: { include: { token: true } } } });
    if (!vault) throw new NotFoundException("Vault NFT not found");
    if (vault.ownerUserId) {
      const owner = await this.prisma.user.findUnique({ where: { id: vault.ownerUserId } });
      if (owner?.walletAddress !== input.walletAddress) throw new BadRequestException("Wallet does not own this Vault NFT.");
    }
    const scan: TokenScan = {
      mint: vault.collection.token.mint,
      symbol: vault.collection.token.symbol,
      name: vault.collection.token.name,
      ageHours: vault.collection.token.ageHours,
      liquidityUsd: Number(vault.collection.token.liquidityUsd),
      marketCapUsd: Number(vault.collection.token.marketCapUsd),
      holders: vault.collection.token.holders,
      volume24hUsd: Number(vault.collection.token.volume24hUsd),
      riskScore: vault.collection.token.riskScore,
      activeVolume: Number(vault.collection.token.volume24hUsd) > 0,
      reasons: []
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
}
