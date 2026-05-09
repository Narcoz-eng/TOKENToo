import assert from "node:assert/strict";
import { TokenScannerService } from "./token-scanner.service";

const mints = {
  sparse: "So11111111111111111111111111111111111111112",
  indexed: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  missing: "DezXAZ8z7PnrnRJjz3WsWRq5nGdP3VZ1StSS9wXV6VSh",
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  mainnet: "Es9vMFrzaCERmJfrF4H2FYD4wH7VEg7A3RBWhQ5YM5Q"
};

async function run() {
  process.env.HELIUS_API_KEY = process.env.HELIUS_API_KEY || "test-key";
  await verifiesSparseMetadata();
  await verifiesFullyIndexedMetadata();
  await verifiesMissingMetadataStillBuildsIdentity();
  await verifiesDevnetAndMainnetInputs();
  await verifiesDisconnectedDbWarning();
  await verifiesInvalidTlsWarning();
  console.log("token-scanner tests passed");
}

async function verifiesSparseMetadata() {
  const scanner = scannerWith({
    helius: { asset: null, warning: "Helius TOKEN_NOT_INDEXED: Asset Not Found" },
    rpc: { decimals: 6, supply: "1000000000" },
    dex: {
      provider: "dexscreener",
      name: "Hantavirus",
      symbol: "HANTA",
      imageUri: "https://cdn.example/hanta-logo.png",
      socialLinks: { twitter: "https://x.com/hanta" },
      liquidityUsd: 12000,
      volume24hUsd: 800
    }
  });
  const scan = await scanner.scanToken(mints.sparse);
  assert.equal(scan.name, "Hantavirus");
  assert.equal(scan.indexed, false);
  assert.ok((scan.fallbackConfidence ?? 0) > 35);
  assert.ok((scan.inferredIdentityConfidence ?? 0) > 35);
  assert.ok(scan.riskNotes.includes("market_data_enriched_by_fallback_provider"));
  assert.ok(!scan.riskNotes.includes("market_data_not_scanned_no_liquidity_holder_or_volume_claims"));
  assert.ok(String(scan.description).includes("medical contamination"));
}

async function verifiesFullyIndexedMetadata() {
  const scanner = scannerWith({
    helius: {
      asset: {
        content: {
          json_uri: "https://metadata.example/usdc.json",
          metadata: { name: "USD Coin", symbol: "USDC", description: "Stablecoin metadata", image: "https://metadata.example/usdc.png" },
          links: { external_url: "https://circle.com" }
        },
        token_info: { decimals: 6, supply: "1000000" }
      }
    },
    offchain: {
      name: "USD Coin",
      symbol: "USDC",
      description: "Stablecoin metadata with https://x.com/circle social context.",
      image: "https://metadata.example/usdc.png",
      external_url: "https://circle.com"
    },
    rpc: { decimals: 6, supply: "1000000" }
  });
  const scan = await scanner.scanToken(mints.indexed);
  assert.equal(scan.indexed, true);
  assert.ok((scan.metadataConfidence ?? 0) >= 80);
  assert.equal(scan.metadataUri, "https://metadata.example/usdc.json");
  assert.ok(!scan.riskNotes.includes("missing_metadata_uri"));
  assert.equal(scan.socialLinks?.twitter, "https://x.com/circle");
}

async function verifiesMissingMetadataStillBuildsIdentity() {
  const scanner = scannerWith({
    helius: { asset: null, warning: "Helius TOKEN_NOT_INDEXED: Asset Not Found" },
    rpc: { warning: "RPC unavailable" }
  });
  const scan = await scanner.scanToken(mints.missing);
  assert.match(scan.name, /^Mint /);
  assert.equal(scan.symbol, mints.missing.slice(0, 4).toUpperCase());
  assert.ok(scan.description);
  assert.ok(scan.riskNotes.includes("rpc_supply_unavailable_supply_claims_disabled"));
  assert.ok(!scan.persistenceWarning);
}

async function verifiesDevnetAndMainnetInputs() {
  const devnet = await scannerWith({ helius: { asset: null, warning: "TOKEN_NOT_INDEXED" }, rpc: { decimals: 6, supply: "42" } }).scanToken(mints.devnet);
  const mainnet = await scannerWith({ helius: { asset: null, warning: "TOKEN_NOT_INDEXED" }, rpc: { decimals: 6, supply: "42" } }).scanToken(mints.mainnet);
  assert.equal(devnet.decimals, 6);
  assert.equal(mainnet.decimals, 6);
}

async function verifiesDisconnectedDbWarning() {
  const scanner = scannerWith({ helius: { asset: null, warning: "TOKEN_NOT_INDEXED" }, rpc: { decimals: 6, supply: "42" }, dbError: new Error("Can't reach database server at db.example:5432") });
  const scan = await scanner.scanToken(mints.sparse);
  assert.match(scan.persistenceWarning ?? "", /could not be persisted/i);
  assert.doesNotMatch(scan.persistenceWarning ?? "", /Invalid `prisma/i);
}

async function verifiesInvalidTlsWarning() {
  const scanner = scannerWith({ helius: { asset: null, warning: "TOKEN_NOT_INDEXED" }, rpc: { decimals: 6, supply: "42" }, dbError: new Error("Invalid `prisma.token.upsert()` invocation:\nError opening a TLS connection:\nself-signed certificate in certificate chain") });
  const scan = await scanner.scanToken(mints.sparse);
  assert.match(scan.persistenceWarning ?? "", /TLS certificate could not be verified/);
  assert.doesNotMatch(scan.persistenceWarning ?? "", /prisma\.token\.upsert/);
}

function scannerWith(input: {
  helius: { asset: unknown; warning?: string };
  offchain?: Record<string, unknown>;
  rpc?: Record<string, unknown>;
  dex?: Record<string, unknown>;
  dbError?: Error;
}) {
  const prisma = {
    token: {
      upsert: async () => {
        if (input.dbError) throw input.dbError;
        return { id: "token_test" };
      }
    },
    tokenMetadataRecord: {
      upsert: async () => {
        if (input.dbError) throw input.dbError;
        return { id: "metadata_test" };
      }
    }
  };
  const scanner = new TokenScannerService(prisma as never);
  const mutable = scanner as any;
  mutable.fetchRpcMint = async () => input.rpc ?? { decimals: 6, supply: "1" };
  mutable.fetchHeliusAssetWithFallback = async () => input.helius;
  mutable.fetchOffchainJson = async () => ({ data: input.offchain ?? null });
  mutable.fetchDexScreenerMetadata = async () => input.dex ?? null;
  mutable.fetchDexScreenerProfile = async () => null;
  mutable.fetchDexScreenerSearch = async () => null;
  mutable.fetchJupiterMetadata = async () => null;
  mutable.fetchSolanaTokenMetadata = async () => null;
  return scanner;
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
