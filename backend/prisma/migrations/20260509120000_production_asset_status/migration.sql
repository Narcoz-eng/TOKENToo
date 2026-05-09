-- Production asset status split: wireframe, AI concept, curated layers, and final production.
CREATE TYPE "ProductionAssetStatus" AS ENUM ('WIREFRAME', 'AI_CONCEPT', 'CURATED_LAYER_READY', 'ARTIST_APPROVED', 'FINAL_PRODUCTION');

ALTER TYPE "PreviewAssetType" ADD VALUE IF NOT EXISTS 'TRAIT_SHEET';
ALTER TYPE "PreviewAssetType" ADD VALUE IF NOT EXISTS 'ANIMATION_KEYFRAME';

ALTER TABLE "StyleProfile"
ADD COLUMN "productionAssetStatus" "ProductionAssetStatus" NOT NULL DEFAULT 'WIREFRAME';

ALTER TABLE "PreviewAsset"
ADD COLUMN "productionAssetStatus" "ProductionAssetStatus" NOT NULL DEFAULT 'WIREFRAME',
ADD COLUMN "previewClassification" TEXT NOT NULL DEFAULT 'WIREFRAME_CONCEPT',
ADD COLUMN "provider" TEXT,
ADD COLUMN "promptHash" TEXT,
ADD COLUMN "generationMetadata" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX "StyleProfile_productionAssetStatus_idx" ON "StyleProfile"("productionAssetStatus");
CREATE INDEX "PreviewAsset_productionAssetStatus_idx" ON "PreviewAsset"("productionAssetStatus");
