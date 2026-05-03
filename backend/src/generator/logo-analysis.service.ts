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

@Injectable()
export class LogoAnalysisService {
  analyze(input: CreateGenerationRunInput): LogoAnalysisOutput {
    const raw = `${input.tokenName} ${input.tokenSymbol} ${input.description} ${input.logoUri ?? ""} ${input.logoData ?? ""} ${JSON.stringify(input.hints ?? {})}`;
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
    if (/frog|toad|pepe|bog|swamp/.test(source)) return source.includes("pepe") ? "alien" : "frog";
    if (/dog|doge|shib|inu|kennel|bark/.test(source)) return source.includes("shib") ? "samurai dog" : "dog";
    if (/cat|kitty|meow|claw/.test(source)) return "cat";
    if (/robot|bot|mech|ai|machine/.test(source)) return "robot";
    if (/skull|bone|dead|reaper/.test(source)) return "skull";
    if (/coin|gold|cash|bank|vault/.test(source)) return "coin mascot";
    if (/wizard|mage|spell|magic/.test(source)) return "wizard";
    return pick(["frog", "dog", "cat", "alien", "robot", "wizard", "skull", "coin mascot"], seed);
  }

  private palette(input: CreateGenerationRunInput, seed: number) {
    const color = input.hints?.colorPreference?.trim();
    const matches = color?.match(/#[0-9a-fA-F]{6}/g);
    if (matches?.length) {
      return [matches[0], matches[1] ?? "#7a35ff", matches[2] ?? "#090916"];
    }
    return fallbackPalettes[seed % fallbackPalettes.length] as string[];
  }

  private shapeLanguage(words: string[], fallback: string, seed: number) {
    const source = words.join(" ");
    if (/blade|samurai|war|fang|skull|aggressive/.test(source)) return "sharp armored";
    if (/robot|mech|coin|machine/.test(source)) return "geometric mechanical";
    if (/cyber|glitch|neon|hacker/.test(source)) return "sharp glitch";
    if (/frog|dog|cat|cute|meme/.test(source)) return "rounded character";
    return fallback || pick(["rounded organic", "sharp glitch", "geometric armored", "clean ornate"], seed + 3);
  }

  private mood(words: string[], fallback: string, seed: number) {
    const source = words.join(" ");
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
    if (/cat/.test(mascot)) return "cyber-alley-syndicate";
    if (/dog|coin/.test(mascot)) return "meme-kingdom";
    if (/samurai/.test(mascot)) return "neon-samurai";
    if (/robot/.test(mascot)) return "robot-warband";
    if (/alien/.test(mascot)) return "alien-casino";
    if (/skull/.test(mascot)) return "dark-fantasy-raiders";
    return "mystic-pixel-cult";
  }
}

