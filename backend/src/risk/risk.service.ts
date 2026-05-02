import { Injectable } from "@nestjs/common";
import type { InstantSellQuote, TokenScan } from "../types";

@Injectable()
export class RiskService {
  canInstantSell(scan: TokenScan, emergencyFlag = false) {
    return scan.ageHours >= 48 && scan.liquidityUsd >= 100_000 && scan.riskScore >= 60 && scan.activeVolume && !emergencyFlag;
  }

  quoteInstantSell(scan: TokenScan, backingValueSol: number, emergencyFlag = false): InstantSellQuote {
    if (!this.canInstantSell(scan, emergencyFlag)) {
      return {
        enabled: false,
        backingValueSol,
        discountBps: 0,
        quoteSol: 0,
        reason: emergencyFlag ? "emergency_flag" : "risk_gate_failed"
      };
    }

    const discountBps = scan.riskScore >= 80 ? 500 : 1200;
    return {
      enabled: true,
      backingValueSol,
      discountBps,
      quoteSol: Math.round(backingValueSol * (1 - discountBps / 10_000) * 1_000_000_000) / 1_000_000_000
    };
  }
}

