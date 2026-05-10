import { Injectable } from "@nestjs/common";
import type { GeneratedStyleProfile, RarityExamplePlan, TraitCategoryRole, TraitCoverageReport, TraitPackPlan } from "./generator.types";
import { artTeamForStyle } from "./art-team-engine";
import { pick, seedFrom, unique } from "./generator.util";

const rarities: RarityExamplePlan["rarity"][] = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];
const supplyTargets: Record<RarityExamplePlan["rarity"], string> = {
  Common: "45-65%",
  Uncommon: "20-30%",
  Rare: "8-15%",
  Epic: "3-8%",
  Legendary: "0.5-2%",
  Mythic: "0.05-0.5%"
};

@Injectable()
export class TraitCoverageEngineService {
  build(style: GeneratedStyleProfile, pack: TraitPackPlan): TraitCoverageReport {
    const artTeam = artTeamForStyle(style);
    const seed = seedFrom(`${style.collection}:${artTeam.id}:coverage:${JSON.stringify(pack.categories)}`);
    const examples = rarities.map((rarity, index): RarityExamplePlan => {
      const nativeArchetype = artTeam.nativeArchetypes[index % artTeam.nativeArchetypes.length] ?? style.legendaryTheme;
      return {
        rarity,
        supplyTarget: supplyTargets[rarity],
        base: this.value(pack, "base", index, seed),
        head: this.value(pack, "head", index, seed + 11),
        eyes: this.value(pack, "eyes", index, seed + 23),
        mouth: this.value(pack, "mouth", index, seed + 37),
        body: this.value(pack, "body", index, seed + 41),
        prop: this.value(pack, "prop", index, seed + 53),
        background: this.value(pack, "background", index, seed + 67),
        aura: rarity === "Common" || rarity === "Uncommon" ? this.lowAura(pack, index, seed + 71) : this.value(pack, "aura", index, seed + 71),
        mood: artTeam.moodVocabulary[index % artTeam.moodVocabulary.length] ?? "focused",
        posture: this.postureFor(artTeam.id, rarity, index),
        roleFantasy: this.roleFantasy(style, nativeArchetype, rarity),
        archetype: rarity === "Legendary" || rarity === "Mythic" ? nativeArchetype : `${nativeArchetype} in training`
      };
    });
    const repeatedTraitWarnings = this.repetitionWarnings(examples);
    const globalClicheWarnings = this.globalClicheWarnings(examples);
    const rotation = (key: keyof RarityExamplePlan) => this.rotationScore(examples.map((example) => String(example[key])));
    const traitDiversityScore = Math.round((rotation("head") + rotation("eyes") + rotation("mouth") + rotation("body") + rotation("prop") + rotation("background")) / 6);
    return {
      traitCoverageScore: this.coverageScore(pack),
      traitDiversityScore,
      rarityVisualDistance: Math.round((traitDiversityScore + rotation("posture") + rotation("archetype")) / 3),
      accessoryRotationScore: rotation("prop"),
      outfitRotationScore: rotation("body"),
      mouthRotationScore: rotation("mouth"),
      eyeRotationScore: rotation("eyes"),
      backgroundRotationScore: rotation("background"),
      silhouetteVariationScore: Math.round((rotation("base") + rotation("head") + rotation("posture")) / 3),
      repeatedTraitWarnings,
      globalClicheWarnings,
      examples
    };
  }

  private value(pack: TraitPackPlan, role: TraitCategoryRole, rarityIndex: number, seed: number) {
    const values = this.values(pack, role);
    if (!values.length) return `Missing ${role} layer`;
    if (["base", "head", "eyes", "mouth", "body", "prop", "background", "aura"].includes(role)) return values[(Math.abs(seed) + rarityIndex) % values.length] ?? pick(values, seed + rarityIndex);
    return values[Math.abs(seed + rarityIndex) % values.length] ?? pick(values, seed + rarityIndex);
  }

  private lowAura(pack: TraitPackPlan, index: number, seed: number) {
    const low = this.values(pack, "aura").filter((value) => /none|smoke|dust|warm|soft|pencil|dither/i.test(value));
    return low[index % Math.max(1, low.length)] ?? this.value(pack, "aura", index, seed);
  }

  private values(pack: TraitPackPlan, role: TraitCategoryRole) {
    const categoryId = pack.categoryRoles[role];
    return categoryId ? pack.categories[categoryId] ?? [] : [];
  }

  private postureFor(artTeam: string, rarity: string, index: number) {
    const map: Record<string, string[]> = {
      DEGENLAB: ["hunched and tired", "leaning into desk chaos", "upright trader flex", "locked-in hacker hunch", "expensive kingpin lounge", "prophet-like final stare"],
      SOFTROOM_STUDIO: ["small cozy sit", "sleepy side tilt", "curious paw lift", "streamer lean", "plush royal sit", "internet-famous pose"],
      PAPERGHOST: ["quiet floating stillness", "small tilted watching", "clutching a memory", "archive guardian hover", "lantern vigil", "abandoned memory silhouette"],
      MOSSWORKS: ["gentle forest stand", "curious lean", "lantern step", "guardian stance", "ancient wander", "moss deity stillness"],
      PIXEL_REBEL: ["idle sprite stance", "street signal lean", "focused hack pose", "broadcast command stance", "glitch idol pose", "network phantom silhouette"],
      VOID_SKETCH: ["slouched street stance", "spray-can lean", "defiant side-eye", "wired marker gesture", "tag king posture", "back-alley icon stance"]
    };
    return map[artTeam]?.[index] ?? `${rarity.toLowerCase()} collection-native posture`;
  }

  private roleFantasy(style: GeneratedStyleProfile, archetype: string, rarity: string) {
    if (rarity === "Common") return `grounded holder identity inside ${style.backgroundWorld}`;
    if (rarity === "Uncommon") return `first visible social role inside ${style.backgroundWorld}`;
    if (rarity === "Rare") return `recognizable collector status as ${archetype}`;
    if (rarity === "Epic") return `high-attitude faction role with stronger props and setting`;
    if (rarity === "Legendary") return `status scene around ${archetype}`;
    return `one-of-one collection-native mythic identity: ${archetype}`;
  }

  private coverageScore(pack: TraitPackPlan) {
    const required: TraitCategoryRole[] = ["base", "background", "head", "eyes", "mouth", "body", "prop", "aura"];
    const minimum = (role: TraitCategoryRole) => (role === "base" || role === "aura" ? 6 : 6);
    const scores = required.map((role) => Math.min(100, Math.round((this.values(pack, role).length / minimum(role)) * 100)));
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  private rotationScore(values: string[]) {
    return Math.round((unique(values).length / Math.max(1, values.length)) * 100);
  }

  private repetitionWarnings(examples: RarityExamplePlan[]) {
    const warnings: string[] = [];
    for (const key of ["head", "eyes", "mouth", "body", "prop", "background"] as const) {
      const seen = new Set<string>();
      for (const example of examples) {
        const value = example[key].toLowerCase();
        if (seen.has(value)) warnings.push(`${key} repeats "${example[key]}" across rarity ladder.`);
        seen.add(value);
      }
    }
    return warnings;
  }

  private globalClicheWarnings(examples: RarityExamplePlan[]) {
    const cliches = /\b(hood|halo|void|staff|cosmic|god form|gold god)\b/i;
    return examples
      .filter((example) => (example.rarity === "Legendary" || example.rarity === "Mythic") && cliches.test(JSON.stringify(example)))
      .map((example) => `${example.rarity} risks global mythic cliche: ${example.archetype}.`);
  }
}
