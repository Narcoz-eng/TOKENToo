import { ArtPreviewGeneratorService } from "./art-preview-generator.service";
import { CollectionDistinctivenessScorerService } from "./collection-distinctiveness-scorer.service";
import { CommunityContextService } from "./community-context.service";
import { CompatibilityEngineService } from "./compatibility-engine.service";
import { readFileSync } from "node:fs";
import { CreativeDnaService } from "./creative-dna.service";
import type { CreateGenerationRunInput, GeneratedStyleProfile, PreviewAssetPlan, TraitPackPlan } from "./generator.types";
import { LogoAnalysisService } from "./logo-analysis.service";
import { MetadataGeneratorService } from "./metadata-generator.service";
import { QualityValidatorService } from "./quality-validator.service";
import { RarityEngineService } from "./rarity-engine.service";
import { StyleProfileGeneratorService } from "./style-profile-generator.service";
import { TraitPackGeneratorService } from "./trait-pack-generator.service";

const samples: CreateGenerationRunInput[] = [
  {
    tokenMint: "2tXHantaSparseFallback11111111111111111111zs9y",
    selectedPreset: "creative-dna-generated",
    hints: {
      sourceMetadata: {
        mint: "2tXHantaSparseFallback11111111111111111111zs9y",
        name: "Hantavirus",
        symbol: "HANTA",
        imageUri: "https://metadata.example/hanta-logo.png",
        socialLinks: { twitter: "https://x.com/hantavirus" },
        extensions: {
          inferredIdentitySeed: {
            official: false,
            signalWeights: { medical: 0.92, contamination: 0.88, mutation: 0.72, quarantine: 0.7 },
            inferredSignals: ["medical", "contamination", "mutation", "quarantine", "lab", "fever", "microscopic"],
            description: "Sparse metadata identity seed: medical contamination, mutation, quarantine, lab, fever, microscopic, and paranoid meme signals."
          }
        },
        riskNotes: ["missing_metadata_uri", "missing_description", "rpc_supply_unavailable", "Helius metadata unavailable; using fallback providers."]
      },
      memes: ["coughing degen", "patient zero"],
      slogans: ["Quarantine the chart"],
      mood: "dark"
    }
  },
  {
    tokenMint: "DT93bLkL1VagdhasrKWqQ6UGMNwUwL1oATRzhepE9SP3",
    selectedPreset: "creative-dna-generated",
    hints: {
      sourceMetadata: {
        mint: "DT93bLkL1VagdhasrKWqQ6UGMNwUwL1oATRzhepE9SP3",
        name: "Bogged Pepe",
        symbol: "BOG",
        description: "A swamp-born Pepe community chanting ribbit raids, bog liquidity, and holder memes.",
        imageUri: "https://metadata.example/bogged-pepe.png",
        metadataUri: "https://metadata.example/bogged-pepe.json",
        socialLinks: { twitter: "https://x.com/boggedpepe", telegram: "https://t.me/boggedpepe" },
        extensions: { website: "https://bogged.example", slogan: "ribbit raids only" }
      },
      memes: ["ribbit raid", "bog hands"],
      slogans: ["From the pond to the chart"],
      mood: "funny"
    }
  },
  {
    tokenMint: "HZd7Rr7APjWjzxUigrPssft52ykTqwF1oA5DRPL5tva6",
    selectedPreset: "creative-dna-generated",
    hints: {
      sourceMetadata: {
        mint: "HZd7Rr7APjWjzxUigrPssft52ykTqwF1oA5DRPL5tva6",
        name: "Cozy Shib",
        symbol: "COZY",
        description: "A cozy Shib pack with blanket naps, lofi kennel rooms, tennis balls, snack raids, and soft diamond paw holders.",
        imageUri: "https://metadata.example/shib-guard.png",
        metadataUri: "https://metadata.example/shib-guard.json",
        socialLinks: { twitter: "https://x.com/shibguard", discord: "https://discord.gg/shibguard" },
        extensions: { community: "lofi kennel couch" }
      },
      memes: ["diamond paws", "blanket gang"],
      mood: "cute"
    }
  },
  {
    tokenMint: "87WxncrW1tKYyHBsv4qFbANtgVAe8peNPtmf6ySDycaj",
    selectedPreset: "creative-dna-generated",
    hints: {
      sourceMetadata: {
        mint: "87WxncrW1tKYyHBsv4qFbANtgVAe8peNPtmf6ySDycaj",
        name: "Meow Market",
        symbol: "MEOW",
        description: "Cat traders prowling night markets, claw charts, alley alpha, milk bar lore, and nine-life holder energy.",
        imageUri: "https://metadata.example/meow-market.png",
        metadataUri: "https://metadata.example/meow-market.json",
        socialLinks: { twitter: "https://x.com/meowmarket" },
        extensions: { phrase: "nine lives, one candle" }
      },
      memes: ["claw the chart", "nine lives"],
      mood: "cute"
    }
  },
  {
    tokenMint: "D4TXW495tiD55ttwXyWjVEeDWUweb7RCUfPLmn9nD5qg",
    selectedPreset: "creative-dna-generated",
    hints: {
      sourceMetadata: {
        mint: "D4TXW495tiD55ttwXyWjVEeDWUweb7RCUfPLmn9nD5qg",
        name: "Agent Reactor",
        symbol: "AGENT",
        description: "Autonomous AI agents running reactor nodes, compute raids, terminal chants, and machine guild coordination.",
        imageUri: "https://metadata.example/agent-reactor.png",
        metadataUri: "https://metadata.example/agent-reactor.json",
        socialLinks: { twitter: "https://x.com/agentreactor", github: "https://github.com/agentreactor" },
        extensions: { model: "agent swarm", domain: "compute guild" }
      },
      memes: ["prompt harder", "node awake"],
      mood: "cyber"
    }
  },
  {
    tokenMint: "99CfCw7wUh4st1MQLR74oNna89FtrrfnrDfozN4i21tp",
    selectedPreset: "creative-dna-generated",
    hints: {
      sourceMetadata: {
        mint: "99CfCw7wUh4st1MQLR74oNna89FtrrfnrDfozN4i21tp",
        name: "Degen Index",
        symbol: "DGNX",
        description: "Abstract degen index for chart chaos, liquidity rituals, candle rooms, and jackpot raid signals.",
        imageUri: "https://metadata.example/degen-index.png",
        metadataUri: "https://metadata.example/degen-index.json",
        socialLinks: { twitter: "https://x.com/degenindex", website: "https://dgnx.example" },
        extensions: { market: "degen bazaar", phrase: "send the candle" }
      },
      memes: ["send the candle", "liquidity ritual"],
      mood: "chaotic"
    }
  },
  {
    tokenMint: "AzkUL45kuLLXoYtrPMP5nFqSs8Jm8Ywp4cgS2ds81skL",
    selectedPreset: "creative-dna-generated",
    hints: {
      sourceMetadata: {
        mint: "AzkUL45kuLLXoYtrPMP5nFqSs8Jm8Ywp4cgS2ds81skL",
        name: "Skull Ledger",
        symbol: "SKULL",
        description: "Dark fantasy skull holders writing cursed ledgers, crypt raids, bone receipts, black moon rituals, and ash market lore.",
        imageUri: "https://metadata.example/skull-ledger.png",
        metadataUri: "https://metadata.example/skull-ledger.json",
        socialLinks: { twitter: "https://x.com/skulledger", discord: "https://discord.gg/skulledger" },
        extensions: { realm: "black moon crypt", chant: "debt follows the dead" }
      },
      memes: ["bone receipts", "black moon"],
      mood: "dark"
    }
  },
  {
    tokenMint: "CuTEe2DG1vJzGzbaR84eMAkU4mWQjVY12TqYrcTuoon",
    selectedPreset: "creative-dna-generated",
    hints: {
      sourceMetadata: {
        mint: "CuTEe2DG1vJzGzbaR84eMAkU4mWQjVY12TqYrcTuoon",
        name: "Tiny Toast",
        symbol: "TOAST",
        description: "A cute cartoon mascot community with tiny breakfast heroes, sticker friends, sunny play rooms, juice boxes, and soft reward quests.",
        imageUri: "https://metadata.example/tiny-toast.png",
        metadataUri: "https://metadata.example/tiny-toast.json",
        socialLinks: { twitter: "https://x.com/tinytoast" },
        extensions: { style: "cute toy cartoon", phrase: "tiny but toasted" }
      },
      memes: ["tiny but toasted", "sticker friends"],
      mood: "cute"
    }
  },
  {
    tokenMint: "VaPoR4v8asndPooL9xWveMaLLwAVe1111111111111",
    selectedPreset: "creative-dna-generated",
    hints: {
      sourceMetadata: {
        mint: "VaPoR4v8asndPooL9xWveMaLLwAVe1111111111111",
        name: "Liminal Wave",
        symbol: "VAPR",
        description: "Abstract vaporwave token for empty mall dreams, VHS sunsets, pool tile prophecies, palm grid rituals, and surreal arcade holders.",
        imageUri: "https://metadata.example/liminal-wave.png",
        metadataUri: "https://metadata.example/liminal-wave.json",
        socialLinks: { twitter: "https://x.com/liminalwave", website: "https://vapr.example" },
        extensions: { aesthetic: "vaporwave surreal abstract", phrase: "mall never closes" }
      },
      memes: ["mall never closes", "VHS oracle"],
      mood: "cyber"
    }
  }
];

type ExistingStyle = { id: string; collection: string; mascot: string; artStyle?: string; colors: unknown; backgroundWorld: string; traitLanguage: unknown; visualFingerprint?: unknown; brandDna?: unknown };

async function main() {
  const logo = new LogoAnalysisService();
  const contextService = new CommunityContextService();
  const styleService = new StyleProfileGeneratorService(new RarityEngineService());
  const traits = new TraitPackGeneratorService(new RarityEngineService());
  const compatibility = new CompatibilityEngineService();
  const previews = new ArtPreviewGeneratorService();
  const metadata = new MetadataGeneratorService();
  const distinctivenessService = new CollectionDistinctivenessScorerService();
  const qualityService = new QualityValidatorService();
  const creativeDna = new CreativeDnaService();
  const existing: ExistingStyle[] = [];
  const failures: string[] = [];
  const generatedStyles: GeneratedStyleProfile[] = [];

  const report = samples.map((input) => {
    const source = input.hints?.sourceMetadata;
    const normalized: CreateGenerationRunInput = {
      ...input,
      tokenName: source?.name,
      tokenSymbol: source?.symbol?.startsWith("$") ? source.symbol : `$${source?.symbol ?? "TOKEN"}`,
      description: source?.description,
      logoUri: source?.imageUri ?? source?.logoUri
    };
    const analysis = logo.analyze(normalized);
    const context = contextService.build(normalized.tokenSymbol ?? "$TOKEN", normalized.description ?? "", normalized.hints, analysis);
    const style = styleService.generate(normalized, analysis, context, 1);
    const pack = traits.generate(style);
    const rules = traits.compatibilityRules(pack);
    const generatedPreviews = previews.generate(style, pack, input.tokenMint, 0);
    const distinctiveness = distinctivenessService.score(style, existing);
    const quality = qualityService.validate(style, pack, rules, generatedPreviews, distinctiveness);
    const compatibilityResult = compatibility.validateRules(pack, rules);
    const sampleFailures = verifySample(style, pack, generatedPreviews, metadata, distinctiveness.passed, compatibilityResult.passed);
    failures.push(...sampleFailures.map((failure) => `${style.collection}: ${failure}`));
    generatedStyles.push(style);
    existing.push({
      id: input.tokenMint,
      collection: style.collection,
      mascot: style.mascot,
      artStyle: style.artStyle,
      colors: style.colors,
      backgroundWorld: style.backgroundWorld,
      traitLanguage: style.traitLanguage,
      visualFingerprint: style.visualFingerprint,
      brandDna: style.brandDna
    });
    return {
      collection: style.collection,
      sourceMint: input.tokenMint,
      creativeDnaKey: style.creativeUniverse.archetype,
      creativeDna: style.creativeUniverse.creativeDna,
      visualSystem: style.creativeUniverse.creativeDna.visualSystem,
      signalProfile: style.creativeUniverse.signalProfile,
      artStyle: style.artStyle,
      artStyleReason: style.creativeUniverse.artStyleReason,
      mascot: style.mascot,
      world: style.backgroundWorld,
      silhouette: style.brandDna.mascotSilhouette,
      baseArchetypes: style.brandDna.baseArchetypes.slice(0, 3),
      taxonomy: style.creativeUniverse.taxonomy.map((category) => ({ role: category.role, label: category.label, examples: category.nouns.slice(0, 3) })),
      moodCulture: style.creativeUniverse.moodCulture.map((mood) => ({ name: mood.name, eyes: mood.eyeLanguage, mouth: mood.mouthLanguage, animationState: mood.animationState })),
      animationReadiness: style.creativeUniverse.animationReadiness,
      productionAssetPolicy: style.productionAssetPolicy,
      productionAssetStatus: style.productionAssetStatus,
      previewClassifications: generatedPreviews.map((preview) => preview.previewClassification),
      sampleNfts: generatedPreviews.filter((item) => item.type === "SAMPLE_NFT").map((item) => ({
        label: item.label,
        rarity: item.metadata.rarity,
        traitCount: item.metadata.traitCount,
        compositionCategory: item.metadata.compositionCategory,
        renderedTraitKeys: item.metadata.renderedTraitKeys,
        renderingEngine: item.metadata.renderingEngine,
        cameraVariant: item.metadata.cameraVariant,
        faceVariant: item.metadata.faceVariant,
        silhouetteVariant: item.metadata.silhouetteVariant,
        eventFrame: item.metadata.eventFrame,
        renderFingerprint: item.metadata.renderFingerprint
      })),
      qualityTier: quality.tier,
      conceptIssues: quality.issues.filter((issue) => !/production|fallback/i.test(issue)),
      productionBlockers: quality.issues.filter((issue) => /production|fallback/i.test(issue)),
      distinctivenessScore: distinctiveness.score,
      distinctivenessPassed: distinctiveness.passed,
      compatibilityPassed: compatibilityResult.passed,
      traitExamples: style.traitLanguage.slice(0, 8),
      productionReady: false,
      blocker: "Concept preview only. Launch requires curated/handmade layer packs, stronger curation for epic+, artist review where required, and permanent storage."
    };
  });

  failures.push(...verifyCollectionSet(report));
  failures.push(...verifySameRendererPairs(generatedStyles, creativeDna));
  failures.push(...verifyNoOpenAiInProductionHotPaths());
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), failures, samples: report }, null, 2));
  if (failures.length) {
    throw new Error(`Generator quality sample failures: ${failures.join("; ")}`);
  }
}

function verifySample(
  style: GeneratedStyleProfile,
  pack: TraitPackPlan,
  previews: PreviewAssetPlan[],
  metadata: MetadataGeneratorService,
  distinctivenessPassed: boolean,
  compatibilityPassed: boolean
) {
  const failures: string[] = [];
  const samplesByRarity = new Map(previews.filter((item) => item.type === "SAMPLE_NFT").map((item) => [String(item.metadata.rarity), item]));
  const common = samplesByRarity.get("Common");
  const epic = samplesByRarity.get("Epic");
  const legendary = samplesByRarity.get("Legendary");
  const mythic = samplesByRarity.get("Mythic");
  if (!common || !epic || !legendary || !mythic) failures.push("preview set must include Common, Epic, Legendary, and Mythic samples.");
  if (common && (Number(common.metadata.traitCount) > 4 || /premium|legendary|signature|mythic/i.test(String(common.metadata.aura)) || /premium|legendary|signature|mythic/i.test(String(common.metadata.frame)))) failures.push("Common sample is not simple enough.");
  if (common && [common.metadata.headgear, common.metadata.accessory, common.metadata.aura].map(String).includes("None")) failures.push("Common sample contains empty None traits.");
  if (common && epic && Number(epic.metadata.traitCount) <= Number(common.metadata.traitCount)) failures.push("Epic sample is not visibly more complex than Common.");
  if (legendary && (legendary.metadata.compositionCategory !== "signature-scene" || /none|no signature/i.test(String(legendary.metadata.legendaryOverlay)))) failures.push("Legendary sample is not compositionally unique.");
  if (mythic && (mythic.metadata.compositionCategory !== "near-1-of-1" || mythic.metadata.specialMetadataFlag !== "MYTHIC_CURATED_COMPOSITION")) failures.push("Mythic sample is missing near-1/1 metadata.");
  const sampleNfts = previews.filter((item) => item.type === "SAMPLE_NFT");
  const faceVariants = new Set(sampleNfts.map((item) => String(item.metadata.faceVariant ?? "")));
  const cameraVariants = new Set(sampleNfts.map((item) => String(item.metadata.cameraVariant ?? "")));
  const silhouetteVariants = new Set(sampleNfts.map((item) => String(item.metadata.silhouetteVariant ?? "")));
  const renderFingerprints = new Set(sampleNfts.map((item) => String(item.metadata.renderFingerprint ?? "")));
  if (faceVariants.size < 5) failures.push("Rarity ladder does not vary face rendering enough.");
  if (cameraVariants.size < 5) failures.push("Rarity ladder does not vary camera/framing enough.");
  if (silhouetteVariants.size < 5) failures.push("Rarity ladder does not vary silhouette enough.");
  if (renderFingerprints.size < 5) failures.push("Rarity ladder does not expose unique render fingerprints.");
  if (legendary && !/event|incident|takeover|scene|legendary|wide|camera/i.test(String(legendary.metadata.eventFrame) + String(legendary.metadata.cameraVariant))) failures.push("Legendary sample is not a scene-level event.");
  if (mythic && !/mythic|takeover|one-off|world|near/i.test(String(mythic.metadata.eventFrame) + String(mythic.metadata.cameraVariant) + String(mythic.metadata.silhouetteVariant))) failures.push("Mythic sample is not a near-1/1 world-level event.");
  for (const preview of previews.filter((item) => item.type === "SAMPLE_NFT")) {
    const generated = metadata.sample(style, pack, preview);
    const attributes = Object.fromEntries(generated.attributes.map((attribute) => [attribute.trait_type, String(attribute.value)]));
    const checks: Array<[string, unknown]> = [
      ["Background", preview.metadata.background],
      ["Base Character", preview.metadata.base],
      ["Headgear", preview.metadata.headgear],
      ["Eyes", preview.metadata.eyes],
      ["Mouth Expression", preview.metadata.mouthExpression],
      ["Outfit", preview.metadata.outfit],
      ["Aura", preview.metadata.aura],
      ["Accessory", preview.metadata.accessory],
      ["Neck/Chest Accessory", preview.metadata.neckChestAccessory],
      ["Frame/Border", preview.metadata.frame],
      ["Pose", preview.metadata.pose],
      ["Scene", preview.metadata.scene],
      ["Rarity", preview.metadata.rarity]
    ];
    for (const [traitType, expected] of checks) {
      if (attributes[traitType] !== String(expected)) failures.push(`${preview.label} metadata mismatch for ${traitType}.`);
    }
  }
  const forbiddenText = JSON.stringify({ style, pack: pack.traits.slice(0, 40) }).toLowerCase();
  if (/neon cyber frog/.test(forbiddenText)) failures.push("forbidden generic neon cyber frog pattern found.");
  if (/biohazard-viral|frog-degen|dog-cozy|dog-pack|cat-hyper-meme|robot-ai|trader-finance/.test(String(style.creativeUniverse.archetype))) {
    failures.push("Creative DNA key still exposes a fixed archetype template.");
  }
  if ((style.brandDna.tokenSymbol ?? "").replace(/^\$/, "") === "HANTA") {
    const hantaText = JSON.stringify({
      dna: style.creativeUniverse.creativeDna,
      signals: style.creativeUniverse.signalProfile,
      taxonomy: style.creativeUniverse.taxonomy,
      traits: pack.traits.slice(0, 60)
    }).toLowerCase();
    const hantaIdentityText = JSON.stringify({
      artStyle: style.creativeUniverse.creativeDna.artStyle,
      worldConcept: style.creativeUniverse.creativeDna.worldConcept,
      mascotOrSubject: style.creativeUniverse.creativeDna.mascotOrSubject,
      taxonomy: style.creativeUniverse.taxonomy.map((category) => ({ label: category.label, nouns: category.nouns })),
      traitExamples: pack.traits.slice(0, 60)
    }).toLowerCase();
    if (!/hanta|hantavirus|medical|contamination|virus|viral|infection|pathogen|outbreak|quarantine|mutation|lab|fever|microscope|specimen/.test(hantaText)) {
      failures.push("HANTA Creative DNA is not strongly related to Hantavirus-like metadata signals.");
    }
    if (/generic robot|random robot|token-native sparse/.test(hantaIdentityText)) {
      failures.push("HANTA sparse metadata fell back to a generic template identity.");
    }
  }
  if (!distinctivenessPassed) failures.push("distinctiveness score did not pass.");
  if (!compatibilityPassed) failures.push("compatibility rules did not pass.");
  return failures;
}

function verifyCollectionSet(report: Array<Record<string, any>>) {
  const failures: string[] = [];
  if (report.length < 8) failures.push("quality samples must include at least 8 metadata examples.");
  const creativeDnaKeys = new Set(report.map((item) => item.creativeDnaKey));
  if (creativeDnaKeys.size !== report.length) failures.push("each quality sample must generate a unique Creative DNA key.");
  const styles = new Map<string, string[]>();
  const worldConcepts = new Map<string, string[]>();
  const legendaryStructures = new Map<string, string[]>();
  const visualSignatures = new Map<string, string[]>();
  const rendererFamilies = new Set<string>();
  const renderingEngines = new Set<string>();
  for (const item of report) {
    const style = String(item.artStyle);
    styles.set(style, [...(styles.get(style) ?? []), String(item.collection)]);
    const world = String(item.creativeDna?.worldConcept ?? item.world);
    worldConcepts.set(world, [...(worldConcepts.get(world) ?? []), String(item.collection)]);
    const legendary = String(item.creativeDna?.legendaryMythology ?? "");
    legendaryStructures.set(legendary, [...(legendaryStructures.get(legendary) ?? []), String(item.collection)]);
    const visual = item.visualSystem ?? item.creativeDna?.visualSystem;
    if (visual?.rendererFamily) rendererFamilies.add(String(visual.rendererFamily));
    if (visual?.renderingEngine) renderingEngines.add(String(visual.renderingEngine));
    const signature = [
      visual?.rendererFamily,
      visual?.renderingEngine,
      visual?.bodySystem,
      visual?.eyeSystem,
      visual?.mouthSystem,
      visual?.faceGrammar,
      visual?.compositionStyle,
      visual?.cameraSystem,
      visual?.lightingModel,
      visual?.cardStructure
    ].map(String).join("|");
    visualSignatures.set(signature, [...(visualSignatures.get(signature) ?? []), String(item.collection)]);
    if (!Array.isArray(item.taxonomy) || item.taxonomy.length < 10) failures.push(`${item.collection} does not expose a community-native taxonomy.`);
    if (/\b(frog|dog|anime|trader|robot)\b/i.test(JSON.stringify(item.taxonomy))) failures.push(`${item.collection} still exposes fixed template taxonomy labels.`);
    if (!Array.isArray(item.moodCulture) || item.moodCulture.length < 3) failures.push(`${item.collection} does not expose community-native mood culture.`);
    if (!item.creativeDna?.artStyle || !item.signalProfile?.semanticWeights) failures.push(`${item.collection} does not expose generated Creative DNA and signal profile.`);
    if (!visual?.renderingEngine || !visual?.bodySystem || !visual?.eyeSystem || !visual?.mouthSystem || !visual?.faceGrammar || !visual?.compositionStyle || !visual?.cameraSystem || !visual?.lightingModel || !visual?.rarityProgression || !visual?.rarityFrames?.Mythic) failures.push(`${item.collection} does not expose a complete visual system.`);
    if (item.productionReady !== false || item.productionAssetPolicy?.launchClassification !== "CONCEPT_PREVIEW") failures.push(`${item.collection} incorrectly marks concept output as production-ready.`);
    if (item.productionAssetStatus !== "WIREFRAME") failures.push(`${item.collection} wireframe sample must remain WIREFRAME status.`);
    if (!item.previewClassifications?.every((value: string) => value === "WIREFRAME_CONCEPT")) failures.push(`${item.collection} procedural samples must be labeled WIREFRAME_CONCEPT.`);
    if (item.productionAssetPolicy?.aiFinalImageAllowed !== false) failures.push(`${item.collection} allows fully AI-generated final NFT images.`);
  }
  if (rendererFamilies.size < 5) failures.push("quality samples must exercise at least five renderer families.");
  if (renderingEngines.size < 5) failures.push("quality samples must exercise at least five rendering engines.");
  for (const [style, collections] of styles) {
    if (collections.length > 1) failures.push(`art style "${style}" is reused by ${collections.join(", ")}.`);
  }
  for (const [world, collections] of worldConcepts) {
    if (collections.length > 1) failures.push(`world concept "${world}" is reused by ${collections.join(", ")}.`);
  }
  for (const [legendary, collections] of legendaryStructures) {
    if (collections.length > 1) failures.push(`legendary structure "${legendary}" is reused by ${collections.join(", ")}.`);
  }
  for (const [signature, collections] of visualSignatures) {
    if (signature && collections.length > 1) failures.push(`visual system signature is reused by ${collections.join(", ")}.`);
  }
  for (let left = 0; left < report.length; left += 1) {
    for (let right = left + 1; right < report.length; right += 1) {
      const a = report[left];
      const b = report[right];
      const taxonomyOverlap = jaccard(
        a.taxonomy.flatMap((category: { label: string }) => significantWords(category.label)),
        b.taxonomy.flatMap((category: { label: string }) => significantWords(category.label))
      );
      const traitOverlap = jaccard(significantWords(a.traitExamples.join(" ")), significantWords(b.traitExamples.join(" ")));
      const poseOverlap = jaccard(significantWords(a.baseArchetypes.join(" ")), significantWords(b.baseArchetypes.join(" ")));
      if (taxonomyOverlap > 0.35) failures.push(`${a.collection} and ${b.collection} share too much trait taxonomy.`);
      if (traitOverlap > 0.34) failures.push(`${a.collection} and ${b.collection} share too much trait vocabulary.`);
      if (poseOverlap > 0.62) failures.push(`${a.collection} and ${b.collection} share too much pose/silhouette language.`);
    }
  }
  return failures;
}

function verifySameRendererPairs(styles: GeneratedStyleProfile[], creativeDna: CreativeDnaService) {
  const failures: string[] = [];
  const grouped = new Map<string, GeneratedStyleProfile[]>();
  for (const style of styles) {
    const renderer = style.creativeUniverse.creativeDna.visualSystem.rendererFamily;
    grouped.set(renderer, [...(grouped.get(renderer) ?? []), style]);
  }
  const pairs = [...grouped.entries()].flatMap(([renderer, entries]) =>
    entries.length >= 2 ? entries.slice(0, 2).map((style) => ({ renderer, style })) : []
  );
  if (!pairs.length) return ["quality samples must include at least one same-renderer pair to prove the renderer is only a medium."];

  for (const [renderer, entries] of grouped) {
    if (entries.length < 2) continue;
    for (let left = 0; left < entries.length; left += 1) {
      for (let right = left + 1; right < entries.length; right += 1) {
        const a = entries[left];
        const b = entries[right];
        const pairIssues = creativeDna.compareCivilizations(a, b);
        failures.push(...pairIssues.map((issue) => `${a.collection} and ${b.collection} share renderer ${renderer}: ${issue}`));
        const visualA = a.creativeUniverse.creativeDna.visualSystem;
        const visualB = b.creativeUniverse.creativeDna.visualSystem;
        if (a.creativeUniverse.creativeDna.worldConcept === b.creativeUniverse.creativeDna.worldConcept) failures.push(`${a.collection} and ${b.collection} share a world concept under renderer ${renderer}.`);
        if (a.creativeUniverse.creativeDna.legendaryMythology === b.creativeUniverse.creativeDna.legendaryMythology) failures.push(`${a.collection} and ${b.collection} share mythology under renderer ${renderer}.`);
        if (visualA.cameraSystem === visualB.cameraSystem) failures.push(`${a.collection} and ${b.collection} share camera language under renderer ${renderer}.`);
        if (a.creativeUniverse.creativeDna.rarityPhilosophy === b.creativeUniverse.creativeDna.rarityPhilosophy) failures.push(`${a.collection} and ${b.collection} share rarity storytelling under renderer ${renderer}.`);
      }
    }
  }
  return failures;
}

function verifyNoOpenAiInProductionHotPaths() {
  const failures: string[] = [];
  const hotPathFiles = [
    "src/vault-mint/vault-mint-orchestrator.service.ts",
    "src/vault-mint/vault-redeem-orchestrator.service.ts",
    "src/vault-mint/solana-transaction-adapter.service.ts",
    "src/staking/staking.service.ts",
    "src/generator/asset-production-layer.service.ts",
    "src/generator/deterministic-render.service.ts"
  ];
  const forbidden = /\b(AiConceptPipelineService|OpenAIImageProvider|HybridAssetProvider|ENABLE_AI_IMAGE_GENERATION|OPENAI_API_KEY|openai\.generate|aiConcepts\.generate)\b/;
  for (const file of hotPathFiles) {
    const source = readFileSync(file, "utf8");
    if (forbidden.test(source)) failures.push(`${file} must not call or configure OpenAI image generation in mint/final-render/redeem/stake paths.`);
  }
  return failures;
}

function significantWords(value: string) {
  const stop = new Set([
    "with",
    "from",
    "that",
    "this",
    "into",
    "token",
    "holder",
    "holders",
    "raid",
    "raids",
    "vault",
    "vaults",
    "scene",
    "mark",
    "sigil",
    "emblem",
    "trade",
    "community",
    "base",
    "body",
    "bodies",
    "form",
    "forms",
    "pose",
    "poses",
    "crop",
    "readability",
    "readable",
    "rounded",
    "sharp",
    "mascot",
    "signal",
    "signals",
    "objects",
    "relics",
    "tools",
    "charms",
    "rooms",
    "worlds",
    "weather",
    "districts",
    "masks",
    "crowns",
    "glares",
    "blinks",
    "fits",
    "wraps",
    "frames",
    "borders",
    "loops",
    "motion",
    "states",
    "layers",
    "compact",
    "braced",
    "side",
    "stepping",
    "front",
    "facing",
    "low",
    "angle",
    "three",
    "quarter",
    "full",
    "sticker",
    "waist",
    "tight",
    "portrait",
    "scout",
    "idol",
    "carrier",
    "witness",
    "runner",
    "figure",
    "subject",
    "dominant",
    "anchor",
    "object",
    "medical",
    "market",
    "stress",
    "dream",
    "surreal",
    "specific",
    "silhouette",
    "changes",
    "camera",
    "framing",
    "system",
    "shown",
    "emotion",
    "rendering",
    "read",
    "view",
    "built",
    "around"
  ]);
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3 && !stop.has(word));
}

function jaccard(left: string[], right: string[]) {
  const a = new Set(left);
  const b = new Set(right);
  const shared = [...a].filter((word) => b.has(word)).length;
  return shared / Math.max(1, new Set([...a, ...b]).size);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
