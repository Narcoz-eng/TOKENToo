import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { WalletAddress } from "../auth/wallet-address.decorator";
import { WalletAuthGuard } from "../auth/wallet-auth.guard";
import { MarketplaceEngineService } from "./marketplace.service";

const listingSchema = z.object({
  vaultNftId: z.string().min(1),
  sellerUserId: z.string().min(1),
  priceSol: z.number().positive(),
  idempotencyKey: z.string().optional()
});

const quoteSchema = z.object({
  vaultNftId: z.string().min(1),
  backingValueSol: z.number().positive()
});

const purchaseSchema = z.object({
  listingId: z.string().min(1),
  idempotencyKey: z.string().optional()
});

@Controller("marketplace")
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceEngineService) {}

  @Post("value-comparison")
  valueComparison(@Body() body: { priceSol: number; backingValueSol: number }) {
    return this.marketplace.valueComparison(Number(body.priceSol), Number(body.backingValueSol));
  }

  @Post("listings")
  @UseGuards(WalletAuthGuard)
  createListing(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.marketplace.createListing({ ...listingSchema.parse(body), walletAddress });
  }

  @Post("instant-sell/quotes")
  @UseGuards(WalletAuthGuard)
  instantSellQuote(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.marketplace.persistInstantSellQuote({ ...quoteSchema.parse(body), walletAddress });
  }

  @Post("purchases/intents")
  @UseGuards(WalletAuthGuard)
  createPurchaseIntent(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.marketplace.createPurchaseIntent({ ...purchaseSchema.parse(body), walletAddress });
  }
}
