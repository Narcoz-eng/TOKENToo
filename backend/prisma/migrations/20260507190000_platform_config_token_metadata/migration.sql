-- Founder/dev persistence support for Phew.run.
-- Stores non-secret platform configuration and token metadata workflow records.

CREATE TABLE "PlatformConfig" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TokenMetadataRecord" (
  "id" UUID NOT NULL,
  "tokenId" UUID,
  "mint" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "description" TEXT,
  "logoUri" TEXT,
  "metadataUri" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'backend',
  "onChainWriteStatus" TEXT NOT NULL DEFAULT 'PROVIDER_NOT_CONFIGURED',
  "onChainTxSignature" TEXT,
  "indexed" BOOLEAN NOT NULL DEFAULT false,
  "verificationStatus" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TokenMetadataRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformConfig_key_key" ON "PlatformConfig"("key");
CREATE UNIQUE INDEX "TokenMetadataRecord_mint_key" ON "TokenMetadataRecord"("mint");
CREATE INDEX "TokenMetadataRecord_tokenId_idx" ON "TokenMetadataRecord"("tokenId");
CREATE INDEX "TokenMetadataRecord_onChainWriteStatus_idx" ON "TokenMetadataRecord"("onChainWriteStatus");

ALTER TABLE "TokenMetadataRecord" ADD CONSTRAINT "TokenMetadataRecord_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE SET NULL ON UPDATE CASCADE;
