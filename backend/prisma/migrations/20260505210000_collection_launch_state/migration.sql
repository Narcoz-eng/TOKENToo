-- AlterTable
ALTER TABLE "Collection"
  ADD COLUMN "collectionMetadataUri" TEXT,
  ADD COLUMN "launchStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "launchTxSignature" TEXT,
  ADD COLUMN "launchUnsignedTransaction" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Collection_launchTxSignature_key" ON "Collection"("launchTxSignature");
CREATE INDEX "Collection_launchStatus_idx" ON "Collection"("launchStatus");
