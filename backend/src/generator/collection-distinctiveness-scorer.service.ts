import { Injectable } from "@nestjs/common";
import type { DistinctivenessReportPlan, GeneratedStyleProfile } from "./generator.types";
import { average, clamp } from "./generator.util";

type ExistingStyle = {
  id: string;
  collection: string;
  mascot: string;
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

    const similarity = nearest?.score ?? { palette: 0, mascot: 0, world: 0, language: 0, fingerprint: 0 };
    const paletteUniqueness = clamp(100 - similarity.palette);
    const mascotUniqueness = clamp(100 - similarity.mascot);
    const backgroundWorldUniqueness = clamp(100 - similarity.world);
    const traitLanguageUniqueness = clamp(100 - similarity.language);
    const silhouetteUniqueness = clamp(100 - Math.round((similarity.mascot + similarity.world + similarity.fingerprint) / 3));
    const report = this.report(silhouetteUniqueness, paletteUniqueness, mascotUniqueness, backgroundWorldUniqueness, traitLanguageUniqueness);

    return {
      ...report,
      nearestCollection: nearest
        ? {
            id: nearest.candidate.id,
            collection: nearest.candidate.collection,
            similarityScore: nearest.totalScore
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
    const score = average([silhouetteUniqueness, paletteUniqueness, mascotUniqueness, backgroundWorldUniqueness, traitLanguageUniqueness]);
    return {
      silhouetteUniqueness,
      paletteUniqueness,
      mascotUniqueness,
      backgroundWorldUniqueness,
      traitLanguageUniqueness,
      score,
      passed: score >= 72
    };
  }

  private similarity(style: GeneratedStyleProfile, existing: ExistingStyle) {
    return {
      palette: this.paletteSimilarity(style.colors, this.stringArray(existing.colors)),
      mascot: this.wordOverlap([style.mascot], [existing.mascot]) * 100,
      world: this.wordOverlap([style.backgroundWorld], [existing.backgroundWorld]) * 100,
      language: this.wordOverlap(style.traitLanguage, this.stringArray(existing.traitLanguage)) * 100,
      fingerprint: this.fingerprintSimilarity(style.visualFingerprint, existing.visualFingerprint) * 100
    };
  }

  private fingerprintSimilarity(left: unknown, right: unknown) {
    const leftText = JSON.stringify(left ?? {}).toLowerCase();
    const rightText = JSON.stringify(right ?? {}).toLowerCase();
    if (!leftText || !rightText || rightText === "{}") return 0;
    return this.wordOverlap([leftText], [rightText]);
  }

  private paletteSimilarity(left: string[], right: string[]) {
    if (right.length === 0) return 0;
    const shared = left.filter((color) => right.includes(color)).length;
    return Math.round((shared / Math.max(left.length, right.length)) * 100);
  }

  private wordOverlap(left: string[], right: string[]) {
    const leftWords = new Set(left.join(" ").toLowerCase().split(/\s+/).filter(Boolean));
    const rightWords = new Set(right.join(" ").toLowerCase().split(/\s+/).filter(Boolean));
    const shared = [...leftWords].filter((word) => rightWords.has(word)).length;
    return shared / Math.max(1, Math.min(leftWords.size, rightWords.size));
  }

  private stringArray(value: unknown) {
    return Array.isArray(value) ? value.map(String) : [];
  }
}
