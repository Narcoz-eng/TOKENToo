import { Inject, Injectable } from "@nestjs/common";
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
  TraitCategoryRole,
  VisualDesignSystem,
  VisualRarityFrame
} from "./generator.types";
import { CreativeDnaService } from "./creative-dna.service";
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
  constructor(
    @Inject(RarityEngineService) private readonly rarity: RarityEngineService,
    private readonly creativeDnaService: CreativeDnaService = new CreativeDnaService()
  ) {}

  generate(input: CreateGenerationRunInput, analysis: LogoAnalysisOutput, context: CommunityContextOutput, version = 1): GeneratedStyleProfile {
    const seed = seedFrom(`${input.tokenMint}:${input.tokenSymbol}:${version}:${context.extractedVocabulary.join("|")}`);
    const source = input.hints?.sourceMetadata;
    const tokenName = input.tokenName ?? source?.name ?? "Token";
    const tokenSymbol = input.tokenSymbol ?? source?.symbol ?? "$TOKEN";
    const sourceWords = unique([...context.extractedVocabulary, ...this.sourceWords(input), ...analysis.visualKeywords]).filter((word) => !this.genericWord(word));
    const motif = this.primaryMotif(tokenName, tokenSymbol, sourceWords, context.extractedVocabulary, seed);
    const seedWorld = input.hints?.themePreference?.trim() || this.visualWorld(sourceWords, seed + 2);
    const universe = this.creativeUniverse(input, analysis, context, sourceWords, motif, seedWorld, seed);
    const world = universe.creativeDna.worldConcept;
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
    const rarityVisualRules = this.rarityVisualRules(motif, world, silhouette, universe.creativeDna.visualSystem);
    const compositionRules = this.visualCompositionRules(universe.creativeDna.visualSystem);
    const typographyDirection = this.visualTypographyDirection(universe.creativeDna.visualSystem);
    const compatibilityHints = this.visualCompatibilityHints(universe.creativeDna.visualSystem);
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
      compositionRules,
      traitNamingRules: [
        "Use generated Creative DNA language in every visible trait.",
        "Avoid fixed archetype labels and plain color/object names.",
        "Rarity must be readable from silhouette, glow, or composition."
      ],
      typographyDirection,
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
        ...compatibilityHints,
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
        visualSystem: universe.creativeDna.visualSystem,
        signalWeights: universe.signalProfile.semanticWeights,
        mascotArchetype: mascot,
        silhouetteFamily: silhouette,
        palette: colorSystem,
        backgroundWorld: world,
        traitVocabulary: traitLanguage,
        traitTaxonomy: universe.taxonomy.map((category) => `${category.role}:${category.label}`),
        artStyle: universe.artStyle,
        rendererFamily: universe.creativeDna.visualSystem.rendererFamily,
        renderingEngine: universe.creativeDna.visualSystem.renderingEngine,
        bodySystem: universe.creativeDna.visualSystem.bodySystem,
        anatomyModel: universe.creativeDna.visualSystem.anatomyModel,
        eyeSystem: universe.creativeDna.visualSystem.eyeSystem,
        faceGrammar: universe.creativeDna.visualSystem.faceGrammar,
        compositionStyle: universe.creativeDna.visualSystem.compositionStyle,
        cameraSystem: universe.creativeDna.visualSystem.cameraSystem,
        lightingModel: universe.creativeDna.visualSystem.lightingModel,
        rarityFrames: universe.creativeDna.visualSystem.rarityFrames,
        poseLanguage: universe.baseSilhouettes.map((base) => base.poseLanguage),
        moodCulture: universe.moodCulture.map((mood) => mood.name),
        compositionType: compositionRules,
        typographyDirection,
        loreMemeLanguage: brandDna.memeLanguage,
        legendaryDirection: brandDna.legendaryDirection,
        sourceMint: input.tokenMint,
        sourceSymbol: tokenSymbol,
        antiGenericRules: brandDna.forbiddenSimilarities
      },
      assetPackId: `creative-dna-${this.categoryId(`${motif}-${universe.creativeDna.visualSystem.rendererFamily}`)}`,
      artSource: "PROCEDURAL_FALLBACK",
      productionAssetStatus: "WIREFRAME",
      tenKReadiness,
      creativeUniverse: universe,
      productionAssetPolicy: universe.productionAssetPolicy
    };
  }

  private lore(input: CreateGenerationRunInput, analysis: LogoAnalysisOutput, context: CommunityContextOutput, theme: string, world: string) {
    if (context.lore) return context.lore;
    const symbol = input.tokenSymbol ?? input.hints?.sourceMetadata?.symbol ?? "$TOKEN";
    const anchor = this.publicAnchorWords(analysis.visualKeywords).slice(0, 3).join(", ") || "motion rituals, charged silhouettes, and holder suspense";
    return `${this.publicIdentityName(symbol)} is forming a ${theme} around ${anchor}. The collection is built for holders who want visible identity, raid energy, and staking progression.`;
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

  private visualCompositionRules(visual: VisualDesignSystem) {
    return [
      visual.compositionStyle,
      visual.cameraFraming,
      visual.bodySystem,
      visual.anatomyModel,
      visual.eyeSystem,
      visual.mouthSystem,
      visual.faceGrammar,
      visual.environmentSystem,
      visual.sceneGrammar,
      visual.rarityProgression,
      visual.legendaryPhilosophy,
      "Mood must alter visible face, posture, framing, or lighting rather than metadata text only.",
      "Legendary and mythic outputs must become scenes, incidents, or emotional snapshots."
    ];
  }

  private visualTypographyDirection(visual: VisualDesignSystem) {
    const directions: Record<VisualDesignSystem["rendererFamily"], string> = {
      "pixel-topdown": "pixel HUD labels, tiny map captions, no luxury serif badges",
      "cel-portrait": "cinematic cel poster type with asymmetric title placement",
      "clay-toy": "soft toy packaging labels with small handmade captions",
      "horror-poster": "specimen-file labeling, warning tape, surveillance timestamps",
      "terminal-brutalist": "monospace terminal UI, receipt rows, command-line captions",
      "surreal-collage": "cut-paper captions, album-cover labels, displaced text fragments",
      "sticker-pack": "die-cut sticker labels, small punchline captions, pack-sheet numbering",
      "comic-panel": "bold comic sound effects, panel captions, speech-bubble fragments",
      "cinematic-scene": "film-title lower thirds, location stamps, cinematic credits",
      "propaganda-poster": "large poster headline blocks, stamp marks, campaign slogans",
      "retro-arcade": "score HUD, stage labels, combo text, cartridge-era pixels",
      "low-poly": "minimal technical labels, viewport coordinates, low-poly asset tags",
      "painterly-portrait": "gallery plaque captions, brush-signature marks, emotional title cards",
      "children-cartoon": "bouncy title stickers, toy-box captions, mischief labels"
    };
    return directions[visual.rendererFamily];
  }

  private visualCompatibilityHints(visual: VisualDesignSystem) {
    return [
      `${visual.eyeSystem}: do not combine with head traits that hide the generated eye system.`,
      `${visual.mouthSystem}: do not combine with masks or props that erase the generated emotional mouth read.`,
      `${visual.bodySystem}: body traits must preserve the generated proportion and silhouette language.`,
      `${visual.compositionStyle}: frame, aura, and background traits must not collapse into a generic centered card.`,
      `${visual.legendaryPhilosophy}: legendary traits must change scene logic, not just add a label or badge.`
    ];
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

  private visualWorld(words: string[], seed: number) {
    const hints = this.topHints(this.semanticWeights(words.join(" "))).flatMap((hint) => hint.worlds);
    const anchor = titleCase(pick(words.length ? words : ["origin"], seed + 3));
    const selected = hints.length ? pick(hints, seed + 5) : pick(["source-code room", "holder alley", "logo-color habitat", "social-feed district", "symbol shrine", "market rumor map"], seed);
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
    const subject = this.publicIdentityName(mascot).split(/\s+/).slice(0, 2).join(" ") || motif;
    return [
      `${motif} Founder`,
      `${subject} Signal`,
      `${titleCase(pick(words.length ? words : [motif], seed + 31))} Scout`,
      `${motif} Raid Captain`,
      `${motif} Mythkeeper`
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
    seed: number
  ): CommunityCreativeUniverse {
    const signalProfile = this.extractSignals(input, analysis, context, words, seed);
    const creativeDna = this.generateCreativeDna(input, analysis, signalProfile, motif, world, seed);
    const taxonomy = this.dynamicTaxonomy(creativeDna, signalProfile, motif, seed);
    const moodCulture = this.dynamicMoodCulture(creativeDna, signalProfile, motif, seed);
    const baseSilhouettes = this.dynamicBaseSilhouettes(creativeDna, signalProfile, analysis.shapeLanguage, seed);
    const animationReadiness = this.dynamicAnimationReadiness(creativeDna, signalProfile, moodCulture, `${creativeDna.visualSystem.rendererFamily} ${creativeDna.visualSystem.emotionalRendering}`, seed);
    const archetype = this.creativeDnaService.identityKey(motif, signalProfile, seed);
    const productionAssetPolicy = this.productionAssetPolicy();
    return {
      archetype,
      signalProfile,
      creativeDna,
      inferredCommunityLanguage: unique([...context.memes, ...context.slogans, ...context.phrases, ...words, ...signalProfile.culturalWords]).slice(0, 32),
      artStyle: creativeDna.artStyle,
      artStyleReason: `${creativeDna.artStyle} was shaped from collection identity, visual references, social cues, and creator mood: ${this.topWeightKeys(signalProfile.semanticWeights).join(", ")}.`,
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
    const styleRefs = unique([...hints.flatMap((hint) => hint.styles), analysis.style]).filter(Boolean);
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

  private generateCreativeDna(input: CreateGenerationRunInput, analysis: LogoAnalysisOutput, signals: CreativeSignalProfile, motif: string, seedWorld: string, seed: number): CreativeDNA {
    const hints = this.topHints(signals.semanticWeights);
    const primary = hints[0];
    const secondary = hints[1] ?? primary;
    const primaryObjects = (primary.objects?.length ? primary.objects : unique([...signals.objects, motif])).filter(Boolean);
    const visualSystem = this.generateVisualSystem(signals, motif, seed);
    const texture = pick(unique([visualSystem.lightingModel, ...hints.flatMap((hint) => hint.textures), "inked grain", "cut-paper shadows", "sticker gloss", "screenprint noise"]), seed + 23);
    const styleBase = `${visualSystem.rendererFamily.replace(/-/g, " ")} ${visualSystem.compositionStyle}`;
    const worldCore = pick(unique([...signals.worldReferences, ...hints.flatMap((hint) => hint.worlds), seedWorld]), seed + 31);
    const worldConcept = `${motif} ${worldCore} ${pick(["micro-world", "signal district", "holder habitat", "myth room", "ritual market", "dream map"], seed + 37)}`.toLowerCase();
    const subjectWord = pick(unique([...signals.entities, analysis.mascot, motif]).filter(Boolean), seed + 41);
    const mascotOrSubject = this.publicSubjectName(motif, signals, analysis, subjectWord, seed);
    const baseSilhouetteRules = unique([
      `${visualSystem.bodySystem}; ${visualSystem.proportionSystem}; ${analysis.shapeLanguage} ${pick(primary.silhouettes, seed + 47)}`,
      `${visualSystem.headShape}; ${visualSystem.eyeSystem}; ${pick(primary.silhouettes, seed + 53)} with ${pick(primaryObjects, seed + 59)} readability`,
      `${visualSystem.compositionStyle}; ${visualSystem.cameraFraming}; rarity-specific silhouette changes`
    ]);
    const primaryMoods = unique([input.hints?.mood ?? "", ...primary.expressions]).filter(Boolean);
    const moodCulture = (primaryMoods.length >= 4 ? primaryMoods : unique([...primaryMoods, ...secondary.expressions, ...signals.emotions])).slice(0, 8);
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
      cameraFraming: visualSystem.cameraFraming,
      palette: this.paletteFromSignals(analysis.palette, signals, seed),
      textureLanguage: texture,
      visualSystem,
      moodCulture,
      expressionLanguage,
      traitCategories,
      rarityPhilosophy: `${motif} rarity follows ${visualSystem.rarityProgression}; silhouette, environment, posture, lighting, and emotional rendering must all change.`,
      legendaryMythology: `${motif} ${pick(signals.worldReferences.length ? signals.worldReferences : [worldConcept], seed + 83)} becomes ${visualSystem.legendaryPhilosophy}, where ${pick(primaryObjects, seed + 89)} changes the scene, camera, anatomy, lighting, and emotional snapshot.`,
      animationLanguage: `${motif} ${visualSystem.emotionalRendering} loops with ${texture} motion.`,
      forbiddenSimilarities: [
        "No fixed frog, dog, cat, robot, trader, or virus template selection.",
        "No shared circular face, centered portrait, neon glow, rarity badge, card frame, or background layout across collections.",
        "No generic vault/crown/robot fallback when metadata is sparse.",
        "No repeated world concept, rendering family, body system, eye system, base pose ladder, mood vocabulary, or legendary structure.",
        `Do not reuse the ${motif} Creative DNA for unrelated communities.`
      ]
    };
  }

  private publicSubjectName(motif: string, signals: CreativeSignalProfile, analysis: LogoAnalysisOutput, subjectWord: string, seed: number) {
    const source = `${motif} ${subjectWord} ${analysis.mascot} ${signals.objects.join(" ")} ${signals.worldReferences.join(" ")}`.toLowerCase();
    if (/hanta|hantavirus|virus|viral|biohazard|infection|pathogen|quarantine|mutation|toxic|lab/.test(source)) return `${motif} containment avatar`.toLowerCase();
    if (/aura|glow|signal|pulse|motion|energy/.test(source)) return `${motif} aura bearer`.toLowerCase();
    if (/chart|candle|market|liquidity|degen|pump/.test(source)) return `${motif} market sentinel`.toLowerCase();
    if (/dream|vapor|liminal|surreal/.test(source)) return `${motif} dream signal`.toLowerCase();
    return `${motif} ${pick(["signal bearer", "raid avatar", "origin sentinel", "myth keeper"], seed + 47)}`.toLowerCase();
  }

  private publicAnchorWords(words: string[]) {
    const forbidden = /^(has|sparse|official|metadata|internal|identity|seed|inferred|token|native|subject|context|fallback|provider|confidence)$/i;
    return unique(words.flatMap((word) => word.split(/\s+/)))
      .map((word) => word.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())
      .filter((word) => word.length > 2 && !forbidden.test(word))
      .slice(0, 8);
  }

  private publicIdentityName(value: string) {
    const clean = value
      .replace(/^\$/, "")
      .replace(/[^a-zA-Z0-9\s.-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) return "This community";
    return clean.length <= 6 && clean === clean.toUpperCase() ? clean : titleCase(clean);
  }

  private generateVisualSystem(signals: CreativeSignalProfile, motif: string, seed: number): VisualDesignSystem {
    const weights = signals.semanticWeights;
    const topKey = this.topWeightKeys(weights)[0] ?? "";
    const primaryHint = this.topHints(weights)[0];
    const family = this.creativeDnaService.selectRendererMedium(signals, seed);
    const objectPool = (primaryHint?.objects?.length ? primaryHint.objects : unique([...signals.objects, motif])).filter(Boolean);
    const worldPool = (primaryHint?.worlds?.length ? primaryHint.worlds : unique([...signals.worldReferences, "origin room"])).filter(Boolean);
    const object = pick(objectPool, seed + 11);
    const world = pick(worldPool, seed + 13);
    const systems: Record<VisualDesignSystem["rendererFamily"], Omit<VisualDesignSystem, "rendererFamily" | "rarityFrames">> = {
      "pixel-topdown": {
        renderingEngine: "pixel-engine",
        bodySystem: `${motif} tiny tile sprites with square-foot walk cycles`,
        headShape: "block head or tiny icon head, never circular portrait",
        eyeSystem: "two-to-four pixel eyes, blink frames, panic dots, sideways glances",
        mouthSystem: "single-pixel grimace, open shout tile, or missing-mouth deadpan",
        proportionSystem: "tiny bodies, oversized object readability, top-down limbs",
        anatomyModel: "8-bit walk-cycle body with independent head tile, hand tile, and prop tile",
        faceGrammar: "pixel eyes and mouth are separate swap frames, not one shared face",
        compositionStyle: "top-down arcade map with diagonal chaos lanes",
        cameraFraming: "orthographic top-down board view",
        cameraSystem: "locked orthographic camera with rarity-specific zoom, pan, and crowd density",
        lightingModel: "flat arcade color ramps with blinking hazard tiles",
        environmentSystem: `${world} as playable tile map with obstacles and moving clutter`,
        sceneGrammar: "environment is a game board; legendary and mythic are frozen gameplay incidents",
        emotionalRendering: "emotion shown by sprite lean, shake frames, eye pixels, and collision posture",
        rarityProgression: "map complexity, sprite mutation, obstacle density, and event tiles",
        legendaryPhilosophy: "a full playable incident map frozen at the decisive frame",
        cardStructure: "edge-to-edge pixel map, no centered portrait frame"
      },
      "cel-portrait": {
        renderingEngine: "portrait-engine",
        bodySystem: `${motif} shoulder-up character acting with hair/cloth silhouette breaks`,
        headShape: "angular portrait head with jawline, cheek planes, and non-circular crop",
        eyeSystem: "large cinematic eyes with highlights, tears, glare cuts, and blink layers",
        mouthSystem: "asymmetric lips, clenched teeth, whisper mouth, or trembling expression",
        proportionSystem: "portrait proportions, visible shoulders, dramatic neck and hand gesture",
        anatomyModel: "cel portrait anatomy with hair masses, neck tension, hand acting, and shoulder silhouette",
        faceGrammar: "eyes, brow, mouth, and hand tension all change per rarity and mood",
        compositionStyle: "cinematic portrait with off-center gaze and foreground object",
        cameraFraming: "shoulder-up emotional close-up",
        cameraSystem: "push-in portrait camera, alternating over-shoulder, profile, and wide reaction shots",
        lightingModel: "dramatic key light, rim shadow, and mood-specific color temperature",
        environmentSystem: `${world} as blurred emotional set dressing behind the face`,
        sceneGrammar: "portrait becomes a film reaction shot; legendary/mythic are story beats, not trait piles",
        emotionalRendering: "emotion shown through eye shape, brow tilt, mouth asymmetry, hand tension, and lighting",
        rarityProgression: "acting intensity, lighting contrast, hand/prop staging, and background story",
        legendaryPhilosophy: "a cinematic reaction shot at the exact community myth moment",
        cardStructure: "poster frame with asymmetrical title space, no rarity badge plate"
      },
      "clay-toy": {
        renderingEngine: "clay-render-engine",
        bodySystem: `${motif} handmade toy bodies with squash, fingerprints, and poseable limbs`,
        headShape: "soft sculpted head, bean or plush form, not a perfect circle",
        eyeSystem: "inset bead eyes, sleepy lids, lopsided buttons, blink dents",
        mouthSystem: "pressed clay smile, tiny worried notch, or raised smug bead",
        proportionSystem: "short rounded limbs, tactile chunky silhouette, toy shelf scale",
        anatomyModel: "stop-motion toy armature with squashed torso, bead eyes, and bendable limbs",
        faceGrammar: "face is sculpted clay dents and beads that visibly shift with mood",
        compositionStyle: "small diorama scene with props at table height",
        cameraFraming: "low macro toy photography",
        cameraSystem: "macro tabletop camera with shallow depth and set-piece cuts",
        lightingModel: "softbox shadows, ambient bounce, cozy practical lights",
        environmentSystem: `${world} as tactile miniature set with handmade props`,
        sceneGrammar: "rarity adds handmade set depth; legendary/mythic become one-off dioramas",
        emotionalRendering: "emotion shown by slumped clay posture, bead-eye angle, head tilt, and tiny hands",
        rarityProgression: "materials, set depth, sculpt complexity, and prop storytelling",
        legendaryPhilosophy: "a handmade diorama event with one-off sculpt and set",
        cardStructure: "photographic diorama crop, no graphic card border"
      },
      "horror-poster": {
        renderingEngine: "horror-engine",
        bodySystem: `${motif} mutated anatomy with infection growths and uneven limb mass`,
        headShape: "asymmetric specimen skull, swollen jaw, cracked mask, or parasite crown",
        eyeSystem: "mismatched pupils, fever glare, one sealed eye, microscope stare",
        mouthSystem: "crooked infected grin, cough gape, split-mouth snarl, or surgical seam",
        proportionSystem: "unbalanced torso, one oversized limb, visible growth stages",
        anatomyModel: "body evolves through infection stages with asymmetrical mass and unstable joints",
        faceGrammar: "face mutates per rarity: sealed eye, mismatched pupil, split mouth, fever glare",
        compositionStyle: "containment incident scene with unstable subject placement",
        cameraFraming: "surveillance close-up or low horror specimen crop",
        cameraSystem: "security-camera cuts, specimen close-ups, low-angle breach frames",
        lightingModel: "sick fluorescent horror, warning red, and contaminated green-blue spill",
        environmentSystem: `${world} as lab accident space with stains, tape, glass, and warning UI`,
        sceneGrammar: "rarity is containment failure; legendary/mythic are breach events",
        emotionalRendering: "emotion shown by asymmetric face, infected posture, tremor lines, and paranoid eye direction",
        rarityProgression: "infection stage, anatomy distortion, containment failure, and lab incident severity",
        legendaryPhilosophy: "a containment breach event where the subject changes form and scene logic",
        cardStructure: "specimen file or surveillance capture, no centered mascot card"
      },
      "terminal-brutalist": {
        renderingEngine: "terminal-engine",
        bodySystem: `${motif} reduced avatar made of terminal panels, desk posture, and dead UI blocks`,
        headShape: "rectangle screen, receipt strip, or cropped human silhouette",
        eyeSystem: "flat exhausted eye bars, cursor pupils, red wick stare, or empty sockets",
        mouthSystem: "one-line deadpan, error glyph, clenched dash, or no-mouth silence",
        proportionSystem: "minimal body, hunched shoulders, big desk/screen dominance",
        anatomyModel: "avatar is built from screens, receipts, cursor blocks, and desk posture",
        faceGrammar: "face is UI state: cursor pupils, flat bars, error glyph mouth, no-mouth silence",
        compositionStyle: "brutalist terminal layout with charts and negative space",
        cameraFraming: "wide terminal screen or desk-cam crop",
        cameraSystem: "screen-capture camera with panel crops, desk cams, and wide command-room views",
        lightingModel: "low-color monitor glow with harsh flat shadows",
        environmentSystem: `${world} as screen stack, orderbook, receipt, or command-line room`,
        sceneGrammar: "rarity increases information pressure; legendary/mythic are system failure screens",
        emotionalRendering: "emotion shown by posture collapse, screen glare, cursor eyes, and chart pressure",
        rarityProgression: "layout density, screen count, market scars, and emotional collapse",
        legendaryPhilosophy: "a market/system event screen captured at the irreversible moment",
        cardStructure: "brutalist UI panel, no glow aura or collectible badge"
      },
      "surreal-collage": {
        renderingEngine: "surreal-engine",
        bodySystem: `${motif} collage body with cutout layers, warped objects, and scale contradictions`,
        headShape: "mask, window, object-head, or melting silhouette",
        eyeSystem: "floating eyes, sticker pupils, VHS offsets, or hidden face fragments",
        mouthSystem: "cut-paper mouth, silent void, smile sticker, or displaced caption",
        proportionSystem: "dream scale shifts, elongated limbs, object-body hybrids",
        anatomyModel: "body is assembled from cutouts, object-heads, floating layers, and impossible scale",
        faceGrammar: "face fragments drift independently: eyes, captions, void mouths, sticker smiles",
        compositionStyle: "asymmetric collage scene with impossible perspective",
        cameraFraming: "album-cover surreal crop",
        cameraSystem: "album-cover crop with forced perspective shifts and object-scale jumps",
        lightingModel: "flat collage shadows, VHS bloom, or impossible sunset wash",
        environmentSystem: `${world} as layered dream set with props floating across depth planes`,
        sceneGrammar: "rarity increases dream logic; legendary/mythic swap subject and world roles",
        emotionalRendering: "emotion shown by object placement, scale, off-axis eyes, and unsettling negative space",
        rarityProgression: "layer count, impossible perspective, object transformation, and dream logic",
        legendaryPhilosophy: "a mythic dream tableau where the world and subject swap roles",
        cardStructure: "edge-to-edge collage canvas, no standard NFT card frame"
      },
      "sticker-pack": {
        renderingEngine: "sticker-engine",
        bodySystem: `${motif} die-cut sticker mascots with bendy limbs and punchline props`,
        headShape: "sticker head silhouette changes between blob, object, badge, and mascot icon",
        eyeSystem: "dot eyes, X-eyes, side glances, sticker eyelids, and meme tears",
        mouthSystem: "sticker grin, open yell, deadpan dash, sticker bite, or misplaced caption mouth",
        proportionSystem: "chunky sticker proportions with thick outline and exaggerated prop scale",
        anatomyModel: "flat sticker layers with detachable face decals, limbs, and object props",
        faceGrammar: "facial stickers swap positions and shapes per mood, including off-center misprints",
        compositionStyle: "sticker-sheet cluster with uneven cut lines and negative-space jokes",
        cameraFraming: "flat product scan or sticker-pack sheet view",
        cameraSystem: "flat lay camera with sheet crops, singles, and clustered pack spreads",
        lightingModel: "flat sticker gloss with paper shadows and small specular hits",
        environmentSystem: `${world} as a sticker sheet, phone case, laptop lid, or meme pack`,
        sceneGrammar: "rarity adds sticker count, misprint drama, and sheet storytelling",
        emotionalRendering: "emotion shown by sticker decal placement, body bend, misprint asymmetry, and caption-mouths",
        rarityProgression: "outline thickness, sticker count, prop jokes, pack layout, and misprint rarity",
        legendaryPhilosophy: "a one-off sticker sheet takeover where the pack tells a whole incident",
        cardStructure: "die-cut sheet layout, no portrait card"
      },
      "comic-panel": {
        renderingEngine: "comic-panel-engine",
        bodySystem: `${motif} comic actors with inked action poses and panel-breaking limbs`,
        headShape: "inked head shapes shift between profile, three-quarter, screaming, and shadowed mask",
        eyeSystem: "ink slits, shocked circles, speed-line glare, narrowed panels, and asymmetrical brows",
        mouthSystem: "speech-shout mouth, clenched teeth, gutter silence, caption mouth, or crooked grin",
        proportionSystem: "comic anatomy with elastic limbs, foreshortened hands, and panel-breaking silhouettes",
        anatomyModel: "inked comic anatomy with foreground hands, motion smears, and panel cuts",
        faceGrammar: "face is drawn through brow shape, panel angle, mouth bubble, and ink shadow",
        compositionStyle: "comic page panels with gutters, action diagonals, and sound-effect staging",
        cameraFraming: "panel crop, action close-up, or splash-page wide shot",
        cameraSystem: "panel-to-panel camera grammar with close-up, reaction, and splash page variants",
        lightingModel: "bold ink shadow, halftone light, and spot-color impact",
        environmentSystem: `${world} as panel backgrounds, speed lines, and action gutters`,
        sceneGrammar: "rarity escalates from single panel to splash-page event",
        emotionalRendering: "emotion shown by panel angle, ink shadow, mouth bubble, motion smear, and body impact",
        rarityProgression: "panel count, ink impact, motion, sound effects, and splash-page stakes",
        legendaryPhilosophy: "a splash-page event where the collection myth breaks the panel grid",
        cardStructure: "comic page crop, no standard badge frame"
      },
      "cinematic-scene": {
        renderingEngine: "cinematic-engine",
        bodySystem: `${motif} scene actors staged in environments with foreground/background depth`,
        headShape: "silhouette-first head reads through rim light, profile, helmet, or shadow cut",
        eyeSystem: "small cinematic eye glints, hard stares, reflected lights, or shadow-hidden eyes",
        mouthSystem: "subtle acting mouth, breath cloud, shout silhouette, or no-dialogue tension",
        proportionSystem: "full-scene human/creature proportions with foreground props and depth layers",
        anatomyModel: "film still anatomy with blocking, foreground props, and environmental scale",
        faceGrammar: "emotion is carried by camera, light, posture, and tiny facial acting",
        compositionStyle: "cinematic wide frame with foreground obstruction and environmental storytelling",
        cameraFraming: "wide film still, low angle, over-shoulder, or extreme close-up",
        cameraSystem: "shot-list camera grammar: establishing, medium, close-up, low angle, event wide",
        lightingModel: "cinematic key light, motivated practicals, atmospheric haze, and rim light",
        environmentSystem: `${world} as a film set with depth, weather, props, and blocked action`,
        sceneGrammar: "rarity is a shot progression; legendary/mythic are decisive film frames",
        emotionalRendering: "emotion shown by blocking, light direction, distance, posture, and atmosphere",
        rarityProgression: "camera distance, set scale, event stakes, atmospheric depth, and actor blocking",
        legendaryPhilosophy: "a cinematic event frame where the world is actively changing",
        cardStructure: "film still frame with location/scene marks, no collectible badge"
      },
      "propaganda-poster": {
        renderingEngine: "poster-engine",
        bodySystem: `${motif} emblematic poster figures with hard silhouette and symbolic props`,
        headShape: "iconic poster head, mask, statue profile, or emblem face",
        eyeSystem: "minimal poster eyes, cutout shadows, slogan gaze, or blank propaganda stare",
        mouthSystem: "slogan mouth, stern line, open chant, or sealed emblem",
        proportionSystem: "monumental poster proportions, graphic hands, and simplified anatomy",
        anatomyModel: "flat poster anatomy with hard shadows, symbol props, and monument scale",
        faceGrammar: "expression is poster rhetoric: gaze angle, slogan mouth, and graphic shadow",
        compositionStyle: "propaganda poster with diagonal hierarchy, symbol blocks, and oversized type",
        cameraFraming: "heroic low poster angle or flat campaign print",
        cameraSystem: "poster camera with monument scale, diagonal hierarchy, and type-as-composition",
        lightingModel: "hard graphic shadows, limited spot palette, screenprint grain",
        environmentSystem: `${world} as campaign symbols, banners, print texture, and crowd silhouettes`,
        sceneGrammar: "rarity adds public ritual, crowd scale, and symbolic takeover",
        emotionalRendering: "emotion shown by slogan pressure, body monumentality, shadow shape, and crowd scale",
        rarityProgression: "poster hierarchy, symbol density, crowd scale, print layers, and campaign stakes",
        legendaryPhilosophy: "a mythic campaign poster announcing a one-time community event",
        cardStructure: "full poster print, not a portrait card"
      },
      "retro-arcade": {
        renderingEngine: "arcade-engine",
        bodySystem: `${motif} arcade fighters and playable icons with stage-specific action frames`,
        headShape: "sprite head, boss icon, helmet tile, or tiny expression icon",
        eyeSystem: "arcade glints, hurt-frame eyes, victory eyes, boss eyes, and blink sprites",
        mouthSystem: "hurt-frame mouth, victory grin, shout sprite, or silent idle",
        proportionSystem: "sprite proportions with readable limbs, impact frames, and power-up props",
        anatomyModel: "arcade sprite anatomy with idle, hurt, attack, victory, and boss frames",
        faceGrammar: "face changes are animation frames, not static portrait features",
        compositionStyle: "arcade action frame with HUD, stage hazards, and combo lanes",
        cameraFraming: "side-scroller, top-down arena, or boss-stage framing",
        cameraSystem: "game camera with side-scroll, arena, boss zoom, and HUD crop variants",
        lightingModel: "limited arcade palette, flashing hit lights, scanline glow",
        environmentSystem: `${world} as playable stage with HUD, hazards, and power-ups`,
        sceneGrammar: "rarity escalates from idle sprite to boss-stage event",
        emotionalRendering: "emotion shown by animation frame, squash, hit flash, and HUD state",
        rarityProgression: "stage hazards, sprite frames, combo events, boss states, and HUD chaos",
        legendaryPhilosophy: "a boss-stage event frozen during the community's final input",
        cardStructure: "arcade screen capture with HUD, no collectible card border"
      },
      "low-poly": {
        renderingEngine: "low-poly-engine",
        bodySystem: `${motif} faceted low-poly figures with silhouette-first geometry`,
        headShape: "faceted helmet, object head, angular mask, or prism skull",
        eyeSystem: "small emissive triangles, visor slits, gem eyes, or blank polygons",
        mouthSystem: "polygon notch, broken seam, low-poly grin, or silent faceted face",
        proportionSystem: "low-poly proportions with big silhouette planes and readable joints",
        anatomyModel: "geometry-first anatomy with large planes, joints, and low-poly object props",
        faceGrammar: "face is defined by polygon cuts, emissive triangles, and edge highlights",
        compositionStyle: "isometric low-poly scene with geometric props and camera depth",
        cameraFraming: "isometric game asset view or low-poly cinematic angle",
        cameraSystem: "isometric and low-angle camera variants with geometry scale shifts",
        lightingModel: "flat-shaded facets, sharp rim edges, and gradient skybox light",
        environmentSystem: `${world} as faceted terrain, object clusters, and polygon ruins`,
        sceneGrammar: "rarity adds terrain complexity, geometry mutations, and scene scale",
        emotionalRendering: "emotion shown by polygon tilt, visor angle, posture, and faceted light",
        rarityProgression: "geometry complexity, environment scale, edge glow, and object transformation",
        legendaryPhilosophy: "a low-poly world event where the scene geometry reconfigures around the subject",
        cardStructure: "isometric viewport, no centered portrait card"
      },
      "painterly-portrait": {
        renderingEngine: "portrait-engine",
        bodySystem: `${motif} painterly busts with brushy silhouette breaks and visible gesture`,
        headShape: "painted head, mask, profile, or dissolved edge silhouette",
        eyeSystem: "brush-stroke eyes, wet highlights, half-lids, and abstract glances",
        mouthSystem: "painted smirk, smeared shout, closed line, or dissolved mouth",
        proportionSystem: "painterly portrait proportions with expressive shoulders and hand marks",
        anatomyModel: "painted bust anatomy with visible brush direction and gesture marks",
        faceGrammar: "emotion is brushwork: eye smear, mouth edge, cheek plane, and head tilt",
        compositionStyle: "painterly portrait with uneven crop, atmospheric background, and brush drama",
        cameraFraming: "painted bust crop or emotional close-up",
        cameraSystem: "portrait camera with crop shifts, profile turns, and brush-field depth",
        lightingModel: "painterly chiaroscuro, color fields, and brush-textured rim light",
        environmentSystem: `${world} as painted atmosphere, symbolic props, and texture fields`,
        sceneGrammar: "rarity escalates from study to finished emotional painting",
        emotionalRendering: "emotion shown by brush direction, eye smears, mouth edge, posture, and color temperature",
        rarityProgression: "brush density, crop drama, symbolic props, atmosphere, and emotional finish",
        legendaryPhilosophy: "a one-off painted emotional snapshot where the myth is captured as a portrait",
        cardStructure: "gallery painting crop, no badge plate"
      },
      "children-cartoon": {
        renderingEngine: "sticker-engine",
        bodySystem: `${motif} chaotic cartoon bodies with squash, noodle limbs, and toy-like props`,
        headShape: "rubber-hose head, object head, silly mask, or soft blob silhouette",
        eyeSystem: "button dots, spiral eyes, star eyes, sleepy arcs, and panic ovals",
        mouthSystem: "big open laugh, tiny oops mouth, wobble smile, or sticker bite",
        proportionSystem: "big head, rubber limbs, squash body, and prop-first readability",
        anatomyModel: "children-cartoon squash anatomy with noodle arms and overacting props",
        faceGrammar: "face is highly animated: star eyes, panic ovals, wobble smiles, and bite frames",
        compositionStyle: "toy-box cartoon chaos with bouncing props and playful depth",
        cameraFraming: "storybook close-up, toy-box wide, or bouncing sticker crop",
        cameraSystem: "playroom camera with wide chaos, close reaction, and toy-box stage variants",
        lightingModel: "bright cartoon flats, soft shadows, playful color pops",
        environmentSystem: `${world} as a toy-box/playroom stage with jumping props`,
        sceneGrammar: "rarity adds more mischief, props, and storybook chaos",
        emotionalRendering: "emotion shown by squashed posture, star eyes, mouth scale, prop motion, and goofy framing",
        rarityProgression: "prop chaos, squash intensity, toy-box depth, and storybook event scale",
        legendaryPhilosophy: "a full playroom incident where every prop joins the joke",
        cardStructure: "storybook/toy-box frame, no generic NFT card"
      }
    };
    const system = systems[family];
    const bodySystem = `${system.bodySystem}; dominant signal ${topKey || "token-native"}; anchor object ${object}`;
    const cameraAnchor = pick(unique([...objectPool, ...worldPool, motif]).filter(Boolean), seed + 101);
    const culturePool = unique([...(primaryHint?.danger ?? []), ...(primaryHint?.expressions ?? []), ...signals.memeLanguage, motif]).filter(Boolean);
    const emotionPool = (primaryHint?.expressions?.length ? primaryHint.expressions : unique([...signals.emotions, signals.energyLevel, motif])).filter(Boolean);
    const cultureAnchor = pick(culturePool, seed + 103);
    const emotionAnchor = pick(emotionPool, seed + 107);
    const personalizedSystem = {
      ...system,
      bodySystem,
      cameraSystem: `${system.cameraSystem}; ${motif} shot grammar follows ${cameraAnchor} through ${world} with ${emotionAnchor} timing`,
      lightingModel: `${system.lightingModel}; keyed to ${emotionAnchor} and ${cameraAnchor}`,
      environmentSystem: `${system.environmentSystem}; preserve ${cultureAnchor} and ${cameraAnchor} as production layer cues`,
      rarityProgression: `${system.rarityProgression}; ${motif} ladder escalates ${cameraAnchor}, ${cultureAnchor}, ${world}, and ${emotionAnchor}`,
      legendaryPhilosophy: `${system.legendaryPhilosophy}; built around ${object} and the ${cultureAnchor} myth`
    };
    return {
      ...personalizedSystem,
      rendererFamily: family,
      rarityFrames: this.rarityFrames(family, personalizedSystem.renderingEngine, motif, object, world, personalizedSystem, seed)
    };
  }

  private rarityFrames(
    family: VisualDesignSystem["rendererFamily"],
    engine: VisualDesignSystem["renderingEngine"],
    motif: string,
    object: string,
    world: string,
    system: Omit<VisualDesignSystem, "rendererFamily" | "rarityFrames">,
    seed: number
  ): VisualDesignSystem["rarityFrames"] {
    const eventWords = ["first signal", "pressure spike", "identity rupture", "world event", "myth frame", "one-off takeover"];
    const entries: VisualRarityFrame[] = [
      {
        rarity: "Common",
        composition: `entry read in ${system.compositionStyle}`,
        camera: `identity camera: ${system.cameraSystem}`,
        subjectTreatment: `base ${system.anatomyModel}`,
        faceTreatment: `neutral ${system.faceGrammar}`,
        bodyLanguage: `low-intensity ${system.emotionalRendering}`,
        environment: `quiet ${system.environmentSystem}`,
        lighting: `baseline ${system.lightingModel}`,
        event: `${motif} ${pick(eventWords, seed + 1)}`,
        silhouetteMutation: `clean ${family} silhouette`,
        animationCue: "idle blink or breathing loop"
      },
      {
        rarity: "Uncommon",
        composition: `off-axis variant of ${system.compositionStyle}`,
        camera: `tilted camera variation in ${system.cameraSystem}`,
        subjectTreatment: `small prop/body shift around ${object}`,
        faceTreatment: `blink/asymmetry pass using ${system.faceGrammar}`,
        bodyLanguage: `noticeable lean or stance change`,
        environment: `first active layer inside ${world}`,
        lighting: `small mood shift in ${system.lightingModel}`,
        event: `${object} enters frame`,
        silhouetteMutation: `one visible appendage or prop breaks the base outline`,
        animationCue: "blink plus prop wobble"
      },
      {
        rarity: "Rare",
        composition: `deeper scene variant with foreground/background separation`,
        camera: `rarer crop from ${system.cameraSystem}`,
        subjectTreatment: `stronger anatomy read: ${system.anatomyModel}`,
        faceTreatment: `asymmetric eyes and mouth state from ${system.faceGrammar}`,
        bodyLanguage: `emotion-driven posture, not neutral standing`,
        environment: `richer ${system.environmentSystem}`,
        lighting: `stronger contrast in ${system.lightingModel}`,
        event: `${motif} pressure beat with ${object}`,
        silhouetteMutation: `secondary shape changes the outline`,
        animationCue: "expression loop plus aura/lighting pulse"
      },
      {
        rarity: "Epic",
        composition: `action composition with diagonal movement and staging`,
        camera: `dramatic crop/zoom from ${system.cameraSystem}`,
        subjectTreatment: `premium body and prop transformation around ${object}`,
        faceTreatment: `high-emotion expression from ${system.faceGrammar}`,
        bodyLanguage: `active gesture, impact, collapse, or performance pose`,
        environment: `complex ${system.environmentSystem}`,
        lighting: `event lighting through ${system.lightingModel}`,
        event: `${motif} event threshold`,
        silhouetteMutation: `major outline shift with visible rarity read`,
        animationCue: "idle cycle changes into action loop"
      },
      {
        rarity: "Legendary",
        composition: `scene-level legendary frame: ${system.legendaryPhilosophy}`,
        camera: `new camera language from ${system.cameraSystem}`,
        subjectTreatment: `new silhouette and anatomy state, not upgraded base`,
        faceTreatment: `unique emotional snapshot using ${system.faceGrammar}`,
        bodyLanguage: `story pose tied to the event`,
        environment: `legendary ${world} event environment`,
        lighting: `signature lighting event in ${system.lightingModel}`,
        event: `${motif} ${object} incident`,
        silhouetteMutation: `legendary silhouette is separately readable`,
        animationCue: "reaction frame, event loop, and lighting pulse"
      },
      {
        rarity: "Mythic",
        composition: `near-1/1 mythic world takeover using ${system.sceneGrammar}`,
        camera: `one-off camera impossible for lower tiers`,
        subjectTreatment: `mythic transformed subject with scene-owned anatomy`,
        faceTreatment: `one-off face grammar: transformed eyes, mouth, and emotional lighting`,
        bodyLanguage: `full narrative body language with environment interaction`,
        environment: `mythic ${system.environmentSystem} changed by ${object}`,
        lighting: `mythic lighting rule, not just stronger glow`,
        event: `${motif} ${object} mythic takeover`,
        silhouetteMutation: `near-1/1 silhouette and scale change`,
        animationCue: "multi-state loop with blink, expression, event, and camera motion"
      }
    ];
    return Object.fromEntries(entries.map((entry) => [entry.rarity, { ...entry, composition: `${engine}: ${entry.composition}` }])) as VisualDesignSystem["rarityFrames"];
  }

  private dynamicTaxonomy(dna: CreativeDNA, signals: CreativeSignalProfile, motif: string, seed: number): TraitCategoryPlan[] {
    return this.roleOrder().map((role, index) => {
      const label = dna.traitCategories[index] ?? this.dynamicCategoryLabel(role, motif, signals, seed + index * 17);
      const nouns = this.nounsForRole(role, motif, signals, seed + index * 101);
      return {
        id: this.categoryId(label),
        label,
        role,
        description: `${label} production layer group shaped around ${this.topWeightKeys(signals.semanticWeights).join(", ") || motif}.`,
        targetCount: this.targetCount(role),
        nouns,
        forbiddenConcepts: this.forbiddenForSignals(signals)
      };
    });
  }

  private dynamicBaseSilhouettes(dna: CreativeDNA, signals: CreativeSignalProfile, shapeLanguage: string, seed: number): BaseSilhouettePlan[] {
    const objects = signals.objects.length ? signals.objects : ["signal", "relic", "badge"];
    const visual = dna.visualSystem;
    const family = visual.rendererFamily;
    const fallbackPoseVerbs = ["off-axis acting", "prop-driven leaning", "environment-reacting", "camera-aware turning", "scene-breaking"];
    const poseVerbs: Partial<Record<VisualDesignSystem["rendererFamily"], string[]>> = {
      "pixel-topdown": ["tile-dashing", "corner-camping", "item-carrying", "hazard-dodging", "crowd-bumping"],
      "cel-portrait": ["over-shoulder glaring", "hand-clenched reacting", "tearline holding", "jaw-tight turning", "foreground-reaching"],
      "clay-toy": ["slumped tabletop", "tiny-hand waving", "head-tilted wobbling", "squash-foot planted", "prop-hugging"],
      "horror-poster": ["tremor-crouched", "limb-dragging", "glass-pressed", "warning-lit recoiling", "growth-burst twisting"],
      "terminal-brutalist": ["desk-collapsing", "screen-hunched", "cursor-staring", "receipt-folded", "chart-lit frozen"],
      "surreal-collage": ["scale-slipping", "object-swapping", "cutout-drifting", "mask-displaced", "perspective-falling"],
      "sticker-pack": ["die-cut bending", "misprint leaning", "prop-hugging", "sheet-peeling", "caption-biting"],
      "comic-panel": ["panel-breaking", "speed-line lunging", "speech-bubble shouting", "gutter-hiding", "impact-falling"],
      "cinematic-scene": ["over-shoulder blocking", "low-angle bracing", "foreground-reaching", "wide-shot isolated", "event-lit turning"],
      "propaganda-poster": ["monument-standing", "banner-pointing", "crowd-facing", "slogan-chanting", "symbol-hoisting"],
      "retro-arcade": ["attack-frame lunging", "hurt-frame blinking", "boss-stage posing", "combo-dashing", "victory-hopping"],
      "low-poly": ["faceted leaning", "isometric stepping", "edge-lit bracing", "prism-turning", "geometry-shifting"],
      "painterly-portrait": ["brush-tilted", "profile-turning", "hand-to-face acting", "shadow-sinking", "rim-lit looking"],
      "children-cartoon": ["squash-bouncing", "noodle-arm waving", "toy-box tumbling", "star-eye wobbling", "prop-chasing"]
    };
    const fallbackFrames = ["off-axis scene crop", "wide environment frame", visual.cameraFraming];
    const frames: Partial<Record<VisualDesignSystem["rendererFamily"], string[]>> = {
      "pixel-topdown": ["orthographic tile viewport", "mini-map crowd read", visual.cameraFraming],
      "cel-portrait": ["off-center shoulder portrait", "foreground hand crop", visual.cameraFraming],
      "clay-toy": ["macro tabletop crop", "toy shelf diorama crop", visual.cameraFraming],
      "horror-poster": ["surveillance specimen crop", "low containment angle", visual.cameraFraming],
      "terminal-brutalist": ["desk-cam layout", "wide terminal viewport", visual.cameraFraming],
      "surreal-collage": ["album-cover crop", "layered paper stage", visual.cameraFraming],
      "sticker-pack": ["sticker sheet flat lay", "die-cut single crop", visual.cameraFraming],
      "comic-panel": ["panel close-up", "splash-page wide", visual.cameraFraming],
      "cinematic-scene": ["establishing wide", "low-angle film still", visual.cameraFraming],
      "propaganda-poster": ["heroic poster angle", "flat campaign print", visual.cameraFraming],
      "retro-arcade": ["side-scroll stage", "boss-stage viewport", visual.cameraFraming],
      "low-poly": ["isometric viewport", "low-poly low angle", visual.cameraFraming],
      "painterly-portrait": ["gallery portrait crop", "profile brush crop", visual.cameraFraming],
      "children-cartoon": ["toy-box wide", "storybook close-up", visual.cameraFraming]
    };
    const fallbackRoles = ["Actor", "Subject", "Event", "Variant"];
    const roles: Partial<Record<VisualDesignSystem["rendererFamily"], string[]>> = {
      "pixel-topdown": ["Sprite", "NPC", "Map Event", "Pickup"],
      "cel-portrait": ["Lead", "Witness", "Rival", "Closeup"],
      "clay-toy": ["Figurine", "Shelf Friend", "Miniature", "Plush"],
      "horror-poster": ["Specimen", "Patient", "Carrier", "Incident"],
      "terminal-brutalist": ["Operator", "Screen", "Desk Ghost", "Terminal"],
      "surreal-collage": ["Cutout", "Mask", "Dream Body", "Fragment"],
      "sticker-pack": ["Sticker", "Peel", "Decal", "Misprint"],
      "comic-panel": ["Panel Lead", "Splash Figure", "Gutter Witness", "Action Beat"],
      "cinematic-scene": ["Actor", "Frame", "Witness", "Set Piece"],
      "propaganda-poster": ["Icon", "Banner", "Chant", "Campaign Figure"],
      "retro-arcade": ["Fighter", "Boss", "Pickup", "Stage Event"],
      "low-poly": ["Mesh", "Prism", "Isometric Figure", "Geometry Event"],
      "painterly-portrait": ["Sitter", "Study", "Profile", "Brush Figure"],
      "children-cartoon": ["Toy", "Mischief", "Sidekick", "Storybook Figure"]
    };
    const roleSet = roles[family] ?? fallbackRoles;
    const poseSet = poseVerbs[family] ?? fallbackPoseVerbs;
    const frameSet = frames[family] ?? fallbackFrames;
    return Array.from({ length: 3 }, (_, index) => {
      return {
        name: `${titleCase(pick(signals.entities.length ? signals.entities : ["Origin"], seed + index * 11))} ${pick(roleSet, seed + index * 13)}`,
        bodyShape: `${family}; ${visual.bodySystem}; ${visual.headShape}; ${pick(signals.visualShapes.length ? signals.visualShapes : [shapeLanguage], seed + index * 7)}`,
        poseLanguage: `${pick(poseSet, seed + index * 17)} with ${pick(objects, seed + index * 19)}; ${visual.emotionalRendering}`,
        proportions: `${visual.proportionSystem}; ${pick(signals.visualShapes.length ? signals.visualShapes : ["clear"], seed + index * 29)} shape cues`,
        cameraFraming: index === 2 ? visual.cameraFraming : pick(frameSet, seed + index * 31),
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
      const stanceWord = pick(["braced", "tilted", "cornered", "floating", "locked-in", "soft"], seed + index * 31);
      const auraWord = pick(signals.dangerSafetyCues.length ? signals.dangerSafetyCues : signals.worldReferences.length ? signals.worldReferences : ["signal"], seed + index * 41);
      return {
        name: `${motif} ${titleCase(mood)} ${titleCase(object)} ${titleCase(stanceWord)}`,
        expression: `${mood} ${signals.humorType}`,
        eyeLanguage: `${titleCase(pick(signals.visualShapes.length ? signals.visualShapes : ["signal"], seed + index * 19))} ${pick(["stare", "blink", "glare", "squint", "wide-eye"], seed + index * 23)}`,
        mouthLanguage: `${titleCase(pick(dna.expressionLanguage.length ? dna.expressionLanguage : [mood], seed + index * 29))} mouth`,
        stance: `${stanceWord} ${object} stance`,
        gesture: `${object} ${pick(["grip", "point", "lift", "shield", "clutch", "offer"], seed + index * 37)}`,
        auraBehavior: `${auraWord} ${pick(["pulse", "drift", "flash", "spark", "haze"], seed + index * 43)}`,
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
    const stop = new Set(["with", "from", "that", "this", "into", "token", "coin", "official", "website", "twitter", "discord", "telegram", "https", "metadata", "example", "image", "symbol", "name", "for", "and", "the", "com", "json", "png", "false", "true", "description", "identity", "seed", "sparse", "internal", "inferred", "fallback", "provider", "confidence", "context", "inferredidentityseed", "signalweights", "inferredsignals"]);
    return unique(value.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !stop.has(word))).slice(0, 80);
  }

  private productionAssetPolicy(): ProductionAssetPolicy {
    return {
      launchClassification: "CONCEPT_PREVIEW",
      defaultAssetStatus: "WIREFRAME",
      commonToRareSource: "approved_layer_pack_required",
      epicLegendaryMythicSource: "curated_composition_required",
      aiFinalImageAllowed: false,
      aiAssistedFinalOutputsAllowed: true,
      layeredExportsAllowed: true,
      artistCleanupAllowed: true,
      selectiveManualCurationAllowed: true,
      creatorApprovalRequiredBeforeMint: true,
      massAutomaticPublicMintGeneration: false,
      previewQualityTarget: "MINT_WORTHY_STUDIO_PREVIEW",
      artistReviewRequiredFor: ["Epic", "Legendary", "Mythic"],
      productionReadyRequires: [
        "locked art direction",
        "approved silhouette system",
        "approved faction culture",
        "approved trait families",
        "approved cinematic direction",
        "curated or artist-cleaned layered exports",
        "permanent final asset storage",
        "creator-approved final assets for public launch"
      ]
    };
  }

  private categoryId(label: string) {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 48);
  }

  private rarityVisualRules(motif: string, world: string, silhouette: string, visual: VisualDesignSystem): Record<string, RarityComplexityRule> {
    const progress = visual.rarityProgression;
    return {
      Common: { minTraits: 2, maxTraits: 4, pose: `${visual.cameraFraming} intro pose`, background: `simple ${visual.environmentSystem}`, aura: "none", frame: "none", composition: `${motif} ${visual.compositionStyle} common read` },
      Uncommon: { minTraits: 3, maxTraits: 5, pose: `${visual.emotionalRendering} variation`, background: `small ${visual.environmentSystem} shift`, aura: "none", frame: "standard", composition: `first ${progress} step` },
      Rare: { minTraits: 5, maxTraits: 7, pose: `${visual.bodySystem} stronger acting beat`, background: `richer ${world}`, aura: "mild", frame: "standard", composition: `${visual.eyeSystem} and ${visual.mouthSystem} become visible` },
      Epic: { minTraits: 7, maxTraits: 9, pose: `${visual.compositionStyle} event pose`, background: `complex ${visual.environmentSystem}`, aura: "strong", frame: "special", composition: `${silhouette}; ${progress}; lighting changes through ${visual.lightingModel}` },
      Legendary: { minTraits: 9, maxTraits: 11, pose: `${visual.legendaryPhilosophy} scene pose`, background: `${visual.legendaryPhilosophy} background`, aura: "signature", frame: "special", composition: `${visual.legendaryPhilosophy}; new camera, anatomy, face, and environment` },
      Mythic: { minTraits: 10, maxTraits: 12, pose: `near 1/1 ${visual.rendererFamily} curated moment`, background: `one-off ${visual.environmentSystem}`, aura: "signature", frame: "mythic", composition: `near 1/1 ${visual.cardStructure}; ${visual.legendaryPhilosophy}` }
    };
  }

  private genericWord(word: string) {
    return /^(token|coin|crypto|vault|nft|the|and|for|with|official|website|twitter|telegram|discord|metadata|image|description)$/i.test(word);
  }

  private genericTrait(value: string) {
    return /^(neon|cyber|green|gold|blue|red|hat|background|aura|eyes|shirt|crown)$/i.test(value.trim());
  }
}
