import { ProtocolAccountingService } from "./protocol-accounting.service";
import { ProtocolService } from "./protocol.service";
import { ProviderCostGuard } from "../generator/provider-abstractions";
import { StudioImageProviderService } from "../generator/studio-image-provider.service";
import type { GeneratedStyleProfile, StyleBiblePlan } from "../generator/generator.types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  await reserveIsolationTest();
  await liveOwnerTruthTest();
  await paidAiGuardTest();
  providerCostGuardTest();
  console.log("PASS protocol reserve isolation");
  console.log("PASS protocol live owner truth");
  console.log("PASS no paid AI without explicit global guard");
  console.log("PASS provider cost guard");
}

async function reserveIsolationTest() {
  const db = fakeAccountingDb();
  const accounting = new ProtocolAccountingService(db as any);
  await accounting.recalculateReserve("collection-a");
  await accounting.recalculateReserve("collection-b");
  assert(db.reserveVault.rows.get("collection-a").totalLocked === "300", "collection A reserve total should not include collection B");
  assert(db.reserveVault.rows.get("collection-b").totalLocked === "900", "collection B reserve total should not include collection A");
  assert(db.reserveVault.rows.get("collection-a").availableBacking === "200", "collection A redeemed amount should reduce available backing");
  assert(db.reserveVault.rows.get("collection-b").availableBacking === "900", "collection B backing should remain isolated");
}

async function liveOwnerTruthTest() {
  const updates: Array<{ id: string; ownerUserId: string }> = [];
  const fakePrisma = {
    user: {
      upsert: async ({ where }: any) => ({ id: `user:${where.walletAddress}`, walletAddress: where.walletAddress })
    },
    vaultNFT: {
      update: async ({ where, data }: any) => {
        updates.push({ id: where.id, ownerUserId: data.ownerUserId });
        return {};
      }
    }
  };
  const fakeAccounting = { syncVaultPosition: async () => ({}) };
  const nft = {
    id: "vault-1",
    mint: "nft-mint",
    owner: { walletAddress: "old-owner" },
    collection: { collectionAssetAddress: "collection-asset" }
  };
  const protocol = new ProtocolService(fakePrisma as any, {
    getCoreAssetProof: async () => ({
      verificationAvailable: true,
      currentOwner: "new-owner",
      collectionMatches: true,
      issues: []
    })
  } as any, fakeAccounting as any);

  let rejected = false;
  try {
    await protocol.assertCurrentOwner({ nft, walletAddress: "old-owner" });
  } catch {
    rejected = true;
  }
  assert(rejected, "stale DB owner must not pass when live chain owner is different");
  const accepted = await protocol.assertCurrentOwner({ nft, walletAddress: "new-owner" });
  assert(accepted.verificationAvailable, "live owner verification should be used");
  assert(updates[0]?.ownerUserId === "user:new-owner", "local owner snapshot should refresh to live owner");
}

async function paidAiGuardTest() {
  const previous = snapshotEnv(["GEMINI_API_KEY", "IMAGEN_API_KEY", "STUDIO_IMAGE_PROVIDER", "ENABLE_STUDIO_IMAGE_GENERATION", "ENABLE_AI_IMAGE_GENERATION", "ENABLE_GEMINI_TEXT_PROMPTS", "PAID_AI_GENERATION_ENABLED", "DEV_DISABLE_PAID_AI"]);
  try {
    process.env.GEMINI_API_KEY = "test-google-key";
    process.env.STUDIO_IMAGE_PROVIDER = "imagen";
    process.env.ENABLE_STUDIO_IMAGE_GENERATION = "true";
    process.env.ENABLE_GEMINI_TEXT_PROMPTS = "false";
    process.env.PAID_AI_GENERATION_ENABLED = "false";
    process.env.DEV_DISABLE_PAID_AI = "true";
    const blockedImagen = fakeImagenProvider();
    const blocked = await new StudioImageProviderService(blockedImagen as any).generateStudioAssets(studioInput());
    assert(blockedImagen.calls.length === 0, "normal Studio placeholder flow must not call Imagen when paid AI is disabled");
    assert(blocked.summary.noBillableGenerationAttempted, "blocked Studio flow must report no billable generation");

    process.env.PAID_AI_GENERATION_ENABLED = "true";
    process.env.DEV_DISABLE_PAID_AI = "false";
    const paidImagen = fakeImagenProvider();
    const paid = await new StudioImageProviderService(paidImagen as any).generateStudioAssets(studioInput());
    assert(paidImagen.calls.length === 5, "paid Studio generation should only run after explicit global paid guard is enabled");
    assert(paid.summary.estimatedCostUsd > 0, "paid Studio generation should expose estimated cost");
  } finally {
    restoreEnv(previous);
  }
}

function providerCostGuardTest() {
  const guard = new ProviderCostGuard({
    APP_ENV: "development",
    PAID_AI_GENERATION_ENABLED: "false",
    DEV_DISABLE_PAID_AI: "true"
  });
  const free = guard.decide({ provider: "local-component-preview", kind: "local_component_preview", estimatedCostUsd: 0 });
  assert(free.allowed && free.noBillableGenerationAttempted, "local component previews must always be free and allowed");

  const blocked = guard.decide({ provider: "imagen", kind: "premium_image", estimatedCostUsd: 0.04, explicitUserAction: true });
  assert(!blocked.allowed, "paid provider calls must be blocked when the global paid AI guard is disabled");
  assert(blocked.noBillableGenerationAttempted, "blocked paid calls must report no billable generation attempted");

  const allowed = new ProviderCostGuard({
    APP_ENV: "production",
    PAID_AI_GENERATION_ENABLED: "true",
    DEV_DISABLE_PAID_AI: "false"
  }).decide({ provider: "imagen", kind: "premium_image", estimatedCostUsd: 0.04, explicitUserAction: true });
  assert(allowed.allowed && !allowed.noBillableGenerationAttempted, "explicit paid provider calls should pass only after paid AI is enabled");
}

function fakeAccountingDb() {
  const collections = new Map([
    ["collection-a", { id: "collection-a", tokenVaultPda: "reserve-a", emergencyFlag: false, status: "ACTIVE", token: { mint: "mint-a" } }],
    ["collection-b", { id: "collection-b", tokenVaultPda: "reserve-b", emergencyFlag: false, status: "ACTIVE", token: { mint: "mint-b" } }]
  ]);
  const nfts = [
    { collectionId: "collection-a", status: "LOCKED", amount: "200" },
    { collectionId: "collection-a", status: "REDEEMED", amount: "100" },
    { collectionId: "collection-b", status: "LOCKED", amount: "900" }
  ];
  const rows = new Map<string, any>();
  return {
    collection: { findUnique: async ({ where }: any) => collections.get(where.id) },
    vaultNFT: {
      aggregate: async ({ where }: any) => {
        const total = nfts
          .filter((nft) => nft.collectionId === where.collectionId)
          .filter((nft) => !where.status || (where.status.not ? nft.status !== where.status.not : nft.status === where.status))
          .reduce((sum, nft) => sum + BigInt(nft.amount), 0n);
        return { _sum: { amount: total.toString() } };
      }
    },
    reserveVault: {
      rows,
      upsert: async ({ where, update, create }: any) => {
        const row = { ...(rows.get(where.collectionId) ?? create), ...update };
        rows.set(where.collectionId, row);
        return row;
      }
    }
  };
}

function studioInput() {
  const style = {
    collection: "PHEW TEST",
    colors: ["#baff00", "#16d7d2"],
    traitLanguage: ["vault"],
    brandDna: { mintAddress: "mint", tokenSymbol: "PHEW" },
    creativeUniverse: { creativeDna: { artStyle: "protocol" } }
  } as unknown as GeneratedStyleProfile;
  const promptPack = {
    styleBibleImage: "style bible",
    traitCatalogSheet: "trait catalog",
    rarityLadder: "rarity ladder",
    moodSheet: "mood sheet",
    layerBreakdown: "layer breakdown"
  };
  return {
    tokenMint: "mint",
    style,
    plan: { promptPack, artTeam: { id: "DEGENLAB" } } as unknown as StyleBiblePlan,
    deterministicAssets: [],
    styleVersion: 1,
    rarityVersion: "test"
  };
}

function fakeImagenProvider() {
  const calls: any[] = [];
  return {
    calls,
    generateStudioBible: async (input: any) => {
      calls.push(input);
      return { uri: `data:image/png;base64,${Buffer.from(input.generationType).toString("base64")}` };
    }
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
