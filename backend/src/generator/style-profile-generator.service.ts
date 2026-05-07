import { Injectable } from "@nestjs/common";
import { getPreset } from "./art-presets";
import { selectAssetPack } from "./curated-asset-packs";
import type { CommunityContextOutput, CreateGenerationRunInput, GeneratedStyleProfile, LogoAnalysisOutput } from "./generator.types";
import { pick, seedFrom, titleCase, unique } from "./generator.util";
import { RarityEngineService } from "./rarity-engine.service";

@Injectable()
export class StyleProfileGeneratorService {
  constructor(private readonly rarity: RarityEngineService) {}

  generate(input: CreateGenerationRunInput, analysis: LogoAnalysisOutput, context: CommunityContextOutput, version = 1): GeneratedStyleProfile {
    const preset = getPreset(input.selectedPreset);
    const seed = seedFrom(`${input.tokenMint}:${input.tokenSymbol}:${version}:${context.extractedVocabulary.join("|")}`);
    const motif = titleCase(pick(context.extractedVocabulary, seed));
    const world = input.hints?.themePreference?.trim() || pick(preset.backgroundWorlds, seed + 2);
    const assetPack = selectAssetPack(analysis.mascot, [...context.extractedVocabulary, ...context.traitSeeds, world]);
    const mascot = `${analysis.mascot} ${pick(["warden", "prophet", "raider", "champion", "founder", "boss"], seed + 4)}`;
    const theme = `${motif} ${pick(["vault raiders", "guild", "cult", "kingdom", "syndicate", "warband"], seed + 6)}`;
    const roleNames = unique([...context.roleNames, `${motif} Legend`, `${titleCase(analysis.mascot)} Captain`]).slice(0, 8);
    const traitLanguage = unique([
      ...context.traitSeeds,
      ...preset.traitNouns,
      ...context.backgroundNames,
      `${motif} Aura`,
      `${motif} Raid Crown`,
      `${titleCase(analysis.mascot)} Relic`
    ]).slice(0, 24);

    const lore = this.lore(input, analysis, context, theme, world);
    const tenKReadiness = this.tenKReadiness(input, analysis);
    const colorSystem = this.collectionColorSystem(analysis.palette, input.hints?.colorPreference);
    const brandDna = {
      tokenSymbol: input.tokenSymbol,
      tokenName: input.tokenName,
      mintAddress: input.tokenMint,
      logoPalette: analysis.palette,
      logoDerivedColors: analysis.palette,
      colorSystem,
      mascotArchetype: analysis.mascot,
      memeLanguage: unique([...context.memes, ...context.phrases, ...context.slogans, ...context.extractedVocabulary]).slice(0, 24),
      lore,
      visualWorld: world,
      shapeLanguage: analysis.shapeLanguage,
      compositionRules: assetPack.compositionRules,
      traitNamingRules: [
        "Use token/community language in every visible trait.",
        "Avoid plain color/object labels.",
        "Rarity must be readable from silhouette, glow, or composition."
      ],
      typographyDirection: assetPack.typographyDirection,
      raidLanguage: context.raidNames,
      roleLanguage: roleNames,
      legendaryDirection: preset.legendaryDirection,
      forbiddenSimilarities: assetPack.forbiddenCombinations.map((item) => `${item.trait}: ${item.incompatibleWith.join(", ")}`),
      sourceMetadataSummary: {
        logoUri: input.logoUri,
        hasLogoData: Boolean(input.logoData),
        description: input.description,
        selectedPreset: input.selectedPreset,
        creatorHints: input.hints ?? {}
      }
    };

    return {
      collection: `${input.tokenSymbol} Vaults`,
      theme,
      mascot,
      artStyle: preset.artStyle,
      colors: analysis.palette,
      backgroundWorld: world,
      traitLanguage,
      rarityStructure: this.rarity.weights(),
      legendaryTheme: `${preset.legendaryDirection}: ${motif} ${titleCase(analysis.mascot)} Ascendant`,
      animationStyle: preset.animationDirection,
      raidTheme: pick(context.raidNames, seed + 8),
      lore,
      roleNames,
      brandDna,
      visualFingerprint: {
        mascotArchetype: analysis.mascot,
        silhouetteFamily: analysis.shapeLanguage,
        palette: colorSystem,
        backgroundWorld: world,
        traitVocabulary: traitLanguage,
        compositionType: assetPack.compositionRules,
        typographyDirection: assetPack.typographyDirection,
        loreMemeLanguage: brandDna.memeLanguage,
        legendaryDirection: preset.legendaryDirection
      },
      assetPackId: assetPack.id,
      artSource: "PROCEDURAL_FALLBACK",
      tenKReadiness
    };
  }

  private lore(input: CreateGenerationRunInput, analysis: LogoAnalysisOutput, context: CommunityContextOutput, theme: string, world: string) {
    if (context.lore) return context.lore;
    const slogan = context.slogans[0] ? ` Their chant is "${context.slogans[0]}."` : "";
    return `${input.tokenSymbol} holders formed the ${theme} inside ${world}. The ${analysis.mascot} identity is built from ${analysis.visualKeywords.slice(0, 4).join(", ")} and rewards members who lock, raid, and grow the faction.${slogan}`;
  }

  private tenKReadiness(input: CreateGenerationRunInput, analysis: LogoAnalysisOutput) {
    return {
      possibleUniqueCombinations: "30*40*40*30*20*40*40*20*10*5+",
      expectedDuplicateRisk: "LOW" as const,
      weakestTraitCategory: "legendaryOverlay",
      overusedBaseVariantRisk: false,
      rarityDistributionValid: true,
      silhouetteDominanceRisk: analysis.shapeLanguage.toLowerCase().includes("generic"),
      shallowCategories: [],
      pass: Boolean(input.logoUri || input.logoData) && !analysis.shapeLanguage.toLowerCase().includes("generic")
    };
  }

  private collectionColorSystem(palette: string[], colorPreference?: string) {
    const cleanPalette = unique([...palette, ...(colorPreference ? [colorPreference] : [])]).slice(0, 8);
    const [primary = "#7cff00", secondary = "#16d7d2", accent = "#f4c542"] = cleanPalette;
    return {
      primaryColors: [primary],
      secondaryColors: [secondary],
      accentColors: cleanPalette.slice(2, 5).length ? cleanPalette.slice(2, 5) : [accent],
      neutralSupportColors: ["#031017", "#0f172a", "#e5f7f5"],
      glowLightColors: cleanPalette.slice(0, 3),
      backgroundColors: ["#031017", "#07131b", secondary],
      forbiddenColorCombinations: [
        "Do not reuse the global Phew.run platform palette as the collection identity.",
        "Do not approve palettes that collapse into an existing collection color system."
      ]
    };
  }
}
