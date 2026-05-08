import { ArtPreviewGeneratorService } from "./art-preview-generator.service";
import { CollectionDistinctivenessScorerService } from "./collection-distinctiveness-scorer.service";
import { CommunityContextService } from "./community-context.service";
import { CompatibilityEngineService } from "./compatibility-engine.service";
import type { CreateGenerationRunInput, GeneratedStyleProfile, PreviewAssetPlan, TraitPackPlan } from "./generator.types";
import { LogoAnalysisService } from "./logo-analysis.service";
import { MetadataGeneratorService } from "./metadata-generator.service";
import { QualityValidatorService } from "./quality-validator.service";
import { RarityEngineService } from "./rarity-engine.service";
import { StyleProfileGeneratorService } from "./style-profile-generator.service";
import { TraitPackGeneratorService } from "./trait-pack-generator.service";

const samples: CreateGenerationRunInput[] = [
  {
    tokenMint: "DT93bLkL1VagdhasrKWqQ6UGMNwUwL1oATRzhepE9SP3",
    selectedPreset: "meme-kingdom",
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
    selectedPreset: "meme-kingdom",
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
    selectedPreset: "cyber-alley-syndicate",
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
    selectedPreset: "robot-warband",
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
    selectedPreset: "alien-casino",
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
    selectedPreset: "dark-fantasy-raiders",
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
    selectedPreset: "luxury-crown-club",
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
    selectedPreset: "cyber-alley-syndicate",
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
  const existing: ExistingStyle[] = [];
  const failures: string[] = [];

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
      archetype: style.creativeUniverse.archetype,
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
      sampleNfts: generatedPreviews.filter((item) => item.type === "SAMPLE_NFT").map((item) => ({
        label: item.label,
        rarity: item.metadata.rarity,
        traitCount: item.metadata.traitCount,
        compositionCategory: item.metadata.compositionCategory,
        renderedTraitKeys: item.metadata.renderedTraitKeys
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
  if (common && (Number(common.metadata.traitCount) > 4 || common.metadata.aura !== "None" || common.metadata.frame !== "None")) failures.push("Common sample is not simple enough.");
  if (common && epic && Number(epic.metadata.traitCount) <= Number(common.metadata.traitCount)) failures.push("Epic sample is not visibly more complex than Common.");
  if (legendary && (legendary.metadata.compositionCategory !== "signature-scene" || legendary.metadata.legendaryOverlay === "None")) failures.push("Legendary sample is not compositionally unique.");
  if (mythic && (mythic.metadata.compositionCategory !== "near-1-of-1" || mythic.metadata.specialMetadataFlag !== "MYTHIC_CURATED_COMPOSITION")) failures.push("Mythic sample is missing near-1/1 metadata.");
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
  if (!distinctivenessPassed) failures.push("distinctiveness score did not pass.");
  if (!compatibilityPassed) failures.push("compatibility rules did not pass.");
  return failures;
}

function verifyCollectionSet(report: Array<Record<string, any>>) {
  const failures: string[] = [];
  if (report.length < 8) failures.push("quality samples must include at least 8 metadata examples.");
  const archetypes = new Set(report.map((item) => item.archetype));
  if (archetypes.size < 8) failures.push("quality samples must cover 8 different community archetypes.");
  const styles = new Map<string, string[]>();
  for (const item of report) {
    const style = String(item.artStyle);
    styles.set(style, [...(styles.get(style) ?? []), String(item.collection)]);
    if (!Array.isArray(item.taxonomy) || item.taxonomy.length < 10) failures.push(`${item.collection} does not expose a community-native taxonomy.`);
    if (!Array.isArray(item.moodCulture) || item.moodCulture.length < 3) failures.push(`${item.collection} does not expose community-native mood culture.`);
    if (item.productionReady !== false || item.productionAssetPolicy?.launchClassification !== "CONCEPT_PREVIEW") failures.push(`${item.collection} incorrectly marks concept output as production-ready.`);
    if (item.productionAssetPolicy?.aiFinalImageAllowed !== false) failures.push(`${item.collection} allows fully AI-generated final NFT images.`);
  }
  for (const [style, collections] of styles) {
    if (collections.length > 1) failures.push(`art style "${style}" is reused by ${collections.join(", ")} without a collection-specific override.`);
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
      if (poseOverlap > 0.34) failures.push(`${a.collection} and ${b.collection} share too much pose/silhouette language.`);
    }
  }
  return failures;
}

function significantWords(value: string) {
  const stop = new Set(["with", "from", "that", "this", "into", "token", "holder", "holders", "raid", "raids", "vault", "vaults", "scene", "mark", "sigil", "emblem", "trade", "community", "base"]);
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
