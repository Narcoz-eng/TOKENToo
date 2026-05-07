import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { AssetStorageService } from "../generator/asset-storage.service";
import { SolanaTransactionAdapterService } from "../vault-mint/solana-transaction-adapter.service";
import { requiredDevnetEnv, validateDevnetEnv } from "./devnet-env";

const PLACEHOLDER_PROGRAM_ID = "11111111111111111111111111111111";

type Flags = {
  createToken: boolean;
  mintTestTokens: boolean;
  createCollectionAsset: boolean;
  printEnv: boolean;
};

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  const report: Record<string, unknown> = {
    status: "INCOMPLETE",
    rpcUrl,
    actions: [],
    missing: validateDevnetEnv(),
    warnings: []
  };

  const payer = loadWallet(report);
  await verifyBaseState(connection, report, payer);

  if (flags.createToken) {
    if (!payer) throw new Error("--create-token requires ANCHOR_WALLET pointing to a devnet keypair file.");
    const tokenMint = await createTestToken(connection, payer, process.env.DEVNET_TEST_WALLET_PUBLIC_KEY);
    process.env.DEVNET_TEST_TOKEN_MINT = tokenMint;
    (report.actions as unknown[]).push({ createToken: "ok", DEVNET_TEST_TOKEN_MINT: tokenMint });
  }

  if (flags.mintTestTokens) {
    if (!payer) throw new Error("--mint-test-tokens requires ANCHOR_WALLET pointing to a devnet keypair file.");
    const mint = process.env.DEVNET_TEST_TOKEN_MINT;
    if (!mint) throw new Error("--mint-test-tokens requires DEVNET_TEST_TOKEN_MINT or --create-token.");
    const result = await mintTestTokens(connection, payer, mint, process.env.DEVNET_TEST_WALLET_PUBLIC_KEY);
    (report.actions as unknown[]).push({ mintTestTokens: "ok", ...result });
  }

  if (flags.createCollectionAsset) {
    if (!payer) throw new Error("--create-collection-asset requires ANCHOR_WALLET pointing to a devnet keypair file.");
    const collection = await createCollectionAsset(connection, payer);
    process.env.DEVNET_TEST_COLLECTION_ASSET = collection.collectionAssetAddress;
    (report.actions as unknown[]).push({ createCollectionAsset: "ok", ...collection });
  }

  report.missing = validateDevnetEnv();
  report.status = (report.missing as unknown[]).length ? "INCOMPLETE" : "READY_FOR_E2E";
  report.env = envBlock();
  report.envText = formatEnvBlock(envBlock());
  report.required = requiredDevnetEnv;

  console.log(JSON.stringify(report, null, 2));
}

function parseFlags(args: string[]): Flags {
  return {
    createToken: args.includes("--create-token"),
    mintTestTokens: args.includes("--mint-test-tokens"),
    createCollectionAsset: args.includes("--create-collection-asset"),
    printEnv: args.includes("--print-env")
  };
}

function loadWallet(report: Record<string, unknown>) {
  const walletPath = process.env.ANCHOR_WALLET;
  if (!walletPath) {
    (report.warnings as string[]).push("ANCHOR_WALLET is not set. Resource creation flags require a local devnet keypair.");
    return null;
  }
  const secret = JSON.parse(readFileSync(walletPath, "utf8")) as number[];
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));
  process.env.DEVNET_TEST_WALLET_PUBLIC_KEY ??= keypair.publicKey.toBase58();
  return keypair;
}

async function verifyBaseState(connection: Connection, report: Record<string, unknown>, payer: Keypair | null) {
  const programId = process.env.PROGRAM_ID;
  report.program = {
    PROGRAM_ID: programId ?? null,
    isPlaceholder: !programId || programId === PLACEHOLDER_PROGRAM_ID
  };
  if (payer) {
    const lamports = await connection.getBalance(payer.publicKey, "confirmed");
    report.wallet = {
      publicKey: payer.publicKey.toBase58(),
      sol: lamports / 1_000_000_000,
      funded: lamports > 0
    };
  } else if (process.env.DEVNET_TEST_WALLET_PUBLIC_KEY) {
    const wallet = new PublicKey(process.env.DEVNET_TEST_WALLET_PUBLIC_KEY);
    const lamports = await connection.getBalance(wallet, "confirmed");
    report.wallet = {
      publicKey: wallet.toBase58(),
      sol: lamports / 1_000_000_000,
      funded: lamports > 0
    };
  }
  const version = await connection.getVersion();
  report.rpcVersion = version;
}

async function createTestToken(connection: Connection, payer: Keypair, ownerOverride?: string) {
  const { createMint, getOrCreateAssociatedTokenAccount, mintTo } = await import("@solana/spl-token");
  const owner = ownerOverride ? new PublicKey(ownerOverride) : payer.publicKey;
  const mint = await createMint(connection, payer, payer.publicKey, null, 6);
  const ata = await getOrCreateAssociatedTokenAccount(connection, payer, mint, owner, true);
  await mintTo(connection, payer, mint, ata.address, payer, 1_000_000_000_000n);
  return mint.toBase58();
}

async function mintTestTokens(connection: Connection, payer: Keypair, mintAddress: string, ownerOverride?: string) {
  const { getOrCreateAssociatedTokenAccount, mintTo } = await import("@solana/spl-token");
  const mint = new PublicKey(mintAddress);
  const owner = ownerOverride ? new PublicKey(ownerOverride) : payer.publicKey;
  const ata = await getOrCreateAssociatedTokenAccount(connection, payer, mint, owner, true);
  const signature = await mintTo(connection, payer, mint, ata.address, payer, 1_000_000_000_000n);
  return { DEVNET_TEST_TOKEN_MINT: mint.toBase58(), ata: ata.address.toBase58(), signature };
}

async function createCollectionAsset(connection: Connection, payer: Keypair) {
  if ((process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock") !== "devnet") throw new Error("Set SOLANA_TRANSACTION_PROVIDER=devnet before creating a Core collection asset.");
  if ((process.env.METAPLEX_NFT_STANDARD ?? "METAPLEX_CORE") !== "METAPLEX_CORE") throw new Error("Set METAPLEX_NFT_STANDARD=METAPLEX_CORE.");
  if ((process.env.FINAL_ASSET_STORAGE_PROVIDER ?? "mock") !== "pinata") throw new Error("Set FINAL_ASSET_STORAGE_PROVIDER=pinata.");
  if (!process.env.PINATA_JWT) throw new Error("PINATA_JWT is required to upload collection metadata.");

  const storage = new AssetStorageService();
  const metadataUri = await storage.storeFinalNftMetadata("devnet/phew-test-collection.json", {
    name: "Phew.run Devnet Test Collection",
    description: "Devnet-only Metaplex Core collection asset for Phew.run E2E verification.",
    external_url: process.env.NEXT_PUBLIC_APP_URL,
    properties: { vaultx: { devnetSetup: true, createdAt: new Date().toISOString() } }
  });
  const adapter = new SolanaTransactionAdapterService();
  const built = await adapter.buildCollectionAssetTransaction({
    walletAddress: payer.publicKey.toBase58(),
    name: "Phew.run Devnet Test",
    metadataUri
  });
  if (!built.base64UnsignedTransaction) throw new Error("Collection asset builder did not return a signable devnet transaction.");
  const tx = Transaction.from(Buffer.from(built.base64UnsignedTransaction, "base64"));
  tx.partialSign(payer);
  const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  const confirmation = await connection.confirmTransaction(signature, "confirmed");
  if (confirmation.value.err) throw new Error(`Collection asset transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  return {
    collectionAssetAddress: built.collectionAssetAddress,
    metadataUri,
    signature
  };
}

function envBlock() {
  return {
    PROGRAM_ID: process.env.PROGRAM_ID ?? "",
    SOLANA_TRANSACTION_PROVIDER: "devnet",
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    ANCHOR_PROVIDER_URL: process.env.ANCHOR_PROVIDER_URL ?? process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    DEVNET_TEST_WALLET_PUBLIC_KEY: process.env.DEVNET_TEST_WALLET_PUBLIC_KEY ?? "",
    DEVNET_TEST_TOKEN_MINT: process.env.DEVNET_TEST_TOKEN_MINT ?? "",
    DEVNET_TEST_COLLECTION_ASSET: process.env.DEVNET_TEST_COLLECTION_ASSET ?? "",
    FINAL_ASSET_STORAGE_PROVIDER: "pinata",
    PINATA_JWT: process.env.PINATA_JWT ? "<redacted>" : "",
    METAPLEX_NFT_STANDARD: "METAPLEX_CORE"
  };
}

function formatEnvBlock(values: Record<string, string>) {
  return Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
