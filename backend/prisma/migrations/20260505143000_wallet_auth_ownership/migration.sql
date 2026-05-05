-- AlterTable
ALTER TABLE "GenerationRun" ADD COLUMN "creatorWallet" TEXT;

-- CreateIndex
CREATE INDEX "GenerationRun_creatorWallet_idx" ON "GenerationRun"("creatorWallet");
