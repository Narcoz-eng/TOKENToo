import { Injectable } from "@nestjs/common";

export const rarityWeights = {
  Common: 5500,
  Uncommon: 2500,
  Rare: 1200,
  Epic: 600,
  Legendary: 150,
  Mythic: 50
};

@Injectable()
export class RarityEngineService {
  weights() {
    return rarityWeights;
  }

  rarityForIndex(index: number, total: number) {
    const ratio = index / Math.max(1, total - 1);
    if (ratio > 0.995) return "Mythic";
    if (ratio > 0.98) return "Legendary";
    if (ratio > 0.92) return "Epic";
    if (ratio > 0.78) return "Rare";
    if (ratio > 0.55) return "Uncommon";
    return "Common";
  }

  weightForRarity(rarity: string) {
    if (rarity === "Mythic") return 50;
    if (rarity === "Legendary") return 150;
    if (rarity === "Epic") return 600;
    if (rarity === "Rare") return 1200;
    if (rarity === "Uncommon") return 2500;
    return 5500;
  }
}

