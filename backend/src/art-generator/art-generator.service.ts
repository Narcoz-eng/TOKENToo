import { Injectable } from "@nestjs/common";
import type { BaseCharacterVariant, CommunityProfile, GeneratedArt, MicroRandomization } from "../types";

@Injectable()
export class ArtGeneratorService {
  async generateVaultArt(profile: CommunityProfile, positionId: string): Promise<GeneratedArt> {
    const seed = this.seed(`${profile.symbol}:${positionId}`);
    const baseVariant = this.baseVariants(profile)[seed % 32];
    const microRandomization = this.microRandomization(seed);
    const layers = [
      profile.traitLayers.background[0],
      baseVariant.name,
      this.pick(profile.traitLayers.headgear, seed + 1),
      this.pick(profile.traitLayers.eyes, seed + 2),
      this.pick(profile.traitLayers.aura, seed + 3),
      this.pick(profile.traitLayers.accessory, seed + 4)
    ];
    const uniquenessHash = this.uniquenessHash(profile.symbol, baseVariant.id, layers, microRandomization);
    const animated = baseVariant.rarityBias === "legendary" || layers.some((layer) => /pulse|mythic|legendary|static/i.test(layer));

    return {
      imageUri: `ipfs://vaultx/${profile.symbol.toLowerCase().replace("$", "")}/${positionId}.png`,
      metadataUri: `ipfs://vaultx/${profile.symbol.toLowerCase().replace("$", "")}/${positionId}.json`,
      layers,
      baseVariant,
      microRandomization,
      uniquenessHash,
      animated
    };
  }

  async uploadMetadata(metadata: Record<string, unknown>) {
    const symbol = String(metadata.symbol ?? "vaultx").toLowerCase().replace("$", "");
    return `arweave://vaultx/${symbol}/${Date.now()}.json`;
  }

  createGenerationPlan(profile: CommunityProfile, collectionSize = 10_000) {
    const baseVariants = this.baseVariants(profile);
    const forcedUniqueCombinations = Math.min(collectionSize, baseVariants.length * profile.traitLayers.headgear.length * profile.traitLayers.eyes.length * profile.traitLayers.aura.length);

    return {
      styleProfile: profile.styleProfile,
      baseVariantCount: baseVariants.length,
      baseVariants,
      traitLayers: profile.traitLayers,
      rarityWeights: profile.rarityTable,
      uniqueness: {
        forcedUniqueCombinations,
        collisionPolicy: "reject-and-reroll",
        uniquenessKey: ["baseVariant", "headgear", "eyes", "aura", "accessory", "background"]
      },
      microRandomization: {
        offsetX: "[-10, 10]px",
        offsetY: "[-8, 8]px",
        rotation: "[-5, 5]deg",
        scale: "[0.94, 1.06]",
        hueShift: "[-10, 10]deg",
        noiseOpacity: "[0.04, 0.14]"
      },
      rareAnimationRules: ["glow pulse", "particle movement", "animated aura shimmer"]
    };
  }

  private baseVariants(profile: CommunityProfile): BaseCharacterVariant[] {
    const poses = ["front stance", "three-quarter turn", "battle lean", "crouched guard", "banner pose", "artifact hold", "side profile", "boss stare"];
    const biases: BaseCharacterVariant["rarityBias"][] = ["common", "common", "uncommon", "rare", "epic", "legendary"];

    return Array.from({ length: 32 }, (_, index) => ({
      id: `${profile.symbol.replace("$", "").toLowerCase()}-base-${index + 1}`,
      name: `${profile.styleProfile.mascotType} ${profile.styleProfile.shapeLanguage} base ${index + 1}`,
      silhouette: `${profile.styleProfile.shapeLanguage} ${profile.styleProfile.mascotType} silhouette with ${profile.styleProfile.visualFx[index % profile.styleProfile.visualFx.length]}`,
      pose: poses[index % poses.length],
      rarityBias: biases[index % biases.length]
    }));
  }

  private microRandomization(seed: number): MicroRandomization {
    return {
      offsetX: (seed % 21) - 10,
      offsetY: (Math.floor(seed / 3) % 17) - 8,
      rotationDeg: ((seed % 101) / 10) - 5,
      scale: Math.round((0.94 + ((seed % 13) / 100)) * 100) / 100,
      hueShiftDeg: (Math.floor(seed / 5) % 21) - 10,
      noiseOpacity: Math.round((0.04 + ((seed % 10) / 100)) * 100) / 100
    };
  }

  private pick(items: string[], seed: number) {
    return items[seed % items.length];
  }

  private seed(value: string) {
    return [...value].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
  }

  private uniquenessHash(symbol: string, baseId: string, layers: string[], micro: MicroRandomization) {
    return this.seed(`${symbol}:${baseId}:${layers.join("|")}:${JSON.stringify(micro)}`).toString(16);
  }
}
