import { Injectable } from "@nestjs/common";
import type { CommunityCreativeUniverse, CreativeSignalProfile, GeneratedStyleProfile, TraitPackPlan, VisualDesignSystem } from "./generator.types";
import { pick, seedFrom, titleCase, unique } from "./generator.util";

const rendererMedia: VisualDesignSystem["rendererFamily"][] = [
  "pixel-topdown",
  "anime-portrait",
  "clay-toy",
  "biohazard-horror",
  "terminal-brutalist",
  "surreal-collage",
  "sticker-pack",
  "comic-panel",
  "cinematic-scene",
  "propaganda-poster",
  "retro-arcade",
  "low-poly",
  "painterly-portrait",
  "children-cartoon"
];

const fixedTemplatePattern = /\b(frog|toad|dog|doge|shib|inu|cat|kitty|anime|trader|robot|bot|ape|monkey|skeleton|template|bayc|bored\s*ape|degods?|mad\s*lads?|solana\s*monkey)\b/i;

@Injectable()
export class CreativeDnaService {
  selectRendererMedium(signals: CreativeSignalProfile, seed: number): VisualDesignSystem["rendererFamily"] {
    const { cueDial } = signals;
    const candidates = [
      ...(cueDial.surreal >= 70 ? ["surreal-collage", "low-poly", "painterly-portrait"] : []),
      ...(cueDial.chaos >= 70 ? ["comic-panel", "retro-arcade", "pixel-topdown", "surreal-collage"] : []),
      ...(cueDial.aggressive >= 70 ? ["cinematic-scene", "comic-panel", "propaganda-poster"] : []),
      ...(cueDial.luxury >= 70 ? ["painterly-portrait", "cinematic-scene", "propaganda-poster"] : []),
      ...(cueDial.cozy >= 70 ? ["clay-toy", "sticker-pack", "children-cartoon"] : []),
      ...rendererMedia
    ] as VisualDesignSystem["rendererFamily"][];
    return pick(unique(candidates), seed + 17);
  }

  identityKey(motif: string, signals: CreativeSignalProfile, seed: number) {
    const words = unique([
      motif,
      ...signals.entities,
      ...signals.objects,
      ...signals.worldReferences,
      ...signals.culturalWords,
      signals.energyLevel,
      signals.communityVibe
    ])
      .flatMap((value) => String(value).split(/[^a-z0-9]+/i))
      .map((word) => word.toLowerCase())
      .filter((word) => word.length > 3 && !fixedTemplatePattern.test(word) && !/token|coin|nft|holder|vault|official|community|signal/.test(word));
    const selected = unique(words).slice(0, 8);
    const fingerprint = seedFrom(`${motif}:${selected.join("|")}:${seed}`).toString(36).slice(0, 6);
    const base = selected.length ? selected.slice(0, 3).map(titleCase).join("-") : `${titleCase(motif)}-Origin`;
    return `creative-dna-${this.slug(`${base}-${fingerprint}`)}`;
  }

  validate(style: GeneratedStyleProfile, pack?: TraitPackPlan) {
    const issues: string[] = [];
    const universe = style.creativeUniverse;
    const visual = universe?.creativeDna?.visualSystem;
    if (!universe?.creativeDna || !universe.signalProfile || !visual) {
      return ["Creative DNA, signal profile, and renderer medium are required."];
    }

    const identityText = [
      universe.archetype,
      universe.creativeDna.worldConcept,
      universe.creativeDna.mascotOrSubject,
      universe.creativeDna.legendaryMythology,
      ...universe.taxonomy.map((category) => category.label),
      ...universe.moodCulture.map((mood) => mood.name),
      ...(pack?.traits.slice(0, 80).map((trait) => trait.name) ?? [])
    ].join(" ");
    if (/\b(template|archetype-template|selected because|maps to archetype)\b/i.test(identityText)) issues.push("Creative DNA still reads like a fixed collection template.");
    if (/^(biohazard-viral|frog-degen|dog-cozy|dog-pack|cat-hyper-meme|robot-ai|trader-finance)$/i.test(universe.archetype)) issues.push("Creative DNA exposes a fixed archetype key.");

    const rendererTerms = this.rendererTerms(visual.rendererFamily);
    const rendererHits = rendererTerms.filter((term) => new RegExp(`\\b${term}\\b`, "i").test(identityText)).length;
    if (rendererHits >= 4) issues.push("Renderer medium is leaking into collection identity, taxonomy, or mythology.");

    const uniqueWorldWords = new Set(this.words(universe.creativeDna.worldConcept));
    const uniqueTaxonomyWords = new Set(this.words(universe.taxonomy.map((category) => category.label).join(" ")));
    const uniqueMoodWords = new Set(this.words(universe.moodCulture.map((mood) => mood.name).join(" ")));
    if (uniqueWorldWords.size < 3) issues.push("Creative DNA world concept is too thin.");
    if (uniqueTaxonomyWords.size < 12) issues.push("Creative DNA trait taxonomy is too generic.");
    if (uniqueMoodWords.size < 5) issues.push("Creative DNA emotional culture is too generic.");

    const mandatory = [
      universe.creativeDna.worldConcept,
      universe.creativeDna.mascotOrSubject,
      universe.creativeDna.rarityPhilosophy,
      universe.creativeDna.legendaryMythology,
      universe.creativeDna.animationLanguage,
      visual.compositionStyle,
      visual.cameraSystem,
      visual.lightingModel,
      visual.rarityFrames?.Mythic?.composition
    ];
    if (mandatory.some((value) => !String(value ?? "").trim())) issues.push("Creative DNA is missing required universe, rarity, camera, lighting, or animation rules.");
    return issues;
  }

  compareCivilizations(left: GeneratedStyleProfile, right: GeneratedStyleProfile) {
    const leftVisual = left.creativeUniverse.creativeDna.visualSystem;
    const rightVisual = right.creativeUniverse.creativeDna.visualSystem;
    if (leftVisual.rendererFamily !== rightVisual.rendererFamily) return [];
    const checks: Array<[string, string[], string[]]> = [
      ["world concept", this.words(left.creativeUniverse.creativeDna.worldConcept), this.words(right.creativeUniverse.creativeDna.worldConcept)],
      ["trait taxonomy", this.words(left.creativeUniverse.taxonomy.map((category) => category.label).join(" ")), this.words(right.creativeUniverse.taxonomy.map((category) => category.label).join(" "))],
      ["mythology", this.words(left.creativeUniverse.creativeDna.legendaryMythology), this.words(right.creativeUniverse.creativeDna.legendaryMythology)],
      ["camera language", this.words(leftVisual.cameraSystem), this.words(rightVisual.cameraSystem)],
      ["rarity story", this.words(left.creativeUniverse.creativeDna.rarityPhilosophy), this.words(right.creativeUniverse.creativeDna.rarityPhilosophy)]
    ];
    return checks.filter(([, a, b]) => this.jaccard(a, b) > 0.58).map(([label]) => `Collections share too much ${label} for the same renderer medium.`);
  }

  private rendererTerms(family: VisualDesignSystem["rendererFamily"]) {
    return family.split(/[-\s]+/).concat(family.replace(/-/g, " "));
  }

  private words(value: string) {
    const stop = new Set(["with", "from", "that", "this", "into", "token", "coin", "nft", "holder", "holders", "community", "signal", "signals", "rendering", "renderer", "camera", "lighting", "rarity", "scene", "world", "system"]);
    return value.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3 && !stop.has(word));
  }

  private jaccard(left: string[], right: string[]) {
    const a = new Set(left);
    const b = new Set(right);
    const shared = [...a].filter((word) => b.has(word)).length;
    return shared / Math.max(1, new Set([...a, ...b]).size);
  }

  private slug(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
  }
}
