-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'RISK_DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VaultStatus" AS ENUM ('LOCKED', 'REDEEMABLE', 'REDEEMED', 'STAKED');

-- CreateEnum
CREATE TYPE "StakingStatus" AS ENUM ('ACTIVE', 'UNSTAKED', 'SLASHED');

-- CreateEnum
CREATE TYPE "RaidMissionType" AS ENUM ('SOCIAL', 'VOLUME', 'HOLDER', 'INVITE', 'STAKING', 'COLLECTION_LEVEL');

-- CreateEnum
CREATE TYPE "RaidStatus" AS ENUM ('DRAFT', 'LIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "XPSource" AS ENUM ('BUY_NFT', 'HOLD_NFT', 'COMPLETE_RAID', 'INVITE_USER', 'STAKING', 'MARKETPLACE_VOLUME', 'UPGRADE_ACTIVITY', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'FILLED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('MARKETPLACE', 'INSTANT_SELL', 'BID_ACCEPTED');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('MARKETPLACE', 'MINT_VAULT', 'REDEEM', 'INSTANT_SELL', 'UPGRADE');

-- CreateEnum
CREATE TYPE "FeeDestination" AS ENUM ('RAID_REWARDS', 'BUYBACK_BACKING', 'PROTOCOL_TREASURY', 'CREATOR_COMMUNITY', 'SAFETY_RESERVE');

-- CreateEnum
CREATE TYPE "GeneratorRunStatus" AS ENUM ('DRAFT', 'PREVIEWED', 'APPROVED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OutputQualityTier" AS ENUM ('BASIC', 'PREMIUM', 'LEGENDARY_READY');

-- CreateEnum
CREATE TYPE "PreviewAssetType" AS ENUM ('AVATAR', 'BANNER', 'SAMPLE_NFT');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "supabaseAuthId" UUID,
    "walletAddress" TEXT NOT NULL,
    "username" TEXT,
    "avatarUrl" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" UUID NOT NULL,
    "mint" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "metadataUri" TEXT,
    "imageUri" TEXT,
    "ageHours" INTEGER NOT NULL DEFAULT 0,
    "liquidityUsd" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "marketCapUsd" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "holders" INTEGER NOT NULL DEFAULT 0,
    "volume24hUsd" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationRun" (
    "id" UUID NOT NULL,
    "tokenName" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "tokenMint" TEXT NOT NULL,
    "logoUri" TEXT,
    "logoData" TEXT,
    "description" TEXT NOT NULL,
    "communityHints" JSONB NOT NULL DEFAULT '{}',
    "selectedPreset" TEXT,
    "status" "GeneratorRunStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedVersion" INTEGER,
    "regenerationCount" INTEGER NOT NULL DEFAULT 0,
    "seed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogoAnalysis" (
    "id" UUID NOT NULL,
    "generationRunId" UUID NOT NULL,
    "palette" JSONB NOT NULL,
    "mascot" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "shapeLanguage" TEXT NOT NULL,
    "visualKeywords" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogoAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityContext" (
    "id" UUID NOT NULL,
    "generationRunId" UUID NOT NULL,
    "memes" JSONB NOT NULL DEFAULT '[]',
    "slogans" JSONB NOT NULL DEFAULT '[]',
    "phrases" JSONB NOT NULL DEFAULT '[]',
    "lore" TEXT,
    "extractedVocabulary" JSONB NOT NULL,
    "traitSeeds" JSONB NOT NULL,
    "roleNames" JSONB NOT NULL,
    "raidNames" JSONB NOT NULL,
    "backgroundNames" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleProfile" (
    "id" UUID NOT NULL,
    "generationRunId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "collection" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "mascot" TEXT NOT NULL,
    "artStyle" TEXT NOT NULL,
    "colors" JSONB NOT NULL,
    "backgroundWorld" TEXT NOT NULL,
    "traitLanguage" JSONB NOT NULL,
    "rarityStructure" JSONB NOT NULL,
    "legendaryTheme" TEXT NOT NULL,
    "animationStyle" TEXT NOT NULL,
    "raidTheme" TEXT NOT NULL,
    "lore" TEXT NOT NULL,
    "roleNames" JSONB NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StyleProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratorTraitPack" (
    "id" UUID NOT NULL,
    "styleProfileId" UUID NOT NULL,
    "collectionSize" INTEGER NOT NULL DEFAULT 10000,
    "categories" JSONB NOT NULL,
    "rarityWeights" JSONB NOT NULL,
    "unlockSchedule" JSONB NOT NULL,
    "uniquenessRules" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratorTraitPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraitDefinition" (
    "id" UUID NOT NULL,
    "traitPackId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "weightBps" INTEGER NOT NULL,
    "unlockLevel" INTEGER NOT NULL DEFAULT 1,
    "compatibilityTags" JSONB NOT NULL DEFAULT '[]',
    "visualDescription" TEXT NOT NULL,

    CONSTRAINT "TraitDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompatibilityRule" (
    "id" UUID NOT NULL,
    "traitPackId" UUID NOT NULL,
    "trait" TEXT NOT NULL,
    "incompatibleWith" JSONB NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "CompatibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreviewAsset" (
    "id" UUID NOT NULL,
    "generationRunId" UUID NOT NULL,
    "styleProfileId" UUID NOT NULL,
    "type" "PreviewAssetType" NOT NULL,
    "label" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreviewAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityReport" (
    "id" UUID NOT NULL,
    "generationRunId" UUID NOT NULL,
    "styleProfileId" UUID NOT NULL,
    "previewQualityScore" INTEGER NOT NULL,
    "uniquenessScore" INTEGER NOT NULL,
    "colorHarmonyScore" INTEGER NOT NULL,
    "rarityDistributionScore" INTEGER NOT NULL,
    "duplicateRiskScore" INTEGER NOT NULL,
    "compatibilityScore" INTEGER NOT NULL,
    "tier" "OutputQualityTier" NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "issues" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistinctivenessReport" (
    "id" UUID NOT NULL,
    "generationRunId" UUID NOT NULL,
    "styleProfileId" UUID NOT NULL,
    "silhouetteUniqueness" INTEGER NOT NULL,
    "paletteUniqueness" INTEGER NOT NULL,
    "mascotUniqueness" INTEGER NOT NULL,
    "backgroundWorldUniqueness" INTEGER NOT NULL,
    "traitLanguageUniqueness" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "nearestCollection" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistinctivenessReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" UUID NOT NULL,
    "tokenId" UUID NOT NULL,
    "creatorUserId" UUID NOT NULL,
    "onchainProfilePda" TEXT,
    "feeVaultPda" TEXT,
    "tokenVaultPda" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUri" TEXT,
    "bannerUri" TEXT,
    "colorPalette" JSONB NOT NULL,
    "mascot" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "vibe" TEXT NOT NULL,
    "rarityTable" JSONB NOT NULL,
    "communityXp" INTEGER NOT NULL DEFAULT 0,
    "communityLevel" INTEGER NOT NULL DEFAULT 1,
    "unlockedTraits" JSONB NOT NULL DEFAULT '[]',
    "activeBoosts" JSONB NOT NULL DEFAULT '[]',
    "status" "CollectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "instantSellDisabled" BOOLEAN NOT NULL DEFAULT false,
    "emergencyFlag" BOOLEAN NOT NULL DEFAULT false,
    "floorPriceSol" DECIMAL(20,9) NOT NULL DEFAULT 0,
    "volume24hSol" DECIMAL(20,9) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultNFT" (
    "id" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "tokenId" UUID NOT NULL,
    "ownerUserId" UUID,
    "mint" TEXT NOT NULL,
    "metadataUri" TEXT NOT NULL,
    "imageUri" TEXT NOT NULL,
    "positionPda" TEXT NOT NULL,
    "amount" DECIMAL(38,0) NOT NULL,
    "lockDurationDays" INTEGER NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlocksAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "tier" TEXT NOT NULL,
    "vaultType" TEXT NOT NULL DEFAULT 'COMMUNITY',
    "redeemable" BOOLEAN NOT NULL DEFAULT false,
    "status" "VaultStatus" NOT NULL DEFAULT 'LOCKED',
    "traits" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultNFT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraitPack" (
    "id" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "rarityTable" JSONB NOT NULL,
    "isUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TraitPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trait" (
    "id" UUID NOT NULL,
    "traitPackId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "weightBps" INTEGER NOT NULL,
    "imageLayer" TEXT,
    "animatedUri" TEXT,

    CONSTRAINT "Trait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidRoom" (
    "id" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "creatorUserId" UUID,
    "name" TEXT NOT NULL,
    "bossName" TEXT,
    "status" "RaidStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "rewardPoolSol" DECIMAL(20,9) NOT NULL DEFAULT 0,
    "xpTarget" INTEGER NOT NULL,
    "currentXp" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL,
    "antiAbuseRules" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaidRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidMission" (
    "id" UUID NOT NULL,
    "raidRoomId" UUID NOT NULL,
    "type" "RaidMissionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "solReward" DECIMAL(20,9) NOT NULL DEFAULT 0,
    "dailyXpCap" INTEGER,
    "minWalletAgeHrs" INTEGER,
    "minHoldingHrs" INTEGER,
    "noWashTrades" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaidMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaidParticipation" (
    "id" UUID NOT NULL,
    "raidRoomId" UUID NOT NULL,
    "raidMissionId" UUID,
    "userId" UUID NOT NULL,
    "contribution" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "rewardSol" DECIMAL(20,9) NOT NULL DEFAULT 0,
    "abuseScore" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaidParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XPLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "collectionId" UUID,
    "source" "XPSource" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XPLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StakingPosition" (
    "id" UUID NOT NULL,
    "vaultNftId" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "apyBps" INTEGER NOT NULL,
    "boostBps" INTEGER NOT NULL DEFAULT 0,
    "rewardsAccruedSol" DECIMAL(20,9) NOT NULL DEFAULT 0,
    "xpAccrued" INTEGER NOT NULL DEFAULT 0,
    "status" "StakingStatus" NOT NULL DEFAULT 'ACTIVE',
    "stakedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unstakedAt" TIMESTAMP(3),

    CONSTRAINT "StakingPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" UUID NOT NULL,
    "vaultNftId" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "sellerUserId" UUID NOT NULL,
    "priceSol" DECIMAL(20,9) NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" UUID NOT NULL,
    "listingId" UUID,
    "vaultNftId" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "buyerUserId" UUID,
    "sellerUserId" UUID,
    "saleType" "SaleType" NOT NULL,
    "priceSol" DECIMAL(20,9) NOT NULL,
    "feeSol" DECIMAL(20,9) NOT NULL,
    "txSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeLedger" (
    "id" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "sourceType" "FeeType" NOT NULL,
    "destination" "FeeDestination" NOT NULL,
    "grossSol" DECIMAL(20,9) NOT NULL,
    "allocatedSol" DECIMAL(20,9) NOT NULL,
    "txSignature" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuybackEvent" (
    "id" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "tokenAmount" DECIMAL(38,0) NOT NULL,
    "spentSol" DECIMAL(20,9) NOT NULL,
    "txSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuybackEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskScoreSnapshot" (
    "id" UUID NOT NULL,
    "tokenId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "liquidityUsd" DECIMAL(20,6) NOT NULL,
    "holders" INTEGER NOT NULL,
    "volume24hUsd" DECIMAL(20,6) NOT NULL,
    "ageHours" INTEGER NOT NULL,
    "activeVolume" BOOLEAN NOT NULL,
    "emergencyFlag" BOOLEAN NOT NULL DEFAULT false,
    "reasons" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseAuthId_key" ON "User"("supabaseAuthId");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Token_mint_key" ON "Token"("mint");

-- CreateIndex
CREATE INDEX "Token_symbol_idx" ON "Token"("symbol");

-- CreateIndex
CREATE INDEX "Token_riskScore_idx" ON "Token"("riskScore");

-- CreateIndex
CREATE INDEX "GenerationRun_tokenMint_idx" ON "GenerationRun"("tokenMint");

-- CreateIndex
CREATE INDEX "GenerationRun_status_idx" ON "GenerationRun"("status");

-- CreateIndex
CREATE INDEX "GenerationRun_createdAt_idx" ON "GenerationRun"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LogoAnalysis_generationRunId_key" ON "LogoAnalysis"("generationRunId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityContext_generationRunId_key" ON "CommunityContext"("generationRunId");

-- CreateIndex
CREATE INDEX "StyleProfile_artStyle_idx" ON "StyleProfile"("artStyle");

-- CreateIndex
CREATE UNIQUE INDEX "StyleProfile_generationRunId_version_key" ON "StyleProfile"("generationRunId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratorTraitPack_styleProfileId_key" ON "GeneratorTraitPack"("styleProfileId");

-- CreateIndex
CREATE INDEX "TraitDefinition_category_rarity_idx" ON "TraitDefinition"("category", "rarity");

-- CreateIndex
CREATE UNIQUE INDEX "TraitDefinition_traitPackId_category_name_key" ON "TraitDefinition"("traitPackId", "category", "name");

-- CreateIndex
CREATE INDEX "CompatibilityRule_traitPackId_idx" ON "CompatibilityRule"("traitPackId");

-- CreateIndex
CREATE INDEX "PreviewAsset_generationRunId_type_idx" ON "PreviewAsset"("generationRunId", "type");

-- CreateIndex
CREATE INDEX "QualityReport_generationRunId_idx" ON "QualityReport"("generationRunId");

-- CreateIndex
CREATE INDEX "QualityReport_tier_idx" ON "QualityReport"("tier");

-- CreateIndex
CREATE INDEX "DistinctivenessReport_generationRunId_idx" ON "DistinctivenessReport"("generationRunId");

-- CreateIndex
CREATE INDEX "DistinctivenessReport_score_idx" ON "DistinctivenessReport"("score");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_tokenId_key" ON "Collection"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_onchainProfilePda_key" ON "Collection"("onchainProfilePda");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_feeVaultPda_key" ON "Collection"("feeVaultPda");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_tokenVaultPda_key" ON "Collection"("tokenVaultPda");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_status_idx" ON "Collection"("status");

-- CreateIndex
CREATE INDEX "Collection_communityLevel_idx" ON "Collection"("communityLevel");

-- CreateIndex
CREATE UNIQUE INDEX "VaultNFT_mint_key" ON "VaultNFT"("mint");

-- CreateIndex
CREATE UNIQUE INDEX "VaultNFT_positionPda_key" ON "VaultNFT"("positionPda");

-- CreateIndex
CREATE INDEX "VaultNFT_collectionId_status_idx" ON "VaultNFT"("collectionId", "status");

-- CreateIndex
CREATE INDEX "VaultNFT_ownerUserId_idx" ON "VaultNFT"("ownerUserId");

-- CreateIndex
CREATE INDEX "VaultNFT_unlocksAt_idx" ON "VaultNFT"("unlocksAt");

-- CreateIndex
CREATE UNIQUE INDEX "TraitPack_collectionId_name_key" ON "TraitPack"("collectionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Trait_traitPackId_category_name_key" ON "Trait"("traitPackId", "category", "name");

-- CreateIndex
CREATE INDEX "RaidRoom_collectionId_status_idx" ON "RaidRoom"("collectionId", "status");

-- CreateIndex
CREATE INDEX "RaidParticipation_userId_idx" ON "RaidParticipation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RaidParticipation_raidRoomId_userId_key" ON "RaidParticipation"("raidRoomId", "userId");

-- CreateIndex
CREATE INDEX "XPLog_userId_createdAt_idx" ON "XPLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "XPLog_collectionId_createdAt_idx" ON "XPLog"("collectionId", "createdAt");

-- CreateIndex
CREATE INDEX "StakingPosition_collectionId_status_idx" ON "StakingPosition"("collectionId", "status");

-- CreateIndex
CREATE INDEX "StakingPosition_userId_status_idx" ON "StakingPosition"("userId", "status");

-- CreateIndex
CREATE INDEX "Listing_collectionId_status_priceSol_idx" ON "Listing"("collectionId", "status", "priceSol");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_listingId_key" ON "Sale"("listingId");

-- CreateIndex
CREATE INDEX "Sale_collectionId_createdAt_idx" ON "Sale"("collectionId", "createdAt");

-- CreateIndex
CREATE INDEX "FeeLedger_collectionId_createdAt_idx" ON "FeeLedger"("collectionId", "createdAt");

-- CreateIndex
CREATE INDEX "FeeLedger_sourceType_idx" ON "FeeLedger"("sourceType");

-- CreateIndex
CREATE INDEX "BuybackEvent_collectionId_createdAt_idx" ON "BuybackEvent"("collectionId", "createdAt");

-- CreateIndex
CREATE INDEX "RiskScoreSnapshot_tokenId_createdAt_idx" ON "RiskScoreSnapshot"("tokenId", "createdAt");

-- CreateIndex
CREATE INDEX "RiskScoreSnapshot_score_idx" ON "RiskScoreSnapshot"("score");

-- AddForeignKey
ALTER TABLE "LogoAnalysis" ADD CONSTRAINT "LogoAnalysis_generationRunId_fkey" FOREIGN KEY ("generationRunId") REFERENCES "GenerationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityContext" ADD CONSTRAINT "CommunityContext_generationRunId_fkey" FOREIGN KEY ("generationRunId") REFERENCES "GenerationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleProfile" ADD CONSTRAINT "StyleProfile_generationRunId_fkey" FOREIGN KEY ("generationRunId") REFERENCES "GenerationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratorTraitPack" ADD CONSTRAINT "GeneratorTraitPack_styleProfileId_fkey" FOREIGN KEY ("styleProfileId") REFERENCES "StyleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraitDefinition" ADD CONSTRAINT "TraitDefinition_traitPackId_fkey" FOREIGN KEY ("traitPackId") REFERENCES "GeneratorTraitPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibilityRule" ADD CONSTRAINT "CompatibilityRule_traitPackId_fkey" FOREIGN KEY ("traitPackId") REFERENCES "GeneratorTraitPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreviewAsset" ADD CONSTRAINT "PreviewAsset_generationRunId_fkey" FOREIGN KEY ("generationRunId") REFERENCES "GenerationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreviewAsset" ADD CONSTRAINT "PreviewAsset_styleProfileId_fkey" FOREIGN KEY ("styleProfileId") REFERENCES "StyleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityReport" ADD CONSTRAINT "QualityReport_generationRunId_fkey" FOREIGN KEY ("generationRunId") REFERENCES "GenerationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityReport" ADD CONSTRAINT "QualityReport_styleProfileId_fkey" FOREIGN KEY ("styleProfileId") REFERENCES "StyleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistinctivenessReport" ADD CONSTRAINT "DistinctivenessReport_generationRunId_fkey" FOREIGN KEY ("generationRunId") REFERENCES "GenerationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistinctivenessReport" ADD CONSTRAINT "DistinctivenessReport_styleProfileId_fkey" FOREIGN KEY ("styleProfileId") REFERENCES "StyleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultNFT" ADD CONSTRAINT "VaultNFT_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultNFT" ADD CONSTRAINT "VaultNFT_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultNFT" ADD CONSTRAINT "VaultNFT_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraitPack" ADD CONSTRAINT "TraitPack_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trait" ADD CONSTRAINT "Trait_traitPackId_fkey" FOREIGN KEY ("traitPackId") REFERENCES "TraitPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidRoom" ADD CONSTRAINT "RaidRoom_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidMission" ADD CONSTRAINT "RaidMission_raidRoomId_fkey" FOREIGN KEY ("raidRoomId") REFERENCES "RaidRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidParticipation" ADD CONSTRAINT "RaidParticipation_raidRoomId_fkey" FOREIGN KEY ("raidRoomId") REFERENCES "RaidRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidParticipation" ADD CONSTRAINT "RaidParticipation_raidMissionId_fkey" FOREIGN KEY ("raidMissionId") REFERENCES "RaidMission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidParticipation" ADD CONSTRAINT "RaidParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XPLog" ADD CONSTRAINT "XPLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StakingPosition" ADD CONSTRAINT "StakingPosition_vaultNftId_fkey" FOREIGN KEY ("vaultNftId") REFERENCES "VaultNFT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StakingPosition" ADD CONSTRAINT "StakingPosition_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StakingPosition" ADD CONSTRAINT "StakingPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_vaultNftId_fkey" FOREIGN KEY ("vaultNftId") REFERENCES "VaultNFT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_vaultNftId_fkey" FOREIGN KEY ("vaultNftId") REFERENCES "VaultNFT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeLedger" ADD CONSTRAINT "FeeLedger_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuybackEvent" ADD CONSTRAINT "BuybackEvent_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskScoreSnapshot" ADD CONSTRAINT "RiskScoreSnapshot_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE;
