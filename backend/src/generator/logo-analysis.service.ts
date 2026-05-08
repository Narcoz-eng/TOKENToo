import { Injectable } from "@nestjs/common";
import { artPresets, getPreset } from "./art-presets";
import type { CreateGenerationRunInput, LogoAnalysisOutput } from "./generator.types";
import { pick, seedFrom, slugWords } from "./generator.util";

const fallbackPalettes = [
  ["#21f26b", "#7a35ff", "#050712"],
  ["#f6c84c", "#39ff88", "#1b1204"],
  ["#ff4fd8", "#28d7ff", "#08091a"],
  ["#ff6b35", "#ffd166", "#140907"],
  ["#79f2ff", "#d8f7ff", "#06131f"],
  ["#e6d28a", "#7a35ff", "#08060e"],
  ["#ff365e", "#101018", "#f4f7fb"],
  ["#a8ff3e", "#00e5ff", "#101018"]
];

const viralPattern = /hanta|hantavirus|virus|viral|biohazard|infection|infected|pathogen|outbreak|quarantine|mutation|mutant|patient zero|fever|plague|microbe|microscopic|specimen|containment/;

@Injectable()
export class LogoAnalysisService {
  analyze(input: CreateGenerationRunInput): LogoAnalysisOutput {
    const source = input.hints?.sourceMetadata;
    const raw = [
      input.tokenName,
      input.tokenSymbol,
      input.description,
      input.logoUri,
      input.logoData,
      source?.name,
      source?.symbol,
      source?.description,
      source?.externalUrl ? "external community site" : "",
      source?.socialLinks ? Object.keys(source.socialLinks).join(" ") : "",
      input.hints?.memes?.join(" "),
      input.hints?.slogans?.join(" "),
      input.hints?.phrases?.join(" "),
      input.hints?.mascotPreference,
      input.hints?.themePreference,
      input.hints?.mood
    ].filter(Boolean).join(" ");
    const words = slugWords(raw);
    const seed = seedFrom(raw);
    const mascot = this.mascot(input, words, seed);
    const preset = getPreset(input.selectedPreset ?? this.presetFromMascot(mascot));
    const palette = this.palette(input, seed);
    const mood = input.hints?.mood ?? this.mood(words, preset.mood, seed);
    const shapeLanguage = this.shapeLanguage(words, preset.shapeLanguage, seed);
    const visualKeywords = this.keywords(words, mascot, preset, seed);

    return {
      palette,
      mascot,
      style: `${mood} ${preset.artStyle}`,
      mood: `${mood} ${pick(["cult", "guild", "kingdom", "syndicate", "raiders"], seed + 7)}`,
      shapeLanguage,
      visualKeywords
    };
  }

  private mascot(input: CreateGenerationRunInput, words: string[], seed: number) {
    const preference = input.hints?.mascotPreference?.trim().toLowerCase();
    if (preference) return preference;
    const source = words.join(" ");
    if (viralPattern.test(source)) return "infected lab mascot";
    if (/vapor|vaporwave|surreal|liminal|synth|mall|pool|vhs/.test(source)) return "abstract mascot";
    if (/cute|baby|toy|toast|sticker|soft|candy|breakfast/.test(source)) return "cute mascot";
    if (/frog|toad|pepe|bog|swamp/.test(source)) return "frog";
    if (/dog|doge|shib|inu|kennel|bark/.test(source)) return source.includes("shib") ? "samurai dog" : "dog";
    if (/cat|kitty|meow|claw/.test(source)) return "cat";
    if (/robot|bot|mech|agent|(^|\W)ai(\W|$)|machine/.test(source)) return "robot";
    if (/skull|bone|dead|reaper/.test(source)) return "skull";
    if (/degen|pump|casino|jackpot|candle|liquidity|chart/.test(source)) return "alien";
    if (/coin|gold|cash|bank|vault/.test(source)) return "coin mascot";
    if (/wizard|mage|spell|magic/.test(source)) return "wizard";
    const subject = pick(words.filter((word) => !/token|coin|official|metadata|image|website|twitter|discord|telegram/.test(word)).length ? words : ["origin", "signal", "holder"], seed);
    return `${subject} token-native subject`;
  }

  private palette(input: CreateGenerationRunInput, seed: number) {
    const color = input.hints?.colorPreference?.trim();
    const matches = color?.match(/#[0-9a-fA-F]{6}/g);
    if (matches?.length) {
      return [matches[0], matches[1] ?? "#7a35ff", matches[2] ?? "#090916"];
    }
    const source = `${input.tokenName ?? ""} ${input.tokenSymbol ?? ""} ${input.description ?? ""} ${JSON.stringify(input.hints?.sourceMetadata ?? {})}`.toLowerCase();
    if (viralPattern.test(source)) return ["#7cff38", "#3dd6ff", "#f2d34f", "#101018"];
    if (/pepe|frog|swamp|bog|ribbit|pond/.test(source)) return ["#2bd66f", "#6b3f20", "#071509"];
    if (/dog|doge|shib|inu|kennel|bark|bone/.test(source)) return ["#f3a43b", "#6d3a12", "#110b06"];
    if (/cat|kitty|meow|claw|alley/.test(source)) return ["#ff5fc8", "#2ac7d8", "#111019"];
    if (/(^|\W)(ai|bot)(\W|$)|robot|agent|neural|compute|machine/.test(source)) return ["#6fe7ff", "#5967ff", "#06111a"];
    if (/degen|pump|casino|jackpot|candle|liquidity|chart/.test(source)) return ["#ff7a1a", "#7f38ff", "#120817"];
    return fallbackPalettes[seed % fallbackPalettes.length] as string[];
  }

  private shapeLanguage(words: string[], fallback: string, seed: number) {
    const source = words.join(" ");
    if (viralPattern.test(source)) return "organic microscopic hazard";
    if (/blade|samurai|war|fang|skull|aggressive/.test(source)) return "sharp armored";
    if (/robot|mech|coin|machine/.test(source)) return "geometric mechanical";
    if (/cyber|glitch|neon|hacker/.test(source)) return "sharp glitch";
    if (/frog|dog|cat|cute|meme/.test(source)) return "rounded character";
    return fallback || pick(["rounded organic", "sharp glitch", "geometric armored", "clean ornate"], seed + 3);
  }

  private mood(words: string[], fallback: string, seed: number) {
    const source = words.join(" ");
    if (viralPattern.test(source)) return "toxic";
    if (/luxury|vip|gold|premium|crown/.test(source)) return "premium";
    if (/dark|shadow|skull|dead/.test(source)) return "mysterious";
    if (/chaos|degen|wild|bonk/.test(source)) return "chaotic";
    if (/war|raid|fight|angry/.test(source)) return "aggressive";
    if (/cute|soft|baby/.test(source)) return "playful";
    return fallback.split(",")[0] ?? pick(["playful", "mysterious", "chaotic", "premium", "aggressive"], seed + 5);
  }

  private keywords(words: string[], mascot: string, preset: (typeof artPresets)[number], seed: number) {
    const fromInput = words.slice(0, 5);
    const fromPreset = [
      pick(preset.backgroundWorlds, seed + 1),
      pick(preset.traitNouns, seed + 2),
      pick(preset.visualFx, seed + 3)
    ];
    return [...new Set([mascot, ...fromInput, ...fromPreset].map((word) => word.toLowerCase()))].slice(0, 10);
  }

  private presetFromMascot(mascot: string) {
    if (/infected|lab|virus|biohazard/.test(mascot)) return "dark-fantasy-raiders";
    if (/cat/.test(mascot)) return "cyber-alley-syndicate";
    if (/dog|coin/.test(mascot)) return "meme-kingdom";
    if (/samurai/.test(mascot)) return "neon-samurai";
    if (/robot/.test(mascot)) return "robot-warband";
    if (/alien/.test(mascot)) return "alien-casino";
    if (/skull/.test(mascot)) return "dark-fantasy-raiders";
    return "mystic-pixel-cult";
  }
}
