import assert from "node:assert/strict";
import { TokenScannerService } from "./token-scanner.service";
import { getLastHeliusErrorCode, heliusRpcUrlForNetwork, normalizeHeliusConfig } from "./helius-config";

async function run() {
  keyOnlyEnv();
  fullUrlEnv();
  preventsDoubleApiKey();
  detectsNetworkMismatch();
  await mapsInvalidKey();
  await supportsFallbackMetadataPath();
  console.log("helius-config tests passed");
}

function keyOnlyEnv() {
  const config = normalizeHeliusConfig({ HELIUS_API_KEY: "key-only", NEXT_PUBLIC_SOLANA_NETWORK: "devnet" } as NodeJS.ProcessEnv);
  assert.equal(config.heliusApiKey, "key-only");
  assert.equal(config.heliusKeySource, "key-only");
  assert.equal(config.network, "devnet");
  assert.equal(config.heliusRpcUrl, "https://devnet.helius-rpc.com/?api-key=key-only");
  assert.equal(config.errorCode, undefined);
}

function fullUrlEnv() {
  const config = normalizeHeliusConfig({ HELIUS_API_KEY: "https://devnet.helius-rpc.com/?api-key=url-key" } as NodeJS.ProcessEnv);
  assert.equal(config.heliusApiKey, "url-key");
  assert.equal(config.heliusKeySource, "extracted-from-url");
  assert.equal(config.network, "devnet");
  assert.equal(config.warnings.includes("HELIUS_API_KEY should contain key only; extracted api-key from URL"), true);
}

function preventsDoubleApiKey() {
  const url = heliusRpcUrlForNetwork("mainnet", "already?api-key=inside");
  assert.equal(new URL(url).searchParams.getAll("api-key").length, 1);
  assert.equal(url.includes("?api-key="), true);
  assert.equal(url.includes("?api-key=https%3A"), false);
}

function detectsNetworkMismatch() {
  const config = normalizeHeliusConfig({
    HELIUS_RPC_URL: "https://devnet.helius-rpc.com/?api-key=url-key",
    SOLANA_CLUSTER: "mainnet-beta"
  } as NodeJS.ProcessEnv);
  assert.equal(config.errorCode, "NETWORK_MISMATCH_DEVNET_MAINNET");
}

async function mapsInvalidKey() {
  const restore = mockFetch(async () => new Response("no", { status: 401 }));
  try {
    const service = new TokenScannerService({} as never) as any;
    await assert.rejects(
      () => service.fetchHeliusAsset("So11111111111111111111111111111111111111112", normalizeHeliusConfig({ HELIUS_API_KEY: "bad-key" } as NodeJS.ProcessEnv)),
      (error: any) => error.getResponse().code === "HELIUS_AUTH_FAILED"
    );
    assert.equal(getLastHeliusErrorCode(), "HELIUS_AUTH_FAILED");
  } finally {
    restore();
  }
}

async function supportsFallbackMetadataPath() {
  let calls = 0;
  const restore = mockFetch(async (input) => {
    calls += 1;
    const url = String(input);
    if (url.includes("helius-rpc.com")) {
      return Response.json({ error: { code: -32000, message: "asset not indexed" } });
    }
    if (url.includes("dexscreener.com")) {
      return Response.json({
        pairs: [{
          chainId: "solana",
          baseToken: { address: "So11111111111111111111111111111111111111112", name: "Fallback Token", symbol: "FBK" },
          url: "https://dexscreener.com/solana/fallback",
          info: { imageUrl: "https://example.com/logo.png", socials: [{ type: "twitter", url: "https://x.com/fallback" }] },
          liquidity: { usd: 123 },
          marketCap: 456,
          volume: { h24: 789 }
        }]
      });
    }
    return Response.json({ name: "Jupiter Fallback", symbol: "JUPF", logoURI: "https://example.com/jup.png" });
  });
  try {
    const service = new TokenScannerService({} as never) as any;
    const result = await service.fetchHeliusAssetWithFallback("So11111111111111111111111111111111111111112", normalizeHeliusConfig({ HELIUS_API_KEY: "key-only" } as NodeJS.ProcessEnv));
    assert.equal(result.asset, null);
    assert.match(result.warning, /TOKEN_NOT_INDEXED/);
    const dex = await service.fetchDexScreenerMetadata("So11111111111111111111111111111111111111112");
    assert.equal(dex.name, "Fallback Token");
    assert.equal(dex.symbol, "FBK");
    assert.equal(dex.liquidityUsd, 123);
    assert.equal(calls >= 3, true);
  } finally {
    restore();
  }
}

function mockFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
