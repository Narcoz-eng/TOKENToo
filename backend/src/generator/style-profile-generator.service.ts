import { Injectable } from "@nestjs/common";
import { getPreset } from "./art-presets";
import { selectAssetPack } from "./curated-asset-packs";
import type { CommunityContextOutput, CreateGenerationRunInput, GeneratedStyleProfile, LogoAnalysisOutput, RarityComplexityRule } from "./generator.types";
import { pick, seedFrom, titleCase, unique } from "./generator.util";
import { RarityEngineService } from "./rarity-engine.service";

@Injectable()
export class StyleProfileGeneratorService {
  constructor(private readonly rarity: RarityEngineService) {}

  generate(input: CreateGenerationRunInput, analysis: LogoAnalysisOutput, context: CommunityContextOutput, version = 1): GeneratedStyleProfile {
    const preset = getPreset(input.selectedPreset);
    const seed = seedFrom(`${input.tokenMint}:${input.tokenSymbol}:${version}:${context.extractedVocabulary.join("|")}`);
    const source = input.hints?.sourceMetadata;
    const tokenName = input.tokenName ?? source?.name ?? "Token";
    const tokenSymbol = input.tokenSymbol ?? source?.symbol ?? "$TOKEN";
    const sourceWords = unique([...context.extractedVocabulary, ...this.sourceWords(input), ...analysis.visualKeywords]).filter((word) => !this.genericWord(word));
    const motif = titleCase(pick(sourceWords.length ? sourceWords : context.extractedVocabulary, seed));
    const world = input.hints?.themePreference?.trim() || this.visualWorld(sourceWords, preset.backgroundWorlds, seed + 2);
    const assetPack = selectAssetPack(analysis.mascot, [...sourceWords, ...context.traitSeeds, world]);
    const silhouette = this.silhouette(analysis, sourceWords, seed);
    const mascot = `${analysis.mascot} ${silhouette}`;
    const theme = `${motif} ${pick(["vault circle", "holder house", "raid club", "signal crew", "meme order", "liquidity guild"], seed + 6)}`;
    const roleNames = unique([...context.roleNames, ...this.roleLanguage(motif, analysis.mascot, sourceWords, seed)]).slice(0, 10);
    const traitLanguage = unique([
      ...this.communityTraitLanguage(tokenName, sourceWords, analysis, seed),
      ...context.traitSeeds,
      ...context.backgroundNames,
      ...preset.traitNouns.slice(0, 4)
    ]).filter((trait) => !this.genericTrait(trait)).slice(0, 32);

    const lore = this.lore(input, analysis, context, theme, world);
    const tenKReadiness = this.tenKReadiness(input, analysis);
    const colorSystem = this.collectionColorSystem(analysis.palette, input.hints?.colorPreference);
    const rarityVisualRules = this.rarityVisualRules(motif, world, silhouette);
    const baseArchetypes = this.baseArchetypes(analysis.mascot, motif, silhouette, seed);
    const brandDna = {
      tokenSymbol,
      tokenName,
      mintAddress: input.tokenMint,
      logoPalette: analysis.palette,
      logoDerivedColors: analysis.palette,
      colorSystem,
      mascotArchetype: analysis.mascot,
      memeLanguage: unique([...context.memes, ...context.phrases, ...context.slogans, ...sourceWords]).slice(0, 24),
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
      legendaryDirection: this.legendaryDirection(motif, analysis.mascot, world, preset.legendaryDirection),
      mascotSilhouette: silhouette,
      backgroundWorld: world,
      baseArchetypes,
      rarityVisualRules,
      forbiddenSimilarities: [
        ...assetPack.forbiddenCombinations.map((item) => `${item.trait}: ${item.incompatibleWith.join(", ")}`),
        "No generic neon cyber mascot identity without token-specific vocabulary.",
        "No platform Phew lime/cyan/gold palette as the collection identity.",
        "No legendary recolors; legendary/mythic must change pose, scene, frame, and FX."
      ],
      sourceMetadataSummary: {
        source: "helius_scan_primary",
        logoUri: input.logoUri ?? source?.imageUri ?? source?.logoUri,
        hasLogoData: Boolean(input.logoData),
        description: input.description ?? source?.description,
        metadataUri: source?.metadataUri,
        externalUrl: source?.externalUrl,
        socialLinks: source?.socialLinks,
        extensions: source?.extensions,
        overridesApplied: {
          tokenName: Boolean(input.hints?.overrides?.tokenName),
          tokenSymbol: Boolean(input.hints?.overrides?.tokenSymbol),
          description: Boolean(input.hints?.overrides?.description),
          logoUri: Boolean(input.hints?.overrides?.logoUri)
        },
        selectedPreset: input.selectedPreset,
        creatorHints: input.hints ?? {}
      }
    };

    return {
      collection: `${tokenSymbol} ${pick(["Vaults", "Holders", "Raiders", "Capsules", "Relics"], seed + 13)}`,
      theme,
      mascot,
      artStyle: preset.artStyle,
      colors: analysis.palette,
      backgroundWorld: world,
      traitLanguage,
      rarityStructure: this.rarity.weights(),
      legendaryTheme: brandDna.legendaryDirection,
      animationStyle: preset.animationDirection,
      raidTheme: pick(context.raidNames, seed + 8),
      lore,
      roleNames,
      brandDna,
      visualFingerprint: {
        mascotArchetype: analysis.mascot,
        silhouetteFamily: silhouette,
        palette: colorSystem,
        backgroundWorld: world,
        traitVocabulary: traitLanguage,
        compositionType: assetPack.compositionRules,
        typographyDirection: assetPack.typographyDirection,
        loreMemeLanguage: brandDna.memeLanguage,
        legendaryDirection: brandDna.legendaryDirection,
        sourceMint: input.tokenMint,
        sourceSymbol: tokenSymbol,
        antiGenericRules: brandDna.forbiddenSimilarities
      },
      assetPackId: assetPack.id,
      artSource: "PROCEDURAL_FALLBACK",
      tenKReadiness
    };
  }

  private lore(input: CreateGenerationRunInput, analysis: LogoAnalysisOutput, context: CommunityContextOutput, theme: string, world: string) {
    if (context.lore) return context.lore;
    const slogan = context.slogans[0] ? ` Their chant is "${context.slogans[0]}."` : "";
    const symbol = input.tokenSymbol ?? input.hints?.sourceMetadata?.symbol ?? "$TOKEN";
    return `${symbol} holders formed the ${theme} inside ${world}. The ${analysis.mascot} identity is built from ${analysis.visualKeywords.slice(0, 4).join(", ")} and rewards members who lock, raid, and grow the faction.${slogan}`;
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
      pass: Boolean(input.logoUri || input.logoData || input.hints?.sourceMetadata?.imageUri || input.hints?.sourceMetadata?.logoUri) && !analysis.shapeLanguage.toLowerCase().includes("generic")
    };
  }

  private collectionColorSystem(palette: string[], colorPreference?: string) {
    const cleanPalette = unique([...palette, ...(colorPreference ? [colorPreference] : [])]).slice(0, 8);
    const platform = new Set(["#baff00", "#16d7d2", "#f4c542"]);
    const filtered = cleanPalette.filter((color) => !platform.has(color.toLowerCase()));
    const [primary = cleanPalette[0] ?? "#7cff00", secondary = cleanPalette[1] ?? "#7a35ff", accent = cleanPalette[2] ?? "#f46d43"] = filtered.length >= 3 ? filtered : cleanPalette;
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

  private sourceWords(input: CreateGenerationRunInput) {
    const source = input.hints?.sourceMetadata;
    const links = source?.socialLinks ? Object.keys(source.socialLinks) : [];
    return unique([
      ...(source?.name ? source.name.split(/\W+/) : []),
      ...(source?.symbol ? [source.symbol.replace(/^\$/, "")] : []),
      ...(source?.description ? source.description.split(/\W+/) : []),
      ...links,
      ...Object.keys(source?.extensions ?? {})
    ].map((word) => word.toLowerCase()).filter((word) => word.length > 2)).slice(0, 28);
  }

  private visualWorld(words: string[], fallbackWorlds: string[], seed: number) {
    const source = words.join(" ");
    if (/pepe|frog|swamp|bog|pond|meme/.test(source)) return "memetic swamp trading floor";
    if (/dog|doge|shib|inu|bone|pack/.test(source)) return "moonlit kennel dojo district";
    if (/cat|kitty|meow|claw|nft/.test(source)) return "night market alley network";
    if (/degen|pump|casino|moon|chart|liquidity/.test(source)) return "chart-lit degen bazaar";
    if (/(^|\s)(ai|bot)(\s|$)|robot|agent|neural|compute/.test(source)) return "autonomous machine server temple";
    return pick(fallbackWorlds, seed);
  }

  private silhouette(analysis: LogoAnalysisOutput, words: string[], seed: number) {
    const source = words.join(" ");
    const modifier = /shib|samurai|dojo/.test(source) ? "kabuto side-profile" : /(^|\s)(ai|bot)(\s|$)|robot/.test(source) ? "modular visor chassis" : /cat/.test(source) ? "arched alley-stalker" : /frog|pepe/.test(source) ? "wide-eyed squat meme idol" : pick(["crest-backed", "asymmetric relic-bearer", "banner-shouldered", "mask-forward"], seed);
    return `${analysis.shapeLanguage} ${modifier}`;
  }

  private roleLanguage(motif: string, mascot: string, words: string[], seed: number) {
    return [
      `${motif} Holder`,
      `${titleCase(mascot)} Signal`,
      `${titleCase(pick(words.length ? words : [motif], seed + 31))} Scout`,
      `${motif} Liquidity Guard`,
      `${titleCase(mascot)} Myth`
    ];
  }

  private communityTraitLanguage(tokenName: string, words: string[], analysis: LogoAnalysisOutput, seed: number) {
    const motifs = unique([...words, ...tokenName.split(/\W+/), ...analysis.visualKeywords]).filter((word) => word.length > 2 && !this.genericWord(word));
    const nouns = ["emblem", "chant", "sigil", "trade mark", "holder badge", "raid prop", "scene key", "origin mark", "meme relic", "liquidity tag"];
    return Array.from({ length: 18 }, (_, index) => `${titleCase(pick(motifs.length ? motifs : [analysis.mascot], seed + index * 7))} ${pick(nouns, seed + index * 11)}`);
  }

  private legendaryDirection(motif: string, mascot: string, world: string, fallback: string) {
    return `${fallback}; ${motif} ${titleCase(mascot)} takes over ${world} with unique scene layout, signature frame, strong FX, and custom silhouette`;
  }

  private baseArchetypes(mascot: string, motif: string, silhouette: string, seed: number) {
    return [
      `${motif} base holder, ${silhouette}, front readable pose`,
      `${titleCase(mascot)} scout, lighter silhouette, one prop slot`,
      `${motif} raid lead, broader shoulders, gesture pose`,
      `${titleCase(mascot)} myth form, reserved for legendary/mythic composition`,
      `${motif} liquidity guard, badge-forward silhouette`
    ].map((value, index) => `${value} #${index + 1 + (seed % 3)}`);
  }

  private rarityVisualRules(motif: string, world: string, silhouette: string): Record<string, RarityComplexityRule> {
    return {
      Common: { minTraits: 2, maxTraits: 4, pose: "base pose", background: "simple flat world hint", aura: "none", frame: "none", composition: `${motif} base holder in ${world}` },
      Uncommon: { minTraits: 3, maxTraits: 5, pose: "base pose with expression shift", background: "slight world variation", aura: "none", frame: "standard", composition: "one modest accessory and readable eyes" },
      Rare: { minTraits: 5, maxTraits: 7, pose: "stronger expression", background: "richer token world", aura: "mild", frame: "standard", composition: "better outfit/accessory without overload" },
      Epic: { minTraits: 7, maxTraits: 9, pose: "premium action pose", background: "complex world scene", aura: "strong", frame: "special", composition: `${silhouette} with aura, premium outfit, stronger silhouette` },
      Legendary: { minTraits: 9, maxTraits: 11, pose: "unique scene pose", background: "unique background", aura: "signature", frame: "special", composition: "unique pose/scene/frame/FX; never a recolor" },
      Mythic: { minTraits: 10, maxTraits: 12, pose: "near 1/1 curated pose", background: "hand-directed one-off scene", aura: "signature", frame: "mythic", composition: "near 1/1 curated composition with special metadata flag" }
    };
  }

  private genericWord(word: string) {
    return /^(token|coin|crypto|vault|nft|the|and|for|with|official|website|twitter|telegram|discord)$/i.test(word);
  }

  private genericTrait(value: string) {
    return /^(neon|cyber|green|gold|blue|red|hat|background|aura|eyes|shirt|crown)$/i.test(value.trim());
  }
}
