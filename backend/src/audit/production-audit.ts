import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CapabilitiesService } from "../system/capabilities.service";
import { PrismaService } from "../db/prisma.service";
import { loadLocalEnv, loadedLocalEnvFiles } from "../env/load-local-env";
import { TokenScannerService } from "../token-scanner/token-scanner.service";
import { ArtPreviewGeneratorService } from "../generator/art-preview-generator.service";
import { MetadataGeneratorService } from "../generator/metadata-generator.service";
import type { GeneratedStyleProfile, TraitPackPlan } from "../generator/generator.types";
import { normalizeHeliusConfig } from "../token-scanner/helius-config";

const EXPECTED_DEVNET_PROGRAM_ID = "8i9Xd9ikQSEdDstcV9L8ikru8nZFBsNWx2Y5TQpgAnU6";
const PLACEHOLDER_PROGRAM_ID = "11111111111111111111111111111111";

async function main() {
  loadLocalEnv();
  const issues: string[] = [];
  const checks: Record<string, unknown> = {};
  const root = resolve(__dirname, "../../..");

  const scannerSource = readFileSync(resolve(root, "backend/src/token-scanner/token-scanner.service.ts"), "utf8");
  const heliusConfigSource = readFileSync(resolve(root, "backend/src/token-scanner/helius-config.ts"), "utf8");
  requireCheck(!scannerSource.includes("Frog Vault Token") && !scannerSource.includes("$FROG"), "Token scanner still contains mock Frog data.", issues);
  requireCheck(scannerSource.includes("normalizeHeliusConfig") && heliusConfigSource.includes("getAsset") && heliusConfigSource.includes("showFungible"), "Token scanner does not use normalized Helius getAsset.", issues);

  const createPage = readFileSync(resolve(root, "frontend/app/create-collection/page.tsx"), "utf8");
  requireCheck(createPage.includes("Token CA / mint address") && createPage.includes("/tokens/") && createPage.includes("Optional Overrides"), "Create Collection is not CA-first.", issues);

  checks.programIds = programIdCheck(root, issues);
  checks.rarity = rarityCheck(issues);
  checks.metadata = metadataCheck(issues);

  const prisma = new PrismaService();
  const capabilities = await new CapabilitiesService(prisma).status();
  checks.capabilities = {
    heliusConfigured: capabilities.capabilities.heliusConfigured,
    heliusReachable: capabilities.capabilities.heliusReachable,
    heliusAvailable: capabilities.capabilities.heliusAvailable,
    tokenMetadataAvailable: capabilities.capabilities.tokenMetadataAvailable,
    warnings: capabilities.warnings
  };

  const testMint = process.env.TEST_TOKEN_MINT;
  const helius = normalizeHeliusConfig();
  if (helius.heliusApiKey && testMint) {
    const scan = await new TokenScannerService(prisma).scanToken(testMint);
    requireCheck(Boolean(scan.name && scan.symbol && scan.provider === "helius"), "Helius scan did not resolve token identity.", issues);
    checks.heliusScan = { mint: scan.mint, name: scan.name, symbol: scan.symbol, metadataUri: scan.metadataUri, imageUri: scan.imageUri };
  } else {
    checks.heliusScan = "skipped: set HELIUS_API_KEY and TEST_TOKEN_MINT to run live scan verification";
  }

  await prisma.$disconnect();
  const output = {
    status: issues.length ? "FAILED" : "READY",
    loadedEnvFiles: loadedLocalEnvFiles(),
    checks,
    issues
  };
  console.log(JSON.stringify(output, null, 2));
  if (issues.length) process.exitCode = 1;
}

function programIdCheck(root: string, issues: string[]) {
  const anchorToml = readFileSync(resolve(root, "Anchor.toml"), "utf8");
  const libRs = readFileSync(resolve(root, "programs/vaultx/src/lib.rs"), "utf8");
  const anchorIds = [...anchorToml.matchAll(/vaultx\s*=\s*"([^"]+)"/g)].map((match) => match[1]);
  const declareId = libRs.match(/declare_id!\("([^"]+)"\)/)?.[1] ?? null;
  const envProgramId = process.env.PROGRAM_ID;
  const publicProgramId = process.env.NEXT_PUBLIC_PROGRAM_ID;
  requireCheck(!anchorIds.includes(PLACEHOLDER_PROGRAM_ID) && declareId !== PLACEHOLDER_PROGRAM_ID && envProgramId !== PLACEHOLDER_PROGRAM_ID, "Placeholder program id is still configured.", issues);
  requireCheck(anchorIds.every((id) => id === EXPECTED_DEVNET_PROGRAM_ID) && declareId === EXPECTED_DEVNET_PROGRAM_ID, "Anchor.toml and declare_id! are not aligned to intended devnet program id.", issues);
  if (envProgramId) requireCheck(envProgramId === EXPECTED_DEVNET_PROGRAM_ID, "PROGRAM_ID does not match intended devnet program id.", issues);
  if (publicProgramId) requireCheck(publicProgramId === (envProgramId ?? EXPECTED_DEVNET_PROGRAM_ID), "NEXT_PUBLIC_PROGRAM_ID does not match PROGRAM_ID.", issues);
  return { anchorIds, declareId, envProgramId: envProgramId ?? null, publicProgramId: publicProgramId ?? null };
}

function rarityCheck(issues: string[]) {
  const previews = new ArtPreviewGeneratorService().generate(styleFixture(), packFixture(), "audit", 0).filter((asset) => asset.type === "SAMPLE_NFT");
  const common = previews.find((asset) => asset.metadata.rarity === "Common");
  const premium = previews.find((asset) => asset.metadata.rarity === "Legendary" || asset.metadata.rarity === "Mythic");
  if (common) {
    const visible = Number(common.metadata.traitCount ?? 0);
    requireCheck(visible <= 4, "Common sample has too many visible premium traits.", issues);
  }
  if (premium) requireCheck(premium.metadata.pose !== "base pose" && !/none|no signature/i.test(String(premium.metadata.legendaryOverlay)), "Legendary/Mythic sample lacks unique pose or overlay.", issues);
  return previews.map((asset) => ({ label: asset.label, rarity: asset.metadata.rarity, pose: asset.metadata.pose, visualRule: asset.metadata.visualRule }));
}

function metadataCheck(issues: string[]) {
  const sample = new MetadataGeneratorService().sample(styleFixture(), packFixture(), {
    type: "SAMPLE_NFT",
    label: "audit",
    uri: "ipfs://audit",
    productionAssetStatus: "CURATED_LAYER_READY",
    previewClassification: "PRODUCTION_ASSET_PREVIEW",
    provider: "curated",
    generationMetadata: {},
    metadata: { rarity: "Legendary", base: "Audit Base", background: "Audit World", headgear: "Audit Crown", aura: "Audit Aura", accessory: "Audit Relic", pose: "unique cinematic pose" }
  });
  const attributes = new Map(sample.attributes.map((attribute) => [attribute.trait_type, attribute.value]));
  requireCheck(attributes.get("Base Character") === "Audit Base" && attributes.get("Rarity") === "Legendary", "Metadata attributes do not match rendered preview traits.", issues);
  return { name: sample.name, image: sample.image, rarity: attributes.get("Rarity") };
}

function styleFixture(): GeneratedStyleProfile {
  return {
    collection: "$AUDIT Vaults",
    theme: "Audit guild",
    mascot: "audit warden",
    artStyle: "premium cyber cartoon",
    colors: ["#baff00", "#16d7d2", "#071017", "#f4c542"],
    backgroundWorld: "Audit chain citadel",
    traitLanguage: ["Audit Signal", "Chain Citadel", "Verifier Crown", "Metadata Relic"],
    rarityStructure: { Common: 5500, Uncommon: 2500, Rare: 1200, Epic: 600, Legendary: 150, Mythic: 50 },
    legendaryTheme: "Audit verifier ascendant full scene",
    animationStyle: "premium reveal",
    raidTheme: "Audit raid",
    lore: "Audit holders verify every launch claim.",
    roleNames: ["Verifier", "Custodian"],
    brandDna: {
      tokenSymbol: "$AUDIT",
      tokenName: "Audit",
      mintAddress: "audit",
      logoPalette: ["#6fe7ff", "#5967ff", "#06111a"],
      logoDerivedColors: ["#6fe7ff", "#5967ff", "#06111a"],
      colorSystem: { primaryColors: ["#6fe7ff"], secondaryColors: ["#5967ff"], accentColors: ["#f4f7fb"], neutralSupportColors: ["#06111a"], glowLightColors: ["#6fe7ff"], backgroundColors: ["#06111a"], forbiddenColorCombinations: [] },
      mascotArchetype: "audit",
      memeLanguage: ["verify"],
      lore: "Audit holders verify every launch claim.",
      visualWorld: "Audit chain citadel",
      shapeLanguage: "geometric",
      compositionRules: ["metadata must match rendered traits"],
      traitNamingRules: ["no generic traits"],
      typographyDirection: "terminal",
      raidLanguage: ["audit raid"],
      roleLanguage: ["Verifier"],
      legendaryDirection: "Audit verifier ascendant full scene",
      mascotSilhouette: "audit verifier silhouette",
      backgroundWorld: "Audit chain citadel",
      baseArchetypes: ["Audit verifier base"],
      baseSilhouettes: [{ name: "Audit Verifier", bodyShape: "geometric body", poseLanguage: "inspection stance", proportions: "balanced", cameraFraming: "poster crop", rarityUpgradePath: "audit ladder" }],
      moodCulture: [{ name: "Audit Locked-In", expression: "focused", eyeLanguage: "scanner eyes", mouthLanguage: "flat line", stance: "inspection stance", gesture: "checklist hold", auraBehavior: "verification pulse", animationState: "audit-idle" }],
      animationReadiness: {
        blinkLayers: ["audit blink"],
        mouthLayers: ["audit mouth"],
        eyeVariants: ["scanner eyes"],
        auraLoops: ["verification pulse"],
        fxLoops: ["audit pulse"],
        emotionalTransitions: ["audit-idle -> audit-idle"],
        idleStates: ["audit-idle"],
        reactionStates: { mint: "audit mint", redeem: "audit redeem", stake: "audit stake", unstake: "audit unstake", receiveNft: "audit receive", levelUp: "audit level", raidSuccess: "audit raid", rewards: "audit rewards" }
      },
      productionAssetPolicy: {
        launchClassification: "CONCEPT_PREVIEW",
        defaultAssetStatus: "CURATED_LAYER_READY",
        commonToRareSource: "approved_layer_pack_required",
        epicLegendaryMythicSource: "curated_composition_required",
        aiFinalImageAllowed: false,
        artistReviewRequiredFor: ["Epic", "Legendary", "Mythic"],
        productionReadyRequires: ["approved layer pack"]
      },
      traitTaxonomy: [],
      rarityVisualRules: {
        Common: { minTraits: 2, maxTraits: 4, pose: "base pose", background: "simple", aura: "none", frame: "none", composition: "simple" },
        Epic: { minTraits: 7, maxTraits: 9, pose: "premium action pose", background: "premium", aura: "strong", frame: "special", composition: "premium" },
        Legendary: { minTraits: 9, maxTraits: 11, pose: "unique cinematic pose", background: "unique", aura: "signature", frame: "special", composition: "unique" },
        Mythic: { minTraits: 10, maxTraits: 12, pose: "near 1/1 curated pose", background: "one-off", aura: "signature", frame: "mythic", composition: "near 1/1" }
      },
      forbiddenSimilarities: [],
      sourceMetadataSummary: {}
    },
    visualFingerprint: { archetype: "audit", poseLanguage: ["inspection stance"] },
    assetPackId: "audit",
    artSource: "CURATED_PACK",
    productionAssetStatus: "CURATED_LAYER_READY",
    tenKReadiness: { possibleUniqueCombinations: "10000", expectedDuplicateRisk: "LOW", weakestTraitCategory: "none", overusedBaseVariantRisk: false, rarityDistributionValid: true, silhouetteDominanceRisk: false, shallowCategories: [], pass: true },
    creativeUniverse: {
      archetype: "audit",
      signalProfile: {
        entities: ["audit"],
        objects: ["checklist"],
        animals: [],
        emotions: ["focused"],
        colors: ["#00ff99"],
        visualShapes: ["geometric"],
        culturalWords: ["verify"],
        memeLanguage: [],
        humorType: "none",
        energyLevel: "focused pressure",
        communityVibe: "audit verification room",
        worldReferences: ["audit chain citadel"],
        styleReferences: ["premium cyber cartoon"],
        dangerSafetyCues: ["verification"],
        cueDial: { luxury: 20, chaos: 20, cozy: 20, aggressive: 20, surreal: 20 },
        semanticWeights: { audit: 100 }
      },
      creativeDna: {
        artStyle: "audit premium cyber cartoon",
        worldConcept: "audit chain citadel",
        mascotOrSubject: "audit verifier",
        baseSilhouetteRules: ["audit verifier silhouette"],
        cameraFraming: "poster crop",
        palette: ["#00ff99", "#0f172a", "#ffffff"],
        textureLanguage: "audit scanline",
        visualSystem: {
          rendererFamily: "terminal-brutalist",
          renderingEngine: "terminal-engine",
          bodySystem: "audit checklist body blocks",
          headShape: "rectangular verifier monitor",
          eyeSystem: "scanner slits",
          mouthSystem: "flat status line",
          proportionSystem: "compact inspector",
          anatomyModel: "screen-and-checklist inspector body",
          faceGrammar: "scanner eyes, status-line mouth, and cursor blinks",
          compositionStyle: "terminal verification layout",
          cameraFraming: "poster crop",
          cameraSystem: "screen-capture crops and audit panel wides",
          lightingModel: "flat terminal glow",
          environmentSystem: "audit panels",
          sceneGrammar: "audit panels escalate into verification event screens",
          emotionalRendering: "focused posture and scanner eyes",
          rarityProgression: "more verification panels and checklist density",
          legendaryPhilosophy: "full audit event screen",
          cardStructure: "rectangular terminal card",
          rarityFrames: {
            Common: { rarity: "Common", composition: "terminal-engine: base audit read", camera: "audit panel", subjectTreatment: "small monitor", faceTreatment: "scanner blink", bodyLanguage: "still verifier", environment: "quiet audit panels", lighting: "flat terminal glow", event: "audit starts", silhouetteMutation: "base monitor", animationCue: "cursor blink" },
            Uncommon: { rarity: "Uncommon", composition: "terminal-engine: tilted audit read", camera: "tilted panel", subjectTreatment: "monitor with checklist", faceTreatment: "side scanner", bodyLanguage: "leaning verifier", environment: "first warning row", lighting: "green terminal pulse", event: "checklist enters", silhouetteMutation: "checklist prop", animationCue: "cursor blink plus row flash" },
            Rare: { rarity: "Rare", composition: "terminal-engine: deeper panel read", camera: "foreground panels", subjectTreatment: "screen stack", faceTreatment: "asymmetric scanner", bodyLanguage: "focused inspector", environment: "richer audit panels", lighting: "stronger terminal contrast", event: "audit pressure", silhouetteMutation: "screen stack", animationCue: "scanner sweep" },
            Epic: { rarity: "Epic", composition: "terminal-engine: action audit screen", camera: "diagonal panel zoom", subjectTreatment: "premium monitor stack", faceTreatment: "high-emotion error face", bodyLanguage: "alert verifier", environment: "complex audit console", lighting: "event terminal glow", event: "audit threshold", silhouetteMutation: "major screen outline", animationCue: "error loop" },
            Legendary: { rarity: "Legendary", composition: "terminal-engine: full audit event", camera: "event wide", subjectTreatment: "new audit silhouette", faceTreatment: "signature scanner reaction", bodyLanguage: "event verifier", environment: "legendary audit room", lighting: "signature terminal event", event: "full audit event", silhouetteMutation: "legendary monitor silhouette", animationCue: "event pulse" },
            Mythic: { rarity: "Mythic", composition: "terminal-engine: mythic audit takeover", camera: "one-off audit camera", subjectTreatment: "transformed audit system", faceTreatment: "mythic scanner face", bodyLanguage: "world-owning verifier", environment: "mythic audit room", lighting: "mythic terminal light", event: "audit takeover", silhouetteMutation: "near-one-of-one monitor", animationCue: "multi-state audit loop" }
          }
        },
        moodCulture: ["focused"],
        expressionLanguage: ["scanner focus"],
        traitCategories: [],
        rarityPhilosophy: "audit rarity escalates through verification detail",
        legendaryMythology: "audit verifier ascendant full scene",
        animationLanguage: "audit pulse loops",
        forbiddenSimilarities: []
      },
      inferredCommunityLanguage: ["verify"],
      artStyle: "premium cyber cartoon",
      artStyleReason: "audit fixture",
      taxonomy: [],
      baseSilhouettes: [{ name: "Audit Verifier", bodyShape: "geometric body", poseLanguage: "inspection stance", proportions: "balanced", cameraFraming: "poster crop", rarityUpgradePath: "audit ladder" }],
      moodCulture: [{ name: "Audit Locked-In", expression: "focused", eyeLanguage: "scanner eyes", mouthLanguage: "flat line", stance: "inspection stance", gesture: "checklist hold", auraBehavior: "verification pulse", animationState: "audit-idle" }],
      animationReadiness: {
        blinkLayers: ["audit blink"],
        mouthLayers: ["audit mouth"],
        eyeVariants: ["scanner eyes"],
        auraLoops: ["verification pulse"],
        fxLoops: ["audit pulse"],
        emotionalTransitions: ["audit-idle -> audit-idle"],
        idleStates: ["audit-idle"],
        reactionStates: { mint: "audit mint", redeem: "audit redeem", stake: "audit stake", unstake: "audit unstake", receiveNft: "audit receive", levelUp: "audit level", raidSuccess: "audit raid", rewards: "audit rewards" }
      },
      productionAssetPolicy: {
        launchClassification: "CONCEPT_PREVIEW",
        defaultAssetStatus: "CURATED_LAYER_READY",
        commonToRareSource: "approved_layer_pack_required",
        epicLegendaryMythicSource: "curated_composition_required",
        aiFinalImageAllowed: false,
        artistReviewRequiredFor: ["Epic", "Legendary", "Mythic"],
        productionReadyRequires: ["approved layer pack"]
      },
      antiGenericRules: []
    },
    productionAssetPolicy: {
      launchClassification: "CONCEPT_PREVIEW",
      defaultAssetStatus: "CURATED_LAYER_READY",
      commonToRareSource: "approved_layer_pack_required",
      epicLegendaryMythicSource: "curated_composition_required",
      aiFinalImageAllowed: false,
      artistReviewRequiredFor: ["Epic", "Legendary", "Mythic"],
      productionReadyRequires: ["approved layer pack"]
    }
  };
}

function packFixture(): TraitPackPlan {
  const values = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => `${prefix} ${index + 1}`);
  return {
    collectionSize: 10_000,
    categories: {
      baseCharacter: values("Base", 42),
      backgrounds: values("World", 60),
      headgear: values("Crown", 60),
      eyes: values("Eyes", 44),
      mouthExpression: values("Expression", 32),
      outfitBody: values("Outfit", 60),
      accessories: values("Relic", 80),
      neckChestAccessory: values("Medallion", 34),
      auraEffect: values("Aura", 36),
      borderFrame: values("Frame", 18),
      legendaryOverlay: values("Legendary Scene", 12),
      animationOverlay: values("Reveal", 10)
    },
    categoryRoles: {
      base: "baseCharacter",
      background: "backgrounds",
      head: "headgear",
      eyes: "eyes",
      mouth: "mouthExpression",
      body: "outfitBody",
      prop: "accessories",
      neck: "neckChestAccessory",
      aura: "auraEffect",
      frame: "borderFrame",
      legendary: "legendaryOverlay",
      animation: "animationOverlay"
    },
    categoryLabels: {
      baseCharacter: "Audit Bodies",
      backgrounds: "Audit Worlds",
      headgear: "Audit Head Marks",
      eyes: "Audit Eye States",
      mouthExpression: "Audit Mouth States",
      outfitBody: "Audit Fits",
      accessories: "Audit Objects",
      neckChestAccessory: "Audit Badges",
      auraEffect: "Audit Pulses",
      borderFrame: "Audit Borders",
      legendaryOverlay: "Audit Scenes",
      animationOverlay: "Audit Loops"
    },
    rarityWeights: { Common: 5500, Uncommon: 2500, Rare: 1200, Epic: 600, Legendary: 150, Mythic: 50 },
    unlockSchedule: {},
    uniquenessRules: { noDuplicateFullCombinations: true, maxBaseUsagePct: 3, legendaryCapPct: 1.5, minBackgroundSpreadPct: 70, rarityMustBeVisuallyObvious: true },
    traits: []
  };
}

function requireCheck(condition: boolean, message: string, issues: string[]) {
  if (!condition) issues.push(message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
