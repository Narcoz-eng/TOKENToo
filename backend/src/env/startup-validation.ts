export function validateStartupEnvironment() {
  const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
  const placeholderProgramId = "11111111111111111111111111111111";
  process.env.OPENAI_IMAGE_MODEL ??= "gpt-image-1";
  process.env.ENABLE_AI_IMAGE_GENERATION ??= "false";
  if (process.env.PROGRAM_ID === placeholderProgramId) {
    throw new Error("Phew.run environment is unsafe: PROGRAM_ID cannot be the system-program placeholder.");
  }
  if (process.env.NEXT_PUBLIC_PROGRAM_ID === placeholderProgramId) {
    throw new Error("Phew.run environment is unsafe: NEXT_PUBLIC_PROGRAM_ID cannot be the system-program placeholder.");
  }
  if (process.env.PROGRAM_ID && process.env.NEXT_PUBLIC_PROGRAM_ID && process.env.PROGRAM_ID !== process.env.NEXT_PUBLIC_PROGRAM_ID) {
    throw new Error("Phew.run environment is unsafe: PROGRAM_ID and NEXT_PUBLIC_PROGRAM_ID must match.");
  }
  if ((process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true" && !process.env.OPENAI_API_KEY) {
    if (appEnv === "production") throw new Error("Phew.run production environment is unsafe: OPENAI_API_KEY is required when ENABLE_AI_IMAGE_GENERATION=true.");
  }
  if (appEnv !== "production") return;

  const issues: string[] = [];
  if ((process.env.ENABLE_MOCK_MINT ?? "false") === "true") issues.push("ENABLE_MOCK_MINT must be false in production.");
  if ((process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock") === "mock") issues.push("SOLANA_TRANSACTION_PROVIDER cannot be mock in production.");
  if ((process.env.FINAL_ASSET_STORAGE_PROVIDER ?? "mock") === "mock") issues.push("FINAL_ASSET_STORAGE_PROVIDER cannot be mock in production.");
  if (!process.env.HELIUS_API_KEY) issues.push("HELIUS_API_KEY is required in production for CA-first token scanning.");
  if (!process.env.PROGRAM_ID) issues.push("PROGRAM_ID is required in production.");
  if ((process.env.DESIGN_MODEL_PROVIDER ?? "mock") === "mock") issues.push("DESIGN_MODEL_PROVIDER cannot be mock in production.");
  if ((process.env.LAYER_PACK_PROVIDER ?? "mock") === "mock") issues.push("LAYER_PACK_PROVIDER cannot be mock in production.");
  if ((process.env.LEGENDARY_ASSET_PROVIDER ?? "mock") === "mock") issues.push("LEGENDARY_ASSET_PROVIDER cannot be mock in production.");
  if ((process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true" && !process.env.OPENAI_API_KEY) issues.push("OPENAI_API_KEY is required when ENABLE_AI_IMAGE_GENERATION=true.");
  if ((process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true" && !process.env.OPENAI_IMAGE_MODEL) issues.push("OPENAI_IMAGE_MODEL is required when AI images are enabled.");
  if ((process.env.FINAL_ASSET_STORAGE_PROVIDER ?? "mock") === "pinata" && !process.env.PINATA_JWT) issues.push("PINATA_JWT is required for FINAL_ASSET_STORAGE_PROVIDER=pinata.");
  if ((process.env.METAPLEX_NFT_STANDARD ?? "METAPLEX_CORE") !== "METAPLEX_CORE") issues.push("METAPLEX_NFT_STANDARD must be METAPLEX_CORE until the fallback is implemented.");
  if (issues.length) throw new Error(`Phew.run production environment is unsafe: ${issues.join(" ")}`);
}
