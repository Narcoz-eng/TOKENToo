import { Injectable } from "@nestjs/common";
import { FeeEngineService } from "../fee-engine/fee-engine.service";
import { RiskService } from "../risk/risk.service";
import type { TokenScan } from "../types";

@Injectable()
export class MarketplaceEngineService {
  constructor(
    private readonly fees: FeeEngineService,
    private readonly risk: RiskService
  ) {}

  createListing(vaultNftId: string, sellerUserId: string, priceSol: number) {
    return {
      vaultNftId,
      sellerUserId,
      priceSol,
      fee: this.fees.quote(priceSol, "marketplace")
    };
  }

  floorPrice(prices: number[]) {
    return prices.length ? Math.min(...prices) : 0;
  }

  backingValue(tokenPriceSol: number, amountUi: number) {
    return Math.round(tokenPriceSol * amountUi * 1_000_000_000) / 1_000_000_000;
  }

  instantSellQuote(scan: TokenScan, backingValueSol: number, emergencyFlag = false) {
    return this.risk.quoteInstantSell(scan, backingValueSol, emergencyFlag);
  }
}

