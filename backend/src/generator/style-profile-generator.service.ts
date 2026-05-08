import { Injectable } from "@nestjs/common";
import { getPreset } from "./art-presets";
import { selectAssetPack } from "./curated-asset-packs";
import type {
  AnimationReadinessPlan,
  BaseSilhouettePlan,
  CommunityContextOutput,
  CommunityCreativeUniverse,
  CreateGenerationRunInput,
  CreativeDNA,
  CreativeSignalProfile,
  GeneratedStyleProfile,
  LogoAnalysisOutput,
  MoodExpressionPlan,
  ProductionAssetPolicy,
  RarityComplexityRule,
  TraitCategoryPlan,
  TraitCategoryRole
} from "./generator.types";
import { pick, seedFrom, titleCase, unique } from "./generator.util";
import { RarityEngineService } from "./rarity-engine.service";

type SemanticHint = {
  key: string;
  pattern: RegExp;
  objects: string[];
  worlds: string[];
  textures: string[];
  styles: string[];
  expressions: string[];
  silhouettes: string[];
  roleWords?: Partial<Record<TraitCategoryRole, string[]>>;
  danger?: string[];
};

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
    const motif = this.primaryMotif(tokenName, tokenSymbol, sourceWords, context.extractedVocabulary, seed);
    const seedWorld = input.hints?.themePreference?.trim() || this.visualWorld(sourceWords, preset.backgroundWorlds, seed + 2);
    const universe = this.creativeUniverse(input, analysis, context, sourceWords, motif, seedWorld, seed, preset);
    const world = universe.creativeDna.worldConcept;
    const assetPack = selectAssetPack(analysis.mascot, [...sourceWords, ...context.traitSeeds, world, ...universe.signalProfile.objects]);
    const silhouette = universe.creativeDna.baseSilhouetteRules[0] ?? this.silhouette(analysis, sourceWords, seed);
    const mascot = universe.creativeDna.mascotOrSubject;
    const theme = `${motif} ${pick(["holder house", "signal crew", "meme order", "liquidity guild", "origin circle", "raid studio"], seed + 6)}`;
    const roleNames = unique([...context.roleNames, ...this.roleLanguage(motif, mascot, sourceWords, seed)]).slice(0, 10);
    const cultureNouns = universe.taxonomy.flatMap((category) => category.nouns);
    const traitLanguage = unique([
      ...this.communityTraitLanguage(tokenName, sourceWords, analysis, seed, cultureNouns),
      ...context.traitSeeds,
      ...context.backgroundNames,
      ...cultureNouns
    ]).filter((trait) => !this.genericTrait(trait)).slice(0, 32);

    const lore = this.lore(input, analysis, context, theme, world);
    const tenKReadiness = this.tenKReadiness(input, analysis);
    const colorSystem = this.collectionColorSystem(universe.creativeDna.palette, input.hints?.colorPreference);
    const rarityVisualRules = this.rarityVisualRules(motif, world, silhouette);
    const baseArchetypes = universe.baseSilhouettes.map((item) => `${item.name}: ${item.bodyShape}, ${item.poseLanguage}, ${item.cameraFraming}`);
    const brandDna = {
      tokenSymbol,
      tokenName,
      mintAddress: input.tokenMint,
      logoPalette: analysis.palette,
      logoDerivedColors: analysis.palette,
      colorSystem,
      mascotArchetype: mascot,
      memeLanguage: unique([...context.memes, ...context.phrases, ...context.slogans, ...sourceWords, ...universe.signalProfile.memeLanguage]).slice(0, 24),
      lore,
      visualWorld: world,
      shapeLanguage: analysis.shapeLanguage,
      compositionRules: assetPack.compositionRules,
      traitNamingRules: [
        "Use generated Creative DNA language in every visible trait.",
        "Avoid fixed archetype labels and plain color/object names.",
        "Rarity must be readable from silhouette, glow, or composition."
      ],
      typographyDirection: assetPack.typographyDirection,
      raidLanguage: context.raidNames,
      roleLanguage: roleNames,
      legendaryDirection: universe.creativeDna.legendaryMythology,
      mascotSilhouette: silhouette,
      backgroundWorld: world,
      baseArchetypes,
      baseSilhouettes: universe.baseSilhouettes,
      moodCulture: universe.moodCulture,
      animationReadiness: universe.animationReadiness,
      productionAssetPolicy: universe.productionAssetPolicy,
      traitTaxonomy: universe.taxonomy,
      rarityVisualRules,
      forbiddenSimilarities: [
        ...assetPack.forbiddenCombinations.map((item) => `${item.trait}: ${item.incompatibleWith.join(", ")}`),
        ...universe.creativeDna.forbiddenSimilarities,
        ...universe.antiGenericRules
      ],
      creativeDna: universe.creativeDna,
      signalProfile: universe.signalProfile,
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
      artStyle: universe.artStyle,
      colors: universe.creativeDna.palette,
      backgroundWorld: world,
      traitLanguage,
      rarityStructure: this.rarity.weights(),
      legendaryTheme: brandDna.legendaryDirection,
      animationStyle: universe.animationReadiness.idleStates.join("; "),
      raidTheme: pick(context.raidNames, seed + 8),
      lore,
      roleNames,
      brandDna,
      visualFingerprint: {
        archetype: universe.archetype,
        creativeDna: universe.creativeDna,
        signalWeights: universe.signalProfile.semanticWeights,
        mascotArchetype: mascot,
        silhouetteFamily: silhouette,
        palette: colorSystem,
        backgroundWorld: world,
        traitVocabulary: traitLanguage,
        traitTaxonomy: universe.taxonomy.map((category) => `${category.role}:${category.label}`),
        artStyle: universe.artStyle,
        poseLanguage: universe.baseSilhouettes.map((base) => base.poseLanguage),
        moodCulture: universe.moodCulture.map((mood) => mood.name),
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
      tenKReadiness,
      creativeUniverse: universe,
      productionAssetPolicy: universe.productionAssetPolicy
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
    const extensionText = Object.entries(source?.extensions ?? {}).flatMap(([key, value]) => [key, ...String(JSON.stringify(value)).split(/\W+/)]);
    return unique([
      ...(source?.name ? source.name.split(/\W+/) : []),
      ...(source?.symbol ? [source.symbol.replace(/^\$/, "")] : []),
      ...(source?.description ? source.description.split(/\W+/) : []),
      ...(input.description ? input.description.split(/\W+/) : []),
      ...links,
      ...extensionText,
      ...(source?.riskNotes ?? []).flatMap((note) => note.split(/\W+/))
    ].map((word) => word.toLowerCase()).filter((word) => word.length > 2)).slice(0, 60);
  }

  private visualWorld(words: string[], fallbackWorlds: string[], seed: number) {
    const hints = this.topHints(this.semanticWeights(words.join(" "))).flatMap((hint) => hint.worlds);
    const anchor = titleCase(pick(words.length ? words : ["origin"], seed + 3));
    const selected = hints.length ? pick(hints, seed + 5) : pick(fallbackWorlds, seed);
    const frame = pick(["district", "room", "map", "altar", "market", "theater", "habitat", "archive"], seed + 9);
    return `${anchor} ${selected} ${frame}`.toLowerCase();
  }

  private primaryMotif(tokenName: string, tokenSymbol: string, sourceWords: string[], contextWords: string[], seed: number) {
    const identityWords = unique([...tokenName.split(/\W+/), tokenSymbol.replace(/^\$/, ""), ...sourceWords].map((word) => word.toLowerCase()).filter((word) => word.length > 2 && !this.genericWord(word)));
    const named = identityWords.find((word) => tokenName.toLowerCase().includes(word) || tokenSymbol.toLowerCase().includes(word));
    if (named) return titleCase(named);
    return titleCase(pick(sourceWords.length ? sourceWords : contextWords.length ? contextWords : ["origin"], seed));
  }

  private silhouette(analysis: LogoAnalysisOutput, words: string[], seed: number) {
    const hints = this.topHints(this.semanticWeights(words.join(" ")));
    const modifier = pick(unique([...hints.flatMap((hint) => hint.silhouettes), "crest-backed signal bearer", "asymmetric relic carrier", "banner-shouldered community figure", "mask-forward mascot subject"]), seed);
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

  private communityTraitLanguage(tokenName: string, words: string[], analysis: LogoAnalysisOutput, seed: number, cultureNouns: string[] = []) {
    const motifs = unique([...words, ...tokenName.split(/\W+/), ...analysis.visualKeywords]).filter((word) => word.length > 2 && !this.genericWord(word));
    const nouns = cultureNouns.length ? unique(cultureNouns).slice(0, 28) : ["emblem", "chant", "sigil", "holder badge", "raid prop", "scene key", "origin mark", "meme relic", "liquidity tag"];
    return Array.from({ length: 18 }, (_, index) => `${titleCase(pick(motifs.length ? motifs : [analysis.mascot], seed + index * 7))} ${pick(nouns, seed + index * 11)}`);
  }

  private creativeUniverse(
    input: CreateGenerationRunInput,
    analysis: LogoAnalysisOutput,
    context: CommunityContextOutput,
    words: string[],
    motif: string,
    world: string,
    seed: number,
    preset: { artStyle: string; animationDirection: string }
  ): CommunityCreativeUniverse {
    const signalProfile = this.extractSignals(input, analysis, context, words, seed);
    const creativeDna = this.generateCreativeDna(input, analysis, signalProfile, motif, world, seed, preset);
    const taxonomy = this.dynamicTaxonomy(creativeDna, signalProfile, motif, seed);
    const moodCulture = this.dynamicMoodCulture(creativeDna, signalProfile, motif, seed);
    const baseSilhouettes = this.dynamicBaseSilhouettes(creativeDna, signalProfile, analysis.shapeLanguage, seed);
    const animationReadiness = this.dynamicAnimationReadiness(creativeDna, signalProfile, moodCulture, preset.animationDirection, seed);
    const archetype = this.dynamicIdentityKey(motif, signalProfile, seed);
    const productionAssetPolicy = this.productionAssetPolicy();
    return {
      archetype,
      signalProfile,
      creativeDna,
      inferredCommunityLanguage: unique([...context.memes, ...context.slogans, ...context.phrases, ...words, ...signalProfile.culturalWords]).slice(0, 32),
      artStyle: creativeDna.artStyle,
      artStyleReason: `${creativeDna.artStyle} was generated from weighted metadata, logo, social, mood, and fallback-market signals: ${this.topWeightKeys(signalProfile.semanticWeights).join(", ")}.`,
      taxonomy,
      baseSilhouettes,
      moodCulture,
      animationReadiness,
      productionAssetPolicy,
      antiGenericRules: [
        "Do not select final collection worlds from fixed animal, robot, trader, or virus templates.",
        "Do not approve collection taxonomy if another collection has the same role-label structure.",
        "Do not repeat art style, base pose logic, mood vocabulary, or legendary structure without new source signals.",
        "Do not ship common/uncommon/rare NFTs from generic AI image output; use approved layer packs.",
        "Do not mark production-ready without curated or handmade layers and permanent final storage."
      ]
    };
  }

  private extractSignals(input: CreateGenerationRunInput, analysis: LogoAnalysisOutput, context: CommunityContextOutput, words: string[], seed: number): CreativeSignalProfile {
    const sourceText = this.sourceText(input, context, analysis, words);
    const weights = this.semanticWeights(sourceText);
    const hints = this.topHints(weights);
    const significant = this.significantWords(sourceText);
    const cue = (pattern: RegExp) => pattern.test(sourceText) ? 90 : hints.some((hint) => pattern.test(hint.key)) ? 64 : 24;
    const styleRefs = unique([...hints.flatMap((hint) => hint.styles), analysis.style, input.selectedPreset ?? ""]).filter(Boolean);
    const worldRefs = unique([...hints.flatMap((hint) => hint.worlds), ...context.backgroundNames, input.hints?.themePreference ?? ""]).filter(Boolean);
    const objects = unique([...hints.flatMap((hint) => hint.objects), ...context.traitSeeds, ...significant.slice(0, 8)]).slice(0, 36);
    const animals = significant.filter((word) => /frog|toad|dog|doge|shib|inu|cat|kitty|meow|skull|alien|hanta|mouse|bear|bull|ape/.test(word)).slice(0, 8);
    const emotions = unique([
      input.hints?.mood ?? "",
      ...hints.flatMap((hint) => hint.expressions),
      ...significant.filter((word) => /panic|cozy|rage|happy|sad|fear|sleep|stress|chaos|luxury|dream|toxic|cute|dark|safe|danger/.test(word))
    ].filter(Boolean)).slice(0, 16);
    return {
      entities: unique([input.tokenName ?? "", input.tokenSymbol ?? "", input.hints?.sourceMetadata?.name ?? "", ...significant.slice(0, 12)].filter(Boolean)).slice(0, 18),
      objects,
      animals,
      emotions,
      colors: unique([...analysis.palette, ...significant.filter((word) => /green|red|blue|gold|black|white|pink|purple|orange|silver|chrome|toxic|neon/.test(word))]).slice(0, 12),
      visualShapes: unique([...analysis.shapeLanguage.split(/\s+/), ...hints.flatMap((hint) => hint.silhouettes).flatMap((item) => item.split(/\s+/))]).filter((word) => word.length > 3).slice(0, 18),
      culturalWords: unique([...context.extractedVocabulary, ...significant, ...Object.keys(input.hints?.sourceMetadata?.socialLinks ?? {})]).slice(0, 32),
      memeLanguage: unique([...context.memes, ...context.phrases, ...context.slogans]).slice(0, 24),
      humorType: this.humorType(sourceText, weights, seed),
      energyLevel: this.energyLevel(sourceText, weights),
      communityVibe: this.communityVibe(sourceText, weights, seed),
      worldReferences: worldRefs.slice(0, 18),
      styleReferences: styleRefs.slice(0, 14),
      dangerSafetyCues: unique([...hints.flatMap((hint) => hint.danger ?? []), ...significant.filter((word) => /safe|danger|toxic|hazard|risk|quarantine|dark|shadow|protect|guard|rage/.test(word))]).slice(0, 18),
      cueDial: {
        luxury: cue(/luxury|gold|vip|premium|diamond|velvet/),
        chaos: cue(/chaos|degen|wild|glitch|mutation|outbreak|casino/),
        cozy: cue(/cozy|soft|blanket|lofi|nap|cute|toy|sleep/),
        aggressive: cue(/aggressive|war|fang|blade|raid|rage|skull|danger/),
        surreal: cue(/surreal|dream|vapor|liminal|abstract|microscope|mutation/)
      },
      semanticWeights: weights
    };
  }

  private generateCreativeDna(input: CreateGenerationRunInput, analysis: LogoAnalysisOutput, signals: CreativeSignalProfile, motif: string, seedWorld: string, seed: number, preset: { artStyle: string; animationDirection: string }): CreativeDNA {
    const hints = this.topHints(signals.semanticWeights);
    const primary = hints[0];
    const secondary = hints[1] ?? primary;
    const texture = pick(unique([...hints.flatMap((hint) => hint.textures), "inked grain", "cut-paper shadows", "sticker gloss", "screenprint noise"]), seed + 23);
    const styleBase = pick(unique([...hints.flatMap((hint) => hint.styles), preset.artStyle, "cinematic collectible poster", "community mascot cartoon"]), seed + 29);
    const worldCore = pick(unique([...signals.worldReferences, ...hints.flatMap((hint) => hint.worlds), seedWorld]), seed + 31);
    const worldConcept = `${motif} ${worldCore} ${pick(["micro-world", "signal district", "holder habitat", "myth room", "ritual market", "dream map"], seed + 37)}`.toLowerCase();
    const subjectWord = pick(unique([...signals.entities, analysis.mascot, motif]).filter(Boolean), seed + 41);
    const mascotOrSubject = `${motif} ${pick([...primary.silhouettes, ...secondary.silhouettes, analysis.mascot], seed + 43)} ${titleCase(subjectWord)}`.toLowerCase();
    const baseSilhouetteRules = unique([
      `${analysis.shapeLanguage} ${pick(primary.silhouettes, seed + 47)}`,
      `${pick(secondary.silhouettes, seed + 53)} with ${pick(signals.objects.length ? signals.objects : [motif], seed + 59)} readability`,
      `${pick(["front-readable", "three-quarter", "low-angle", "sticker-flat", "poster-cropped"], seed + 61)} pose family with rarity-specific silhouette changes`
    ]);
    const moodCulture = unique([...signals.emotions, ...hints.flatMap((hint) => hint.expressions)]).slice(0, 8);
    const expressionLanguage = unique([
      `${motif} ${pick(moodCulture.length ? moodCulture : ["focus"], seed + 67)}`,
      `${pick(signals.humorType.split(/\s+/), seed + 71)} reaction`,
      `${pick(signals.dangerSafetyCues.length ? signals.dangerSafetyCues : ["signal"], seed + 73)} expression`
    ]).map(titleCase);
    const traitCategories = this.roleOrder().map((role, index) => this.dynamicCategoryLabel(role, motif, signals, seed + index * 17));
    return {
      artStyle: `${motif} ${styleBase} with ${texture}`.toLowerCase(),
      worldConcept,
      mascotOrSubject,
      baseSilhouetteRules,
      cameraFraming: pick(["tight collectible bust", "three-quarter poster crop", "full-body sticker crop", "low-angle myth portrait", "orthographic trait-readable card"], seed + 79),
      palette: this.paletteFromSignals(analysis.palette, signals, seed),
      textureLanguage: texture,
      moodCulture,
      expressionLanguage,
      traitCategories,
      rarityPhilosophy: `${motif} rarity escalates through silhouette, scene density, signal-specific objects, and myth composition rather than recolors.`,
      legendaryMythology: `${motif} ${pick(signals.worldReferences.length ? signals.worldReferences : [worldConcept], seed + 83)} becomes a one-off myth where ${pick(signals.objects.length ? signals.objects : [motif], seed + 89)} changes the pose, frame, FX, and background logic.`,
      animationLanguage: `${motif} ${pick([...hints.flatMap((hint) => hint.expressions), preset.animationDirection], seed + 97)} loops with ${texture} motion.`,
      forbiddenSimilarities: [
        "No fixed frog, dog, cat, robot, trader, or virus template selection.",
        "No generic vault/crown/robot fallback when metadata is sparse.",
        "No repeated world concept, art style, base pose ladder, mood vocabulary, or legendary scene structure.",
        `Do not reuse the ${motif} Creative DNA for unrelated communities.`
      ]
    };
  }

  private dynamicTaxonomy(dna: CreativeDNA, signals: CreativeSignalProfile, motif: string, seed: number): TraitCategoryPlan[] {
    return this.roleOrder().map((role, index) => {
      const label = dna.traitCategories[index] ?? this.dynamicCategoryLabel(role, motif, signals, seed + index * 17);
      const nouns = this.nounsForRole(role, motif, signals, seed + index * 101);
      return {
        id: this.categoryId(label),
        label,
        role,
        description: `${label} generated from Creative DNA signals: ${this.topWeightKeys(signals.semanticWeights).join(", ")}.`,
        targetCount: this.targetCount(role),
        nouns,
        forbiddenConcepts: this.forbiddenForSignals(signals)
      };
    });
  }

  private dynamicBaseSilhouettes(dna: CreativeDNA, signals: CreativeSignalProfile, shapeLanguage: string, seed: number): BaseSilhouettePlan[] {
    const objects = signals.objects.length ? signals.objects : ["signal", "relic", "badge"];
    return Array.from({ length: 3 }, (_, index) => {
      const rule = dna.baseSilhouetteRules[index % dna.baseSilhouetteRules.length] ?? shapeLanguage;
      return {
        name: `${titleCase(pick(signals.entities.length ? signals.entities : ["Origin"], seed + index * 11))} ${pick(["Carrier", "Witness", "Scout", "Idol", "Runner"], seed + index * 13)}`,
        bodyShape: `${shapeLanguage}; ${rule}`,
        poseLanguage: `${pick(["crouched", "floating", "leaning", "front-facing", "side-stepping", "braced"], seed + index * 17)} ${pick(objects, seed + index * 19)} pose`,
        proportions: `${pick(["oversized head", "compact torso", "long gesture limbs", "wide readable shoulders", "asymmetric profile"], seed + index * 23)} with ${pick(signals.visualShapes.length ? signals.visualShapes : ["clear"], seed + index * 29)} shape cues`,
        cameraFraming: index === 2 ? dna.cameraFraming : pick(["tight portrait crop", "waist-up trait crop", "full-body sticker crop", dna.cameraFraming], seed + index * 31),
        rarityUpgradePath: index === 0 ? "Common-Uncommon base read" : index === 1 ? "Rare-Epic stronger object and expression read" : "Legendary-Mythic unique pose, scene, frame, and FX"
      };
    });
  }

  private dynamicMoodCulture(dna: CreativeDNA, signals: CreativeSignalProfile, motif: string, seed: number): MoodExpressionPlan[] {
    const moods = unique([...dna.moodCulture, ...signals.emotions, signals.energyLevel, signals.communityVibe]).filter(Boolean);
    const objects = signals.objects.length ? signals.objects : ["signal", "badge", "relic"];
    return Array.from({ length: Math.max(3, Math.min(4, moods.length || 3)) }, (_, index) => {
      const mood = pick(moods.length ? moods : ["focused signal"], seed + index * 13);
      const object = pick(objects, seed + index * 17);
      return {
        name: `${motif} ${titleCase(mood)} ${index + 1}`,
        expression: `${mood} ${signals.humorType}`,
        eyeLanguage: `${titleCase(pick(signals.visualShapes.length ? signals.visualShapes : ["signal"], seed + index * 19))} ${pick(["stare", "blink", "glare", "squint", "wide-eye"], seed + index * 23)}`,
        mouthLanguage: `${titleCase(pick(dna.expressionLanguage.length ? dna.expressionLanguage : [mood], seed + index * 29))} mouth`,
        stance: `${pick(["braced", "tilted", "cornered", "floating", "locked-in", "soft"], seed + index * 31)} ${object} stance`,
        gesture: `${object} ${pick(["grip", "point", "lift", "shield", "clutch", "offer"], seed + index * 37)}`,
        auraBehavior: `${pick(signals.dangerSafetyCues.length ? signals.dangerSafetyCues : signals.worldReferences.length ? signals.worldReferences : ["signal"], seed + index * 41)} ${pick(["pulse", "drift", "flash", "spark", "haze"], seed + index * 43)}`,
        animationState: this.categoryId(`${motif}-${mood}-${index}`)
      };
    });
  }

  private dynamicAnimationReadiness(dna: CreativeDNA, signals: CreativeSignalProfile, moods: MoodExpressionPlan[], fallback: string, seed: number): AnimationReadinessPlan {
    const moodStates = moods.map((mood) => mood.animationState);
    const identity = pick(signals.entities.length ? signals.entities : ["creative dna"], seed + 7);
    return {
      blinkLayers: moods.map((mood) => `${mood.name} blink layer`),
      mouthLayers: moods.map((mood) => `${mood.name} mouth layer`),
      eyeVariants: moods.map((mood) => mood.eyeLanguage),
      auraLoops: moods.map((mood) => mood.auraBehavior),
      fxLoops: [`${identity} idle FX`, `${dna.textureLanguage} rarity FX`, fallback],
      emotionalTransitions: moodStates.map((state, index) => `${state} -> ${moodStates[(index + 1) % moodStates.length]}`),
      idleStates: moodStates,
      reactionStates: {
        mint: `${identity} Creative DNA reveal`,
        redeem: `${identity} relief expression`,
        stake: `${identity} lock-in stance`,
        unstake: `${identity} release blink`,
        receiveNft: `${identity} receive flex pose`,
        levelUp: `${identity} upgraded aura loop`,
        raidSuccess: `${identity} raid victory reaction`,
        rewards: `${identity} reward burst expression`
      }
    };
  }

  private semanticHints(): SemanticHint[] {
    return [
      {
        key: "medical-contamination",
        pattern: /hanta|hantavirus|virus|viral|biohazard|infection|infected|pathogen|outbreak|quarantine|mutation|patient|fever|plague|microbe|microscope|specimen|containment|toxic|lab/,
        objects: ["Quarantine Patient", "Lab Relic", "Petri Dish", "Warning Syringe", "Specimen Tag", "Mutation Sample", "Biohazard Badge"],
        worlds: ["quarantine ward", "microscope slide city", "containment hallway", "fever map", "sealed lab bench"],
        textures: ["sickly scanlines", "toxic droplet grain", "rubber glove gloss", "clinical warning tape"],
        styles: ["contaminated medical meme poster", "microscopic horror cartoon", "specimen-card collectible"],
        expressions: ["fever lucid", "infected amused", "containment panic", "mutation rage"],
        silhouettes: ["asymmetric infected lab specimen", "sealed patient mascot", "spore-edged carrier"],
        roleWords: {
          base: ["Infection Stages", "Mutation Carriers", "Patient Forms"],
          background: ["Quarantine Scenes", "Microscope Zones", "Containment Rooms"],
          prop: ["Lab Relics", "Outbreak Objects", "Specimen Tools"],
          aura: ["Viral Load FX", "Fever Weather", "Toxic Drift"],
          legendary: ["Outbreak Myths", "Patient Zero Incidents"]
        },
        danger: ["biohazard", "quarantine", "contamination", "fever", "mutation"]
      },
      {
        key: "amphibian-meme",
        pattern: /frog|toad|pepe|bog|swamp|ribbit|pond|mire|lily/,
        objects: ["Lily Token", "Bog Relic", "Mire Scroll", "Pond Candle", "Ribbit Banner"],
        worlds: ["mire trading floor", "pond shrine", "lily ruin", "mud oracle room"],
        textures: ["wet ink", "muddy halftone", "algae sticker edge"],
        styles: ["hand-drawn swamp meme poster", "pond-prophecy cartoon"],
        expressions: ["bogged confidence", "pond enlightenment", "rug pull survivor"],
        silhouettes: ["wide-eyed squat idol", "spring-loaded pond body"],
        roleWords: { base: ["Bog Bodies", "Pond Forms"], background: ["Swamp Weather"], prop: ["Bog Relics"] }
      },
      {
        key: "canine-pack",
        pattern: /dog|doge|shib|inu|kennel|bark|bone|pack|paws|blanket|lofi/,
        objects: ["Treat Bag", "Pack Charm", "Tennis Ball", "Moon Collar", "Blanket Badge"],
        worlds: ["kennel block", "lofi couch room", "moon yard", "snack corner"],
        textures: ["soft fur grain", "streetwear patchwork", "warm lamp glow"],
        styles: ["streetwear mascot cartoon", "cozy sticker collectible"],
        expressions: ["treat locked", "fake brave", "nap commander"],
        silhouettes: ["rounded pack mascot", "compact blanket guard"],
        roleWords: { base: ["Pack Forms", "Comfort Poses"], background: ["Kennel Corners"], prop: ["Pack Comforts"] }
      },
      {
        key: "feline-chaos",
        pattern: /cat|kitty|meow|claw|nine.?life|milk|alley|stream|arcade/,
        objects: ["Mouse Cursor", "Claw Mark", "Milk Cup", "Arcade Token", "Chat Banner"],
        worlds: ["stream desk", "night alley", "arcade cabinet", "milk bar"],
        textures: ["chat-static grain", "claw-scratch ink", "screen glow"],
        styles: ["hyper meme arcade poster", "night-market comic collectible"],
        expressions: ["dead chat", "combo panic", "milk smug"],
        silhouettes: ["arched alley-stalker", "keyboard-chaos sitter"],
        roleWords: { base: ["Nine-Life Bodies", "Stream Poses"], background: ["Chat Rooms"], prop: ["Claw Objects"] }
      },
      {
        key: "machine-intelligence",
        pattern: /(^|\s)(ai|bot)(\s|$)|robot|agent|neural|compute|machine|model|swarm|reactor|node|terminal/,
        objects: ["Prompt Card", "GPU Shard", "Node Key", "Patch Cable", "Terminal Cursor"],
        worlds: ["server shrine", "reactor node room", "terminal chapel", "inference rack"],
        textures: ["glitch metal", "debug scanline", "circuit dust"],
        styles: ["autonomous machine poster", "terminal-interface collectible"],
        expressions: ["kernel calm", "recursive focus", "patch note tired"],
        silhouettes: ["modular visor chassis", "boxy signal unit"],
        roleWords: { base: ["Signal Chassis", "Node Bodies"], background: ["Compute Rooms"], prop: ["Compute Relics"] }
      },
      {
        key: "market-stress",
        pattern: /trader|terminal|chart|candle|liquidation|perp|finance|yield|market|index|pnl|margin|liquidity|pump|degen/,
        objects: ["Margin Phone", "Chart Tablet", "Coffee Cup", "Liquidation Notice", "Orderbook Panel"],
        worlds: ["red candle wall", "perp desk", "orderbook alley", "liquidity pit"],
        textures: ["ticker rain", "terminal glow", "receipt paper grain"],
        styles: ["comic finance stress poster", "trading-terminal collectible"],
        expressions: ["locked-in candle", "liquidation gasp", "wealthy despair"],
        silhouettes: ["desk-leaning stress avatar", "orderbook-lit trader form"],
        roleWords: { base: ["Market Scars", "Desk Avatars"], background: ["Terminal Reflections"], aura: ["Liquidation Auras"], legendary: ["Market Events"] }
      },
      {
        key: "dream-surreal",
        pattern: /dream|vapor|vaporwave|surreal|liminal|mall|vhs|pool|cloud|sleep|candy|abstract/,
        objects: ["VHS Receipt", "Cloud Accessory", "Candy Mutation", "Palm Token", "Dream Lens"],
        worlds: ["empty mall", "pool tile dream", "sunset grid", "cloud arcade"],
        textures: ["VHS bloom", "soft cloud grain", "liquid chrome"],
        styles: ["surreal vapor poster", "dream-layer cartoon"],
        expressions: ["mall empty", "sleepy signal", "tape-warp calm"],
        silhouettes: ["melting dream silhouette", "floating cloud body"],
        roleWords: { base: ["Dream Layers", "Sleepy Poses"], background: ["Cloud Rooms"], prop: ["Candy Mutations"], legendary: ["Liminal Myths"] }
      },
      {
        key: "dark-ritual",
        pattern: /skull|bone|reaper|crypt|shadow|cursed|dark|ash|moon|ritual|ledger/,
        objects: ["Bone Receipt", "Black Candle", "Ash Ledger", "Omen Charm", "Crypt Coin"],
        worlds: ["black moon crypt", "ash chapel", "bone market", "cursed ledger room"],
        textures: ["ash drift", "candle soot", "moonlit ink"],
        styles: ["dark fantasy storybook poster", "cursed collectible painting"],
        expressions: ["cursed smirk", "dead rich", "crypt calm"],
        silhouettes: ["hollow-eyed omen figure", "candle-forward relic bearer"],
        roleWords: { base: ["Omen Forms", "Crypt Bodies"], background: ["Cursed Locations"], prop: ["Cursed Relics"] },
        danger: ["curse", "shadow", "black moon", "debt"]
      },
      {
        key: "soft-play",
        pattern: /cute|baby|toy|toast|sticker|soft|candy|breakfast|tiny|friend|juice/,
        objects: ["Juice Box", "Sticker Wand", "Cloud Plush", "Toast Charm", "Pocket Flag"],
        worlds: ["sunny toy shelf", "breakfast room", "sticker desk", "pillow stage"],
        textures: ["soft sticker gloss", "plush grain", "breakfast cereal color"],
        styles: ["soft toy poster", "children's cartoon collectible"],
        expressions: ["tiny brave", "oops friend", "sleepy star"],
        silhouettes: ["plush rounded mascot", "tiny sticker body"],
        roleWords: { base: ["Toy Bodies", "Dreamy Poses"], background: ["Play Worlds"], prop: ["Pocket Toys"] }
      }
    ];
  }

  private sourceText(input: CreateGenerationRunInput, context: CommunityContextOutput, analysis: LogoAnalysisOutput, words: string[]) {
    const source = input.hints?.sourceMetadata;
    return [
      input.tokenName,
      input.tokenSymbol,
      input.description,
      input.logoUri,
      source?.name,
      source?.symbol,
      source?.description,
      source?.metadataUri,
      source?.imageUri,
      source?.externalUrl,
      JSON.stringify(source?.socialLinks ?? {}),
      JSON.stringify(source?.extensions ?? {}),
      source?.riskNotes?.join(" "),
      input.hints?.memes?.join(" "),
      input.hints?.slogans?.join(" "),
      input.hints?.phrases?.join(" "),
      input.hints?.lore,
      input.hints?.mascotPreference,
      input.hints?.themePreference,
      input.hints?.colorPreference,
      input.hints?.mood,
      context.extractedVocabulary.join(" "),
      analysis.visualKeywords.join(" "),
      analysis.mascot,
      analysis.shapeLanguage,
      words.join(" ")
    ].filter(Boolean).join(" ").toLowerCase();
  }

  private semanticWeights(text: string) {
    const weights = Object.fromEntries(this.semanticHints().map((hint) => [hint.key, hint.pattern.test(text) ? 72 : 0]));
    for (const word of this.significantWords(text)) {
      for (const hint of this.semanticHints()) {
        if (hint.objects.concat(hint.worlds, hint.textures, hint.styles, hint.expressions, hint.silhouettes).join(" ").toLowerCase().includes(word)) {
          weights[hint.key] = (weights[hint.key] ?? 0) + 6;
        }
      }
    }
    return Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, Math.min(100, value)]));
  }

  private topHints(weights: Record<string, number>) {
    const hints = this.semanticHints();
    return Object.entries(weights)
      .sort((a, b) => b[1] - a[1])
      .filter(([, value]) => value > 0)
      .map(([key]) => hints.find((hint) => hint.key === key))
      .filter((hint): hint is SemanticHint => Boolean(hint))
      .concat(hints)
      .filter((hint, index, list) => list.findIndex((item) => item.key === hint.key) === index)
      .slice(0, 3);
  }

  private topWeightKeys(weights: Record<string, number>) {
    return Object.entries(weights).sort((a, b) => b[1] - a[1]).filter(([, value]) => value > 0).slice(0, 4).map(([key]) => key);
  }

  private dynamicIdentityKey(motif: string, signals: CreativeSignalProfile, seed: number) {
    const key = pick(this.topWeightKeys(signals.semanticWeights).length ? this.topWeightKeys(signals.semanticWeights) : signals.culturalWords.length ? signals.culturalWords : ["token-native"], seed + 5);
    return `creative-dna-${this.categoryId(`${motif}-${key}-${signals.energyLevel}`)}`;
  }

  private dynamicCategoryLabel(role: TraitCategoryRole, motif: string, signals: CreativeSignalProfile, seed: number) {
    const hint = pick(this.topHints(signals.semanticWeights), seed + 3);
    const roleWords = hint.roleWords?.[role] ?? [];
    if (roleWords.length) return `${motif} ${pick(roleWords, seed + 7)}`;
    const suffixes: Record<TraitCategoryRole, string[]> = {
      base: ["Bodies", "Forms", "Vessels", "Avatars"],
      background: ["Worlds", "Rooms", "Weather", "Districts"],
      head: ["Head Marks", "Crowns", "Masks", "Signals"],
      eyes: ["Eye States", "Optics", "Glares", "Blinks"],
      mouth: ["Reactions", "Mouth States", "Chants", "Expressions"],
      body: ["Fits", "Wraps", "Uniforms", "Shells"],
      prop: ["Objects", "Relics", "Tools", "Charms"],
      neck: ["Badges", "Tags", "Neck Signals", "Small Relics"],
      aura: ["Auras", "Weather", "FX Loads", "Signal Events"],
      frame: ["Frames", "Borders", "UI Edges", "Seals"],
      legendary: ["Myths", "Incidents", "One-Off Scenes", "Takeovers"],
      animation: ["Loops", "Motion States", "Idle Signals", "Reaction Layers"]
    };
    const anchor = titleCase(pick(unique([motif, ...signals.objects, ...signals.culturalWords]).filter(Boolean), seed + 11));
    return `${anchor} ${pick(suffixes[role], seed + 13)}`;
  }

  private nounsForRole(role: TraitCategoryRole, motif: string, signals: CreativeSignalProfile, seed: number) {
    const hints = this.topHints(signals.semanticWeights);
    const objects = unique([...hints.flatMap((hint) => hint.objects), ...signals.objects, motif]).filter(Boolean);
    const worlds = unique([...hints.flatMap((hint) => hint.worlds), ...signals.worldReferences, motif]).filter(Boolean);
    const expressions = unique([...hints.flatMap((hint) => hint.expressions), ...signals.emotions, motif]).filter(Boolean);
    const base = role === "background" ? worlds : role === "eyes" || role === "mouth" ? expressions : role === "aura" ? unique([...signals.dangerSafetyCues, ...worlds, ...expressions]) : role === "legendary" ? unique([...worlds, ...objects]) : objects;
    const fallback = {
      base: ["Origin Body", "Signal Form", "Holder Vessel"],
      background: ["Origin Room", "Signal District", "Myth Map"],
      head: ["Signal Mark", "Origin Mask", "Trait Crown"],
      eyes: ["Focus Blink", "Signal Stare", "Wide Glare"],
      mouth: ["Holder Smile", "Signal Gasp", "Meme Chant"],
      body: ["Origin Jacket", "Signal Wrap", "Holder Fit"],
      prop: ["Origin Relic", "Signal Tool", "Meme Object"],
      neck: ["Origin Tag", "Signal Charm", "Holder Badge"],
      aura: ["Signal Pulse", "Origin Drift", "Rarity Spark"],
      frame: ["Origin Border", "Signal Edge", "Myth Seal"],
      legendary: ["Origin Myth", "Signal Takeover", "One-Off Scene"],
      animation: ["Blink Loop", "Signal Pulse", "Reaction Pop"]
    }[role];
    return Array.from({ length: Math.min(8, Math.max(4, base.length)) }, (_, index) => titleCase(pick(base.length ? base : fallback, seed + index * 17)));
  }

  private forbiddenForSignals(signals: CreativeSignalProfile) {
    const specific = this.topWeightKeys(signals.semanticWeights);
    return [
      "generic crown",
      "plain aura",
      "template mascot",
      "random robot fallback",
      ...specific.length ? [`unrelated ${specific[0]} copy`] : []
    ];
  }

  private targetCount(role: TraitCategoryRole) {
    const counts: Record<TraitCategoryRole, number> = {
      base: 42,
      background: 60,
      head: 34,
      eyes: 38,
      mouth: 34,
      body: 48,
      prop: 70,
      neck: 24,
      aura: 28,
      frame: 14,
      legendary: 10,
      animation: 10
    };
    return counts[role];
  }

  private roleOrder(): TraitCategoryRole[] {
    return ["base", "background", "head", "eyes", "mouth", "body", "prop", "neck", "aura", "frame", "legendary", "animation"];
  }

  private paletteFromSignals(palette: string[], signals: CreativeSignalProfile, seed: number) {
    const accentByCue = signals.cueDial.luxury > 65 ? "#d8b65a" : signals.cueDial.cozy > 65 ? "#f6b7a8" : signals.cueDial.surreal > 65 ? "#8d7cff" : signals.cueDial.aggressive > 65 ? "#ff365e" : "#45e0a8";
    return unique([...palette, accentByCue, pick(["#101018", "#031017", "#16120f", "#06131f"], seed + 3)]).slice(0, 5);
  }

  private humorType(text: string, weights: Record<string, number>, seed: number) {
    if (/dead chat|rug|liquidation|panic|coughing|patient zero/.test(text)) return "deadpan stress humor";
    if (/cute|tiny|toast|sleep|cozy|oops/.test(text)) return "soft absurd humor";
    if ((weights["market-stress"] ?? 0) > 50) return "finance panic humor";
    if ((weights["medical-contamination"] ?? 0) > 50) return "outbreak paranoia humor";
    return pick(["ironic meme humor", "ritual in-joke humor", "surreal community humor"], seed + 5);
  }

  private energyLevel(text: string, weights: Record<string, number>) {
    if (/rage|war|pump|chaos|outbreak|breakout|combo/.test(text)) return "high volatility";
    if (/cozy|sleep|lofi|soft|calm/.test(text)) return "low warm";
    if ((weights["market-stress"] ?? 0) > 50 || (weights["machine-intelligence"] ?? 0) > 50) return "focused pressure";
    return "medium ritual";
  }

  private communityVibe(text: string, weights: Record<string, number>, seed: number) {
    if ((weights["medical-contamination"] ?? 0) > 50) return "paranoid outbreak crew";
    if ((weights["dream-surreal"] ?? 0) > 50) return "liminal dream circle";
    if ((weights["market-stress"] ?? 0) > 50) return "terminal stress desk";
    if (/cozy|soft|friend|blanket/.test(text)) return "cozy holder room";
    return pick(["raiding signal club", "meme ritual guild", "origin myth circle"], seed + 11);
  }

  private significantWords(value: string) {
    const stop = new Set(["with", "from", "that", "this", "into", "token", "coin", "official", "website", "twitter", "discord", "telegram", "https", "metadata", "example", "image", "symbol", "name", "for", "and", "the", "com", "json", "png", "false", "true", "description", "identity", "seed", "inferredidentityseed", "signalweights", "inferredsignals"]);
    return unique(value.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !stop.has(word))).slice(0, 80);
  }

  private productionAssetPolicy(): ProductionAssetPolicy {
    return {
      launchClassification: "CONCEPT_PREVIEW",
      commonToRareSource: "approved_layer_pack_required",
      epicLegendaryMythicSource: "curated_composition_required",
      aiFinalImageAllowed: false,
      artistReviewRequiredFor: ["Epic", "Legendary", "Mythic"],
      productionReadyRequires: [
        "human-designed base pack",
        "approved trait layer pack",
        "curated rarity composition rules",
        "permanent final asset storage",
        "artist-approved final assets for public launch"
      ]
    };
  }

  private categoryId(label: string) {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 48);
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
    return /^(token|coin|crypto|vault|nft|the|and|for|with|official|website|twitter|telegram|discord|metadata|image|description)$/i.test(word);
  }

  private genericTrait(value: string) {
    return /^(neon|cyber|green|gold|blue|red|hat|background|aura|eyes|shirt|crown)$/i.test(value.trim());
  }
}
