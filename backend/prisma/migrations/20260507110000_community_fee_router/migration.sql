-- Community Fee Router: generated fees are split after the fixed 1% platform fee.
-- Safe Vault invariant: locked backing tokens are not represented in this router.

CREATE TYPE "FeeAllocationPreset" AS ENUM ('BALANCED', 'LIQUIDITY_FIRST', 'RAID_FIRST', 'DEFENSIVE', 'CUSTOM');
CREATE TYPE "TreasuryBucketType" AS ENUM ('CREATOR', 'RAID_REWARDS', 'METEORA_LIQUIDITY', 'INSTANT_SELL_POOL', 'SAFETY_RESERVE', 'BUYBACK_BACKING', 'PROTOCOL');

ALTER TYPE "FeeDestination" ADD VALUE IF NOT EXISTS 'METEORA_LIQUIDITY';
ALTER TYPE "FeeDestination" ADD VALUE IF NOT EXISTS 'INSTANT_SELL_POOL';
ALTER TYPE "TransactionStatus" ADD VALUE IF NOT EXISTS 'NEEDS_CORE_VERIFY';

ALTER TABLE "FeeLedger"
  ALTER COLUMN "destination" DROP NOT NULL,
  ADD COLUMN "platformFeeSol" DECIMAL(20,9) NOT NULL DEFAULT 0,
  ADD COLUMN "netCommunitySol" DECIMAL(20,9) NOT NULL DEFAULT 0,
  ADD COLUMN "allocationPreset" "FeeAllocationPreset",
  ADD COLUMN "creatorSol" DECIMAL(20,9) NOT NULL DEFAULT 0,
  ADD COLUMN "raidRewardsSol" DECIMAL(20,9) NOT NULL DEFAULT 0,
  ADD COLUMN "meteoraLiquiditySol" DECIMAL(20,9) NOT NULL DEFAULT 0,
  ADD COLUMN "instantSellPoolSol" DECIMAL(20,9) NOT NULL DEFAULT 0,
  ADD COLUMN "safetyReserveSol" DECIMAL(20,9) NOT NULL DEFAULT 0,
  ADD COLUMN "buybackBackingSol" DECIMAL(20,9) NOT NULL DEFAULT 0,
  ADD COLUMN "routedAt" TIMESTAMP(3);

CREATE TABLE "FeeAllocationPlan" (
  "id" UUID NOT NULL,
  "collectionId" UUID NOT NULL,
  "preset" "FeeAllocationPreset" NOT NULL DEFAULT 'BALANCED',
  "platformFeeBps" INTEGER NOT NULL DEFAULT 100,
  "creatorBps" INTEGER NOT NULL DEFAULT 1000,
  "raidRewardsBps" INTEGER NOT NULL DEFAULT 3000,
  "meteoraLiquidityBps" INTEGER NOT NULL DEFAULT 1500,
  "instantSellPoolBps" INTEGER NOT NULL DEFAULT 1000,
  "safetyReserveBps" INTEGER NOT NULL DEFAULT 500,
  "buybackBackingBps" INTEGER NOT NULL DEFAULT 3000,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeeAllocationPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityTreasuryBucket" (
  "id" UUID NOT NULL,
  "collectionId" UUID NOT NULL,
  "bucket" "TreasuryBucketType" NOT NULL,
  "balanceSol" DECIMAL(20,9) NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunityTreasuryBucket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FeeAllocationPlan_collectionId_isActive_idx" ON "FeeAllocationPlan"("collectionId", "isActive");
CREATE UNIQUE INDEX "CommunityTreasuryBucket_collectionId_bucket_key" ON "CommunityTreasuryBucket"("collectionId", "bucket");

ALTER TABLE "FeeAllocationPlan" ADD CONSTRAINT "FeeAllocationPlan_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityTreasuryBucket" ADD CONSTRAINT "CommunityTreasuryBucket_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
