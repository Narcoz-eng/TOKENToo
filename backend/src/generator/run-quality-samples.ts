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
    selectedPreset: "neon-samurai",
    hints: {
      sourceMetadata: {
        mint: "HZd7Rr7APjWjzxUigrPssft52ykTqwF1oA5DRPL5tva6",
        name: "Shib Moon Guard",
        symbol: "SHIBG",
        description: "A Shib pack with moon kennel rituals, kabuto raids, bone banners, and diamond paw holders.",
        imageUri: "https://metadata.example/shib-guard.png",
        metadataUri: "https://metadata.example/shib-guard.json",
        socialLinks: { twitter: "https://x.com/shibguard", discord: "https://discord.gg/shibguard" },
        extensions: { community: "moon kennel dojo" }
      },
      memes: ["diamond paws", "bone brigade"],
      mood: "aggressive"
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
  }
];

type ExistingStyle = { id: string; collection: string; mascot: string; colors: unknown; backgroundWorld: string; traitLanguage: unknown; visualFingerprint?: unknown; brandDna?: unknown };

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
      colors: style.colors,
      backgroundWorld: style.backgroundWorld,
      traitLanguage: style.traitLanguage,
      visualFingerprint: style.visualFingerprint,
      brandDna: style.brandDna
    });
    return {
      collection: style.collection,
      sourceMint: input.tokenMint,
      mascot: style.mascot,
      world: style.backgroundWorld,
      silhouette: style.brandDna.mascotSilhouette,
      baseArchetypes: style.brandDna.baseArchetypes.slice(0, 3),
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
      blocker: "Concept preview only. Launch requires real asset providers and permanent storage."
    };
  });

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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
