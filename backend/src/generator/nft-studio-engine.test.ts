import { selectArtTeam } from "./art-team-engine";
import { AiOutputQualityValidatorService } from "./ai-output-quality-validator.service";
import { CuratedLayerPackService } from "./curated-layer-pack.service";
import { ImagenStudioImageError, ImagenStudioImageProviderService } from "./imagen-studio-image-provider.service";
import { ProductionLayerPackService } from "./production-layer-pack.service";
import { resetStudioProviderCircuitBreakers } from "./studio-provider-circuit-breaker";
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
  const previousStudioImageProvider = process.env.STUDIO_IMAGE_PROVIDER;
  const previousGeminiKey = process.env.GEMINI_API_KEY;
  const previousImagenKey = process.env.IMAGEN_API_KEY;
  const previousStudioGeneration = process.env.ENABLE_STUDIO_IMAGE_GENERATION;
  const previousAiGeneration = process.env.ENABLE_AI_IMAGE_GENERATION;
  const previousPaidAiGeneration = process.env.PAID_AI_GENERATION_ENABLED;
  const previousDevDisablePaidAi = process.env.DEV_DISABLE_PAID_AI;
  const previousGeminiTextPrompts = process.env.ENABLE_GEMINI_TEXT_PROMPTS;
  const previousAppEnv = process.env.APP_ENV;
  const previousImagenModel = process.env.IMAGEN_IMAGE_MODEL;
  const previousGeminiImageModel = process.env.GEMINI_IMAGE_MODEL;
  const previousOpenAiKey = process.env.OPENAI_API_KEY;
  const previousOpenAiStudioFallback = process.env.ENABLE_OPENAI_STUDIO_FALLBACK;
  const previousOpenAiStudioModel = process.env.OPENAI_STUDIO_IMAGE_MODEL;
  delete process.env.STUDIO_PROVIDER;
  delete process.env.STUDIO_IMAGE_PROVIDER;
  delete process.env.GEMINI_API_KEY;
  delete process.env.IMAGEN_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ENABLE_OPENAI_STUDIO_FALLBACK;
  delete process.env.OPENAI_STUDIO_IMAGE_MODEL;
  delete process.env.ENABLE_STUDIO_IMAGE_GENERATION;
  delete process.env.ENABLE_AI_IMAGE_GENERATION;
  delete process.env.PAID_AI_GENERATION_ENABLED;
  delete process.env.DEV_DISABLE_PAID_AI;
  delete process.env.APP_ENV;
  delete process.env.IMAGEN_IMAGE_MODEL;
  delete process.env.GEMINI_IMAGE_MODEL;
  resetStudioProviderCircuitBreakers();
  const provider = new StudioImageProviderService();
  const summary = provider.validatePlan(baseStyle, bible, "test-mint");
  assert(summary.provider === "deterministic-render", "Local deterministic rendering should be the default Studio Bible provider");
  assert(summary.providerFailureCode === undefined, "Default local Studio preview should not report a paid-provider failure code");
  assert(summary.model === "style-bible-engine", "Default Studio Bible image model should be the local style bible engine");
  assert(summary.imageCount === 0, "Local default should not claim paid provider images were generated this run");
  assert(summary.estimatedCostUsd === 0, "Local default should not estimate paid preview cost");
  const generated = await provider.generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview"
  });
  assert(generated.assets.length > 0, "Default Studio provider should return local deterministic component-rendered sheets");
  assert(generated.assets.every((asset) => asset.provider === "deterministic-render"), "Default Studio provider must not call paid providers");
  assert(generated.assets.every((asset) => asset.provider !== "openai"), "OpenAI must not generate default Studio Bible assets");
  assert(generated.summary.provider === "deterministic-render", "Default generated Studio summary should report deterministic rendering");
  assert(generated.summary.noBillableGenerationAttempted, "Default Studio generation must report no billable generation attempted");
  assert(generated.summary.costBreakdown.every((line) => line.generationType && line.estimatedCostUsd === 0), "Default Studio provider should return zero-cost per-asset metadata");
  const cached = await provider.generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview",
    cachedAssets: generated.assets
  });
  assert(cached.assets.length === generated.assets.length, "Local deterministic Studio previews should be repeatable with no paid cache dependency");
  assert(cached.summary.estimatedCostUsd === 0, "Repeated local Studio preview should not estimate new provider cost");

  process.env.STUDIO_PROVIDER = "gemini";
  process.env.GEMINI_API_KEY = "test-google-key";
  process.env.ENABLE_STUDIO_IMAGE_GENERATION = "true";
  process.env.PAID_AI_GENERATION_ENABLED = "true";
  process.env.DEV_DISABLE_PAID_AI = "false";
  process.env.ENABLE_GEMINI_TEXT_PROMPTS = "false";
  for (const acceptedModel of ["imagen-4.0-fast-generate-001", "imagen-4.0-generate-001", "imagen-4.0-ultra-generate-001", "imagen-3.0-generate-002"]) {
    process.env.IMAGEN_IMAGE_MODEL = acceptedModel;
    const acceptedSummary = new StudioImageProviderService(fakeImagenProvider() as any).validatePlan(baseStyle, bible, "test-mint");
    assert(acceptedSummary.provider === "imagen", `${acceptedModel} should be accepted as an Imagen Studio Bible model`);
    assert(acceptedSummary.model === acceptedModel, `${acceptedModel} should be preserved as the selected model`);
    assert(acceptedSummary.imagesThisRun === 5, `${acceptedModel} should still estimate five Studio Bible images`);
  }
  process.env.IMAGEN_IMAGE_MODEL = "models/imagen-4-fast-generate-001";
  const normalizedModelSummary = new StudioImageProviderService(fakeImagenProvider() as any).validatePlan(baseStyle, bible, "test-mint");
  assert(normalizedModelSummary.model === "imagen-4.0-fast-generate-001", "Old Imagen aliases should normalize to imagen-4.0-fast-generate-001");

  process.env.IMAGEN_IMAGE_MODEL = "gemini-2.5-flash-image";
  const unsupportedModelProbe = fakeImagenProvider();
  const unsupportedModel = await new StudioImageProviderService(unsupportedModelProbe as any).generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview"
  });
  assert(unsupportedModelProbe.calls.length === 5, "Unsupported selected model should not be called, but the supported fallback chain should generate sheets");
  assert(unsupportedModelProbe.calls.every((call) => call.model !== "gemini-2.5-flash-image"), "Unsupported selected Gemini image model must never be sent to Imagen");
  assert(unsupportedModel.summary.provider === "imagen", "Unsupported selected model should fall back to Imagen, not surface an unsupported-model user flow");
  assert(unsupportedModel.summary.providerFailureCode === undefined, "Successful fallback should not surface IMAGEN_MODEL_UNSUPPORTED");
  assert(unsupportedModel.summary.imagesThisRun === 5, "Fallback generation should report five generated sheets");

  delete process.env.IMAGEN_IMAGE_MODEL;
  process.env.GEMINI_IMAGE_MODEL = "imagen-4.0-fast-generate-001";
  const imagenFake = fakeImagenProvider();
  const configured = await new StudioImageProviderService(imagenFake as any).generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview"
  });
  assert(imagenFake.calls.length === 5, "Imagen configured -> ImagenProvider.generateStudioBible should be called for all five Studio Bible sheets");
  assert(configured.summary.provider === "imagen", "Imagen generation should report provider=imagen");
  assert(configured.summary.model === "imagen-4.0-fast-generate-001", "Imagen generation should report the default Imagen 4 Fast image model");
  assert(configured.summary.imagesThisRun === 5, "Imagen generation should report five images this run");
  assert(configured.summary.estimatedCostUsd > 0, "Imagen generation should include a positive cost estimate");
  assert(hasAllRealStudioBibleAssets(configured.assets), "Imagen output should count as a real Studio Bible only when all five assets exist");

  resetStudioProviderCircuitBreakers();
  process.env.IMAGEN_IMAGE_MODEL = "imagen-4.0-fast-generate-001";
  const fallbackToImagen3 = fakeImagenProvider(undefined, (input) => {
    if (input.model === "imagen-4.0-fast-generate-001" || input.model === "imagen-4.0-generate-001") {
      throw new ImagenStudioImageError("IMAGEN_MODEL_UNSUPPORTED", "IMAGEN_MODEL_UNSUPPORTED");
    }
  });
  const imagen3Fallback = await new StudioImageProviderService(fallbackToImagen3 as any).generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview"
  });
  assert(fallbackToImagen3.calls.filter((call) => call.model === "imagen-4.0-fast-generate-001").length === 1, "Unsupported Imagen 4 Fast should be probed once");
  assert(fallbackToImagen3.calls.filter((call) => call.model === "imagen-4.0-generate-001").length === 1, "Unsupported Imagen 4 Standard should be probed once");
  assert(fallbackToImagen3.calls.filter((call) => call.model === "imagen-3.0-generate-002").length === 5, "Imagen 3 fallback should generate all five sheets");
  assert(imagen3Fallback.summary.model === "imagen-3.0-generate-002", "Unsupported Imagen 4 should fall back to Imagen 3");
  assert(imagen3Fallback.summary.providerFailureCode === undefined, "Successful Imagen 3 fallback must not surface IMAGEN_MODEL_UNSUPPORTED");
  assert(hasAllRealStudioBibleAssets(imagen3Fallback.assets), "Imagen 3 fallback should produce all five real Studio Bible assets");

  resetStudioProviderCircuitBreakers();
  const failingImagen = fakeImagenProvider(new ImagenStudioImageError("IMAGEN_REQUEST_FAILED", "IMAGEN_REQUEST_FAILED"));
  const failed = await new StudioImageProviderService(failingImagen as any).generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview"
  });
  assert(failingImagen.calls.length === 1, "Imagen request failure should stop the batch instead of retry-looping all five sheets");
  assert(failed.assets.length === 0, "Imagen configured but failed -> deterministic fallback must not be silently marked ready");
  assert(failed.summary.provider !== "deterministic-render", "Imagen failure must not report deterministic-render");
  assert(failed.summary.providerFailureCode === "IMAGEN_REQUEST_FAILED", "Imagen failure should surface IMAGEN_REQUEST_FAILED");

  resetStudioProviderCircuitBreakers();
  const quotaImagen = fakeImagenProvider(new ImagenStudioImageError("IMAGEN_QUOTA_EXCEEDED", "IMAGEN_QUOTA_EXCEEDED"));
  const quotaFailed = await new StudioImageProviderService(quotaImagen as any).generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview"
  });
  assert(quotaFailed.assets.length === 0, "Imagen quota failure must not produce deterministic Studio Bible assets");
  assert(quotaFailed.summary.providerFailureCode === "IMAGEN_QUOTA_EXCEEDED", "Imagen quota failure should surface IMAGEN_QUOTA_EXCEEDED");
  const quotaBlocked = await new StudioImageProviderService(quotaImagen as any).generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview"
  });
  assert(quotaImagen.calls.length === 1, "Imagen quota circuit breaker should stop retry-looping provider calls");
  assert(quotaBlocked.summary.noBillableGenerationAttempted, "Quota backoff should block before any new billable generation attempt");

  resetStudioProviderCircuitBreakers();
  delete process.env.IMAGEN_API_KEY;
  delete process.env.GEMINI_API_KEY;
  process.env.OPENAI_API_KEY = "test-openai-key";
  delete process.env.ENABLE_OPENAI_STUDIO_FALLBACK;
  const openAiDisabled = fakeOpenAIProvider();
  const noOpenAiFallback = await new StudioImageProviderService(fakeImagenProvider() as any, undefined as any, openAiDisabled as any).generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview"
  });
  assert(openAiDisabled.calls.length === 0, "OpenAI fallback must not run unless ENABLE_OPENAI_STUDIO_FALLBACK=true");
  assert(noOpenAiFallback.summary.providerFailureCode === "IMAGEN_KEY_MISSING", "Without explicit OpenAI fallback, missing Imagen auth should block generation");

  process.env.ENABLE_OPENAI_STUDIO_FALLBACK = "true";
  const openAiEnabled = fakeOpenAIProvider();
  const openAiFallback = await new StudioImageProviderService(fakeImagenProvider() as any, undefined as any, openAiEnabled as any).generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview"
  });
  assert(openAiEnabled.calls.length === 5, "OpenAI fallback should generate all five sheets only when explicitly enabled");
  assert(openAiFallback.summary.provider === "openai", "Explicit OpenAI fallback should report provider=openai");
  assert(openAiFallback.summary.model === "gpt-image-1.5", "OpenAI fallback should use the current default GPT image model");
  assert(hasAllRealStudioBibleAssets(openAiFallback.assets), "Explicit OpenAI fallback assets should count only when all five real sheets exist");

  process.env.GEMINI_API_KEY = "test-google-key";
  delete process.env.OPENAI_API_KEY;
  delete process.env.ENABLE_OPENAI_STUDIO_FALLBACK;
  const originalFetch = globalThis.fetch;
  try {
    const fetchedUrls: string[] = [];
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      fetchedUrls.push(String(url));
      return new Response(JSON.stringify({ generatedImages: [{ image: { imageBytes: "ZmFrZQ==", mimeType: "image/png" } }] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }) as typeof fetch;
    const directNormalized = await new ImagenStudioImageProviderService().generateStudioBible({
      prompt: "test",
      generationType: "studio_bible",
      studioCacheKey: "direct-model-normalization",
      model: "models/imagen-4-fast-generate-001",
      apiKey: "test-google-key",
      timeoutMs: 1000
    });
    assert(directNormalized.model === "imagen-4.0-fast-generate-001", "Direct Imagen provider calls should normalize old model aliases");
    assert(fetchedUrls[0]?.includes("imagen-4.0-fast-generate-001"), "Direct Imagen provider should call the normalized model endpoint");

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: "Imagen 3 is only available on paid plans. Please upgrade your account." } }), {
        status: 400,
        headers: { "content-type": "application/json" }
      })) as typeof fetch;
    await new ImagenStudioImageProviderService().generateStudioBible({
      prompt: "test",
      generationType: "studio_bible",
      studioCacheKey: "paid-plan-mapping",
      model: "imagen-4.0-fast-generate-001",
      apiKey: "test-google-key",
      timeoutMs: 1000
    });
    assert(false, "Imagen paid-plan rejection should throw");
  } catch (error) {
    assert(error instanceof ImagenStudioImageError && error.code === "IMAGEN_QUOTA_EXCEEDED", "Imagen paid-plan rejection should map to IMAGEN_QUOTA_EXCEEDED");
  } finally {
    globalThis.fetch = originalFetch;
  }

  const cacheProbe = fakeImagenProvider();
  const cachedImagen = await new StudioImageProviderService(cacheProbe as any).generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview",
    cachedAssets: configured.assets
  });
  assert(cacheProbe.calls.length === 0, "Imagen cache hit should not call the provider");
  assert(cachedImagen.summary.provider === "cached-imagen", "Imagen cache hit should report Cached Imagen");
  assert(hasAllRealStudioBibleAssets(cachedImagen.assets), "Cached Imagen assets should count as real Studio Bible assets");

  const deterministicCacheProbe = fakeImagenProvider();
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
  assert(deterministicCacheProbe.calls.length === 5, "Deterministic cached sheets should be ignored and should not block real Imagen generation");
  assert(hasAllRealStudioBibleAssets(ignoredDeterministicCache.assets), "Ignored deterministic cache should be replaced by real Imagen assets");

  process.env.STUDIO_PROVIDER = "deterministic";
  process.env.APP_ENV = "production";
  const deterministicProduction = await new StudioImageProviderService(fakeImagenProvider() as any).generateStudioAssets({
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
  if (previousStudioImageProvider === undefined) delete process.env.STUDIO_IMAGE_PROVIDER;
  else process.env.STUDIO_IMAGE_PROVIDER = previousStudioImageProvider;
  if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = previousGeminiKey;
  if (previousImagenKey === undefined) delete process.env.IMAGEN_API_KEY;
  else process.env.IMAGEN_API_KEY = previousImagenKey;
  if (previousStudioGeneration === undefined) delete process.env.ENABLE_STUDIO_IMAGE_GENERATION;
  else process.env.ENABLE_STUDIO_IMAGE_GENERATION = previousStudioGeneration;
  if (previousAiGeneration === undefined) delete process.env.ENABLE_AI_IMAGE_GENERATION;
  else process.env.ENABLE_AI_IMAGE_GENERATION = previousAiGeneration;
  if (previousPaidAiGeneration === undefined) delete process.env.PAID_AI_GENERATION_ENABLED;
  else process.env.PAID_AI_GENERATION_ENABLED = previousPaidAiGeneration;
  if (previousDevDisablePaidAi === undefined) delete process.env.DEV_DISABLE_PAID_AI;
  else process.env.DEV_DISABLE_PAID_AI = previousDevDisablePaidAi;
  if (previousGeminiTextPrompts === undefined) delete process.env.ENABLE_GEMINI_TEXT_PROMPTS;
  else process.env.ENABLE_GEMINI_TEXT_PROMPTS = previousGeminiTextPrompts;
  if (previousImagenModel === undefined) delete process.env.IMAGEN_IMAGE_MODEL;
  else process.env.IMAGEN_IMAGE_MODEL = previousImagenModel;
  if (previousGeminiImageModel === undefined) delete process.env.GEMINI_IMAGE_MODEL;
  else process.env.GEMINI_IMAGE_MODEL = previousGeminiImageModel;
  if (previousOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = previousOpenAiKey;
  if (previousOpenAiStudioFallback === undefined) delete process.env.ENABLE_OPENAI_STUDIO_FALLBACK;
  else process.env.ENABLE_OPENAI_STUDIO_FALLBACK = previousOpenAiStudioFallback;
  if (previousOpenAiStudioModel === undefined) delete process.env.OPENAI_STUDIO_IMAGE_MODEL;
  else process.env.OPENAI_STUDIO_IMAGE_MODEL = previousOpenAiStudioModel;
  resetStudioProviderCircuitBreakers();

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

function fakeImagenProvider(error?: Error, beforeReturn?: (input: any) => void) {
  const calls: any[] = [];
  return {
    calls,
    generateStudioBible: async (input: any) => {
      calls.push(input);
      beforeReturn?.(input);
      if (error) throw error;
      return { uri: `data:image/png;base64,${Buffer.from(input.generationType).toString("base64")}` };
    }
  };
}

function fakeOpenAIProvider(error?: Error) {
  const calls: any[] = [];
  return {
    calls,
    generate: async (input: any) => {
      calls.push(input);
      if (error) throw error;
      return {
        provider: "openai",
        mimeType: "image/png",
        bytes: Buffer.from(input.prompt.slice(0, 16) || "openai")
      };
    }
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
