import { hasRealStudioBibleAssets, studioBibleAssetTypes, studioPreviewStatusLabel } from "./studio-readiness";
import type { CollectionGeneratorPreview, StudioPreviewAsset } from "./types";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function asset(type: StudioPreviewAsset["type"], provider = "imagen", uri = "data:image/png;base64,ZmFrZQ=="): StudioPreviewAsset {
  return {
    type,
    label: type,
    uri,
    provider,
    model: provider === "deterministic-render" ? "style-bible-engine" : provider.includes("gemini") ? "gemini-2.5-flash-image" : "imagen-4.0-fast-generate-001",
    cacheStatus: provider.includes("cached") ? "hit" : "generated",
    metadata: { provider, sourceProvider: provider === "cached-gemini" ? "gemini" : provider === "cached-imagen" ? "imagen" : provider },
    generationMetadata: { provider, sourceProvider: provider === "cached-gemini" ? "gemini" : provider === "cached-imagen" ? "imagen" : provider }
  };
}

function preview(assets: StudioPreviewAsset[], productionAssetStatus: CollectionGeneratorPreview["productionAssetStatus"] = "AI_CONCEPT"): CollectionGeneratorPreview {
  return {
    id: "test-preview",
    collection: "Test",
    preset: "Test",
    theme: "Test",
    mascot: "Test",
    artStyle: "Test",
    palette: [],
    backgroundWorld: "Test",
    lore: "Test",
    raidTheme: "Test",
    roleNames: [],
    traitLanguage: [],
    traitCounts: {},
    rarityWeights: {},
    unlocks: {},
    previewClassification: productionAssetStatus === "AI_CONCEPT" ? "AI_CONCEPT_PREVIEW" : "WIREFRAME_CONCEPT",
    productionAssetStatus,
    finalProductionReady: false,
    studioAssets: assets,
    avatar: "",
    banner: "",
    samples: [],
    quality: { previewQualityScore: 0, uniquenessScore: 0, colorHarmonyScore: 0, duplicateRiskScore: 0, compatibilityScore: 0, tier: "Preview required", passed: false },
    distinctiveness: { silhouetteUniqueness: 0, paletteUniqueness: 0, mascotUniqueness: 0, backgroundWorldUniqueness: 0, traitLanguageUniqueness: 0, score: 0, passed: false },
    tenKReadiness: { estimated10kFeasible: false, possibleUniqueCombinations: "0", duplicateRisk: "HIGH", visualDiversityScore: 0, blockers: [] }
  } as CollectionGeneratorPreview;
}

const imagenAssets = studioBibleAssetTypes.map((type) => asset(type));
assert(hasRealStudioBibleAssets(preview(imagenAssets)), "Imagen assets should set Studio Bible ready");
assert(studioPreviewStatusLabel(preview(imagenAssets)) === "Studio Bible ready", "Imagen assets should show Studio Bible ready");

const missingAssets = imagenAssets.slice(0, 4);
assert(!hasRealStudioBibleAssets(preview(missingAssets)), "Missing assets should keep UI in preview-required state");
assert(studioPreviewStatusLabel(preview(missingAssets)) === "Studio preview pending", "Missing assets should not show Studio Bible ready");

const cachedImagenAssets = studioBibleAssetTypes.map((type) => asset(type, "cached-imagen"));
assert(hasRealStudioBibleAssets(preview(cachedImagenAssets)), "Cached Imagen assets should count as real Studio Bible assets");

const cachedGeminiAssets = studioBibleAssetTypes.map((type) => asset(type, "cached-gemini"));
assert(hasRealStudioBibleAssets(preview(cachedGeminiAssets)), "Cached Gemini assets should count as real Studio Bible assets");

const deterministicAssets = studioBibleAssetTypes.map((type) => asset(type, "deterministic-render", "data:image/svg+xml,%3Csvg%3E%3C/svg%3E"));
assert(!hasRealStudioBibleAssets(preview(deterministicAssets)), "Cached deterministic assets must not count as real Studio Bible assets");
assert(studioPreviewStatusLabel(preview(deterministicAssets)) === "Studio preview pending", "Deterministic assets must not show Studio Bible ready");
