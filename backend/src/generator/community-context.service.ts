import { Injectable } from "@nestjs/common";
import type { CommunityContextOutput, CommunityHints, LogoAnalysisOutput } from "./generator.types";
import { pick, seedFrom, slugWords, titleCase, unique } from "./generator.util";

@Injectable()
export class CommunityContextService {
  build(symbol: string, description: string, hints: CommunityHints | undefined, analysis: LogoAnalysisOutput): CommunityContextOutput {
    const memes = this.clean(hints?.memes);
    const slogans = this.clean(hints?.slogans);
    const phrases = this.clean(hints?.phrases);
    const lore = hints?.lore?.trim();
    const rawWords = slugWords([description, lore, ...memes, ...slogans, ...phrases, ...analysis.visualKeywords].join(" "));
    const fallbackWords = this.fallbackWords(analysis);
    const vocabulary = unique([...rawWords, ...fallbackWords]).slice(0, 20);
    const seed = seedFrom(`${symbol}:${vocabulary.join("|")}:${analysis.mascot}`);
    const motif = titleCase(pick(vocabulary, seed));
    const place = titleCase(pick(vocabulary, seed + 5));

    return {
      memes,
      slogans,
      phrases,
      lore,
      extractedVocabulary: vocabulary,
      traitSeeds: this.namedSet(vocabulary, seed, ["Relic", "Mask", "Signal", "Crown", "Blade", "Staff", "Halo", "Cloak"]),
      roleNames: [
        `${motif} Founder`,
        `${place} Raider`,
        `${motif} Whale`,
        `${place} Prophet`,
        `${motif} Marshal`
      ],
      raidNames: [
        `${motif} Takeover`,
        `${place} Boss Rush`,
        `${motif} Signal Raid`,
        `${place} Treasury Strike`
      ],
      backgroundNames: [
        `${motif} Temple`,
        `${place} War Room`,
        `${motif} Vault Gate`,
        `${place} Moon District`
      ]
    };
  }

  private clean(items?: string[]) {
    return (items ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 12);
  }

  private fallbackWords(analysis: LogoAnalysisOutput) {
    const mascot = analysis.mascot.toLowerCase();
    if (/frog|swamp/.test(mascot)) return ["swamp", "bog", "lily", "mire", "ritual", "toxic"];
    if (/dog|samurai/.test(mascot)) return ["kennel", "moon", "crown", "bark", "marshal", "kingdom"];
    if (/cat/.test(mascot)) return ["neon", "alley", "static", "claw", "syndicate", "hacker"];
    if (/robot/.test(mascot)) return ["reactor", "mech", "warband", "signal", "factory", "core"];
    if (/alien/.test(mascot)) return ["nebula", "casino", "jackpot", "orbit", "plasma", "vault"];
    return ["vault", "raid", "crown", "sigil", "guild", "legend"];
  }

  private namedSet(words: string[], seed: number, nouns: string[]) {
    return nouns.map((noun, index) => `${titleCase(pick(words, seed + index * 3))} ${noun}`);
  }
}

