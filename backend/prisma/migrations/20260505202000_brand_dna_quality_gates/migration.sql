-- AlterTable
ALTER TABLE "StyleProfile"
  ADD COLUMN "brandDna" JSONB,
  ADD COLUMN "visualFingerprint" JSONB,
  ADD COLUMN "assetPackId" TEXT,
  ADD COLUMN "artSource" TEXT NOT NULL DEFAULT 'PROCEDURAL_FALLBACK',
  ADD COLUMN "tenKReadinessReport" JSONB;

-- CreateIndex
CREATE INDEX "StyleProfile_assetPackId_idx" ON "StyleProfile"("assetPackId");
CREATE INDEX "StyleProfile_artSource_idx" ON "StyleProfile"("artSource");
