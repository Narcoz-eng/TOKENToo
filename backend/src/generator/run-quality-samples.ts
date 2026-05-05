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
  { tokenName: "Frog Vault Token", tokenSymbol: "$FROG", tokenMint: "frog-devnet-sample", description: "mystic swamp cult frog token with toxic bog rituals", selectedPreset: "mystic-pixel-cult", hints: { mascotPreference: "frog", memes: ["ribbit raid", "toxic bog"], mood: "fantasy" } },
  { tokenName: "Doge Kingdom", tokenSymbol: "$DOGE", tokenMint: "dog-devnet-sample", description: "royal dog meme kingdom with moon kennel battles", selectedPreset: "meme-kingdom", hints: { mascotPreference: "dog", memes: ["golden bark"], mood: "funny" } },
  { tokenName: "Cat Syndicate", tokenSymbol: "$CAT", tokenMint: "cat-devnet-sample", description: "cyber cat alley syndicate with neon hacker claws", selectedPreset: "cyber-alley-syndicate", hints: { mascotPreference: "cat", mood: "cyber" } },
  { tokenName: "Robot Warband", tokenSymbol: "$BOT", tokenMint: "robot-devnet-sample", description: "industrial robot machine guild and reactor warband", selectedPreset: "robot-warband", hints: { mascotPreference: "robot", mood: "aggressive" } },
  { tokenName: "Alien Casino", tokenSymbol: "$ALIEN", tokenMint: "alien-devnet-sample", description: "cosmic alien casino with jackpot vault raids", selectedPreset: "alien-casino", hints: { mascotPreference: "alien", mood: "chaotic" } },
  { tokenName: "Skull Raiders", tokenSymbol: "$SKULL", tokenMint: "skull-devnet-sample", description: "dark skull raiders in cursed fortress crypts", selectedPreset: "dark-fantasy-raiders", hints: { mascotPreference: "skull", mood: "dark" } },
  { tokenName: "Wizard Vault", tokenSymbol: "$WIZ", tokenMint: "wizard-devnet-sample", description: "wizard guild of spell vaults and magic raid crowns", selectedPreset: "mystic-pixel-cult", hints: { mascotPreference: "wizard", mood: "fantasy" } },
  { tokenName: "Coin Crown Club", tokenSymbol: "$COIN", tokenMint: "coin-devnet-sample", description: "coin mascot luxury crown club with gold treasury lounge", selectedPreset: "luxury-crown-club", hints: { mascotPreference: "coin mascot", mood: "luxury" } },
  { tokenName: "Luxury Vault", tokenSymbol: "$VIP", tokenMint: "luxury-devnet-sample", description: "premium luxury vault lounge with diamond status roles", selectedPreset: "luxury-crown-club", hints: { mood: "luxury", memes: ["diamond hands", "founder lounge"] } },
  { tokenName: "Chaos Meme", tokenSymbol: "$CHAOS", tokenMint: "chaos-devnet-sample", description: "chaotic degen meme raids with wild jackpot energy", selectedPreset: "alien-casino", hints: { mood: "chaotic", memes: ["send it", "chaos raid"] } }
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
