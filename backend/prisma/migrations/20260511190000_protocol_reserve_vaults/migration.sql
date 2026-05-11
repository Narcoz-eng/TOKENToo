DO $$ BEGIN
  CREATE TYPE "ReserveVaultStatus" AS ENUM ('ACTIVE', 'PAUSED', 'INSOLVENT', 'EMERGENCY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "VaultPositionStatus" AS ENUM ('LOCKED', 'REDEEMABLE', 'STAKED', 'REDEEMED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ReserveVault" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "collectionId" UUID NOT NULL,
  "tokenMint" TEXT NOT NULL,
  "reserveVaultPda" TEXT NOT NULL,
  "totalLocked" DECIMAL(38,0) NOT NULL DEFAULT 0,
  "totalRedeemed" DECIMAL(38,0) NOT NULL DEFAULT 0,
  "totalStaked" DECIMAL(38,0) NOT NULL DEFAULT 0,
  "availableBacking" DECIMAL(38,0) NOT NULL DEFAULT 0,
  "reserveRatioBps" INTEGER NOT NULL DEFAULT 10000,
  "lastOnChainVerifiedAt" TIMESTAMP(3),
  "status" "ReserveVaultStatus" NOT NULL DEFAULT 'ACTIVE',
  "verificationMetadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReserveVault_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VaultPosition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "vaultNftId" UUID NOT NULL,
  "collectionId" UUID NOT NULL,
  "tokenMint" TEXT NOT NULL,
  "positionPda" TEXT NOT NULL,
  "nftMint" TEXT NOT NULL,
  "ownerWalletSnapshot" TEXT,
  "lockedAmount" DECIMAL(38,0) NOT NULL,
  "lockDurationDays" INTEGER NOT NULL,
  "unlocksAt" TIMESTAMP(3) NOT NULL,
  "redeemedAt" TIMESTAMP(3),
  "stakedAt" TIMESTAMP(3),
  "status" "VaultPositionStatus" NOT NULL DEFAULT 'LOCKED',
  "lastVerifiedAt" TIMESTAMP(3),
  "verificationMetadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VaultPosition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReserveVault_collectionId_key" ON "ReserveVault"("collectionId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReserveVault_reserveVaultPda_key" ON "ReserveVault"("reserveVaultPda");
CREATE INDEX IF NOT EXISTS "ReserveVault_tokenMint_status_idx" ON "ReserveVault"("tokenMint", "status");
CREATE INDEX IF NOT EXISTS "ReserveVault_status_idx" ON "ReserveVault"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "VaultPosition_vaultNftId_key" ON "VaultPosition"("vaultNftId");
CREATE UNIQUE INDEX IF NOT EXISTS "VaultPosition_positionPda_key" ON "VaultPosition"("positionPda");
CREATE UNIQUE INDEX IF NOT EXISTS "VaultPosition_nftMint_key" ON "VaultPosition"("nftMint");
CREATE INDEX IF NOT EXISTS "VaultPosition_collectionId_status_idx" ON "VaultPosition"("collectionId", "status");
CREATE INDEX IF NOT EXISTS "VaultPosition_ownerWalletSnapshot_status_idx" ON "VaultPosition"("ownerWalletSnapshot", "status");
CREATE INDEX IF NOT EXISTS "VaultPosition_tokenMint_idx" ON "VaultPosition"("tokenMint");

DO $$ BEGIN
  ALTER TABLE "ReserveVault" ADD CONSTRAINT "ReserveVault_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "VaultPosition" ADD CONSTRAINT "VaultPosition_vaultNftId_fkey" FOREIGN KEY ("vaultNftId") REFERENCES "VaultNFT"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "VaultPosition" ADD CONSTRAINT "VaultPosition_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
