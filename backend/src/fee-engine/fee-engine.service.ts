import { Injectable } from "@nestjs/common";
import type { FeeQuote } from "../types";

const feeBps = {
  marketplace: 250,
  mintVault: 150,
  redeem: 100,
  instantSellLow: 500,
  instantSellMedium: 1200
};

const split = [
  { destination: "raidRewards" as const, bps: 3000 },
  { destination: "buybackBacking" as const, bps: 3000 },
  { destination: "liquidityReserve" as const, bps: 1500 },
  { destination: "protocolTreasury" as const, bps: 1000 },
  { destination: "creatorCommunity" as const, bps: 1000 },
  { destination: "safetyReserve" as const, bps: 500 }
];

@Injectable()
export class FeeEngineService {
  quote(grossSol: number, type: keyof typeof feeBps): FeeQuote {
    const blendedFeeBps = feeBps[type];
    const totalFeeSol = this.round(grossSol * (blendedFeeBps / 10_000));

    return {
      grossSol,
      totalFeeSol,
      blendedFeeBps,
      allocations: split.map((item) => ({
        ...item,
        sol: this.round(totalFeeSol * (item.bps / 10_000))
      }))
    };
  }

  raidPoolFromVolume(volumeSol: number, blendedFeeBps = 400) {
    return this.round(volumeSol * (blendedFeeBps / 10_000) * 0.35);
  }

  private round(value: number) {
    return Math.round(value * 1_000_000_000) / 1_000_000_000;
  }
}
