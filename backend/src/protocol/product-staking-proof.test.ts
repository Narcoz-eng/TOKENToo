import { BadRequestException } from "@nestjs/common";
import { ProductDataService } from "../product-data/product-data.service";
import { ProtocolService } from "./protocol.service";
import { StakingService } from "../staking/staking.service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  await mintEligibilityGateTest();
  await stakingEligibilityAndMutationTest();
  await productionStakingFailClosedTest();
  await proofOwnerRefreshSnapshotTest();
  console.log("PASS product mint eligibility gates");
  console.log("PASS staking eligibility and mutation path");
  console.log("PASS production staking fail-closed path");
  console.log("PASS proof owner refresh stays coherent");
}

async function mintEligibilityGateTest() {
  const db = productDb();
  const service = new ProductDataService(db as any, productSolanaStub() as any);
  const collections = await service.collections();
  const draft = collections.find((collection: any) => collection.id === "draft-token");
  const loosePremium = collections.find((collection: any) => collection.id === "loose-premium");
  const eligible = collections.find((collection: any) => collection.id === "ready-token");
  assert(draft?.mintEligible === false, "Draft collection must not be mint eligible.");
  assert(loosePremium?.qualityTier === "Premium", "Fixture should prove qualityTier alone is too loose.");
  assert(loosePremium?.mintEligible === false, "Identity lock without approved profile gates must not be mint eligible.");
  assert(eligible?.mintEligible === true, "Confirmed launch plus approved profile gates should be mint eligible.");
}

async function productionStakingFailClosedTest() {
  const db = stakingDb();
  const staking = new StakingService(
    db as any,
    { assertCurrentOwner: async () => ({ verificationAvailable: false, issues: [] }) } as any,
    { syncVaultPosition: async () => ({}) } as any
  );
  const previous = snapshotEnv(["ENABLE_LOCAL_STAKING_ACCOUNTING", "ENABLE_PRODUCTION_STAKING", "APP_ENV", "NODE_ENV"]);
  try {
    process.env.ENABLE_LOCAL_STAKING_ACCOUNTING = "true";
    process.env.ENABLE_PRODUCTION_STAKING = "true";
    process.env.APP_ENV = "production";
    process.env.NODE_ENV = "production";
    let rejected = false;
    try {
      await staking.createStakeIntent({ walletAddress: "owner-wallet", vaultNftId: "vault-live", idempotencyKey: "stake-production" });
    } catch (error) {
      rejected = error instanceof BadRequestException && /VaultPosition PDA|Production staking/i.test(error.message);
    }
    assert(rejected, "Production staking must fail closed without live custody/VaultPosition verification.");
  } finally {
    restoreEnv(previous);
  }
}

async function stakingEligibilityAndMutationTest() {
  const db = stakingDb();
  const product = new ProductDataService(db as any, productSolanaStub() as any);
  const initial = await product.staking("owner-wallet");
  assert(initial.eligibleVaults.length === 1, "Only the confirmed live vault should appear as stake eligible.");
  assert(initial.eligibleVaults[0].mint === "live-nft", "Mock, pending, and already-staked vaults must be excluded.");

  const staking = new StakingService(
    db as any,
    { assertCurrentOwner: async () => ({ verificationAvailable: false, issues: [] }) } as any,
    { syncVaultPosition: async () => ({}) } as any
  );

  const previous = snapshotEnv(["ENABLE_LOCAL_STAKING_ACCOUNTING", "APP_ENV", "NODE_ENV"]);
  try {
    process.env.ENABLE_LOCAL_STAKING_ACCOUNTING = "true";
    process.env.APP_ENV = "development";
    process.env.NODE_ENV = "development";

    const staked = await staking.createStakeIntent({ walletAddress: "owner-wallet", vaultNftId: "vault-live", idempotencyKey: "stake-live" });
    assert(staked.position?.status === "ACTIVE", "Stake intent should create an active position when local accounting is enabled.");
    assert(db.vaults.get("vault-live").status === "STAKED", "Stake intent should mark the vault staked.");

    const afterStake = await product.staking("owner-wallet");
    assert(afterStake.eligibleVaults.length === 0, "Staked vault must leave the eligible list.");
    assert(afterStake.positions.length === 1, "Real staking position should be returned from persisted state.");

    assert(staked.position?.id, "Stake intent should return a persisted position id.");
    const unstaked = await staking.createUnstakeIntent({ walletAddress: "owner-wallet", stakingPositionId: staked.position.id, idempotencyKey: "unstake-live" });
    assert(unstaked.position?.status === "UNSTAKED", "Unstake intent should close the active staking position.");
    assert(db.vaults.get("vault-live").status === "REDEEMABLE", "Unlocked vault should become redeemable after unstake.");

    let fakeRejected = false;
    try {
      await staking.createStakeIntent({ walletAddress: "owner-wallet", vaultNftId: "vault-mock", idempotencyKey: "stake-mock" });
    } catch (error) {
      fakeRejected = error instanceof BadRequestException;
    }
    assert(fakeRejected, "Mock Vault NFT mints must not be stakeable.");
  } finally {
    restoreEnv(previous);
  }
}

async function proofOwnerRefreshSnapshotTest() {
  const db = proofDb();
  const protocol = new ProtocolService(
    db as any,
    {
      getCoreAssetProof: async () => ({
        verificationAvailable: true,
        currentOwner: "new-owner",
        collectionMatches: true,
        asset: {},
        productionReady: true,
        issues: []
      })
    } as any,
    { syncVaultPosition: async () => ({}) } as any
  );
  const result = await protocol.vaultProof("live-nft");
  assert(result.proof.currentOwner === "new-owner", "Proof should report the live owner.");
  assert(result.proof.dbOwnerSnapshot === "new-owner", "Proof should report the refreshed DB owner snapshot.");
  assert(result.proof.verificationResult.ownerMatchesDb === true, "Owner refresh should not leave proof in a stale mismatch state.");
}

function productDb() {
  const rows = [
    collectionFixture({ slug: "draft-token", launchStatus: "DRAFT", identityLockedAt: null, approvedGenerationRunId: null, styleProfileVersion: null }),
    collectionFixture({ slug: "loose-premium", launchStatus: "CONFIRMED", identityLockedAt: new Date(), approvedGenerationRunId: null, styleProfileVersion: null }),
    collectionFixture({ slug: "ready-token", launchStatus: "CONFIRMED", identityLockedAt: new Date(), approvedGenerationRunId: "11111111-1111-4111-8111-111111111111", styleProfileVersion: 1 })
  ];
  return {
    collection: {
      findMany: async () => rows
    }
  };
}

function productSolanaStub() {
  return {
    deriveCommunityAddresses: () => ({
      collectionProfile: "N/A",
      feeVault: "N/A",
      reserveVaultTokenAccount: "N/A"
    })
  };
}

function stakingDb() {
  const owner = { id: "user-owner", walletAddress: "owner-wallet" };
  const liveCollection = collectionFixture({ slug: "ready-token", launchStatus: "CONFIRMED", identityLockedAt: new Date(), approvedGenerationRunId: "11111111-1111-4111-8111-111111111111", styleProfileVersion: 1 });
  const vaults = new Map<string, any>([
    ["vault-live", vaultFixture("vault-live", "live-nft", "live-position", "LOCKED", liveCollection, owner)],
    ["vault-mock", vaultFixture("vault-mock", "mock_nft_1", "mock_position_1", "LOCKED", liveCollection, owner)],
    ["vault-pending", vaultFixture("vault-pending", "pending_nft_1", "pending_position_1", "LOCKED", liveCollection, owner)],
    ["vault-staked", vaultFixture("vault-staked", "staked-nft", "staked-position", "STAKED", liveCollection, owner)]
  ]);
  const positions = new Map<string, any>();
  return {
    vaults,
    user: {
      findUnique: async ({ where }: any) => (where.walletAddress === owner.walletAddress ? owner : null),
      upsert: async () => owner
    },
    stakingPosition: {
      findMany: async ({ where }: any) =>
        [...positions.values()].filter((position) => position.userId === where.userId).map((position) => ({
          ...position,
          vaultNft: vaults.get(position.vaultNftId),
          collection: vaults.get(position.vaultNftId).collection
        })),
      findUnique: async ({ where }: any) => {
        const position = positions.get(where.id);
        return position ? { ...position, user: owner, vaultNft: { ...vaults.get(position.vaultNftId), owner } } : null;
      }
    },
    vaultNFT: {
      findMany: async ({ where }: any) =>
        [...vaults.values()]
          .filter((vault) => vault.ownerUserId === where.ownerUserId)
          .filter((vault) => !vault.redeemedAt)
          .filter((vault) => where.status.in.includes(vault.status)),
      findUnique: async ({ where }: any) => {
        const vault = vaults.get(where.id);
        return vault ? { ...vault, owner, stakingPositions: [...positions.values()].filter((position) => position.vaultNftId === vault.id && position.status === "ACTIVE") } : null;
      },
      update: async ({ where, data }: any) => {
        const next = { ...vaults.get(where.id), ...data };
        vaults.set(where.id, next);
        return next;
      }
    },
    $transaction: async (fn: any) =>
      fn({
        stakingPosition: {
          create: async ({ data }: any) => {
            const row = { id: `position-${positions.size + 1}`, stakedAt: new Date(), ...data };
            positions.set(row.id, row);
            return row;
          },
          update: async ({ where, data }: any) => {
            const row = { ...positions.get(where.id), ...data };
            positions.set(where.id, row);
            return row;
          }
        },
        vaultNFT: {
          update: async ({ where, data }: any) => {
            const next = { ...vaults.get(where.id), ...data };
            vaults.set(where.id, next);
            return next;
          }
        }
      })
  };
}

function proofDb() {
  const oldOwner = { id: "user-old", walletAddress: "old-owner" };
  const collection = collectionFixture({ slug: "ready-token", launchStatus: "CONFIRMED", identityLockedAt: new Date(), approvedGenerationRunId: "11111111-1111-4111-8111-111111111111", styleProfileVersion: 1 });
  const nft = {
    ...vaultFixture("vault-live", "live-nft", "live-position", "LOCKED", collection, oldOwner),
    vaultPosition: { ownerWalletSnapshot: "old-owner", lastVerifiedAt: null },
    stakingPositions: []
  };
  return {
    user: {
      upsert: async ({ where }: any) => ({ id: `user-${where.walletAddress}`, walletAddress: where.walletAddress })
    },
    vaultNFT: {
      findFirst: async () => ({ ...nft, owner: oldOwner, collection }),
      findUnique: async () => ({ ...nft, owner: oldOwner, collection }),
      update: async ({ data }: any) => {
        nft.ownerUserId = data.ownerUserId;
        return nft;
      }
    }
  };
}

function collectionFixture(overrides: Partial<any>) {
  const slug = overrides.slug ?? "ready-token";
  return {
    id: `collection-${slug}`,
    slug,
    name: `${slug} Vaults`,
    tokenId: `token-${slug}`,
    token: { id: `token-${slug}`, mint: `${slug}-mint`, symbol: slug.slice(0, 4).toUpperCase(), riskScore: 90, holders: 10 },
    creator: { walletAddress: "creator-wallet" },
    collectionAssetAddress: "collection-asset",
    tokenVaultPda: "reserve-pda",
    reserveVault: {
      reserveVaultPda: "reserve-pda",
      status: "ACTIVE",
      reserveRatioBps: 10000,
      totalLocked: "0",
      availableBacking: "0",
      totalStaked: "0",
      totalRedeemed: "0"
    },
    vaultStrategy: null,
    colorPalette: ["#7cff00", "#16d7d2", "#031017"],
    mascot: "Protocol Mascot",
    theme: "token civilization",
    vibe: "token-backed community",
    roleNames: ["Holder"],
    rarityTable: {},
    status: "ACTIVE",
    emergencyFlag: false,
    instantSellDisabled: false,
    communityLevel: 1,
    communityXp: 0,
    floorPriceSol: 0,
    volume24hSol: 0,
    vaultNfts: [],
    _count: { vaultNfts: 0, sales: 0 },
    ...overrides
  };
}

function vaultFixture(id: string, mint: string, positionPda: string, status: string, collection: any, owner: any) {
  return {
    id,
    collectionId: collection.id,
    tokenId: collection.token.id,
    ownerUserId: owner.id,
    owner,
    collection,
    mint,
    metadataUri: "ipfs://metadata",
    imageUri: "ipfs://image",
    positionPda,
    amount: "100",
    lockDurationDays: 0,
    unlocksAt: new Date(Date.now() - 1000),
    redeemedAt: null,
    tier: "Vault Raider",
    traits: {},
    redeemable: status === "REDEEMABLE",
    status,
    stakingPositions: []
  };
}

function snapshotEnv(keys: string[]) {
  return new Map(keys.map((key) => [key, process.env[key]]));
}

function restoreEnv(snapshot: Map<string, string | undefined>) {
  for (const [key, value] of snapshot.entries()) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
