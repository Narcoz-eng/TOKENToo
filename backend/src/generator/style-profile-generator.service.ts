import { Injectable } from "@nestjs/common";
import { getPreset } from "./art-presets";
import { selectAssetPack } from "./curated-asset-packs";
import type {
  AnimationReadinessPlan,
  BaseSilhouettePlan,
  CommunityContextOutput,
  CommunityCreativeUniverse,
  CreateGenerationRunInput,
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
    const universe = this.creativeUniverse(input, analysis, context, sourceWords, motif, world, seed, preset);
    const assetPack = selectAssetPack(analysis.mascot, [...sourceWords, ...context.traitSeeds, world]);
    const silhouette = this.silhouette(analysis, sourceWords, seed);
    const mascot = `${analysis.mascot} ${silhouette}`;
    const theme = `${motif} ${pick(["vault circle", "holder house", "raid club", "signal crew", "meme order", "liquidity guild"], seed + 6)}`;
    const roleNames = unique([...context.roleNames, ...this.roleLanguage(motif, analysis.mascot, sourceWords, seed)]).slice(0, 10);
    const cultureNouns = universe.taxonomy.flatMap((category) => category.nouns);
    const traitLanguage = unique([
      ...this.communityTraitLanguage(tokenName, sourceWords, analysis, seed, cultureNouns),
      ...context.traitSeeds,
      ...context.backgroundNames,
      ...cultureNouns
    ]).filter((trait) => !this.genericTrait(trait)).slice(0, 32);

    const lore = this.lore(input, analysis, context, theme, world);
    const tenKReadiness = this.tenKReadiness(input, analysis);
    const colorSystem = this.collectionColorSystem(analysis.palette, input.hints?.colorPreference);
    const rarityVisualRules = this.rarityVisualRules(motif, world, silhouette);
    const baseArchetypes = universe.baseSilhouettes.map((item) => `${item.name}: ${item.bodyShape}, ${item.poseLanguage}, ${item.cameraFraming}`);
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
      baseSilhouettes: universe.baseSilhouettes,
      moodCulture: universe.moodCulture,
      animationReadiness: universe.animationReadiness,
      productionAssetPolicy: universe.productionAssetPolicy,
      traitTaxonomy: universe.taxonomy,
      rarityVisualRules,
      forbiddenSimilarities: [
        ...assetPack.forbiddenCombinations.map((item) => `${item.trait}: ${item.incompatibleWith.join(", ")}`),
        "No generic neon cyber mascot identity without token-specific vocabulary.",
        "No platform Phew lime/cyan/gold palette as the collection identity.",
        "No legendary recolors; legendary/mythic must change pose, scene, frame, and FX.",
        ...universe.antiGenericRules
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
      artStyle: universe.artStyle,
      colors: analysis.palette,
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
        mascotArchetype: analysis.mascot,
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
    if (/vapor|vaporwave|surreal|liminal|mall|vhs|pool/.test(source)) return "liminal vaporwave arcade";
    if (/skull|bone|reaper|crypt|shadow|cursed|dark/.test(source)) return "black moon crypt market";
    if (/dog|doge|shib|inu|bone|pack/.test(source)) return "moonlit kennel dojo district";
    if (/cat|kitty|meow|claw|nft/.test(source)) return "night market alley network";
    if (/degen|pump|casino|moon|chart|liquidity/.test(source)) return "chart-lit degen bazaar";
    if (/(^|\s)(ai|bot)(\s|$)|robot|agent|neural|compute/.test(source)) return "autonomous machine server temple";
    if (/pepe|frog|swamp|bog|pond/.test(source)) return "memetic swamp trading floor";
    if (/cute|toy|toast|sticker|soft|candy/.test(source)) return "sunny sticker toy room";
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

  private communityTraitLanguage(tokenName: string, words: string[], analysis: LogoAnalysisOutput, seed: number, cultureNouns: string[] = []) {
    const motifs = unique([...words, ...tokenName.split(/\W+/), ...analysis.visualKeywords]).filter((word) => word.length > 2 && !this.genericWord(word));
    const nouns = cultureNouns.length
      ? unique(cultureNouns).slice(0, 28)
      : ["emblem", "chant", "sigil", "trade mark", "holder badge", "raid prop", "scene key", "origin mark", "meme relic", "liquidity tag"];
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
    const text = unique([...words, ...context.extractedVocabulary, analysis.mascot, input.hints?.mood ?? ""]).join(" ").toLowerCase();
    const archetype = this.communityArchetype(text, analysis.mascot);
    const art = this.artDirection(archetype, text, motif, preset.artStyle, seed);
    const taxonomy = this.taxonomy(archetype, motif, words, seed);
    const moodCulture = this.moodCulture(archetype, motif, seed);
    const baseSilhouettes = this.baseSilhouettes(archetype, motif, analysis.shapeLanguage, world, seed);
    const animationReadiness = this.animationReadiness(archetype, motif, moodCulture, preset.animationDirection);
    const productionAssetPolicy = this.productionAssetPolicy();
    return {
      archetype,
      inferredCommunityLanguage: unique([...context.memes, ...context.slogans, ...context.phrases, ...words]).slice(0, 28),
      artStyle: art.style,
      artStyleReason: art.reason,
      taxonomy,
      baseSilhouettes,
      moodCulture,
      animationReadiness,
      productionAssetPolicy,
      antiGenericRules: [
        `Do not reuse ${archetype} categories outside communities with matching token metadata.`,
        "Do not approve collection taxonomy if more than half the trait categories are shared with another collection.",
        "Do not repeat crown, armor, aura, or frame concepts unless the community metadata explicitly supports them.",
        "Do not ship common/uncommon/rare NFTs from generic AI image output; use approved layer packs.",
        "Do not mark production-ready without curated or handmade layers and permanent final storage."
      ]
    };
  }

  private communityArchetype(text: string, mascot: string) {
    if (/vapor|vaporwave|surreal|dream|synth|mall|liminal|gradient|vhs|pool/.test(text) || /abstract/.test(mascot)) return "abstract-vaporwave";
    if (/frog|pepe|toad|bog|swamp|ribbit|pond/.test(text) || /frog/.test(mascot)) return "frog-degen";
    if (/skull|bone|reaper|necromancer|crypt|shadow|cursed|dark/.test(text) || /skull/.test(mascot)) return "dark-fantasy-skull";
    if (/dog|doge|shib|inu|kennel|bark|bone|cozy|blanket|lofi/.test(text) || /dog|samurai/.test(mascot)) return /cozy|blanket|lofi|soft/.test(text) ? "dog-cozy" : "dog-pack";
    if (/cat|kitty|meow|claw|nine.?life|streamer|arcade/.test(text) || /cat/.test(mascot)) return "cat-hyper-meme";
    if (/(^|\s)(ai|bot)(\s|$)|robot|agent|neural|compute|machine|model|swarm/.test(text) || /robot/.test(mascot)) return "robot-ai";
    if (/trader|terminal|chart|candle|liquidation|perp|finance|yield|market|index/.test(text)) return "trader-finance";
    if (/cute|baby|toy|nursery|cartoon|kids|soft|candy|toast|sticker|breakfast/.test(text) || /cute/.test(mascot)) return "cute-cartoon";
    return "token-native";
  }

  private artDirection(archetype: string, text: string, motif: string, fallback: string, seed: number) {
    const choices: Record<string, string[]> = {
      "frog-degen": ["pixel art swamp prophecy", "hand-drawn meme poster art", "retro game bog cult"],
      "dog-cozy": ["children's cartoon cozy streetwear", "clay rendered toy kennel club", "soft cartoon sticker pack"],
      "dog-pack": ["streetwear mascot cartoon", "comic dog raid crew", "low-poly moon pack"],
      "cat-hyper-meme": ["hand-drawn hyper meme arcade", "anime streamer-room chaos", "comic night-market cat"],
      "robot-ai": ["glitch/cyber machine poster", "low-poly autonomous robot", "trading-terminal AI interface"],
      "trader-finance": ["trading-terminal aesthetic", "comic finance stress poster", "arcade liquidation screen"],
      "dark-fantasy-skull": ["dark fantasy cursed collectible", "horror cute skull storybook", "painterly raid crypt"],
      "cute-cartoon": ["children's cartoon collectible", "clay/rendered toy mascot", "soft poster art"],
      "abstract-vaporwave": ["surreal vaporwave poster art", "abstract retro game dream", "glitch/cyber vaporwave"],
      "token-native": [fallback, "luxury collectible poster art", "community mascot cartoon"]
    };
    const style = pick(choices[archetype] ?? choices["token-native"], seed + 17);
    const reason = `${style} was selected because ${motif} metadata language maps to ${archetype} community signals instead of a platform-wide preset.`;
    return { style, reason };
  }

  private taxonomy(archetype: string, motif: string, words: string[], seed: number): TraitCategoryPlan[] {
    const keyword = titleCase(pick(words.length ? words : [motif], seed + 19));
    const build = (role: TraitCategoryRole, label: string, targetCount: number, nouns: string[], description: string, forbiddenConcepts: string[] = []) => ({
      id: this.categoryId(label),
      label,
      role,
      description,
      targetCount,
      nouns,
      forbiddenConcepts
    });
    const sets: Record<string, TraitCategoryPlan[]> = {
      "frog-degen": [
        build("base", `${motif} Bog Bodies`, 42, ["Squat Idol", "Pond Prophet", "Liquidity Toad", "Mud Oracle", "Ribbit Raider"], "Wide squat frog silhouettes with meme-eye readability."),
        build("background", `${keyword} Swamp Weather`, 60, ["Mire Dawn", "Pond Candle", "Bog Floor", "Chart Rain", "Lily Ruin"], "Swamp scenes shaped by degen chart language."),
        build("head", "Swamp Crowns", 34, ["Reed Crown", "Mold Tiara", "Lilypad Cap", "Bog Circlet"], "Frog-specific status marks.", ["generic crown"]),
        build("eyes", "Prophecy Eyes", 36, ["Rugged Pupil", "Candle Stare", "Ribbit Blink", "Moon Bog Gaze"], "Eye language from prophecy and chart anxiety."),
        build("mouth", "Ribbit Reactions", 30, ["Croak Smirk", "Bogged Grin", "Pond Gasp", "Degen Tongue"], "Community-specific meme reactions."),
        build("body", "Mire Wraps", 44, ["Algae Hoodie", "Mud Poncho", "Chart Vest", "Wader Cloak"], "Body layers that feel swamp-made."),
        build("prop", "Bog Relics", 70, ["Prophecy Scroll", "Toxic Lily", "Liquidity Jar", "Mosquito Banner", "Chart Reed"], "Held and foreground culture objects."),
        build("neck", "Pond Tokens", 24, ["Slug Chain", "Lily Medallion", "Croak Beads"], "Small badges for mid-rarity detail."),
        build("aura", "Toxic Mist Events", 24, ["Mire Fumes", "Ribbit Echo", "Bog Halo", "Chart Spores"], "Rare+ atmosphere without becoming a global aura category."),
        build("frame", "Pond Treaty Borders", 12, ["Reed Border", "Mud Stamp", "Lily Seal"], "Only premium rarity composition devices."),
        build("legendary", "Bog Prophecies", 10, ["Final Croak", "Pond King Collapse", "Ribbit Eclipse"], "Legendary scene rules, never recolors."),
        build("animation", "Croak Loops", 10, ["Blink Ripple", "Tongue Pop", "Mist Breath"], "Future animation layer names.")
      ],
      "dog-cozy": [
        build("base", `${motif} Cozy Pups`, 42, ["Blanket Pup", "Sofa Sprinter", "Pillow Guard", "Moon Napper"], "Rounded dog bodies and soft poses."),
        build("background", "Cozy Kennel Corners", 60, ["Lofi Rug", "Treat Shelf", "Rain Window", "Moon Couch"], "Warm home-world backdrops."),
        build("head", "Nap Hats", 32, ["Beanie Fold", "Sleep Cap", "Ear Muff", "Snack Crown"], "Soft head items, no heavy armor.", ["armor", "battle crown"]),
        build("eyes", "Puppy Mood Eyes", 36, ["Sleepy Spark", "Treat Focus", "Fake Brave", "Blanket Blink"], "Cozy canine expression language."),
        build("mouth", "Snack Reactions", 30, ["Biscuit Smile", "Tiny Bark", "Awkward Pant", "Cozy Yawn"], "Mouth states that match cozy culture."),
        build("body", "Street Blankets", 44, ["Oversized Hoodie", "Patch Jacket", "Fleece Wrap", "Raincoat"], "Streetwear plus comfort."),
        build("prop", "Pack Comforts", 70, ["Tennis Ball", "Treat Bag", "Tea Cup", "Bone Banner"], "Props from dog community rituals."),
        build("neck", "Collar Lore", 24, ["Name Tag", "Soft Collar", "Pack Charm"], "Readable neck accessory system."),
        build("aura", "Warm Room Glow", 24, ["Lamp Glow", "Nap Steam", "Treat Sparkles"], "FX as cozy room atmosphere."),
        build("frame", "Sticker Edges", 12, ["Scrapbook Trim", "Sofa Stitch", "Blanket Border"], "Premium frame equivalents."),
        build("legendary", "Cozy Pack Scenes", 10, ["Moon Couch Commander", "Final Treat Raid", "Blanket Throne"], "Unique warm dog scenes."),
        build("animation", "Tail Loops", 10, ["Tail Wag", "Ear Twitch", "Sleep Blink"], "Animation-ready dog layer names.")
      ],
      "dog-pack": [
        build("base", `${motif} Pack Bodies`, 42, ["Street Pup", "Bone Marshal", "Moon Runner", "Banner Biter"], "Energetic dog poses and readable pack silhouettes."),
        build("background", "Moon Kennel Blocks", 60, ["Alley Kennel", "Pack Roof", "Bone Court", "Moon Lot"], "Street-pack locations."),
        build("head", "Pack Hats", 34, ["Snapback", "Rally Cap", "Bone Beanie", "Moon Hood"], "Streetwear head layers, not royal crowns.", ["generic crown"]),
        build("eyes", "Pack Glares", 36, ["Treat Lock", "Chaos Side Eye", "Moon Squint", "Raid Focus"], "Canine eye culture."),
        build("mouth", "Bark States", 30, ["Victory Bark", "Smug Pant", "Bone Grin", "Chaos Tongue"], "Dog-specific reactions."),
        build("body", "Kennel Fits", 44, ["Varsity Jacket", "Rally Vest", "Track Hoodie", "Moon Jersey"], "Streetwear body system."),
        build("prop", "Pack Props", 70, ["Tennis Ball", "Bone Banner", "Leash Mic", "Snack Bag"], "Dog culture objects."),
        build("neck", "Collar Signals", 24, ["Alpha Tag", "Raid Collar", "Moon Chain"], "Neck status tokens."),
        build("aura", "Pack Noise", 24, ["Bark Lines", "Dust Kick", "Moon Spark"], "Movement and noise FX."),
        build("frame", "Sticker Frames", 12, ["Paw Tape", "Kennel Stamp", "Rally Border"], "Premium composition trim."),
        build("legendary", "Pack Takeovers", 10, ["Moon Yard Captain", "Bone Banner Riot", "Kennel Boss Shot"], "Unique pack scenes."),
        build("animation", "Pack Loops", 10, ["Tail Wag", "Paw Tap", "Bark Pop"], "Animation-ready dog layer names.")
      ],
      "cat-hyper-meme": [
        build("base", `${motif} Cat Bodies`, 42, ["Keyboard Goblin", "Arcade Cat", "Stream Chair Cat", "Alley Sprinter"], "Flexible cat proportions and chaotic sitting/leaning poses."),
        build("background", "Streamer Rooms", 60, ["RGB Desk", "Arcade Cabinet", "Milk Bar", "Claw Alley"], "Rooms and alleys that match hyper meme cat culture."),
        build("head", "Ear Interrupts", 30, ["Headset", "Tiny Crown JPEG", "Beanie Ears", "Clip Bow"], "Head items that work around cat ears."),
        build("eyes", "Combo Eyes", 38, ["Lag Blink", "Arcade Stare", "Claw Combo", "Dead Chat"], "Cat eye states from streaming and arcade language."),
        build("mouth", "Meow Reactions", 34, ["Keyboard Scream", "Milk Smirk", "Tiny Hiss", "Combo O"], "Mouth states as meme reactions."),
        build("body", "Streamer Fits", 44, ["Oversized Tee", "Arcade Hoodie", "Mod Jacket", "Milk Bar Apron"], "Cat streamer/streetwear outfits."),
        build("prop", "Claw Objects", 70, ["Mouse Cursor", "Energy Drink", "Arcade Token", "Claw Mark", "Chat Banner"], "Cat props from digital chaos."),
        build("neck", "Charm Collars", 24, ["Bell Chain", "Mod Badge", "Combo Charm"], "Neck accessories."),
        build("aura", "Chat FX", 24, ["Emote Storm", "Lag Static", "Combo Burst"], "FX as chat and arcade movement."),
        build("frame", "Screen Borders", 12, ["CRT Edge", "Stream Overlay", "Cabinet Trim"], "Premium UI-like framing."),
        build("legendary", "Nine-Life Moments", 10, ["Final Combo", "Dead Chat Revival", "Arcade Boss Cat"], "Unique cat scenes."),
        build("animation", "Meow Loops", 10, ["Tail Flick", "Blink Lag", "Mouth Meow"], "Animation layers.")
      ],
      "robot-ai": [
        build("base", `${motif} Chassis`, 42, ["Node Runner", "Inference Unit", "Patch Bot", "Server Idol"], "Robot bodies with chassis variance."),
        build("background", "Compute Rooms", 60, ["Server Shrine", "Inference Rack", "Node Hangar", "Terminal Chapel"], "AI infrastructure worlds."),
        build("head", "Processor Shells", 32, ["Heatsink Crown", "Cracked Shell", "Antenna Fin", "Patch Hood"], "Hardware identity, no fantasy helmets.", ["helm", "armor"]),
        build("eyes", "Screen States", 38, ["Loading Eyes", "Kernel Panic", "Blue Screen Blink", "Prompt Cursor"], "Robotic eye/screen language."),
        build("mouth", "Speaker Outputs", 28, ["Flatline Speaker", "Syntax Smile", "Error Chirp", "Null Mouth"], "Robot mouth/audio output layers."),
        build("body", "Firmware Plates", 48, ["Patch Plate", "Debug Harness", "Cable Vest", "Model Jacket"], "Body layers as hardware/firmware."),
        build("prop", "Compute Relics", 70, ["Prompt Card", "GPU Shard", "Patch Cable", "Node Key", "Broken Dataset"], "AI community props."),
        build("neck", "Port Badges", 24, ["USB Charm", "Node Tag", "Model License"], "Small hardware identifiers."),
        build("aura", "Signal Corruption", 26, ["Packet Loss", "Circuit Halo", "Terminal Glow", "Firmware Leak"], "Rare+ machine FX."),
        build("frame", "HUD Containers", 12, ["Terminal Window", "Debug Frame", "Model Card"], "Interface framing."),
        build("legendary", "Autonomous Incidents", 10, ["Model Awakening", "Server Temple Breach", "Recursive Commander"], "Unique AI scenes."),
        build("animation", "Firmware Loops", 10, ["Cursor Blink", "Fan Spin", "Screen Tear"], "Animation layer names.")
      ],
      "trader-finance": [
        build("base", `${motif} Trader Avatars`, 42, ["Desk Sleeper", "Leverage Addict", "Floor Captain", "Liquidation Monk"], "Human/mascot trader poses at terminals."),
        build("background", "Market Screens", 60, ["Red Candle Wall", "Perp Desk", "Liquidation Alley", "Coffee Terminal"], "Terminal and finance environments."),
        build("head", "Desk Wear", 30, ["Headset", "Cap Tilt", "Stress Band", "Floor Visor"], "Trader head layers, no crowns unless metadata says so.", ["crown", "armor"]),
        build("eyes", "Chart Eyes", 38, ["Green Candle Pupils", "Red Wick Panic", "Locked-In Stare", "Margin Blink"], "Finance eye language."),
        build("mouth", "Pnl Faces", 32, ["Fake Happy", "Liquidation Gasp", "Smug Fill", "Dead Inside Line"], "Mouth expressions from PnL culture."),
        build("body", "Desk Fits", 44, ["Wrinkled Hoodie", "Broker Vest", "Coffee-Stained Tee", "Terminal Jacket"], "Body layers for trader culture."),
        build("prop", "Desk Objects", 70, ["Coffee Cup", "Margin Call Phone", "Chart Tablet", "Stress Ball", "Liquidation Notice"], "Trader props."),
        build("neck", "Pnl Badges", 24, ["Exchange Lanyard", "Whale Tag", "Risk Badge"], "Finance identifiers."),
        build("aura", "Market Volatility", 26, ["Candle Smoke", "Funding Glow", "Liquidation Sparks", "Orderbook Rain"], "FX as market state."),
        build("frame", "Terminal Panels", 12, ["Orderbook Frame", "Pnl Border", "Exchange Window"], "UI panel framing."),
        build("legendary", "Market Events", 10, ["God Candle Witness", "Margin Call Saint", "Black Swan Desk"], "Unique finance scenes."),
        build("animation", "Terminal Loops", 10, ["Ticker Scroll", "Candle Blink", "Pnl Flash"], "Animation layers.")
      ],
      "dark-fantasy-skull": [
        build("base", `${motif} Skull Forms`, 42, ["Crypt Warden", "Ash Prophet", "Bone Baron", "Cursed Child"], "Skull silhouettes with distinct posture."),
        build("background", "Cursed Locations", 60, ["Crypt Gate", "Ash Chapel", "Black Moon", "Bone Market"], "Dark fantasy worlds."),
        build("head", "Bone Signs", 32, ["Cracked Horns", "Candle Melt", "Ash Hood", "Grave Ribbon"], "Skull head marks, not generic helmets.", ["armor", "generic crown"]),
        build("eyes", "Haunted Sockets", 36, ["Empty Glow", "Cursed Wink", "Moon Socket", "Dead Rich Stare"], "Skull eye language."),
        build("mouth", "Bone Reactions", 30, ["Cursed Grin", "Silent Jaw", "Tiny Scream", "Gold Tooth Curse"], "Mouth/jaw states."),
        build("body", "Crypt Drapes", 44, ["Ash Cloak", "Ritual Bib", "Candle Robe", "Bone Harness"], "Body silhouette layers."),
        build("prop", "Cursed Relics", 70, ["Black Candle", "Grave Receipt", "Bone Coin", "Raid Tombstone"], "Dark culture props."),
        build("neck", "Omen Charms", 24, ["Coffin Tag", "Skull Beads", "Ash Signet"], "Small marks."),
        build("aura", "Curses", 26, ["Ash Drift", "Moon Curse", "Soul Leak", "Candle Smoke"], "Atmospheric FX."),
        build("frame", "Crypt Edges", 12, ["Tomb Border", "Wax Seal", "Bone Trim"], "Premium frames."),
        build("legendary", "Cursed Scenes", 10, ["Black Moon Coronation", "Crypt Raid Saint", "Final Ash Smile"], "Unique scenes."),
        build("animation", "Haunt Loops", 10, ["Jaw Click", "Eye Flame", "Ash Drift"], "Animation layers.")
      ],
      "cute-cartoon": [
        build("base", `${motif} Toy Bodies`, 42, ["Tiny Mascot", "Sticker Friend", "Plush Walker", "Bubble Hero"], "Soft toy-like proportions."),
        build("background", "Play Worlds", 60, ["Sticker Desk", "Candy Room", "Toy Shelf", "Sunny Park"], "Cute environments."),
        build("head", "Tiny Toppers", 30, ["Bow Puff", "Party Cap", "Cloud Clip", "Sticker Hat"], "Soft head items."),
        build("eyes", "Sparkle Eyes", 36, ["Blink Shine", "Curious Dot", "Happy Arc", "Sleepy Star"], "Simple readable eyes."),
        build("mouth", "Tiny Faces", 30, ["Small Smile", "Oops O", "Snack Chew", "Proud Puff"], "Children's cartoon mouth states."),
        build("body", "Soft Outfits", 44, ["Raincoat", "Jumper", "Capelet", "Pajama Suit"], "Cute body layers."),
        build("prop", "Pocket Toys", 70, ["Sticker Wand", "Juice Box", "Tiny Flag", "Cloud Plush"], "Cute props."),
        build("neck", "Friend Charms", 24, ["Name Bead", "Star Collar", "Ribbon Tag"], "Small identifiers."),
        build("aura", "Happy Effects", 24, ["Bubble Pop", "Sun Spark", "Sticker Burst"], "Rare+ cute FX."),
        build("frame", "Sticker Cuts", 12, ["Die Cut Edge", "Notebook Border", "Candy Trim"], "Premium sticker framing."),
        build("legendary", "Storybook Moments", 10, ["Parade Hero", "Toy Shelf Champion", "Candy Room Wish"], "Unique cute scenes."),
        build("animation", "Toy Loops", 10, ["Blink Shine", "Bounce Idle", "Sticker Pop"], "Animation layers.")
      ],
      "abstract-vaporwave": [
        build("base", `${motif} Dream Forms`, 42, ["Chrome Silhouette", "Mall Phantom", "Liquid Idol", "Grid Dancer"], "Abstract character silhouettes."),
        build("background", "Vapor Rooms", 60, ["Mall Atrium", "Sunset Grid", "Pool Tile", "Liminal Arcade"], "Surreal vaporwave worlds."),
        build("head", "Signal Masks", 30, ["Chrome Mask", "Mall Visor", "Sunset Cap", "Dream Lens"], "Abstract head components."),
        build("eyes", "Dream Optics", 36, ["VHS Blink", "Grid Stare", "Mall Glare", "Soft Glitch"], "Surreal eye language."),
        build("mouth", "Signal Mouths", 28, ["VHS Smile", "Static O", "Dream Mute", "Chrome Smirk"], "Abstract mouth states."),
        build("body", "Vapor Fits", 44, ["Windbreaker", "Chrome Drape", "Grid Jacket", "Pool Robe"], "Retro-future body layers."),
        build("prop", "Liminal Objects", 70, ["Cassette", "Palm Token", "Arcade Receipt", "Broken Statue"], "Vaporwave props."),
        build("neck", "Mall Badges", 24, ["Arcade Lanyard", "Palm Charm", "VHS Tag"], "Small identifiers."),
        build("aura", "VHS Weather", 26, ["Scanline Rain", "Sunset Bloom", "Grid Echo", "Tape Warp"], "Rare+ vapor FX."),
        build("frame", "VHS Mattes", 12, ["Tape Border", "Grid Panel", "Mall Kiosk"], "Premium framing."),
        build("legendary", "Liminal Scenes", 10, ["Empty Mall Ascension", "Sunset Grid Idol", "Pool Tile Oracle"], "Unique scenes."),
        build("animation", "Tape Loops", 10, ["Tracking Roll", "Grid Pulse", "Palm Sway"], "Animation layers.")
      ]
    };
    return sets[archetype] ?? [
      build("base", `${motif} Community Bodies`, 42, ["Founder", "Raider", "Scout", "Myth"], "Token-native silhouettes."),
      build("background", `${motif} Worlds`, 60, ["Gate", "Room", "District", "Signal"], "Token-native locations."),
      build("head", `${motif} Head Marks`, 30, ["Cap", "Badge", "Mask"], "Community head marks."),
      build("eyes", `${motif} Eye States`, 36, ["Focus", "Blink", "Glare"], "Community eye language."),
      build("mouth", `${motif} Reactions`, 28, ["Smile", "Gasp", "Smirk"], "Community expressions."),
      build("body", `${motif} Fits`, 44, ["Jacket", "Cloak", "Vest"], "Body layers."),
      build("prop", `${motif} Objects`, 70, ["Badge", "Banner", "Token"], "Community props."),
      build("neck", `${motif} Charms`, 24, ["Tag", "Charm"], "Small identifiers."),
      build("aura", `${motif} Events`, 24, ["Glow", "Spark"], "FX events."),
      build("frame", `${motif} Borders`, 12, ["Border", "Seal"], "Premium frames."),
      build("legendary", `${motif} Scenes`, 10, ["Ascension", "Takeover"], "Unique scenes."),
      build("animation", `${motif} Loops`, 10, ["Blink", "Pulse"], "Animation layers.")
    ];
  }

  private baseSilhouettes(archetype: string, motif: string, shapeLanguage: string, world: string, seed: number): BaseSilhouettePlan[] {
    const variants: Record<string, Array<[string, string, string, string, string]>> = {
      "frog-degen": [["Squat Prophet", "wide squat body, oversized eyes", "low crouch with scroll grip", "short legs, big head, wet feet", "low 3/4 portrait"], ["Bog Whale", "round heavy body", "leaning on lily platform", "wide torso, tiny crown space", "centered collectible bust"], ["Pond Runner", "spring-loaded thin limbs", "mid-hop silhouette", "long toes, compact torso", "dynamic side angle"]],
      "dog-cozy": [["Blanket Pup", "soft round puppy body", "curled seated pose", "large head, blanket mass", "warm close portrait"], ["Sofa Guard", "compact dog body", "front paws on cushion", "short legs, tall ears", "eye-level cozy crop"], ["Treat Sprinter", "small fast body", "side run with snack", "long tail arc", "sticker-like full body"]],
      "dog-pack": [["Street Pup", "athletic mascot body", "one paw forward rally stance", "big ears, visible jacket", "waist-up street crop"], ["Bone Marshal", "stocky dog body", "banner shoulder pose", "broad chest, short legs", "low heroic angle"], ["Moon Runner", "lean running dog", "side sprint", "long tail, lifted paw", "full-body action frame"]],
      "cat-hyper-meme": [["Keyboard Cat", "compact seated body", "hunched at desk", "long tail, sharp ears", "desk-level crop"], ["Arcade Scratcher", "springy cat body", "claws up combo pose", "long arms, bent knees", "cabinet side crop"], ["Stream Gremlin", "tiny body in huge chair", "lean into camera", "giant eyes, thin limbs", "webcam portrait"]],
      "robot-ai": [["Inference Unit", "boxy modular chassis", "front terminal stance", "rectangular torso, screen face", "orthographic poster crop"], ["Patch Bot", "asymmetric repair body", "cable-drag lean", "thin limbs, big backpack", "3/4 technical crop"], ["Server Idol", "tall monolith body", "floating node pose", "long neck, halo ports", "low vertical framing"]],
      "trader-finance": [["Desk Sleeper", "slumped trader body", "one hand on keyboard", "rounded shoulders, tired head", "terminal desk crop"], ["Liquidation Monk", "thin upright figure", "hands folded under charts", "long robe, screen eyes", "centered portrait"], ["Floor Captain", "broad stance body", "phone-and-coffee gesture", "wide shoulders, headset silhouette", "news-poster crop"]],
      "dark-fantasy-skull": [["Crypt Warden", "tall skull body", "candle-forward pose", "long cloak, narrow head", "low crypt angle"], ["Bone Baron", "round skull noble", "seated relic pose", "large skull, small rib body", "painterly bust"], ["Cursed Child", "small skull body", "tilted head stare", "tiny torso, giant sockets", "storybook close crop"]],
      "cute-cartoon": [["Tiny Mascot", "plush rounded body", "front wave", "large head, bean limbs", "sticker portrait"], ["Bubble Hero", "soft inflated body", "floating hop", "round arms, tiny feet", "full-body toy crop"], ["Sticker Friend", "flat die-cut body", "side tilt", "simple proportions", "close sticker frame"]],
      "abstract-vaporwave": [["Mall Phantom", "elongated chrome body", "still mannequin pose", "long limbs, small face", "wide poster crop"], ["Grid Dancer", "angular dream body", "contrapposto grid pose", "geometric torso, floating hands", "low surreal frame"], ["Liquid Idol", "melting silhouette", "slow lean", "fluid proportions", "centered album-cover crop"]]
    };
    return (variants[archetype] ?? variants["cute-cartoon"]).map(([name, bodyShape, poseLanguage, proportions, cameraFraming], index) => ({
      name: `${motif} ${name} ${1 + ((seed + index) % 3)}`,
      bodyShape: `${shapeLanguage}; ${bodyShape}`,
      poseLanguage,
      proportions,
      cameraFraming,
      rarityUpgradePath: index === 0 ? `Common-Uncommon base in ${world}` : index === 1 ? "Rare-Epic stronger silhouette and prop readability" : "Legendary-Mythic unique pose or scene anchor"
    }));
  }

  private moodCulture(archetype: string, motif: string, seed: number): MoodExpressionPlan[] {
    const banks: Record<string, Array<[string, string, string, string, string, string, string, string]>> = {
      "frog-degen": [["Bogged But Certain", "fake confidence", "wide wet prophecy eyes", "crooked ribbit smirk", "low squat", "scroll pinch", "slow toxic mist", "bogged-idle"], ["Pond Enlightened", "blank enlightened stare", "tiny moon pupils", "closed croak line", "still crouch", "raised lily", "halo ripple", "prophecy-blink"], ["Rug Pull Survivor", "exhausted panic", "one eye twitch", "tongue half-out", "collapsed squat", "empty bag grip", "mist hiccup", "survivor-breath"]],
      "dog-cozy": [["Treat Locked", "hopeful focus", "round snack pupils", "tiny pant smile", "front-paw lean", "ball hold", "warm lamp glow", "tail-wag-idle"], ["Nap Commander", "sleepy authority", "half-lid eyes", "small yawn", "blanket sit", "paw salute", "steam curl", "sleep-blink"], ["Fake Brave Pup", "nervous happy", "big uncertain eyes", "awkward grin", "small chest puff", "collar tug", "soft sparkle", "brave-shiver"]],
      "dog-pack": [["Pack Locked", "overconfident", "moon squint", "tooth grin", "forward lean", "paw point", "dust kick", "tail-snap"], ["Bone Chaos", "manic joy", "spiral treat eyes", "tongue-out bark", "running stance", "banner bite", "bark lines", "bark-pop"], ["Moon Alpha", "smug command", "side-eye glare", "closed confident mouth", "wide stance", "leash mic point", "moon spark", "leader-idle"]],
      "cat-hyper-meme": [["Dead Chat", "blank panic", "tiny screen pupils", "flat mouth", "chair slump", "cursor hover", "lag static", "lag-blink"], ["Combo Demon", "manic focus", "arcade star eyes", "keyboard scream", "claws up", "combo swipe", "emote storm", "combo-loop"], ["Milk Smug", "smug comfort", "half-lid eyes", "milk mustache smile", "side curl", "cup raise", "soft chat sparkle", "tail-flick"]],
      "robot-ai": [["Kernel Panic Calm", "calm failure", "error-code eyes", "flat speaker line", "rigid stance", "debug cable grip", "packet loss", "screen-tear"], ["Recursive Giga Brain", "overclocked", "nested cursor eyes", "syntax grin", "floating posture", "node fan gesture", "circuit halo", "cursor-blink"], ["Patch Notes Sad", "tired machine", "low battery eyes", "tiny waveform mouth", "slumped chassis", "wrench hold", "fan sputter", "low-power-idle"]],
      "trader-finance": [["Locked-In Candle", "focused stress", "chart pupils", "jaw clenched", "desk lean", "coffee death grip", "ticker rain", "ticker-scroll"], ["Sad Millionaire", "wealthy despair", "red wick eyes", "thin fake smile", "chair collapse", "phone ignored", "funding glow", "pnl-flash"], ["Liquidation Saint", "zen after loss", "blank margin eyes", "small exhale", "hands folded", "notice held", "candle smoke", "slow-breath"]],
      "dark-fantasy-skull": [["Cursed Smirk", "evil cute", "one candle socket", "jaw grin", "cloak lean", "black candle lift", "ash drift", "jaw-click"], ["Dead Rich", "sad aristocrat", "gold socket shine", "toothless frown", "seated slouch", "coin pinch", "moon curse", "socket-flicker"], ["Crypt Zen", "serene doom", "empty calm sockets", "closed jaw", "ritual stillness", "bead count", "soul leak", "ash-idle"]],
      "cute-cartoon": [["Tiny Brave", "small heroic", "sparkle dot eyes", "proud puff mouth", "front wave", "sticker wand", "bubble pop", "bounce-idle"], ["Oops Friend", "gentle surprise", "round o eyes", "small o mouth", "tilted stance", "juice box squeeze", "sun spark", "oops-blink"], ["Sleepy Star", "sleepy happy", "star half-lids", "soft smile", "pajama sway", "cloud hold", "dream bubble", "sleep-loop"]],
      "abstract-vaporwave": [["Mall Empty", "calm uncanny", "VHS washed eyes", "muted smile", "mannequin stillness", "cassette hold", "scanline rain", "tracking-roll"], ["Sunset Oracle", "enlightened surreal", "grid pupils", "chrome smirk", "floating lean", "palm gesture", "sunset bloom", "grid-pulse"], ["Tape Warp", "paranoid dream", "glitch eyes", "static mouth", "broken dance", "receipt clutch", "tape warp", "soft-glitch"]]
    };
    return (banks[archetype] ?? banks["cute-cartoon"]).map((item, index) => ({
      name: `${motif} ${item[0]} ${index + 1 + (seed % 2)}`,
      expression: item[1],
      eyeLanguage: item[2],
      mouthLanguage: item[3],
      stance: item[4],
      gesture: item[5],
      auraBehavior: item[6],
      animationState: item[7]
    }));
  }

  private animationReadiness(archetype: string, motif: string, moods: MoodExpressionPlan[], fallback: string): AnimationReadinessPlan {
    const moodStates = moods.map((mood) => mood.animationState);
    return {
      blinkLayers: moods.map((mood) => `${mood.name} blink layer`),
      mouthLayers: moods.map((mood) => `${mood.name} mouth layer`),
      eyeVariants: moods.map((mood) => mood.eyeLanguage),
      auraLoops: moods.map((mood) => mood.auraBehavior),
      fxLoops: [`${motif} idle FX`, `${motif} rarity FX`, fallback],
      emotionalTransitions: moodStates.map((state, index) => `${state} -> ${moodStates[(index + 1) % moodStates.length]}`),
      idleStates: moodStates,
      reactionStates: {
        mint: `${archetype} mint reveal with ${motif} identity snap`,
        redeem: `${archetype} redeem relief expression`,
        stake: `${archetype} lock-in stance`,
        unstake: `${archetype} release blink`,
        receiveNft: `${archetype} receive flex pose`,
        levelUp: `${archetype} upgraded aura loop`,
        raidSuccess: `${archetype} raid victory reaction`,
        rewards: `${archetype} reward burst expression`
      }
    };
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
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 48);
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
