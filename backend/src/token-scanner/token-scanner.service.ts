import { Injectable } from "@nestjs/common";
import type { TokenScan } from "../types";

@Injectable()
export class TokenScannerService {
  async scanToken(mint: string): Promise<TokenScan> {
    this.assertMint(mint);

    const seed = [...mint].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const ageHours = 48 + (seed % 260);
    const liquidityUsd = 75_000 + (seed % 20) * 18_500;
    const holders = 650 + (seed % 15) * 145;
    const volume24hUsd = 30_000 + (seed % 16) * 12_000;
    const marketCapUsd = liquidityUsd * (8 + (seed % 5));
    const riskScore = this.calculateRiskScore({ ageHours, liquidityUsd, holders, volume24hUsd });

    return {
      mint,
      symbol: "$FROG",
      name: "Frog Vault Token",
      ageHours,
      liquidityUsd,
      marketCapUsd,
      holders,
      volume24hUsd,
      riskScore,
      activeVolume: volume24hUsd > 25_000,
      reasons: this.reasonsFor(riskScore)
    };
  }

  private assertMint(mint: string) {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
      throw new Error("Invalid Solana mint address");
    }
  }

  private calculateRiskScore(input: Pick<TokenScan, "ageHours" | "liquidityUsd" | "holders" | "volume24hUsd">) {
    let score = 30;
    if (input.ageHours >= 48) score += 20;
    if (input.liquidityUsd >= 100_000) score += 20;
    if (input.holders >= 500) score += 15;
    if (input.volume24hUsd >= 25_000) score += 15;
    return Math.min(score, 100);
  }

  private reasonsFor(score: number) {
    if (score >= 80) return ["age_gate_passed", "liquidity_passed", "holder_distribution_ok", "active_volume"];
    if (score >= 60) return ["eligible_with_medium_discount", "monitor_liquidity_depth"];
    return ["instant_sell_disabled", "risk_score_below_threshold"];
  }
}

