-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'ASSET_GENERATED', 'ASSET_UPLOADED', 'TX_BUILT', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InstantSellQuoteStatus" AS ENUM ('QUOTED', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RaidClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');

-- AlterTable
ALTER TABLE "GenerationRun"
ADD COLUMN "approvedByWallet" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvalSnapshot" JSONB;

-- AlterTable
ALTER TABLE "Collection"
ADD COLUMN "approvedGenerationRunId" UUID,
ADD COLUMN "styleProfileVersion" INTEGER,
ADD COLUMN "traitPackVersion" INTEGER,
ADD COLUMN "metadataSchemaVersion" TEXT NOT NULL DEFAULT 'vaultx-v1',
ADD COLUMN "collectionAssetAddress" TEXT,
ADD COLUMN "metadataUri" TEXT,
ADD COLUMN "identityLockedAt" TIMESTAMP(3),
ADD COLUMN "launchedAt" TIMESTAMP(3),
ADD COLUMN "lore" TEXT,
ADD COLUMN "roleNames" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "raidTheme" TEXT;

-- AlterTable
ALTER TABLE "VaultNFT"
ADD COLUMN "mintTransactionId" UUID;

-- AlterTable
ALTER TABLE "Listing"
ADD COLUMN "backingValueSol" DECIMAL(20,9) NOT NULL DEFAULT 0,
ADD COLUMN "premiumBps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "riskTier" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN "unlocksAtSnapshot" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Sale"
ADD COLUMN "backingValueSol" DECIMAL(20,9) NOT NULL DEFAULT 0,
ADD COLUMN "premiumBps" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RaidClaim" (
    "id" UUID NOT NULL,
    "raidRoomId" UUID NOT NULL,
    "raidMissionId" UUID,
    "userId" UUID NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "status" "RaidClaimStatus" NOT NULL DEFAULT 'PENDING',
    "proof" JSONB NOT NULL DEFAULT '{}',
    "xpRequested" INTEGER NOT NULL DEFAULT 0,
    "xpApproved" INTEGER NOT NULL DEFAULT 0,
    "rewardSol" DECIMAL(20,9) NOT NULL DEFAULT 0,
    "abuseScore" INTEGER NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,
    "txSignature" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaidClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidAbuseSignal" (
    "id" UUID NOT NULL,
    "raidRoomId" UUID,
    "walletAddress" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaidAbuseSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletReputation" (
    "id" UUID NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "walletAgeHours" INTEGER NOT NULL DEFAULT 0,
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "abuseScore" INTEGER NOT NULL DEFAULT 0,
    "completedRaids" INTEGER NOT NULL DEFAULT 0,
    "rejectedClaims" INTEGER NOT NULL DEFAULT 0,
    "washTradeSignals" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletReputation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionCooldown" (
    "id" UUID NOT NULL,
    "raidMissionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "windowKey" TEXT NOT NULL,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "resetsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionCooldown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstantSellQuote" (
    "id" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "vaultNftId" UUID NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "backingValueSol" DECIMAL(20,9) NOT NULL,
    "discountBps" INTEGER NOT NULL,
    "quoteSol" DECIMAL(20,9) NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "riskTier" TEXT NOT NULL,
    "status" "InstantSellQuoteStatus" NOT NULL DEFAULT 'QUOTED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedTxSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstantSellQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MintTransaction" (
    "id" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "collectionId" UUID NOT NULL,
    "tokenMint" TEXT NOT NULL,
    "amount" DECIMAL(38,0) NOT NULL,
    "lockDuration" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "txSignature" TEXT,
    "assetUri" TEXT,
    "metadataUri" TEXT,
    "nftMint" TEXT,
    "vaultPositionPda" TEXT,
    "unsignedTransaction" JSONB,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MintTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedeemTransaction" (
    "id" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "vaultNftId" UUID NOT NULL,
    "vaultPositionId" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "txSignature" TEXT,
    "unsignedTransaction" JSONB,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedeemTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingTransaction" (
    "id" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "listingId" UUID,
    "vaultNftId" UUID NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "txSignature" TEXT,
    "unsignedTransaction" JSONB,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collection_collectionAssetAddress_key" ON "Collection"("collectionAssetAddress");

-- CreateIndex
CREATE INDEX "Collection_approvedGenerationRunId_idx" ON "Collection"("approvedGenerationRunId");

-- CreateIndex
CREATE UNIQUE INDEX "VaultNFT_mintTransactionId_key" ON "VaultNFT"("mintTransactionId");

-- CreateIndex
CREATE INDEX "RaidClaim_raidRoomId_status_idx" ON "RaidClaim"("raidRoomId", "status");

-- CreateIndex
CREATE INDEX "RaidClaim_walletAddress_createdAt_idx" ON "RaidClaim"("walletAddress", "createdAt");

-- CreateIndex
CREATE INDEX "RaidAbuseSignal_walletAddress_createdAt_idx" ON "RaidAbuseSignal"("walletAddress", "createdAt");

-- CreateIndex
CREATE INDEX "RaidAbuseSignal_raidRoomId_severity_idx" ON "RaidAbuseSignal"("raidRoomId", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "WalletReputation_walletAddress_key" ON "WalletReputation"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "MissionCooldown_raidMissionId_walletAddress_windowKey_key" ON "MissionCooldown"("raidMissionId", "walletAddress", "windowKey");

-- CreateIndex
CREATE INDEX "MissionCooldown_userId_resetsAt_idx" ON "MissionCooldown"("userId", "resetsAt");

-- CreateIndex
CREATE INDEX "Listing_premiumBps_idx" ON "Listing"("premiumBps");

-- CreateIndex
CREATE INDEX "InstantSellQuote_collectionId_status_idx" ON "InstantSellQuote"("collectionId", "status");

-- CreateIndex
CREATE INDEX "InstantSellQuote_walletAddress_createdAt_idx" ON "InstantSellQuote"("walletAddress", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MintTransaction_idempotencyKey_key" ON "MintTransaction"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "MintTransaction_txSignature_key" ON "MintTransaction"("txSignature");

-- CreateIndex
CREATE UNIQUE INDEX "MintTransaction_nftMint_key" ON "MintTransaction"("nftMint");

-- CreateIndex
CREATE INDEX "MintTransaction_collectionId_status_idx" ON "MintTransaction"("collectionId", "status");

-- CreateIndex
CREATE INDEX "MintTransaction_walletAddress_createdAt_idx" ON "MintTransaction"("walletAddress", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RedeemTransaction_idempotencyKey_key" ON "RedeemTransaction"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "RedeemTransaction_txSignature_key" ON "RedeemTransaction"("txSignature");

-- CreateIndex
CREATE INDEX "RedeemTransaction_vaultNftId_status_idx" ON "RedeemTransaction"("vaultNftId", "status");

-- CreateIndex
CREATE INDEX "RedeemTransaction_walletAddress_createdAt_idx" ON "RedeemTransaction"("walletAddress", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ListingTransaction_idempotencyKey_key" ON "ListingTransaction"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ListingTransaction_txSignature_key" ON "ListingTransaction"("txSignature");

-- CreateIndex
CREATE INDEX "ListingTransaction_listingId_status_idx" ON "ListingTransaction"("listingId", "status");

-- CreateIndex
CREATE INDEX "ListingTransaction_vaultNftId_status_idx" ON "ListingTransaction"("vaultNftId", "status");

-- CreateIndex
CREATE INDEX "ListingTransaction_walletAddress_createdAt_idx" ON "ListingTransaction"("walletAddress", "createdAt");

-- AddForeignKey
ALTER TABLE "VaultNFT" ADD CONSTRAINT "VaultNFT_mintTransactionId_fkey" FOREIGN KEY ("mintTransactionId") REFERENCES "MintTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidClaim" ADD CONSTRAINT "RaidClaim_raidRoomId_fkey" FOREIGN KEY ("raidRoomId") REFERENCES "RaidRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidClaim" ADD CONSTRAINT "RaidClaim_raidMissionId_fkey" FOREIGN KEY ("raidMissionId") REFERENCES "RaidMission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidClaim" ADD CONSTRAINT "RaidClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidAbuseSignal" ADD CONSTRAINT "RaidAbuseSignal_raidRoomId_fkey" FOREIGN KEY ("raidRoomId") REFERENCES "RaidRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionCooldown" ADD CONSTRAINT "MissionCooldown_raidMissionId_fkey" FOREIGN KEY ("raidMissionId") REFERENCES "RaidMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionCooldown" ADD CONSTRAINT "MissionCooldown_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantSellQuote" ADD CONSTRAINT "InstantSellQuote_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantSellQuote" ADD CONSTRAINT "InstantSellQuote_vaultNftId_fkey" FOREIGN KEY ("vaultNftId") REFERENCES "VaultNFT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MintTransaction" ADD CONSTRAINT "MintTransaction_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedeemTransaction" ADD CONSTRAINT "RedeemTransaction_vaultNftId_fkey" FOREIGN KEY ("vaultNftId") REFERENCES "VaultNFT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingTransaction" ADD CONSTRAINT "ListingTransaction_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingTransaction" ADD CONSTRAINT "ListingTransaction_vaultNftId_fkey" FOREIGN KEY ("vaultNftId") REFERENCES "VaultNFT"("id") ON DELETE CASCADE ON UPDATE CASCADE;
