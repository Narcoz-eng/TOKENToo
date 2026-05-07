export function validateStartupEnvironment() {
  const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
  if (appEnv !== "production") return;

  const issues: string[] = [];
  if ((process.env.ENABLE_MOCK_MINT ?? "false") === "true") issues.push("ENABLE_MOCK_MINT must be false in production.");
  if ((process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock") === "mock") issues.push("SOLANA_TRANSACTION_PROVIDER cannot be mock in production.");
  if ((process.env.FINAL_ASSET_STORAGE_PROVIDER ?? "mock") === "mock") issues.push("FINAL_ASSET_STORAGE_PROVIDER cannot be mock in production.");
  if ((process.env.DESIGN_MODEL_PROVIDER ?? "mock") === "mock") issues.push("DESIGN_MODEL_PROVIDER cannot be mock in production.");
  if ((process.env.LAYER_PACK_PROVIDER ?? "mock") === "mock") issues.push("LAYER_PACK_PROVIDER cannot be mock in production.");
  if ((process.env.LEGENDARY_ASSET_PROVIDER ?? "mock") === "mock") issues.push("LEGENDARY_ASSET_PROVIDER cannot be mock in production.");
  if ((process.env.METAPLEX_NFT_STANDARD ?? "METAPLEX_CORE") !== "METAPLEX_CORE") issues.push("METAPLEX_NFT_STANDARD must be METAPLEX_CORE until the fallback is implemented.");
  if (issues.length) throw new Error(`Phew.run production environment is unsafe: ${issues.join(" ")}`);
}
