import { Injectable } from "@nestjs/common";
import type { DistinctivenessReportPlan, GeneratedStyleProfile } from "./generator.types";
import { average, clamp } from "./generator.util";

type ExistingStyle = {
  id: string;
  collection: string;
  mascot: string;
  artStyle?: string | null;
  colors: unknown;
  backgroundWorld: string;
  traitLanguage: unknown;
  visualFingerprint?: unknown;
  brandDna?: unknown;
};

@Injectable()
export class CollectionDistinctivenessScorerService {
  score(style: GeneratedStyleProfile, existing: ExistingStyle[]): DistinctivenessReportPlan {
    if (existing.length === 0) {
      return this.report(94, 92, 95, 94, 92);
    }

    const nearest = existing
      .map((candidate) => {
        const score = this.similarity(style, candidate);
        return { candidate, score, totalScore: average(Object.values(score)) };
      })
      .sort((a, b) => b.totalScore - a.totalScore)[0];

    const similarity = nearest?.score ?? { palette: 0, mascot: 0, world: 0, language: 0, fingerprint: 0, artStyle: 0, pose: 0, taxonomy: 0 };
    const paletteUniqueness = clamp(100 - similarity.palette);
    const mascotUniqueness = clamp(100 - similarity.mascot);
    const backgroundWorldUniqueness = clamp(100 - similarity.world);
    const traitLanguageUniqueness = clamp(100 - Math.max(similarity.language, similarity.taxonomy));
    const silhouetteUniqueness = clamp(100 - Math.round((similarity.mascot + similarity.pose + similarity.fingerprint + similarity.artStyle) / 4));
    const report = this.report(silhouetteUniqueness, paletteUniqueness, mascotUniqueness, backgroundWorldUniqueness, traitLanguageUniqueness);

    return {
      ...report,
      nearestCollection: nearest
        ? {
            id: nearest.candidate.id,
            collection: nearest.candidate.collection,
            similarityScore: nearest.totalScore,
            artStyleSimilarity: nearest.score.artStyle,
            taxonomySimilarity: nearest.score.taxonomy,
            poseSimilarity: nearest.score.pose
          }
        : undefined
    };
  }

  private report(
    silhouetteUniqueness: number,
    paletteUniqueness: number,
    mascotUniqueness: number,
    backgroundWorldUniqueness: number,
    traitLanguageUniqueness: number
  ) {
    const score = average([silhouetteUniqueness, paletteUniqueness, paletteUniqueness, mascotUniqueness, backgroundWorldUniqueness, traitLanguageUniqueness]);
    return {
      silhouetteUniqueness,
      paletteUniqueness,
      mascotUniqueness,
      backgroundWorldUniqueness,
      traitLanguageUniqueness,
      score,
      passed: score >= 45
    };
  }

  private similarity(style: GeneratedStyleProfile, existing: ExistingStyle) {
    return {
      palette: Math.max(
        this.paletteSimilarity(style.colors, this.stringArray(existing.colors)),
        this.paletteSimilarity(this.paletteFingerprint(style.brandDna?.colorSystem), this.paletteFingerprint(this.brandColorSystem(existing.brandDna)))
      ),
      mascot: this.wordOverlap([style.mascot], [existing.mascot]) * 100,
      world: this.wordOverlap([style.backgroundWorld], [existing.backgroundWorld]) * 100,
      language: this.wordOverlap(style.traitLanguage, this.stringArray(existing.traitLanguage)) * 100,
      artStyle: this.artStyleSimilarity(style, existing),
      pose: this.wordOverlap(
        style.creativeUniverse?.baseSilhouettes?.map((base) => base.poseLanguage) ?? [],
        this.stringArray((existing.visualFingerprint as Record<string, unknown> | undefined)?.poseLanguage)
      ) * 100,
      taxonomy: this.wordOverlap(
        style.creativeUniverse?.taxonomy?.map((category) => category.label) ?? [],
        this.stringArray((existing.visualFingerprint as Record<string, unknown> | undefined)?.traitTaxonomy)
      ) * 100,
      fingerprint: this.fingerprintSimilarity(style.visualFingerprint, existing.visualFingerprint) * 100
    };
  }

  private artStyleSimilarity(style: GeneratedStyleProfile, existing: ExistingStyle) {
    const existingStyle = String(existing.artStyle ?? "");
    if (!existingStyle) return 0;
    const exact = existingStyle.toLowerCase() === style.artStyle.toLowerCase();
    const sameArchetype = this.existingArchetype(existing.visualFingerprint) === style.creativeUniverse?.archetype;
    if (exact && !sameArchetype) return 100;
    if (exact && sameArchetype) return 45;
    return this.wordOverlap([style.artStyle], [existingStyle]) * 80;
  }

  private existingArchetype(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return "";
    return String((value as Record<string, unknown>).archetype ?? "");
  }

  private fingerprintSimilarity(left: unknown, right: unknown) {
    const leftText = this.semanticFingerprint(left);
    const rightText = this.semanticFingerprint(right);
    if (!leftText || !rightText || rightText === "{}") return 0;
    return this.wordOverlap([leftText], [rightText]);
  }

  private semanticFingerprint(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return "";
    const record = value as Record<string, unknown>;
    return [
      record.mascotArchetype,
      record.silhouetteFamily,
      record.backgroundWorld,
      record.legendaryDirection,
      record.artStyle,
      record.archetype,
      record.sourceSymbol,
      ...(this.stringArray(record.traitVocabulary).slice(0, 16)),
      ...(this.stringArray(record.traitTaxonomy).slice(0, 16)),
      ...(this.stringArray(record.poseLanguage).slice(0, 8)),
      ...(this.stringArray(record.moodCulture).slice(0, 8)),
      ...(this.stringArray(record.loreMemeLanguage).slice(0, 12)),
      ...(this.stringArray(record.palette).slice(0, 8))
    ].flat().join(" ").toLowerCase();
  }

  private paletteSimilarity(left: string[], right: string[]) {
    if (right.length === 0) return 0;
    const normalizedRight = right.map((item) => item.toLowerCase());
    const shared = left.map((color) => color.toLowerCase()).filter((color) => normalizedRight.includes(color)).length;
    return Math.round((shared / Math.max(left.length, right.length)) * 100);
  }

  private paletteFingerprint(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const record = value as Record<string, unknown>;
    return ["primaryColors", "secondaryColors", "accentColors", "glowLightColors", "backgroundColors"].flatMap((key) => this.stringArray(record[key]));
  }

  private brandColorSystem(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    return (value as Record<string, unknown>).colorSystem;
  }

  private wordOverlap(left: string[], right: string[]) {
    const leftWords = new Set(this.significantWords(left));
    const rightWords = new Set(this.significantWords(right));
    const shared = [...leftWords].filter((word) => rightWords.has(word)).length;
    return shared / Math.max(1, Math.min(leftWords.size, rightWords.size));
  }

  private significantWords(values: string[]) {
    const stop = new Set([
      "with",
      "from",
      "that",
      "this",
      "into",
      "token",
      "holder",
      "holders",
      "raid",
      "raids",
      "vault",
      "vaults",
      "scene",
      "mark",
      "sigil",
      "emblem",
      "trade",
      "https",
      "com",
      "twitter",
      "discord",
      "telegram"
    ]);
    return values
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9#]+/)
      .filter((word) => word.length > 3 && !stop.has(word));
  }

  private stringArray(value: unknown) {
    return Array.isArray(value) ? value.map(String) : [];
  }
}
