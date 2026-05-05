import { Body, Controller, Post } from "@nestjs/common";
import { MarketplaceEngineService } from "./marketplace.service";

@Controller("marketplace")
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceEngineService) {}

  @Post("value-comparison")
  valueComparison(@Body() body: { priceSol: number; backingValueSol: number }) {
    return this.marketplace.valueComparison(Number(body.priceSol), Number(body.backingValueSol));
  }

  @Post("listings")
  createListing(@Body() body: { vaultNftId: string; sellerUserId: string; priceSol: number; idempotencyKey?: string; walletAddress?: string }) {
    return this.marketplace.createListing({ ...body, priceSol: Number(body.priceSol) });
  }

  @Post("instant-sell/quotes")
  instantSellQuote(@Body() body: { vaultNftId: string; walletAddress: string; backingValueSol: number }) {
    return this.marketplace.persistInstantSellQuote({ ...body, backingValueSol: Number(body.backingValueSol) });
  }
}
