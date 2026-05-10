CREATE TABLE IF NOT EXISTS "CuratedLayerPack" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "generationRunId" UUID NOT NULL,
  "styleProfileId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "version" TEXT NOT NULL DEFAULT 'v1',
  "rootUri" TEXT,
  "manifest" JSONB NOT NULL,
  "validation" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'IMPORTED',
  "width" INTEGER,
  "height" INTEGER,
  "provenanceHash" TEXT,
  "previewUri" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CuratedLayerPack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CuratedLayerAsset" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "layerPackId" UUID NOT NULL,
  "category" TEXT NOT NULL,
  "traitName" TEXT NOT NULL,
  "rarity" TEXT,
  "weightBps" INTEGER NOT NULL DEFAULT 100,
  "zIndex" INTEGER NOT NULL DEFAULT 0,
  "offsetX" INTEGER NOT NULL DEFAULT 0,
  "offsetY" INTEGER NOT NULL DEFAULT 0,
  "blendMode" TEXT NOT NULL DEFAULT 'over',
  "aliases" JSONB NOT NULL DEFAULT '[]',
  "incompatibleWith" JSONB NOT NULL DEFAULT '[]',
  "uri" TEXT NOT NULL,
  "mimeType" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "hasAlpha" BOOLEAN NOT NULL DEFAULT false,
  "contentHash" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CuratedLayerAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CuratedLayerPack_generationRunId_idx" ON "CuratedLayerPack"("generationRunId");
CREATE INDEX IF NOT EXISTS "CuratedLayerPack_styleProfileId_status_idx" ON "CuratedLayerPack"("styleProfileId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "CuratedLayerAsset_layerPackId_category_traitName_key" ON "CuratedLayerAsset"("layerPackId", "category", "traitName");
CREATE INDEX IF NOT EXISTS "CuratedLayerAsset_layerPackId_category_idx" ON "CuratedLayerAsset"("layerPackId", "category");

DO $$ BEGIN
  ALTER TABLE "CuratedLayerPack" ADD CONSTRAINT "CuratedLayerPack_generationRunId_fkey" FOREIGN KEY ("generationRunId") REFERENCES "GenerationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CuratedLayerPack" ADD CONSTRAINT "CuratedLayerPack_styleProfileId_fkey" FOREIGN KEY ("styleProfileId") REFERENCES "StyleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CuratedLayerAsset" ADD CONSTRAINT "CuratedLayerAsset_layerPackId_fkey" FOREIGN KEY ("layerPackId") REFERENCES "CuratedLayerPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
