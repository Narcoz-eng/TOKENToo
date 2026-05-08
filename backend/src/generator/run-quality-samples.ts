import { ArtPreviewGeneratorService } from "./art-preview-generator.service";
import { CollectionDistinctivenessScorerService } from "./collection-distinctiveness-scorer.service";
import { CommunityContextService } from "./community-context.service";
import { CompatibilityEngineService } from "./compatibility-engine.service";
import { LogoAnalysisService } from "./logo-analysis.service";
import { QualityValidatorService } from "./quality-validator.service";
import { RarityEngineService } from "./rarity-engine.service";
import { StyleProfileGeneratorService } from "./style-profile-generator.service";
import { TraitPackGeneratorService } from "./trait-pack-generator.service";
import type { CreateGenerationRunInput } from "./generator.types";

const samples: CreateGenerationRunInput[] = [
  { tokenName: "Citadel Signal", tokenSymbol: "$SIGNAL", tokenMint: "DT93bLkL1VagdhasrKWqQ6UGMNwUwL1oATRzhepE9SP3", description: "mystic signal token with citadel rituals", selectedPreset: "mystic-pixel-cult", hints: { mascotPreference: "signal warden", memes: ["signal raid", "citadel watch"], mood: "fantasy" } },
  { tokenName: "Doge Kingdom", tokenSymbol: "$DOGE", tokenMint: "HZd7Rr7APjWjzxUigrPssft52ykTqwF1oA5DRPL5tva6", description: "royal dog meme kingdom with moon kennel battles", selectedPreset: "meme-kingdom", hints: { mascotPreference: "dog", memes: ["golden bark"], mood: "funny" } },
  { tokenName: "Cat Syndicate", tokenSymbol: "$CAT", tokenMint: "87WxncrW1tKYyHBsv4qFbANtgVAe8peNPtmf6ySDycaj", description: "cyber cat alley syndicate with neon hacker claws", selectedPreset: "cyber-alley-syndicate", hints: { mascotPreference: "cat", mood: "cyber" } },
  { tokenName: "Robot Warband", tokenSymbol: "$BOT", tokenMint: "D4TXW495tiD55ttwXyWjVEeDWUweb7RCUfPLmn9nD5qg", description: "industrial robot machine guild and reactor warband", selectedPreset: "robot-warband", hints: { mascotPreference: "robot", mood: "aggressive" } },
  { tokenName: "Alien Casino", tokenSymbol: "$ALIEN", tokenMint: "99CfCw7wUh4st1MQLR74oNna89FtrrfnrDfozN4i21tp", description: "cosmic alien casino with jackpot vault raids", selectedPreset: "alien-casino", hints: { mascotPreference: "alien", mood: "chaotic" } },
  { tokenName: "Skull Raiders", tokenSymbol: "$SKULL", tokenMint: "2sZD6NmmN2JpicBj9nPDZzFsKd2obPmU7uNmeZ2KYiVD", description: "dark skull raiders in cursed fortress crypts", selectedPreset: "dark-fantasy-raiders", hints: { mascotPreference: "skull", mood: "dark" } },
  { tokenName: "Wizard Vault", tokenSymbol: "$WIZ", tokenMint: "5XPaqkNNuU6Tejym5ppKcfLjyh8gdQasa1YLUfJo7rS3", description: "wizard guild of spell vaults and magic raid crowns", selectedPreset: "mystic-pixel-cult", hints: { mascotPreference: "wizard", mood: "fantasy" } },
  { tokenName: "Coin Crown Club", tokenSymbol: "$COIN", tokenMint: "12B2TPNFmwDSt2dtT48GkCD6LFDWk9kBysjU9F8UhEYm", description: "coin mascot luxury crown club with gold treasury lounge", selectedPreset: "luxury-crown-club", hints: { mascotPreference: "coin mascot", mood: "luxury" } },
  { tokenName: "Luxury Vault", tokenSymbol: "$VIP", tokenMint: "7SgWVoXe8YFzbBuCX3htXJh8HB6AzYmwLMcUHoDEbsHc", description: "premium luxury vault lounge with diamond status roles", selectedPreset: "luxury-crown-club", hints: { mood: "luxury", memes: ["diamond hands", "founder lounge"] } },
  { tokenName: "Chaos Meme", tokenSymbol: "$CHAOS", tokenMint: "58kSkUPkQQXocydDTFfYgxmghgfG8f6TA98arMFk9T79", description: "chaotic degen meme raids with wild jackpot energy", selectedPreset: "alien-casino", hints: { mood: "chaotic", memes: ["send it", "chaos raid"] } }
];

async function main() {
  const logo = new LogoAnalysisService();
  const contextService = new CommunityContextService();
  const styleService = new StyleProfileGeneratorService(new RarityEngineService());
  const traits = new TraitPackGeneratorService(new RarityEngineService());
  const compatibility = new CompatibilityEngineService();
  const previews = new ArtPreviewGeneratorService();
  const distinctivenessService = new CollectionDistinctivenessScorerService();
  const qualityService = new QualityValidatorService();
  const existing: Array<{ id: string; collection: string; mascot: string; colors: unknown; backgroundWorld: string; traitLanguage: unknown }> = [];

  const report = samples.map((input) => {
    const analysis = logo.analyze(input);
    const context = contextService.build(input.tokenSymbol, input.description, input.hints, analysis);
    const style = styleService.generate(input, analysis, context, 1);
    const pack = traits.generate(style);
    const rules = traits.compatibilityRules(pack);
    const generatedPreviews = previews.generate(style, pack, input.tokenMint, 0);
    const distinctiveness = distinctivenessService.score(style, existing);
    const quality = qualityService.validate(style, pack, rules, generatedPreviews, distinctiveness);
    const compatibilityResult = compatibility.validateRules(pack, rules);
    existing.push({ id: input.tokenMint, collection: style.collection, mascot: style.mascot, colors: style.colors, backgroundWorld: style.backgroundWorld, traitLanguage: style.traitLanguage });
    return {
      collection: style.collection,
      avatar: generatedPreviews.find((item) => item.type === "AVATAR")?.uri.slice(0, 64) + "...",
      banner: generatedPreviews.find((item) => item.type === "BANNER")?.uri.slice(0, 64) + "...",
      sampleNfts: generatedPreviews.filter((item) => item.type === "SAMPLE_NFT").map((item) => ({ label: item.label, metadata: item.metadata })),
      qualityTier: quality.tier,
      qualityPassed: quality.passed,
      distinctivenessScore: distinctiveness.score,
      distinctivenessPassed: distinctiveness.passed,
      compatibilityPassed: compatibilityResult.passed,
      traitExamples: style.traitLanguage.slice(0, 8),
      lore: style.lore,
      roleNames: style.roleNames,
      productionReady: false,
      blocker: "Current previews are deterministic SVG fallback output. They are useful for identity testing but not production NFT studio art."
    };
  });

  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), samples: report }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
