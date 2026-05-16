DO $$ BEGIN
  CREATE TYPE "CommunityCreationAccessMethod" AS ENUM ('CREATION_FEE_SOL', 'WHALE_HOLDER', 'SUBSCRIPTION_STUDIO', 'ADMIN_GRANT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommunityCreationAccessStatus" AS ENUM ('PENDING', 'GRANTED', 'DENIED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "VaultStrategyType" AS ENUM ('PASSIVE', 'LIQUIDITY', 'BUYBACK', 'BURN', 'HYBRID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "VaultStrategyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StrategyExecutionAction" AS ENUM ('COLLECT_FEES', 'ADD_LIQUIDITY', 'BUYBACK', 'BURN', 'DISTRIBUTE_REWARDS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StrategyExecutionJobStatus" AS ENUM ('PENDING', 'RUNNING', 'CONFIRMED', 'FAILED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CommunityCreationAccess" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "collectionId" UUID,
  "walletAddress" TEXT NOT NULL,
  "tokenMint" TEXT NOT NULL,
  "method" "CommunityCreationAccessMethod" NOT NULL,
  "status" "CommunityCreationAccessStatus" NOT NULL DEFAULT 'PENDING',
  "requiredLamports" DECIMAL(20,0),
  "paymentSignature" TEXT,
  "idempotencyKey" TEXT,
  "requestHash" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunityCreationAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VaultStrategy" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "collectionId" UUID NOT NULL,
  "type" "VaultStrategyType" NOT NULL DEFAULT 'PASSIVE',
  "status" "VaultStrategyStatus" NOT NULL DEFAULT 'DRAFT',
  "feeAllocationBps" JSONB NOT NULL DEFAULT '{"treasury":0,"buyback":0,"liquidity":0,"rewards":0,"safetyReserve":10000}',
  "executionConfig" JSONB NOT NULL DEFAULT '{"intervalSeconds":86400,"maxSlippageBps":50,"maxSpendPerExecution":"0","maxDailySpend":"0","minReserveRatioBps":10000,"minLiquidityUsd":0,"emergencyPauseThreshold":9000}',
  "approvedByCreator" BOOLEAN NOT NULL DEFAULT false,
  "approvedAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VaultStrategy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StrategyExecutionJob" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "strategyId" UUID NOT NULL,
  "collectionId" UUID NOT NULL,
  "action" "StrategyExecutionAction" NOT NULL,
  "status" "StrategyExecutionJobStatus" NOT NULL DEFAULT 'PENDING',
  "inputAmount" DECIMAL(38,0),
  "outputAmount" DECIMAL(38,0),
  "txSignature" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "idempotencyKey" TEXT,
  "requestHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "executedAt" TIMESTAMP(3),
  CONSTRAINT "StrategyExecutionJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StrategyEventLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "collectionId" UUID NOT NULL,
  "strategyId" UUID,
  "eventType" TEXT NOT NULL,
  "txSignature" TEXT,
  "tokenMint" TEXT NOT NULL,
  "amountIn" DECIMAL(38,0),
  "amountOut" DECIMAL(38,0),
  "slippageBps" INTEGER,
  "beforeState" JSONB NOT NULL DEFAULT '{}',
  "afterState" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StrategyEventLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityCreationAccess_idempotencyKey_key" ON "CommunityCreationAccess"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "CommunityCreationAccess_walletAddress_tokenMint_status_idx" ON "CommunityCreationAccess"("walletAddress", "tokenMint", "status");
CREATE INDEX IF NOT EXISTS "CommunityCreationAccess_collectionId_idx" ON "CommunityCreationAccess"("collectionId");
CREATE INDEX IF NOT EXISTS "CommunityCreationAccess_method_status_idx" ON "CommunityCreationAccess"("method", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "VaultStrategy_collectionId_key" ON "VaultStrategy"("collectionId");
CREATE INDEX IF NOT EXISTS "VaultStrategy_type_status_idx" ON "VaultStrategy"("type", "status");
CREATE INDEX IF NOT EXISTS "VaultStrategy_approvedByCreator_idx" ON "VaultStrategy"("approvedByCreator");

CREATE UNIQUE INDEX IF NOT EXISTS "StrategyExecutionJob_idempotencyKey_key" ON "StrategyExecutionJob"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "StrategyExecutionJob_strategyId_status_idx" ON "StrategyExecutionJob"("strategyId", "status");
CREATE INDEX IF NOT EXISTS "StrategyExecutionJob_collectionId_createdAt_idx" ON "StrategyExecutionJob"("collectionId", "createdAt");
CREATE INDEX IF NOT EXISTS "StrategyExecutionJob_action_status_idx" ON "StrategyExecutionJob"("action", "status");

CREATE INDEX IF NOT EXISTS "StrategyEventLog_collectionId_createdAt_idx" ON "StrategyEventLog"("collectionId", "createdAt");
CREATE INDEX IF NOT EXISTS "StrategyEventLog_strategyId_createdAt_idx" ON "StrategyEventLog"("strategyId", "createdAt");
CREATE INDEX IF NOT EXISTS "StrategyEventLog_eventType_idx" ON "StrategyEventLog"("eventType");

DO $$ BEGIN
  ALTER TABLE "CommunityCreationAccess" ADD CONSTRAINT "CommunityCreationAccess_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "VaultStrategy" ADD CONSTRAINT "VaultStrategy_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StrategyExecutionJob" ADD CONSTRAINT "StrategyExecutionJob_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "VaultStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StrategyExecutionJob" ADD CONSTRAINT "StrategyExecutionJob_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StrategyEventLog" ADD CONSTRAINT "StrategyEventLog_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StrategyEventLog" ADD CONSTRAINT "StrategyEventLog_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "VaultStrategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
