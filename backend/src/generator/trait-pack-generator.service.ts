import { Injectable } from "@nestjs/common";
import type { CompatibilityRulePlan, GeneratedStyleProfile, TraitDefinitionPlan, TraitPackPlan } from "./generator.types";
import { pick, seedFrom, titleCase, unique } from "./generator.util";
import { RarityEngineService } from "./rarity-engine.service";

const categoryTargets = {
  baseCharacter: 42,
  backgrounds: 60,
  headgear: 60,
  eyes: 44,
  mouthExpression: 32,
  outfitBody: 60,
  accessories: 80,
  auraEffect: 36,
  borderFrame: 18,
  legendaryOverlay: 12
};

@Injectable()
export class TraitPackGeneratorService {
  constructor(private readonly rarity: RarityEngineService) {}

  generate(style: GeneratedStyleProfile): TraitPackPlan {
    const seed = seedFrom(`${style.collection}:${style.theme}:${style.backgroundWorld}`);
    const categories = {
      baseCharacter: this.names(style, seed, categoryTargets.baseCharacter, ["Stance", "Silhouette", "Pose", "Champion", "Warden"]),
      backgrounds: this.names(style, seed + 11, categoryTargets.backgrounds, ["Temple", "War Room", "Gate", "District", "Shrine", "Arena"]),
      headgear: this.names(style, seed + 23, categoryTargets.headgear, ["Hood", "Crown", "Helm", "Mask", "Halo", "Kabuto"]),
      eyes: this.names(style, seed + 37, categoryTargets.eyes, ["Eyes", "Visor", "Gaze", "Glare", "Scanner"]),
      mouthExpression: this.names(style, seed + 41, categoryTargets.mouthExpression, ["Grin", "Snarl", "Whisper", "Chant", "Smirk"]),
      outfitBody: this.names(style, seed + 53, categoryTargets.outfitBody, ["Cloak", "Armor", "Cape", "Jacket", "Robe", "Plate"]),
      accessories: this.names(style, seed + 67, categoryTargets.accessories, ["Staff", "Blade", "Relic", "Banner", "Orb", "Key", "Scepter"]),
      auraEffect: this.names(style, seed + 79, categoryTargets.auraEffect, ["Aura", "Mist", "Pulse", "Static", "Flame", "Glow"]),
      borderFrame: this.names(style, seed + 83, categoryTargets.borderFrame, ["Frame", "Seal", "Sigil", "Border", "Insignia"]),
      legendaryOverlay: this.names(style, seed + 97, categoryTargets.legendaryOverlay, ["Ascension", "Mythic Overlay", "One Of One", "King Scene"])
    };

    const traits = Object.entries(categories).flatMap(([category, names]) => this.definitions(category, names, style));

    return {
      collectionSize: 10_000,
      categories,
      rarityWeights: this.rarity.weights(),
      unlockSchedule: {
        level1: ["baseCharacter", "backgrounds", "headgear", "eyes", "mouthExpression", "outfitBody"],
        level2: categories.backgrounds.slice(0, 10),
        level3: categories.accessories.slice(0, 10),
        level4: categories.auraEffect.slice(0, 10),
        level5: categories.legendaryOverlay.slice(0, 5)
      },
      uniquenessRules: {
        noDuplicateFullCombinations: true,
        maxBaseUsagePct: 3,
        legendaryCapPct: 1.5,
        minBackgroundSpreadPct: 70,
        rarityMustBeVisuallyObvious: true
      },
      traits
    };
  }

  compatibilityRules(pack: TraitPackPlan): CompatibilityRulePlan[] {
    const first = (category: keyof typeof pack.categories, pattern: RegExp) =>
      pack.categories[category].find((trait) => pattern.test(trait)) ?? pack.categories[category][0];

    return [
      {
        trait: first("headgear", /Crown|Halo/),
        incompatibleWith: pack.categories.headgear.filter((trait) => /Helm|Mask|Kabuto/.test(trait)).slice(0, 8),
        reason: "Premium headgear must not overlap another full-head silhouette."
      },
      {
        trait: first("eyes", /Visor|Scanner/),
        incompatibleWith: pack.categories.eyes.filter((trait) => /Eyes|Gaze|Glare/.test(trait)).slice(0, 8),
        reason: "Eye layers cannot stack over visor hardware."
      },
      {
        trait: first("accessories", /Staff|Blade|Scepter/),
        incompatibleWith: pack.categories.mouthExpression.filter((trait) => /Whisper|Chant/.test(trait)).slice(0, 6),
        reason: "Large foreground props must not cover readable expression traits."
      },
      {
        trait: first("auraEffect", /Mist|Glow|Flame/),
        incompatibleWith: pack.categories.backgrounds.filter((trait) => /Mist|Glow|Flame/.test(trait)).slice(0, 6),
        reason: "Aura and background must keep the mascot readable."
      }
    ];
  }

  private names(style: GeneratedStyleProfile, seed: number, count: number, nouns: string[]) {
    const language = style.traitLanguage.length ? style.traitLanguage : [style.theme, style.backgroundWorld, style.mascot];
    const motifs = unique([
      ...language.flatMap((entry) => entry.split(/\s+/).filter((word) => word.length > 3)),
      ...style.backgroundWorld.split(/\s+/),
      ...style.theme.split(/\s+/)
    ]).map(titleCase);

    return Array.from({ length: count }, (_, index) => {
      const motif = pick(motifs, seed + index * 5);
      const noun = pick(nouns, seed + index * 7);
      const modifier = pick(["Ancient", "Neon", "Raid", "Mythic", "Vault", "Moon", "Toxic", "Royal", "Signal", "Cursed"], seed + index * 11);
      return `${modifier} ${motif} ${noun}`;
    });
  }

  private definitions(category: string, names: string[], style: GeneratedStyleProfile): TraitDefinitionPlan[] {
    return names.map((name, index) => {
      const rarity = this.rarity.rarityForIndex(index, names.length);
      return {
        category,
        name,
        rarity,
        weightBps: this.rarity.weightForRarity(rarity),
        unlockLevel: this.unlockLevel(category, rarity),
        compatibilityTags: this.tags(category, name),
        visualDescription: `${name} rendered in ${style.artStyle} with ${style.colors[0]} and ${style.colors[1]} accents.`
      };
    });
  }

  private unlockLevel(category: string, rarity: string) {
    if (rarity === "Legendary" || rarity === "Mythic" || category === "legendaryOverlay") return 5;
    if (category === "auraEffect") return 4;
    if (category === "accessories") return 3;
    if (category === "backgrounds") return 2;
    return 1;
  }

  private tags(category: string, name: string) {
    const tags = [category];
    if (/Crown|Helm|Hood|Mask|Halo|Kabuto/.test(name)) tags.push("head-occupies");
    if (/Visor|Scanner|Eyes|Gaze|Glare/.test(name)) tags.push("eye-occupies");
    if (/Staff|Blade|Scepter|Banner/.test(name)) tags.push("foreground-prop");
    if (/Mist|Glow|Flame|Aura|Pulse/.test(name)) tags.push("visibility-risk");
    return tags;
  }
}

