export const requiredDevnetEnv = [
  {
    name: "PROGRAM_ID",
    source: "Use `anchor deploy --provider.cluster devnet`, then copy the deployed program id into Anchor.toml, declare_id!, and .env."
  },
  { name: "SOLANA_RPC_URL", source: "Use https://api.devnet.solana.com or your Helius/Triton devnet RPC." },
  { name: "SOLANA_TRANSACTION_PROVIDER", expected: "devnet", source: "Set SOLANA_TRANSACTION_PROVIDER=devnet." },
  { name: "DEVNET_TEST_TOKEN_MINT", source: "Create with `spl-token create-token --url devnet`." },
  { name: "DEVNET_TEST_WALLET_PUBLIC_KEY", source: "Use `solana address --keypair <wallet>` for the funded test wallet." },
  { name: "DEVNET_TEST_COLLECTION_ASSET", source: "Build/sign/submit the Core collection launch transaction and use the confirmed collectionAssetAddress." },
  { name: "FINAL_ASSET_STORAGE_PROVIDER", expected: "pinata", source: "Set FINAL_ASSET_STORAGE_PROVIDER=pinata for immutable pinned IPFS." },
  { name: "PINATA_JWT", source: "Create a Pinata API JWT and add it to backend/Vercel env." },
  { name: "METAPLEX_NFT_STANDARD", expected: "METAPLEX_CORE", source: "Set METAPLEX_NFT_STANDARD=METAPLEX_CORE." }
];

export function validateDevnetEnv() {
  const placeholderProgramId = "11111111111111111111111111111111";
  return requiredDevnetEnv
    .map((item) => {
      const value = process.env[item.name];
      const missing = !value;
      const wrongValue = Boolean(item.expected && value && value !== item.expected);
      const placeholder = item.name === "PROGRAM_ID" && value === placeholderProgramId;
      return missing || wrongValue || placeholder ? { ...item, actual: value ?? null, reason: missing ? "missing" : placeholder ? "placeholder" : `expected ${item.expected}` } : null;
    })
    .filter(Boolean);
}
