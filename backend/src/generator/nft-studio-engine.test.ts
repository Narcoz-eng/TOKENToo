import { selectArtTeam } from "./art-team-engine";
import { AiOutputQualityValidatorService } from "./ai-output-quality-validator.service";
import { ProductionLayerPackService } from "./production-layer-pack.service";
import { StudioImageProviderService } from "./studio-image-provider.service";
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
  delete process.env.STUDIO_PROVIDER;
  delete process.env.GEMINI_API_KEY;
  const provider = new StudioImageProviderService();
  const summary = provider.validatePlan(baseStyle, bible, "test-mint");
  assert(summary.provider === "gemini-unavailable", "Gemini should be the default Studio Bible provider, with deterministic fallback when the key is missing");
  assert(summary.imageCount === 5, "Fast Studio Preview should plan the five Studio Bible sheets");
  assert(summary.estimatedCostUsd === 0, "Missing Gemini key should not estimate paid preview cost");
  const generated = await provider.generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview"
  });
  assert(generated.assets.length === 5, "Studio provider should return all five Studio Bible assets");
  assert(generated.assets.every((asset) => asset.provider !== "openai"), "OpenAI must not generate default Studio Bible assets");
  assert(generated.assets.every((asset) => asset.generationMetadata?.artDirectionOnly === true && asset.generationMetadata?.finalLayerAsset === false), "Studio Bible assets must be marked as art direction, not final layers");
  assert(generated.summary.costBreakdown.every((line) => line.generationType && typeof line.estimatedCostUsd === "number"), "Studio provider should return per-asset cost metadata");
  const cached = await provider.generateStudioAssets({
    tokenMint: "test-mint",
    style: baseStyle,
    plan: bible,
    deterministicAssets: studioAssets,
    styleVersion: 1,
    rarityVersion: "preview",
    cachedAssets: generated.assets
  });
  assert(cached.assets.every((asset) => asset.provider === "cached"), "Identical Studio Bible requests should reuse cached assets");
  assert(cached.summary.estimatedCostUsd === 0, "Cached Studio Bible reuse should not estimate new provider cost");
  const aiIssues = new AiOutputQualityValidatorService().validate(generated.assets);
  assert(!aiIssues.some((issue) => /missing banner|rarity character/i.test(issue)), `Studio Bible validation should not require cinematic OpenAI assets: ${aiIssues.join(", ")}`);
  if (previousStudioProvider === undefined) delete process.env.STUDIO_PROVIDER;
  else process.env.STUDIO_PROVIDER = previousStudioProvider;
  if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = previousGeminiKey;

  const layerStatus = new ProductionLayerPackService().approvedLayerManifestStatus(pack);
  assert(!layerStatus.approved, "Final export should be blocked without an approved transparent PNG/WebP layer manifest");
  assert(/Final export|Layer manifest|CURATED_LAYER_PACK/i.test(layerStatus.reasonIfNo ?? ""), "Missing layer manifest should explain that export is art direction only");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
