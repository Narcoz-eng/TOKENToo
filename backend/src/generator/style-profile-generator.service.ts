import { Injectable } from "@nestjs/common";
import { getPreset } from "./art-presets";
import type { CommunityContextOutput, CreateGenerationRunInput, GeneratedStyleProfile, LogoAnalysisOutput } from "./generator.types";
import { pick, seedFrom, titleCase, unique } from "./generator.util";
import { RarityEngineService } from "./rarity-engine.service";

@Injectable()
export class StyleProfileGeneratorService {
  constructor(private readonly rarity: RarityEngineService) {}

  generate(input: CreateGenerationRunInput, analysis: LogoAnalysisOutput, context: CommunityContextOutput, version = 1): GeneratedStyleProfile {
    const preset = getPreset(input.selectedPreset);
    const seed = seedFrom(`${input.tokenMint}:${input.tokenSymbol}:${version}:${context.extractedVocabulary.join("|")}`);
    const motif = titleCase(pick(context.extractedVocabulary, seed));
    const world = input.hints?.themePreference?.trim() || pick(preset.backgroundWorlds, seed + 2);
    const mascot = `${analysis.mascot} ${pick(["warden", "prophet", "raider", "champion", "founder", "boss"], seed + 4)}`;
    const theme = `${motif} ${pick(["vault raiders", "guild", "cult", "kingdom", "syndicate", "warband"], seed + 6)}`;
    const roleNames = unique([...context.roleNames, `${motif} Legend`, `${titleCase(analysis.mascot)} Captain`]).slice(0, 8);
    const traitLanguage = unique([
      ...context.traitSeeds,
      ...preset.traitNouns,
      ...context.backgroundNames,
      `${motif} Aura`,
      `${motif} Raid Crown`,
      `${titleCase(analysis.mascot)} Relic`
    ]).slice(0, 24);

    return {
      collection: `${input.tokenSymbol} Vaults`,
      theme,
      mascot,
      artStyle: preset.artStyle,
      colors: analysis.palette,
      backgroundWorld: world,
      traitLanguage,
      rarityStructure: this.rarity.weights(),
      legendaryTheme: `${preset.legendaryDirection}: ${motif} ${titleCase(analysis.mascot)} Ascendant`,
      animationStyle: preset.animationDirection,
      raidTheme: pick(context.raidNames, seed + 8),
      lore: this.lore(input, analysis, context, theme, world),
      roleNames
    };
  }

  private lore(input: CreateGenerationRunInput, analysis: LogoAnalysisOutput, context: CommunityContextOutput, theme: string, world: string) {
    if (context.lore) return context.lore;
    const slogan = context.slogans[0] ? ` Their chant is "${context.slogans[0]}."` : "";
    return `${input.tokenSymbol} holders formed the ${theme} inside ${world}. The ${analysis.mascot} identity is built from ${analysis.visualKeywords.slice(0, 4).join(", ")} and rewards members who lock, raid, and grow the faction.${slogan}`;
  }
}

