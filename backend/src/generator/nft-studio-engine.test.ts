import { selectArtTeam } from "./art-team-engine";
import { AiOutputQualityValidatorService } from "./ai-output-quality-validator.service";
import { CuratedLayerPackService } from "./curated-layer-pack.service";
import { GeminiStudioImageError } from "./gemini-studio-image-provider.service";
import { ProductionLayerPackService } from "./production-layer-pack.service";
import { hasAllRealStudioBibleAssets, StudioImageProviderService } from "./studio-image-provider.service";
import { StyleBibleEngineService } from "./style-bible-engine.service";
import { TraitCoverageEngineService } from "./trait-coverage-engine.service";
import type { GeneratedStyleProfile, TraitPackPlan } from "./generator.types";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const baseStyle = {
  collection: "DEGEN FROGS",
  theme: "Trading chaos",
  mascot: "frog",
  artStyle: "DEGENLAB rough ink",
  colors: ["#4a5d23", "#1e1e1e", "#f4c542", "#d5544d", "#ede7da"],
  backgroundWorld: "late-night trading rooms",
  traitLanguage: ["NGMI Beanie", "Bucket Hat", "Tech Visor", "Gold Tooth", "Command Center", "Penthouse"],
  rarityStructure: { Common: 5200, Uncommon: 2500, Rare: 1200, Epic: 700, Legendary: 150, Mythic: 25 },
  legendaryTheme: "liquidity kingpin",
  animationStyle: "rough ink frame jitters",
  raidTheme: "Chart raid",
  lore: "Swamp born, charts obsessed, cynical survivors.",
  roleNames: ["market survivor", "terminal addict", "liquidity kingpin"],
  brandDna: {
    ticker: "FROG",
    mintAddress: "test",
    tokenName: "DEGEN FROGS",
    tokenSymbol: "FROG",
    metadataConfidence: "high",
    sourceSignals: ["frog", "degen", "trading"],
    logoPalette: ["#4a5d23", "#1e1e1e"],
    logoDerivedColors: ["#4a5d23", "#1e1e1e"],
    memeLanguage: ["NGMI", "liquidity is exit fiction"],
    lore: "Swamp born chart survivors.",
    visualWorld: "late-night trading rooms",
    compositionRules: ["bedrooms", "desks", "trading floors"],
    traitNamingRules: ["use trader slang", "keep meme-native"],
    typographyDirection: "rough handwritten ink",
    raidLanguage: ["panic bid", "rage sell"],
    roleLanguage: ["market survivor", "terminal addict", "liquidity kingpin"],
    originStory: "Swamp born chart survivors.",
    socialRituals: ["panic bid", "rage sell"],
    memeDialect: ["NGMI", "liquidity is exit fiction"],
    tone: "sarcastic",
    mascotArchetype: "frog",
    shapeLanguage: "squat frog silhouettes",
    colorSystem: {
      primaryColors: ["#4a5d23"],
      secondaryColors: ["#1e1e1e"],
      accentColors: ["#f4c542"],
      neutralSupportColors: ["#ede7da"],
      glowLightColors: ["#d5544d"],
      backgroundColors: ["#1e1e1e"],
      forbiddenColorCombinations: []
    },
    worldRules: ["bedrooms", "desks", "trading floors"],
    traitTaxonomy: [],
    baseSilhouettes: [
      { name: "sleepy squat frog", bodyShape: "squat frog", poseLanguage: "hunched and tired", proportions: "large head small body", cameraFraming: "front card", rarityUpgradePath: "status props" },
      { name: "hacker frog", bodyShape: "compact frog", poseLanguage: "locked-in hacker hunch", proportions: "wide face", cameraFraming: "three-quarter card", rarityUpgradePath: "tech props" },
      { name: "gold kingpin frog", bodyShape: "kingpin frog", poseLanguage: "expensive lounge", proportions: "heavy coat silhouette", cameraFraming: "prestige card", rarityUpgradePath: "wealth props" }
    ],
    expressionLanguage: ["dead inside", "panic bid", "locked in"],
    moodCulture: ["dead inside", "smug", "panic bid", "sleep deprived", "locked in"].map((name) => ({
      name,
      expression: name,
      eyeLanguage: name,
      mouthLanguage: name,
      stance: name,
      gesture: name,
      auraBehavior: name,
      animationState: name
    })),
    rarityPhilosophy: "Rarity is access, not just effects.",
    legendaryDirection: "liquidity kingpin",
    statusSymbols: ["coffee", "tablet", "crown", "champagne"],
    motionPrinciples: [],
    forbiddenSimilarities: ["hood + halo + void + staff"],
    productionAssetPolicy: {
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
      productionReadyRequires: ["locked art direction"]
    }
  },
  visualFingerprint: {},
  assetPackId: "test",
  artSource: "PROCEDURAL_FALLBACK",
  productionAssetStatus: "WIREFRAME",
  productionAssetPolicy: {
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
    productionReadyRequires: ["locked art direction"]
  },
  tenKReadiness: { pass: true, estimatedCombinationSpace: 100_000_000, blockers: [], notes: [] },
  creativeUniverse: {
    archetype: "frog",
    inferredCommunityLanguage: [],
    artStyle: "DEGENLAB rough ink",
    artStyleReason: "test",
    taxonomy: [],
    baseSilhouettes: ["frog"],
    moodCulture: ["dead inside"],
    animationReadiness: {},
    productionAssetPolicy: {} as any,
    antiGenericRules: []
  }
} as unknown as GeneratedStyleProfile;

const pack = {
  collectionSize: 10_000,
  categories: {
    base: ["Classic Frog", "Sleepy Frog", "Spotted Trader Frog", "Dark Green Hacker Frog", "Gold Frog", "Trench Prophet Frog"],
    head: ["NGMI Beanie", "Bucket Hat", "Headphones", "Tech Visor", "Crown", "Tinfoil Chart Hat"],
    eyes: ["Tired", "Side Eye", "Bloodshot", "Laser Focus", "Dollar", "Panic Bid"],
    mouth: ["Neutral Frown", "Smirk", "Cigarette", "Gold Tooth", "Grillz", "Skull Grin"],
    body: ["NGMI Hoodie", "Puffer Vest", "Crumpled Suit", "Cyber Jacket", "Fur Coat", "Floor Trader Vest"],
    prop: ["Coffee", "Energy Drink", "Tablet", "Laptop", "Champagne", "Phone Chart"],
    background: ["Bedroom", "Messy Desk", "Trading Floor", "Command Center", "Penthouse", "Liquidation Alley"],
    aura: ["None", "Green Smoke", "Red Glitch", "Purple Glitch", "Gold Drip", "Chart Static"]
  },
  categoryRoles: {
    base: "base",
    background: "background",
    head: "head",
    eyes: "eyes",
    mouth: "mouth",
    body: "body",
    prop: "prop",
    neck: "prop",
    aura: "aura",
    frame: "aura",
    legendary: "aura",
    animation: "aura"
  },
  categoryLabels: { base: "Base", head: "Head Gear", eyes: "Eyes", mouth: "Mouths", body: "Outfits", prop: "Accessories", background: "Backgrounds", aura: "Aura / FX" },
  rarityWeights: { Common: 5200, Uncommon: 2500, Rare: 1200, Epic: 700, Legendary: 150, Mythic: 25 },
  unlockSchedule: {},
  uniquenessRules: { hardIncompatibilities: [], targetUniqueCombinations: 10_000, legendaryCapPct: 1.5, maxDuplicateRiskPct: 0.5 },
  traits: []
} as unknown as TraitPackPlan;

async function main() {
  const team = selectArtTeam({ tokenName: "DEGEN FROGS", tokenSymbol: "FROG", tokenMint: "x", description: "frog degen chart liquidity" });
  assert(team.id === "DEGENLAB", "frog/degen metadata should select DEGENLAB");
  baseStyle.brandDna.artTeam = team;

  const coverage = new TraitCoverageEngineService().build(baseStyle, pack);
  assert(coverage.traitCoverageScore >= 90, "trait coverage should be strong");
  assert(coverage.traitDiversityScore >= 90, "trait diversity should be strong");
  assert(coverage.globalClicheWarnings.length === 0, "DEGENLAB must not use global mythic cliches");
  assert(new Set(coverage.examples.map((example) => example.mouth)).size === coverage.examples.length, "mouths should rotate across the ladder");
  assert(new Set(coverage.examples.map((example) => example.background)).size === coverage.examples.length, "backgrounds should rotate across the ladder");

  const engine = new StyleBibleEngineService(new TraitCoverageEngineService());
  const bible = engine.build(baseStyle, pack);
  assert(bible.artTeam.id === "DEGENLAB", "style bible should preserve selected art team");
  assert(bible.exportPlan.provenanceHash.length === 64, "export provenance hash should be sha256");
  assert(bible.exportPlan.layerManifest.endsWith("layer-manifest.json"), "style bible export should include a layer manifest path");
  assert(bible.exportPlan.metaplexCandyMachineConfig.endsWith("metaplex-candy-machine.json"), "style bible export should include Candy Machine compatible config path");
  assert(bible.exportPlan.genericZip.endsWith("-studio-export.zip"), "style bible export should include generic ZIP export path");
  assert(bible.exportPlan.styleBibleImage.startsWith("data:image/svg+xml"), "style bible image should be an inline studio sheet");
  assert(/style bible|data-studio-bible/i.test(decodeURIComponent(bible.exportPlan.styleBibleImage)), "style bible image should identify itself as a bible, not fake NFT art");
  assert(bible.qaReport.passed, `style bible QA should pass: ${bible.qaReport.issues.join(", ")}`);

  const studioAssets = engine.studioAssets(bible);
  const requiredTypes = ["STYLE_BIBLE", "TRAIT_CATALOG", "RARITY_LADDER", "MOOD_SHEET", "LAYER_BREAKDOWN"];
  for (const type of requiredTypes) {
    assert(studioAssets.some((asset) => asset.type === type && asset.uri.startsWith("data:image/svg+xml")), `${type} should render as a first-class Studio Bible asset`);
  }

  const previousStudioProvider = process.env.STUDIO_PROVIDER;
  const previousGeminiKey = process.env.GEMINI_API_KEY;
  const previousStudioGeneration = process.env.ENABLE_STUDIO_IMAGE_GENERATION;
  const previousAiGeneration = process.env.ENABLE_AI_IMAGE_GENERATION;
  const previousAppEnv = process.env.APP_ENV;
  const previousGeminiModel = process.env.GEMINI_IMAGE_MODEL;
  delete process.env.STUDIO_PROVIDER;
  delete process.env.GEMINI_API_KEY;
  delete process.env.ENABLE_STUDIO_IMAGE_GENERATION;
  delete process.env.ENABLE_AI_IMAGE_GENERATION;
  const provider = new StudioImageProviderService();
  const summary = provider.validatePlan(baseStyle, bible, "test-mint");
  assert(summary.provider === "gemini-unavailable", "Gemini should be the default Studio Bible provider, with no fake sheet fallback when the key is missing");
  assert(summary.providerFailureCode === "GEMINI_KEY_MISSING", "Missing Gemini key should return the exact GEMINI_KEY_MISSING code");
  assert(summary.imageCount === 0, "Missing Gemini key should not claim images were generated this run");
  assert(summary.estimatedCostUsd === 0, "Missing Gemini key should not estimate paid preview cost");
  const generated = await provider.generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview"
  });
  assert(generated.assets.length === 0, "Studio provider must not return deterministic template sheets when Gemini is unavailable");
  assert(generated.assets.every((asset) => asset.provider !== "openai"), "OpenAI must not generate default Studio Bible assets");
  assert(generated.summary.providerFailureCode === "GEMINI_KEY_MISSING", "Missing Gemini should be an honest no-sheet state with an exact code");
  assert(generated.summary.costBreakdown.every((line) => line.generationType && typeof line.estimatedCostUsd === "number"), "Studio provider should return per-asset cost metadata when provider calls are attempted");
  const cached = await provider.generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview",
    cachedAssets: generated.assets
  });
  assert(cached.assets.length === 0, "No fake cached Studio Bible assets should exist when Gemini never generated sheets");
  assert(cached.summary.estimatedCostUsd === 0, "Cached Studio Bible reuse should not estimate new provider cost");

  process.env.STUDIO_PROVIDER = "gemini";
  process.env.GEMINI_API_KEY = "test-gemini-key";
  process.env.ENABLE_STUDIO_IMAGE_GENERATION = "true";
  process.env.GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
  const geminiFake = fakeGeminiProvider();
  const configured = await new StudioImageProviderService(geminiFake as any).generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview"
  });
  assert(geminiFake.calls.length === 5, "Gemini configured -> GeminiProvider.generateStudioBible should be called for all five Studio Bible sheets");
  assert(configured.summary.provider === "gemini", "Gemini generation should report provider=gemini");
  assert(configured.summary.model === "gemini-2.5-flash-image", "Gemini generation should report the configured image model");
  assert(configured.summary.imagesThisRun === 5, "Gemini generation should report five images this run");
  assert(configured.summary.estimatedCostUsd > 0, "Gemini generation should include a positive cost estimate");
  assert(hasAllRealStudioBibleAssets(configured.assets), "Gemini output should count as a real Studio Bible only when all five assets exist");

  const failingGemini = fakeGeminiProvider(new GeminiStudioImageError("GEMINI_REQUEST_FAILED", "GEMINI_REQUEST_FAILED"));
  const failed = await new StudioImageProviderService(failingGemini as any).generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview"
  });
  assert(failingGemini.calls.length === 5, "Gemini failure should still attempt the five Studio Bible sheets in the parallel batch");
  assert(failed.assets.length === 0, "Gemini configured but failed -> deterministic fallback must not be silently marked ready");
  assert(failed.summary.provider !== "deterministic-render", "Gemini failure must not report deterministic-render");
  assert(failed.summary.providerFailureCode === "GEMINI_REQUEST_FAILED", "Gemini failure should surface GEMINI_REQUEST_FAILED");

  const quotaGemini = fakeGeminiProvider(new GeminiStudioImageError("GEMINI_QUOTA_EXCEEDED", "GEMINI_QUOTA_EXCEEDED"));
  const quotaFailed = await new StudioImageProviderService(quotaGemini as any).generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview"
  });
  assert(quotaFailed.assets.length === 0, "Gemini quota failure must not produce deterministic Studio Bible assets");
  assert(quotaFailed.summary.providerFailureCode === "GEMINI_QUOTA_EXCEEDED", "Gemini quota failure should surface GEMINI_QUOTA_EXCEEDED");

  const cacheProbe = fakeGeminiProvider();
  const cachedGemini = await new StudioImageProviderService(cacheProbe as any).generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview",
    cachedAssets: configured.assets
  });
  assert(cacheProbe.calls.length === 0, "Gemini cache hit should not call the provider");
  assert(cachedGemini.summary.provider === "cached-gemini", "Gemini cache hit should report Cached Gemini");
  assert(hasAllRealStudioBibleAssets(cachedGemini.assets), "Cached Gemini assets should count as real Studio Bible assets");

  const deterministicCacheProbe = fakeGeminiProvider();
  const deterministicCache = configured.assets.map((asset) => ({
    ...asset,
    uri: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E",
    provider: "deterministic-render" as const,
    generationMetadata: { ...(asset.generationMetadata ?? {}), provider: "deterministic-render", sourceProvider: "deterministic-render", model: "style-bible-engine" },
    metadata: { ...asset.metadata, provider: "deterministic-render", sourceProvider: "deterministic-render", model: "style-bible-engine" }
  }));
  const ignoredDeterministicCache = await new StudioImageProviderService(deterministicCacheProbe as any).generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview",
    cachedAssets: deterministicCache
  });
  assert(deterministicCacheProbe.calls.length === 5, "Deterministic cached sheets should be ignored and should not block real Gemini generation");
  assert(hasAllRealStudioBibleAssets(ignoredDeterministicCache.assets), "Ignored deterministic cache should be replaced by real Gemini assets");

  process.env.STUDIO_PROVIDER = "deterministic";
  process.env.APP_ENV = "production";
  const deterministicProduction = await new StudioImageProviderService(fakeGeminiProvider() as any).generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview"
  });
  assert(deterministicProduction.assets.length === 0, "Deterministic provider cannot emit Studio Bible ready assets in production");
  assert(!hasAllRealStudioBibleAssets(deterministicProduction.assets), "Deterministic provider cannot set Studio Bible ready in production");
  if (previousAppEnv === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = previousAppEnv;

  const aiIssues = new AiOutputQualityValidatorService().validate(generated.assets);
  assert(!aiIssues.some((issue) => /missing banner|rarity character/i.test(issue)), `Studio Bible validation should not require cinematic OpenAI assets: ${aiIssues.join(", ")}`);
  if (previousStudioProvider === undefined) delete process.env.STUDIO_PROVIDER;
  else process.env.STUDIO_PROVIDER = previousStudioProvider;
  if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = previousGeminiKey;
  if (previousStudioGeneration === undefined) delete process.env.ENABLE_STUDIO_IMAGE_GENERATION;
  else process.env.ENABLE_STUDIO_IMAGE_GENERATION = previousStudioGeneration;
  if (previousAiGeneration === undefined) delete process.env.ENABLE_AI_IMAGE_GENERATION;
  else process.env.ENABLE_AI_IMAGE_GENERATION = previousAiGeneration;
  if (previousGeminiModel === undefined) delete process.env.GEMINI_IMAGE_MODEL;
  else process.env.GEMINI_IMAGE_MODEL = previousGeminiModel;

  const layerStatus = new ProductionLayerPackService().approvedLayerManifestStatus(pack);
  assert(!layerStatus.approved, "Final export should be blocked without an approved transparent PNG/WebP layer manifest");
  assert(/Final export|Layer manifest|CURATED_LAYER_PACK/i.test(layerStatus.reasonIfNo ?? ""), "Missing layer manifest should explain that export is art direction only");

  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;
  const transparentPng = `data:image/png;base64,${(await sharp({ create: { width: 8, height: 8, channels: 4, background: "#4a5d2380" } }).png().toBuffer()).toString("base64")}`;
  const requiredCategories = ["base", "background", "head", "eyes", "mouth", "body", "prop", "aura"];
  const fakeDb = fakeCuratedLayerDb();
  const curated = new CuratedLayerPackService(fakeDb as any);
  const imported = await curated.importForStyle({
    generationRunId: "00000000-0000-0000-0000-000000000001",
    styleProfileId: "00000000-0000-0000-0000-000000000002",
    style: baseStyle,
    pack,
    layerPack: {
      name: "Test transparent layers",
      assets: requiredCategories.map((category, index) => ({
        category,
        name: `${category} test layer`,
        dataUri: transparentPng,
        weightBps: 1000,
        zIndex: index
      }))
    }
  });
  assert(imported?.status === "VALID", `transparent curated layer import should validate: ${JSON.stringify(imported?.validation)}`);
  const exportResult = await curated.exportForStyle({ styleProfileId: "00000000-0000-0000-0000-000000000002", style: baseStyle, pack, count: 3 });
  assert(exportResult.zipBytes > 0, "deterministic export should produce a ZIP payload");
  assert(exportResult.provenanceHash.length === 64, "deterministic export should produce a provenance hash");
}

function fakeCuratedLayerDb() {
  const state: { pack?: any; assets: any[] } = { assets: [] };
  const tx = {
    curatedLayerPack: {
      create: async ({ data }: any) => {
        state.pack = { id: "00000000-0000-0000-0000-000000000003", ...data, createdAt: new Date(), updatedAt: new Date() };
        return state.pack;
      },
      findUnique: async () => ({ ...state.pack, assets: state.assets })
    },
    curatedLayerAsset: {
      createMany: async ({ data }: any) => {
        state.assets = data.map((asset: any, index: number) => ({ id: `asset-${index}`, ...asset, createdAt: new Date() }));
        return { count: state.assets.length };
      }
    }
  };
  return {
    $transaction: async (fn: any) => fn(tx),
    styleProfile: { update: async () => ({}) },
    curatedLayerPack: {
      findFirst: async () => ({ ...state.pack, assets: state.assets }),
      update: async ({ data }: any) => {
        state.pack = { ...state.pack, ...data };
        return state.pack;
      }
    }
  };
}

function fakeGeminiProvider(error?: Error) {
  const calls: any[] = [];
  return {
    calls,
    generateStudioBible: async (input: any) => {
      calls.push(input);
      if (error) throw error;
      return { uri: `data:image/png;base64,${Buffer.from(input.generationType).toString("base64")}` };
    }
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
