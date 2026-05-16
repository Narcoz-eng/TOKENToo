DO $$ BEGIN
  CREATE TYPE "CommunityPaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'DENIED', 'UNAVAILABLE', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WhaleGateVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'DENIED', 'UNAVAILABLE', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StudioSubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CreatorAccessPassStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CreatorAccessPassType" AS ENUM ('STUDIO_SUBSCRIPTION', 'ADMIN_GRANT', 'CREATOR_PASS', 'ALLOWLIST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "TokenCommunity" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tokenId" UUID NOT NULL,
  "collectionId" UUID,
  "creatorUserId" UUID,
  "tokenMint" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "CollectionStatus" NOT NULL DEFAULT 'ACTIVE',
  "launchStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TokenCommunity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CommunityCreationPayment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "communityId" UUID,
  "collectionId" UUID,
  "accessId" UUID,
  "tokenId" UUID,
  "tokenMint" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "payer" TEXT,
  "recipient" TEXT NOT NULL,
  "requiredLamports" DECIMAL(20,0) NOT NULL,
  "paidLamports" DECIMAL(20,0),
  "signature" TEXT,
  "status" "CommunityPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "verificationAvailable" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "idempotencyKey" TEXT,
  "requestHash" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunityCreationPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WhaleGateVerification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "communityId" UUID,
  "collectionId" UUID,
  "accessId" UUID,
  "tokenId" UUID,
  "tokenMint" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "requiredAmount" DECIMAL(38,0) NOT NULL,
  "observedBalance" DECIMAL(38,0),
  "tokenAccount" TEXT,
  "status" "WhaleGateVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verificationAvailable" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "idempotencyKey" TEXT,
  "requestHash" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhaleGateVerification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudioSubscription" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID,
  "walletAddress" TEXT NOT NULL,
  "tier" TEXT NOT NULL DEFAULT 'STUDIO',
  "status" "StudioSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "source" TEXT NOT NULL DEFAULT 'manual',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudioSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CreatorAccessPass" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID,
  "collectionId" UUID,
  "communityId" UUID,
  "walletAddress" TEXT NOT NULL,
  "type" "CreatorAccessPassType" NOT NULL DEFAULT 'CREATOR_PASS',
  "status" "CreatorAccessPassStatus" NOT NULL DEFAULT 'ACTIVE',
  "source" TEXT NOT NULL DEFAULT 'manual',
  "grantedByWallet" TEXT,
  "expiresAt" TIMESTAMP(3),
  "idempotencyKey" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreatorAccessPass_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TokenCommunity_tokenId_key" ON "TokenCommunity"("tokenId");
CREATE UNIQUE INDEX IF NOT EXISTS "TokenCommunity_collectionId_key" ON "TokenCommunity"("collectionId");
CREATE UNIQUE INDEX IF NOT EXISTS "TokenCommunity_tokenMint_key" ON "TokenCommunity"("tokenMint");
CREATE UNIQUE INDEX IF NOT EXISTS "TokenCommunity_slug_key" ON "TokenCommunity"("slug");
CREATE INDEX IF NOT EXISTS "TokenCommunity_status_idx" ON "TokenCommunity"("status");
CREATE INDEX IF NOT EXISTS "TokenCommunity_launchStatus_idx" ON "TokenCommunity"("launchStatus");
CREATE INDEX IF NOT EXISTS "TokenCommunity_creatorUserId_idx" ON "TokenCommunity"("creatorUserId");

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityCreationPayment_accessId_key" ON "CommunityCreationPayment"("accessId");
CREATE UNIQUE INDEX IF NOT EXISTS "CommunityCreationPayment_signature_key" ON "CommunityCreationPayment"("signature");
CREATE UNIQUE INDEX IF NOT EXISTS "CommunityCreationPayment_idempotencyKey_key" ON "CommunityCreationPayment"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "CommunityCreationPayment_walletAddress_tokenMint_status_idx" ON "CommunityCreationPayment"("walletAddress", "tokenMint", "status");
CREATE INDEX IF NOT EXISTS "CommunityCreationPayment_collectionId_status_idx" ON "CommunityCreationPayment"("collectionId", "status");
CREATE INDEX IF NOT EXISTS "CommunityCreationPayment_communityId_status_idx" ON "CommunityCreationPayment"("communityId", "status");
CREATE INDEX IF NOT EXISTS "CommunityCreationPayment_status_createdAt_idx" ON "CommunityCreationPayment"("status", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "WhaleGateVerification_accessId_key" ON "WhaleGateVerification"("accessId");
CREATE UNIQUE INDEX IF NOT EXISTS "WhaleGateVerification_idempotencyKey_key" ON "WhaleGateVerification"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "WhaleGateVerification_walletAddress_tokenMint_status_idx" ON "WhaleGateVerification"("walletAddress", "tokenMint", "status");
CREATE INDEX IF NOT EXISTS "WhaleGateVerification_collectionId_status_idx" ON "WhaleGateVerification"("collectionId", "status");
CREATE INDEX IF NOT EXISTS "WhaleGateVerification_communityId_status_idx" ON "WhaleGateVerification"("communityId", "status");
CREATE INDEX IF NOT EXISTS "WhaleGateVerification_status_createdAt_idx" ON "WhaleGateVerification"("status", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "StudioSubscription_walletAddress_tier_key" ON "StudioSubscription"("walletAddress", "tier");
CREATE INDEX IF NOT EXISTS "StudioSubscription_walletAddress_status_idx" ON "StudioSubscription"("walletAddress", "status");
CREATE INDEX IF NOT EXISTS "StudioSubscription_status_expiresAt_idx" ON "StudioSubscription"("status", "expiresAt");

CREATE UNIQUE INDEX IF NOT EXISTS "CreatorAccessPass_idempotencyKey_key" ON "CreatorAccessPass"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "CreatorAccessPass_walletAddress_status_type_idx" ON "CreatorAccessPass"("walletAddress", "status", "type");
CREATE INDEX IF NOT EXISTS "CreatorAccessPass_collectionId_status_idx" ON "CreatorAccessPass"("collectionId", "status");
CREATE INDEX IF NOT EXISTS "CreatorAccessPass_communityId_status_idx" ON "CreatorAccessPass"("communityId", "status");
CREATE INDEX IF NOT EXISTS "CreatorAccessPass_expiresAt_idx" ON "CreatorAccessPass"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "TokenCommunity" ADD CONSTRAINT "TokenCommunity_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TokenCommunity" ADD CONSTRAINT "TokenCommunity_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TokenCommunity" ADD CONSTRAINT "TokenCommunity_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CommunityCreationPayment" ADD CONSTRAINT "CommunityCreationPayment_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "TokenCommunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CommunityCreationPayment" ADD CONSTRAINT "CommunityCreationPayment_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CommunityCreationPayment" ADD CONSTRAINT "CommunityCreationPayment_accessId_fkey" FOREIGN KEY ("accessId") REFERENCES "CommunityCreationAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CommunityCreationPayment" ADD CONSTRAINT "CommunityCreationPayment_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WhaleGateVerification" ADD CONSTRAINT "WhaleGateVerification_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "TokenCommunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WhaleGateVerification" ADD CONSTRAINT "WhaleGateVerification_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WhaleGateVerification" ADD CONSTRAINT "WhaleGateVerification_accessId_fkey" FOREIGN KEY ("accessId") REFERENCES "CommunityCreationAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WhaleGateVerification" ADD CONSTRAINT "WhaleGateVerification_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StudioSubscription" ADD CONSTRAINT "StudioSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CreatorAccessPass" ADD CONSTRAINT "CreatorAccessPass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CreatorAccessPass" ADD CONSTRAINT "CreatorAccessPass_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CreatorAccessPass" ADD CONSTRAINT "CreatorAccessPass_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "TokenCommunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "TokenCommunity" (
  "tokenId",
  "collectionId",
  "creatorUserId",
  "tokenMint",
  "slug",
  "name",
  "status",
  "launchStatus",
  "metadata",
  "updatedAt"
)
SELECT
  c."tokenId",
  c."id",
  c."creatorUserId",
  t."mint",
  c."slug",
  c."name",
  c."status",
  c."launchStatus",
  jsonb_build_object('source', 'migration-backfill-from-collection'),
  CURRENT_TIMESTAMP
FROM "Collection" c
JOIN "Token" t ON t."id" = c."tokenId"
ON CONFLICT ("tokenId") DO NOTHING;

INSERT INTO "CommunityCreationPayment" (
  "communityId",
  "collectionId",
  "accessId",
  "tokenId",
  "tokenMint",
  "walletAddress",
  "payer",
  "recipient",
  "requiredLamports",
  "paidLamports",
  "signature",
  "status",
  "verificationAvailable",
  "verifiedAt",
  "expiresAt",
  "idempotencyKey",
  "requestHash",
  "metadata",
  "updatedAt"
)
SELECT
  tc."id",
  a."collectionId",
  a."id",
  t."id",
  a."tokenMint",
  a."walletAddress",
  a."walletAddress",
  COALESCE(NULLIF(a."metadata"->>'recipient', ''), 'legacy-unset'),
  COALESCE(a."requiredLamports", 1000000000),
  CASE
    WHEN a."metadata"->>'paidLamports' ~ '^[0-9]+$' THEN (a."metadata"->>'paidLamports')::DECIMAL(20,0)
    WHEN a."status" = 'GRANTED' THEN COALESCE(a."requiredLamports", 1000000000)
    ELSE NULL
  END,
  a."paymentSignature",
  CASE
    WHEN a."status" = 'GRANTED' THEN 'VERIFIED'::"CommunityPaymentStatus"
    WHEN a."status" = 'DENIED' THEN 'DENIED'::"CommunityPaymentStatus"
    WHEN a."status" = 'EXPIRED' THEN 'EXPIRED'::"CommunityPaymentStatus"
    ELSE 'PENDING'::"CommunityPaymentStatus"
  END,
  COALESCE((a."metadata"->>'verificationAvailable') = 'true', a."status" = 'GRANTED', false),
  a."verifiedAt",
  a."expiresAt",
  a."idempotencyKey",
  a."requestHash",
  jsonb_build_object('source', 'migration-backfill-from-community-access', 'legacyMetadata', a."metadata"),
  CURRENT_TIMESTAMP
FROM "CommunityCreationAccess" a
LEFT JOIN "Token" t ON t."mint" = a."tokenMint"
LEFT JOIN "TokenCommunity" tc ON tc."collectionId" = a."collectionId" OR tc."tokenMint" = a."tokenMint"
WHERE a."method" = 'CREATION_FEE_SOL'
ON CONFLICT DO NOTHING;

INSERT INTO "WhaleGateVerification" (
  "communityId",
  "collectionId",
  "accessId",
  "tokenId",
  "tokenMint",
  "walletAddress",
  "requiredAmount",
  "observedBalance",
  "tokenAccount",
  "status",
  "verificationAvailable",
  "verifiedAt",
  "expiresAt",
  "idempotencyKey",
  "requestHash",
  "metadata",
  "updatedAt"
)
SELECT
  tc."id",
  a."collectionId",
  a."id",
  t."id",
  a."tokenMint",
  a."walletAddress",
  CASE WHEN a."metadata"->>'thresholdRaw' ~ '^[0-9]+$' THEN (a."metadata"->>'thresholdRaw')::DECIMAL(38,0) ELSE 1 END,
  CASE WHEN a."metadata"->>'balance' ~ '^[0-9]+$' THEN (a."metadata"->>'balance')::DECIMAL(38,0) ELSE NULL END,
  NULLIF(a."metadata"->>'tokenAccount', ''),
  CASE
    WHEN a."status" = 'GRANTED' THEN 'VERIFIED'::"WhaleGateVerificationStatus"
    WHEN a."status" = 'DENIED' THEN 'DENIED'::"WhaleGateVerificationStatus"
    WHEN a."status" = 'EXPIRED' THEN 'EXPIRED'::"WhaleGateVerificationStatus"
    ELSE 'PENDING'::"WhaleGateVerificationStatus"
  END,
  COALESCE((a."metadata"->>'verificationAvailable') = 'true', a."status" = 'GRANTED', false),
  a."verifiedAt",
  a."expiresAt",
  a."idempotencyKey",
  a."requestHash",
  jsonb_build_object('source', 'migration-backfill-from-community-access', 'legacyMetadata', a."metadata"),
  CURRENT_TIMESTAMP
FROM "CommunityCreationAccess" a
LEFT JOIN "Token" t ON t."mint" = a."tokenMint"
LEFT JOIN "TokenCommunity" tc ON tc."collectionId" = a."collectionId" OR tc."tokenMint" = a."tokenMint"
WHERE a."method" = 'WHALE_HOLDER'
ON CONFLICT DO NOTHING;
