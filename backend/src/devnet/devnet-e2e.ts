import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { SolanaTransactionAdapterService } from "../vault-mint/solana-transaction-adapter.service";
import { validateDevnetEnv } from "./devnet-env";

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const programId = process.env.PROGRAM_ID;
  const tokenMint = process.env.DEVNET_TEST_TOKEN_MINT;
  const wallet = process.env.DEVNET_TEST_WALLET_PUBLIC_KEY;
  const collectionAssetAddress = process.env.DEVNET_TEST_COLLECTION_ASSET;

  const missing = validateDevnetEnv();

  if (missing.length) {
    console.log(
      JSON.stringify(
        {
          status: "SKIPPED",
          reason: "Devnet E2E requires a deployed program, funded wallet, test SPL token, and confirmed Core collection asset.",
          missing
        },
        null,
        2
      )
    );
    return;
  }

  const connection = new Connection(rpcUrl, "confirmed");
  const adapter = new SolanaTransactionAdapterService();
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  const tx = await adapter.buildVaultMintTransaction({
    transactionId: Keypair.generate().publicKey.toBase58(),
    walletAddress: new PublicKey(wallet!).toBase58(),
    collectionId: "devnet-e2e",
    tokenMint: new PublicKey(tokenMint!).toBase58(),
    amount: "1",
    lockDurationDays: 0,
    metadataUri: "ipfs://devnet-e2e-placeholder",
    collectionName: "VaultX Devnet E2E",
    collectionAssetAddress
  });

  console.log(
    JSON.stringify(
      {
        status: "BUILT",
        blockhash: latestBlockhash.blockhash,
        transactionHasBase64: Boolean(tx.base64UnsignedTransaction),
        nftAssetAddress: tx.nftAssetAddress,
        vaultPositionPda: tx.vaultPositionPda,
        nextManualStep: "Sign base64UnsignedTransaction with DEVNET_TEST_WALLET_PUBLIC_KEY and submit through /vault/mint/transactions/:id/submit."
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
