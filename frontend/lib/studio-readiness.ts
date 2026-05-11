import type { CollectionGeneratorPreview, StudioPreviewAsset, StudioPreviewAssetType } from "./types";

export const studioBibleAssetTypes = ["STYLE_BIBLE", "TRAIT_CATALOG", "RARITY_LADDER", "MOOD_SHEET", "LAYER_BREAKDOWN"] as const satisfies readonly StudioPreviewAssetType[];
export const studioBibleAssetTypeSet = new Set<string>(studioBibleAssetTypes);
export const studioDisplayAssetTypeSet = new Set<string>([...studioBibleAssetTypes, "HERO_CONCEPT"]);

export function studioAssetProvider(asset: StudioPreviewAsset) {
  return asset.provider ?? stringFrom(asset.metadata?.provider) ?? stringFrom(asset.generationMetadata?.provider) ?? "studio-provider";
}

export function studioBibleAssetsFromPreview(preview: CollectionGeneratorPreview | null | undefined) {
  if (!preview) return [];
  const fallbackAssets = [
    preview.styleBibleAsset,
    preview.traitCatalogAsset,
    preview.rarityLadderAsset,
    preview.moodSheetAsset,
    preview.layerBreakdownAsset
  ].filter(Boolean) as StudioPreviewAsset[];
  return preview.studioAssets?.length ? preview.studioAssets : fallbackAssets;
}

export function realStudioBibleAssetsFromPreview(preview: CollectionGeneratorPreview | null | undefined) {
  return studioBibleAssetsFromPreview(preview).filter(isRealStudioBibleAsset);
}

export function hasRealStudioBibleAssets(preview: CollectionGeneratorPreview | null | undefined) {
  const assets = realStudioBibleAssetsFromPreview(preview);
  return studioBibleAssetTypes.every((type) => assets.some((asset) => asset.type === type && Boolean(asset.uri)));
}

export function isRealStudioBibleAsset(asset: StudioPreviewAsset | undefined | null): asset is StudioPreviewAsset {
  if (!asset || !studioBibleAssetTypeSet.has(asset.type) || !asset.uri) return false;
  const provider = String(asset.provider ?? asset.metadata?.provider ?? asset.generationMetadata?.provider ?? "").toLowerCase();
  const sourceProvider = String(asset.metadata?.sourceProvider ?? asset.generationMetadata?.sourceProvider ?? "").toLowerCase();
  const model = String(asset.model ?? asset.metadata?.model ?? asset.generationMetadata?.model ?? "").toLowerCase();
  const uri = String(asset.uri).toLowerCase();
  if (/deterministic|wireframe|placeholder|openai|premium-fallback/.test(`${provider} ${sourceProvider}`)) return false;
  if (uri.startsWith("data:image/svg+xml")) return false;
  return provider === "gemini" || provider === "cached-gemini" || sourceProvider === "gemini" || model.includes("gemini");
}

export function studioPreviewStatusLabel(preview: CollectionGeneratorPreview) {
  if (preview.productionAssetStatus === "FINAL_PRODUCTION") return "Final production assets";
  if (preview.productionAssetStatus === "ARTIST_APPROVED") return "Artist approved assets";
  if (preview.productionAssetStatus === "CURATED_LAYER_READY") return "Curated layer ready";
  if (hasRealStudioBibleAssets(preview)) return "Studio Bible ready";
  return "Studio preview pending";
}

export function isStudioPreviewRequired(preview: Pick<CollectionGeneratorPreview, "productionAssetStatus" | "previewClassification"> & Partial<CollectionGeneratorPreview>) {
  if (preview.productionAssetStatus === "CURATED_LAYER_READY" || preview.productionAssetStatus === "ARTIST_APPROVED" || preview.productionAssetStatus === "FINAL_PRODUCTION") return false;
  if (hasRealStudioBibleAssets(preview as CollectionGeneratorPreview)) return false;
  return preview.productionAssetStatus === "WIREFRAME" || preview.previewClassification === "WIREFRAME_CONCEPT" || preview.productionAssetStatus === "AI_CONCEPT" || preview.previewClassification === "AI_CONCEPT_PREVIEW";
}

function stringFrom(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}
