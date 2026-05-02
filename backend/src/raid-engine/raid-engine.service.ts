import { Injectable } from "@nestjs/common";
import type { RaidScoreInput } from "../types";

@Injectable()
export class RaidEngineService {
  createRaidRoom(collectionId: string, name: string) {
    return {
      collectionId,
      name,
      status: "DRAFT",
      antiAbuseRules: {
        dailyXpCap: 800,
        minimumWalletAgeHours: 24,
        minimumHoldingHours: 6,
        washTradeRewards: false,
        scoreByValue: true
      }
    };
  }

  scoreMission(input: RaidScoreInput) {
    if (input.walletAgeHours < 24) return { xp: 0, blocked: true, reason: "wallet_age" };
    if (input.holdingHours < 6) return { xp: 0, blocked: true, reason: "holding_time" };
    if (input.possibleWashTrade) return { xp: 0, blocked: true, reason: "wash_trade" };

    const valueScore = Math.min(400, Math.round(input.notionalValueUsd / 25));
    const activityScore = Math.min(200, input.actionsToday * 25);
    const xp = Math.min(800, valueScore + activityScore);
    return { xp, blocked: false };
  }
}

