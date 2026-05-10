import { Inject, Injectable } from "@nestjs/common";
import type { CompatibilityRulePlan, GeneratedStyleProfile, TraitDefinitionPlan, TraitPackPlan, TraitCategoryPlan, TraitCategoryRole } from "./generator.types";
import { pick, seedFrom, titleCase, unique } from "./generator.util";
import { RarityEngineService } from "./rarity-engine.service";
import { artTeamForStyle } from "./art-team-engine";

@Injectable()
export class TraitPackGeneratorService {
  constructor(@Inject(RarityEngineService) private readonly rarity: RarityEngineService) {}

  generate(style: GeneratedStyleProfile): TraitPackPlan {
    const seed = seedFrom(`${style.collection}:${style.theme}:${style.backgroundWorld}`);
    const taxonomy = style.creativeUniverse?.taxonomy ?? this.fallbackTaxonomy(style);
    const artTeam = artTeamForStyle(style);
    const categories = Object.fromEntries(
      taxonomy.map((category, index) => {
        const base = category.role === "base" ? style.brandDna.baseArchetypes : [];
        const native = artTeam.nativeTraitCatalog[category.role] ?? [];
        return [category.id, unique([...native, ...base, ...this.names(style, category, seed + index * 113)]).slice(0, Math.max(category.targetCount, native.length))];
      })
    );
    const categoryRoles = Object.fromEntries(taxonomy.map((category) => [category.role, category.id])) as Record<TraitCategoryRole, string>;
    const categoryLabels = Object.fromEntries(taxonomy.map((category) => [category.id, category.label]));

    const traits = Object.entries(categories).flatMap(([category, names]) => this.definitions(category, names, style));

    return {
      collectionSize: 10_000,
      categories,
      categoryRoles,
      categoryLabels,
      rarityWeights: this.rarity.weights(),
      unlockSchedule: {
        level1: ["base", "background", "head", "eyes", "mouth", "body"].map((role) => categoryRoles[role as TraitCategoryRole]).filter(Boolean),
        level2: this.values(categories, categoryRoles.background).slice(0, 10),
        level3: this.values(categories, categoryRoles.prop).slice(0, 10),
        level4: [...this.values(categories, categoryRoles.aura).slice(0, 8), ...this.values(categories, categoryRoles.neck).slice(0, 4)],
        level5: [...this.values(categories, categoryRoles.legendary).slice(0, 5), ...this.values(categories, categoryRoles.animation).slice(0, 3)]
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
    const roleValues = (role: TraitCategoryRole) => pack.categories[pack.categoryRoles?.[role] ?? ""] ?? [];
    const first = (role: TraitCategoryRole, pattern: RegExp) => roleValues(role).find((trait) => pattern.test(trait)) ?? roleValues(role)[0] ?? role;

    return [
      {
        trait: first("head", /Crown|Halo|Mask|Shell|Hood|Visor|Toppers|Crowns|Signs/i),
        incompatibleWith: roleValues("head").filter((trait) => /Helm|Mask|Kabuto|Shell|Hood|Crown|Horn/i.test(trait)).slice(0, 8),
        reason: "Head silhouette layers must not overlap another full-head identity mark."
      },
      {
        trait: first("eyes", /Visor|Screen|Eyes|Socket|Gaze|Stare|Optics/i),
        incompatibleWith: roleValues("eyes").filter((trait) => /Eyes|Gaze|Glare|Screen|Socket|Optics|Blink/i.test(trait)).slice(0, 8),
        reason: "Eye layers cannot stack over visor hardware."
      },
      {
        trait: first("prop", /Staff|Blade|Scepter|Banner|Cup|Phone|Cable|Scroll|Relic/i),
        incompatibleWith: roleValues("mouth").filter((trait) => /Whisper|Chant|Mouth|Smile|Grin|Gasp|Scream|Bark|Croak/i.test(trait)).slice(0, 6),
        reason: "Large foreground props must not cover readable expression traits."
      },
      {
        trait: first("aura", /Mist|Glow|Flame|Static|Rain|Smoke|FX|Spark|Weather/i),
        incompatibleWith: roleValues("background").filter((trait) => /Mist|Glow|Flame|Static|Rain|Smoke|Spark|Weather/i.test(trait)).slice(0, 6),
        reason: "FX/weather layers and background must keep the mascot readable."
      }
    ].filter((rule) => rule.trait);
  }

  private names(style: GeneratedStyleProfile, category: TraitCategoryPlan, seed: number) {
    const language = style.traitLanguage.length ? style.traitLanguage : [style.theme, style.backgroundWorld, style.mascot];
    const sourceLanguage = [
      ...style.brandDna.memeLanguage,
      ...style.brandDna.roleLanguage,
      style.brandDna.backgroundWorld,
      style.brandDna.mascotSilhouette
    ];
    const motifs = unique([
      ...language.flatMap((entry) => entry.split(/\s+/).filter((word) => word.length > 3)),
      ...sourceLanguage.flatMap((entry) => entry.split(/\s+/).filter((word) => word.length > 3)),
      ...style.backgroundWorld.split(/\s+/),
      ...style.theme.split(/\s+/)
    ]).filter((word) => !/^(neon|cyber|ancient|mythic|royal|toxic|green|gold|blue)$/i.test(word)).map(titleCase);
    const modifiers = unique([
      ...style.brandDna.memeLanguage.slice(0, 8).map(titleCase),
      ...style.brandDna.roleLanguage.slice(0, 4).map((role) => titleCase(role.split(/\s+/)[0] ?? role)),
      ...style.brandDna.backgroundWorld.split(/\s+/).filter((word) => word.length > 4).map(titleCase),
      "Origin",
      "Holder",
      "Signal",
      "Liquidity",
      "Raid"
    ]);

    const forbidden = new RegExp(category.forbiddenConcepts.length ? category.forbiddenConcepts.join("|") : "$.^", "i");
    return Array.from({ length: category.targetCount }, (_, index) => {
      const motif = pick(motifs, seed + index * 5);
      const noun = pick(category.nouns, seed + index * 7);
      const modifier = pick(modifiers, seed + index * 11);
      const name = `${modifier} ${motif} ${noun}`;
      return forbidden.test(name) ? `${modifier} ${motif} ${category.label}` : name;
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
        visualDescription: `${name} rendered in ${style.artStyle}; it belongs to ${style.brandDna.traitTaxonomy.find((item) => item.id === category)?.label ?? category}, must remain readable inside the ${style.brandDna.backgroundWorld} world, and must follow ${style.brandDna.mascotSilhouette} silhouette rules.`
      };
    });
  }

  private unlockLevel(category: string, rarity: string) {
    if (rarity === "Legendary" || rarity === "Mythic" || /legendary|scene|prophecy|moment|takeover|incident/i.test(category)) return 5;
    if (/aura|mist|glow|fx|weather|curse|volatility/i.test(category)) return 4;
    if (/neck|collar|charm|badge|token|tag/i.test(category)) return 4;
    if (/animation|loop/i.test(category)) return 5;
    if (/prop|object|relic|comfort|desk|claw/i.test(category)) return 3;
    if (/background|world|room|screen|weather|location/i.test(category)) return 2;
    return 1;
  }

  private tags(category: string, name: string) {
    const tags = [category];
    if (/Crown|Helm|Hood|Mask|Halo|Kabuto|Shell|Horn|Cap|Hat|Toppers/.test(name)) tags.push("head-occupies");
    if (/Visor|Scanner|Eyes|Gaze|Glare|Socket|Screen|Optic|Blink|Stare/.test(name)) tags.push("eye-occupies");
    if (/Staff|Blade|Scepter|Banner|Cup|Phone|Cable|Scroll|Relic|Token|Wand/.test(name)) tags.push("foreground-prop");
    if (/Mist|Glow|Flame|Aura|Pulse|Static|Rain|Smoke|Spark|Weather/.test(name)) tags.push("visibility-risk");
    return tags;
  }

  private values(categories: Record<string, string[]>, category?: string) {
    return category ? categories[category] ?? [] : [];
  }

  private fallbackTaxonomy(style: GeneratedStyleProfile): TraitCategoryPlan[] {
    const id = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const build = (role: TraitCategoryRole, label: string, targetCount: number, nouns: string[]): TraitCategoryPlan => ({
      id: id(label),
      label,
      role,
      targetCount,
      nouns,
      description: `${label} for ${style.collection}`,
      forbiddenConcepts: []
    });
    return [
      build("base", "Community Bases", 42, ["Base", "Pose", "Silhouette"]),
      build("background", "Community Worlds", 60, ["Room", "Gate", "Scene"]),
      build("head", "Head Marks", 30, ["Cap", "Mark"]),
      build("eyes", "Eye States", 36, ["Eyes", "Gaze"]),
      build("mouth", "Reactions", 28, ["Smile", "Gasp"]),
      build("body", "Fits", 44, ["Jacket", "Wrap"]),
      build("prop", "Objects", 70, ["Prop", "Banner"]),
      build("neck", "Charms", 24, ["Tag", "Charm"]),
      build("aura", "Events", 24, ["Glow", "Spark"]),
      build("frame", "Borders", 12, ["Frame", "Seal"]),
      build("legendary", "Scenes", 10, ["Scene", "Moment"]),
      build("animation", "Loops", 10, ["Blink", "Pulse"])
    ];
  }
}
