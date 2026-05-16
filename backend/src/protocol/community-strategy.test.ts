import { ForbiddenException } from "@nestjs/common";
import { validateStartupEnvironment } from "../env/startup-validation";
import { CommunityProtocolService } from "./community-protocol.service";
import { StrategyEngineService } from "./strategy-engine.service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  await communityCreationFromTokenTest();
  await accessDeniedTest();
  await paidCreationFeeAccessTest();
  await whaleCreationAccessTest();
  await subscriptionCreationAccessTest();
  await creatorAccessPassAdminGrantTest();
  await strategySafetyTest();
  await mockModeBlockedInProductionTest();
  console.log("PASS token CA community creation and duplicate handling");
  console.log("PASS community creation access gates");
  console.log("PASS strategy defaults and safety checks");
  console.log("PASS mock mode blocked in production validation");
}

async function communityCreationFromTokenTest() {
  const db = fakeProtocolDb();
  const service = communityService(db, solana({ paymentVerified: true }));
  const created = await withEnv({ COMMUNITY_CREATION_FEE_WALLET: "treasury-wallet" }, () =>
    service.createFromToken({
      tokenMint: "TokenMint111111111111111111111111111111111",
      walletAddress: "creator-wallet",
      accessMethod: "CREATION_FEE_SOL",
      paymentSignature: "sig-paid",
      idempotencyKey: "create-one"
    })
  );
  assert(created.collection.launchStatus === "DRAFT", "Token CA flow should create a draft collection.");
  assert(db.vaultStrategy.rows.get(created.collection.id)?.type === "PASSIVE", "New communities must default to PASSIVE strategy.");
  const duplicate = await service.createFromToken({
    tokenMint: "TokenMint111111111111111111111111111111111",
    walletAddress: "another-wallet"
  });
  assert(duplicate.reused, "Duplicate token community creation should reuse the existing collection.");
  assert(db.collection.rows.size === 1, "Duplicate token must not create a second collection.");
}

async function accessDeniedTest() {
  const db = fakeProtocolDb();
  const service = communityService(db, solana({ paymentVerified: false }));
  let rejected = false;
  try {
    await service.createFromToken({ tokenMint: "DeniedMint11111111111111111111111111111111", walletAddress: "creator-wallet" });
  } catch (error) {
    rejected = error instanceof ForbiddenException;
  }
  assert(rejected, "Community creation must be denied without payment, whale, subscription, or admin access.");
  assert([...db.communityCreationAccess.rows.values()].some((row) => row.status === "DENIED"), "Denied access attempt should be recorded.");
}

async function paidCreationFeeAccessTest() {
  const db = fakeProtocolDb();
  const service = communityService(db, solana({ paymentVerified: true }));
  const result = await withEnv({ COMMUNITY_CREATION_FEE_WALLET: "treasury-wallet" }, () =>
    service.createFromToken({
      tokenMint: "PaidMint1111111111111111111111111111111111",
      walletAddress: "payer-wallet",
      accessMethod: "CREATION_FEE_SOL",
      paymentSignature: "sig-paid"
    })
  );
  assert(result.access?.method === "CREATION_FEE_SOL", "Verified 1 SOL payment should grant creation access.");
  assert([...db.communityCreationPayment.rows.values()].some((row) => row.status === "VERIFIED" && row.signature === "sig-paid"), "Verified 1 SOL payment must be stored in CommunityCreationPayment.");
}

async function whaleCreationAccessTest() {
  const db = fakeProtocolDb();
  const service = communityService(db, solana({ whaleSufficient: true }));
  const result = await service.createFromToken({
    tokenMint: "WhaleMint111111111111111111111111111111111",
    walletAddress: "whale-wallet",
    accessMethod: "WHALE_HOLDER"
  });
  assert(result.access?.method === "WHALE_HOLDER", "Whale token balance verification should grant free creation access.");
  assert([...db.whaleGateVerification.rows.values()].some((row) => row.status === "VERIFIED" && row.walletAddress === "whale-wallet"), "Whale gate proof must be stored in WhaleGateVerification.");
}

async function subscriptionCreationAccessTest() {
  const db = fakeProtocolDb();
  db.studioSubscription.rows.set("sub-wallet:STUDIO", {
    id: "subscription-1",
    walletAddress: "sub-wallet",
    tier: "STUDIO",
    status: "ACTIVE",
    createdAt: new Date()
  });
  const service = communityService(db, solana({}));
  const result = await service.createFromToken({
    tokenMint: "SubMint11111111111111111111111111111111111",
    walletAddress: "sub-wallet",
    accessMethod: "SUBSCRIPTION_STUDIO"
  });
  assert(result.access?.method === "SUBSCRIPTION_STUDIO", "Active StudioSubscription should grant creation access.");
}

async function creatorAccessPassAdminGrantTest() {
  const db = fakeProtocolDb();
  db.creatorAccessPass.rows.set("admin-pass", {
    id: "admin-pass",
    walletAddress: "pass-admin-wallet",
    type: "ADMIN_GRANT",
    status: "ACTIVE",
    createdAt: new Date()
  });
  const service = communityService(db, solana({}));
  const result = await service.createFromToken({
    tokenMint: "PassMint1111111111111111111111111111111111",
    walletAddress: "pass-admin-wallet",
    accessMethod: "ADMIN_GRANT"
  });
  assert(result.access?.method === "ADMIN_GRANT", "Active CreatorAccessPass admin grant should grant creation access.");
}

async function strategySafetyTest() {
  const db = fakeProtocolDb();
  const strategy = new StrategyEngineService(db as any);
  db.seedCollection("collection-a", "creator-wallet");
  const passive = await strategy.ensureDefaultStrategy("collection-a");
  assert(passive.type === "PASSIVE", "Strategy must default to PASSIVE.");

  await strategy.configureStrategy("collection-a", {
    type: "BUYBACK",
    status: "ACTIVE",
    approvedByCreator: true,
    feeAllocationBps: { treasury: 0, buyback: 5000, liquidity: 0, rewards: 0, safetyReserve: 5000 },
    executionConfig: {
      maxSpendPerExecution: "5000",
      maxDailySpend: "7000",
      maxSlippageBps: 50,
      minReserveRatioBps: 10000
    }
  }, "creator-wallet");

  db.communityTreasuryBucket.rows.set("collection-a:BUYBACK_BACKING", { collectionId: "collection-a", bucket: "BUYBACK_BACKING", balanceSol: "0.000001" });
  const backingBlocked = await strategy.previewExecution("collection-a", { action: "BUYBACK", inputAmount: "2000", expectedSlippageBps: 10 }, "creator-wallet");
  assert(!backingBlocked.preview.allowed, "Strategy must not spend locked backing when allocated treasury is insufficient.");
  assert(backingBlocked.preview.issues.some((issue: string) => /locked backing/i.test(issue)), "Backing protection issue should be explicit.");

  db.communityTreasuryBucket.rows.set("collection-a:BUYBACK_BACKING", { collectionId: "collection-a", bucket: "BUYBACK_BACKING", balanceSol: "0.000010" });
  db.strategyExecutionJob.rows.set("spent-today", {
    id: "spent-today",
    strategyId: db.vaultStrategy.rows.get("collection-a").id,
    collectionId: "collection-a",
    action: "BUYBACK",
    status: "CONFIRMED",
    inputAmount: "3000",
    createdAt: new Date()
  });
  const dailyBlocked = await strategy.previewExecution("collection-a", { action: "BUYBACK", inputAmount: "5000", expectedSlippageBps: 10 }, "creator-wallet");
  assert(!dailyBlocked.preview.allowed && dailyBlocked.preview.issues.some((issue: string) => /maxDailySpend/i.test(issue)), "Strategy must respect daily cap.");

  const slippageBlocked = await strategy.previewExecution("collection-a", { action: "BUYBACK", inputAmount: "1000", expectedSlippageBps: 100 }, "creator-wallet");
  assert(!slippageBlocked.preview.allowed && slippageBlocked.preview.issues.some((issue: string) => /slippage/i.test(issue)), "Strategy must respect max slippage.");

  const executable = await withEnv({ PROTOCOL_ADMIN_WALLETS: "admin-wallet", STRATEGY_EXECUTION_PROVIDER: "disabled" }, () =>
    strategy.execute("collection-a", { action: "BUYBACK", inputAmount: "1000", expectedSlippageBps: 10, idempotencyKey: "buyback-one" }, { walletAddress: "admin-wallet" })
  );
  assert(executable.job.status === "SKIPPED", "Without a production adapter, execution must be skipped rather than faked.");
  assert(db.strategyEventLog.rows.some((event: any) => event.eventType === "STRATEGY_EXECUTION_SKIPPED_NO_ADAPTER"), "Strategy execution must emit a public event log.");

  db.collection.rows.get("collection-a").reserveVault.status = "INSOLVENT";
  const unhealthy = await strategy.previewExecution("collection-a", { action: "BUYBACK", inputAmount: "1000", expectedSlippageBps: 10 }, "creator-wallet");
  assert(!unhealthy.preview.allowed && unhealthy.preview.issues.some((issue: string) => /INSOLVENT/i.test(issue)), "Unhealthy reserve must block strategy execution.");
}

async function mockModeBlockedInProductionTest() {
  await withEnv({
    APP_ENV: "production",
    NODE_ENV: "production",
    PROGRAM_ID: "8i9Xd9ikQSEdDstcV9L8ikru8nZFBsNWx2Y5TQpgAnU6",
    NEXT_PUBLIC_PROGRAM_ID: "8i9Xd9ikQSEdDstcV9L8ikru8nZFBsNWx2Y5TQpgAnU6",
    SOLANA_TRANSACTION_PROVIDER: "mock",
    ENABLE_MOCK_MINT: "true"
  }, () => {
    const validation = validateStartupEnvironment();
    assert(!validation.valid, "Production startup validation must fail when mock mode is enabled.");
    assert(validation.issues.some((issue) => issue.code === "MOCK_SOLANA_PROVIDER" && issue.severity === "fatal"), "Mock Solana provider must be fatal in production.");
    assert(validation.issues.some((issue) => issue.code === "MOCK_MINT_ENABLED" && issue.severity === "fatal"), "Mock mint must be fatal in production.");
  });
}

function communityService(db: ReturnType<typeof fakeProtocolDb>, fakeSolana: any) {
  return new CommunityProtocolService(
    db as any,
    { scanToken: async (mint: string) => scan(mint) } as any,
    {
      createCommunityProfile: (token: any) => ({
        name: `${token.symbol} Vaults`,
        symbol: token.symbol,
        theme: "token civilization",
        mascot: "Protocol Mascot",
        vibe: "token-backed community",
        palette: ["#7cff00", "#16d7d2", "#031017"],
        communityTraits: { role: ["Holder"] },
        rarityTable: { common: 10000 }
      })
    } as any,
    fakeSolana,
    { recalculateReserve: async () => ({}) } as any,
    new StrategyEngineService(db as any)
  );
}

function fakeProtocolDb() {
  let sequence = 0;
  const tokenRows = new Map<string, any>();
  const collectionRows = new Map<string, any>();
  const accessRows = new Map<string, any>();
  const tokenCommunityRows = new Map<string, any>();
  const paymentRows = new Map<string, any>();
  const whaleRows = new Map<string, any>();
  const subscriptionRows = new Map<string, any>();
  const passRows = new Map<string, any>();
  const strategyRows = new Map<string, any>();
  const bucketRows = new Map<string, any>();
  const jobRows = new Map<string, any>();
  const eventRows: any[] = [];
  const db: any = {
    token: {
      upsert: async ({ where, update, create }: any) => {
        const row = { ...(tokenRows.get(where.mint) ?? { id: `token-${tokenRows.size + 1}`, ...create }), ...update };
        tokenRows.set(where.mint, row);
        return row;
      }
    },
    collection: {
      rows: collectionRows,
      findUnique: async ({ where, include }: any) => {
        const row = where.tokenId ? [...collectionRows.values()].find((item) => item.tokenId === where.tokenId) : where.slug ? [...collectionRows.values()].find((item) => item.slug === where.slug) : collectionRows.get(where.id);
        return hydrateCollection(row, db, include);
      },
      findFirst: async ({ where, include }: any) => {
        const ids = (where?.OR ?? []).map((entry: any) => entry.id ?? entry.slug).filter(Boolean);
        const row = [...collectionRows.values()].find((item) => ids.includes(item.id) || ids.includes(item.slug));
        return hydrateCollection(row, db, include);
      }
    },
    user: {
      upsert: async ({ where }: any) => ({ id: `user:${where.walletAddress}`, walletAddress: where.walletAddress })
    },
    reserveVault: {
      create: async ({ data }: any) => {
        collectionRows.get(data.collectionId).reserveVault = { id: `reserve-${data.collectionId}`, ...data };
        return collectionRows.get(data.collectionId).reserveVault;
      }
    },
    tokenCommunity: {
      rows: tokenCommunityRows,
      upsert: async ({ where, update, create }: any) => {
        const existing = [...tokenCommunityRows.values()].find((row) => row.tokenId === where.tokenId);
        const row = { ...(existing ?? { id: `community-${tokenCommunityRows.size + 1}`, createdAt: new Date(), ...create }), ...update, updatedAt: new Date() };
        tokenCommunityRows.set(row.id, row);
        return row;
      }
    },
    communityCreationAccess: {
      rows: accessRows,
      findUnique: async ({ where }: any) => [...accessRows.values()].find((row) => row.idempotencyKey === where.idempotencyKey) ?? null,
      findFirst: async ({ where }: any) => [...accessRows.values()].find((row) => row.walletAddress === where.walletAddress && row.tokenMint === where.tokenMint && row.status === where.status) ?? null,
      create: async ({ data }: any) => {
        const row = { id: `access-${accessRows.size + 1}`, createdAt: new Date(), ...data };
        accessRows.set(row.id, row);
        return row;
      },
      upsert: async ({ where, update, create }: any) => {
        const existing = [...accessRows.values()].find((row) => row.idempotencyKey === where.idempotencyKey);
        const row = { ...(existing ?? { id: `access-${accessRows.size + 1}`, createdAt: new Date(), ...create }), ...update };
        accessRows.set(row.id, row);
        return row;
      }
    },
    communityCreationPayment: {
      rows: paymentRows,
      create: async ({ data }: any) => {
        const row = { id: `payment-${paymentRows.size + 1}`, createdAt: new Date(), ...data };
        paymentRows.set(row.id, row);
        return row;
      },
      upsert: async ({ where, update, create }: any) => {
        const existing = [...paymentRows.values()].find((row) => row.accessId === where.accessId);
        const row = { ...(existing ?? { id: `payment-${paymentRows.size + 1}`, createdAt: new Date(), ...create }), ...update, updatedAt: new Date() };
        paymentRows.set(row.id, row);
        return row;
      }
    },
    whaleGateVerification: {
      rows: whaleRows,
      create: async ({ data }: any) => {
        const row = { id: `whale-${whaleRows.size + 1}`, createdAt: new Date(), ...data };
        whaleRows.set(row.id, row);
        return row;
      },
      upsert: async ({ where, update, create }: any) => {
        const existing = [...whaleRows.values()].find((row) => row.accessId === where.accessId);
        const row = { ...(existing ?? { id: `whale-${whaleRows.size + 1}`, createdAt: new Date(), ...create }), ...update, updatedAt: new Date() };
        whaleRows.set(row.id, row);
        return row;
      }
    },
    studioSubscription: {
      rows: subscriptionRows,
      findFirst: async ({ where }: any) => [...subscriptionRows.values()].find((row) => row.walletAddress === where.walletAddress && row.status === where.status) ?? null
    },
    creatorAccessPass: {
      rows: passRows,
      findFirst: async ({ where }: any) =>
        [...passRows.values()].find((row) => row.walletAddress === where.walletAddress && row.status === where.status && (!where.type?.in || where.type.in.includes(row.type))) ?? null
    },
    vaultStrategy: {
      rows: strategyRows,
      count: async () => [...strategyRows.values()].filter((row) => row.status === "ACTIVE").length,
      upsert: async ({ where, update, create }: any) => {
        const row = { ...(strategyRows.get(where.collectionId) ?? { id: `strategy-${strategyRows.size + 1}`, createdAt: new Date(), ...create }), ...update, updatedAt: new Date() };
        strategyRows.set(where.collectionId, row);
        collectionRows.get(where.collectionId).vaultStrategy = row;
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = { ...strategyRows.get(where.collectionId), ...data, updatedAt: new Date() };
        strategyRows.set(where.collectionId, row);
        collectionRows.get(where.collectionId).vaultStrategy = row;
        return row;
      }
    },
    communityTreasuryBucket: {
      rows: bucketRows,
      findUnique: async ({ where }: any) => bucketRows.get(`${where.collectionId_bucket.collectionId}:${where.collectionId_bucket.bucket}`) ?? null
    },
    strategyExecutionJob: {
      rows: jobRows,
      findUnique: async ({ where }: any) => [...jobRows.values()].find((row) => row.idempotencyKey === where.idempotencyKey) ?? null,
      findMany: async ({ where }: any) => [...jobRows.values()].filter((row) => row.collectionId === where.collectionId),
      aggregate: async ({ where }: any) => {
        const sum = [...jobRows.values()]
          .filter((row) => row.strategyId === where.strategyId && where.status.in.includes(row.status))
          .reduce((total, row) => total + BigInt(String(row.inputAmount ?? 0)), 0n);
        return { _sum: { inputAmount: sum.toString() } };
      },
      create: async ({ data }: any) => {
        const row = { id: `job-${++sequence}`, createdAt: new Date(), ...data };
        jobRows.set(row.id, row);
        return row;
      }
    },
    strategyEventLog: {
      rows: eventRows,
      create: async ({ data }: any) => {
        const row = { id: `event-${eventRows.length + 1}`, createdAt: new Date(), ...data };
        eventRows.push(row);
        return row;
      },
      findMany: async ({ where }: any) => eventRows.filter((row) => row.collectionId === where.collectionId)
    },
    $transaction: async (fn: any) => fn({
      collection: {
        create: async ({ data }: any) => {
          const row = { id: `collection-${collectionRows.size + 1}`, createdAt: new Date(), updatedAt: new Date(), creator: { walletAddress: "creator-wallet" }, token: [...tokenRows.values()].find((token) => token.id === data.tokenId), ...data };
          collectionRows.set(row.id, row);
          return row;
        }
      },
      reserveVault: db.reserveVault,
      communityCreationAccess: db.communityCreationAccess,
      tokenCommunity: db.tokenCommunity,
      communityCreationPayment: db.communityCreationPayment,
      whaleGateVerification: db.whaleGateVerification
    }),
    seedCollection: (id: string, creatorWallet: string) => {
      const row = {
        id,
        slug: id,
        tokenId: `token-${id}`,
        token: { mint: `mint-${id}`, symbol: "TOK", liquidityUsd: "100000" },
        creator: { walletAddress: creatorWallet },
        emergencyFlag: false,
        reserveVault: { status: "ACTIVE", reserveRatioBps: 10000, availableBacking: "100000", totalLocked: "100000" }
      };
      collectionRows.set(id, row);
      return row;
    }
  };
  return db;
}

function hydrateCollection(row: any, db: any, _include?: any) {
  if (!row) return null;
  return {
    ...row,
    token: row.token ?? { mint: "mint", symbol: "TOK", liquidityUsd: "100000" },
    creator: row.creator ?? { walletAddress: "creator-wallet" },
    reserveVault: row.reserveVault ?? null,
    vaultStrategy: db.vaultStrategy.rows.get(row.id) ?? row.vaultStrategy ?? null
  };
}

function scan(mint: string) {
  return {
    mint,
    symbol: mint.slice(0, 4).toUpperCase(),
    name: `${mint.slice(0, 4)} Token`,
    description: "Token community",
    decimals: 9,
    provider: "helius" as const,
    indexed: true,
    riskNotes: [],
    ageHours: 24,
    liquidityUsd: 100000,
    marketCapUsd: 1000000,
    holders: 1000,
    volume24hUsd: 50000,
    riskScore: 80,
    activeVolume: true,
    reasons: []
  };
}

function solana(options: { paymentVerified?: boolean; whaleSufficient?: boolean }) {
  return {
    verifySolPayment: async () => ({
      verificationAvailable: true,
      verified: Boolean(options.paymentVerified),
      message: options.paymentVerified ? "verified" : "not verified",
      issues: options.paymentVerified ? [] : ["missing payment"]
    }),
    verifyWalletTokenBalance: async () => ({
      verificationAvailable: true,
      sufficient: Boolean(options.whaleSufficient),
      balance: options.whaleSufficient ? "1000000" : "0",
      tokenAccount: "ata",
      issues: options.whaleSufficient ? [] : ["balance too low"]
    })
  };
}

async function withEnv<T>(overrides: Record<string, string>, run: () => T | Promise<T>) {
  const previous = new Map(Object.keys(overrides).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(overrides)) process.env[key] = value;
    return await run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
