import { recordStartupValidation, type StartupCheck } from "./startup-state";

export function validateStartupEnvironment() {
  const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
  const placeholderProgramId = "11111111111111111111111111111111";
  const strict = (process.env.STRICT_STARTUP_VALIDATION ?? "false") === "true";
  const issues: StartupCheck[] = [];
  process.env.OPENAI_IMAGE_MODEL ??= "gpt-image-1";
  process.env.ENABLE_AI_IMAGE_GENERATION ??= "false";
  if (process.env.PROGRAM_ID === placeholderProgramId) {
    issues.push({ code: "PLACEHOLDER_PROGRAM_ID", severity: "fatal", message: "PROGRAM_ID cannot be the system-program placeholder." });
  }
  if (process.env.NEXT_PUBLIC_PROGRAM_ID === placeholderProgramId) {
    issues.push({ code: "PLACEHOLDER_PUBLIC_PROGRAM_ID", severity: "fatal", message: "NEXT_PUBLIC_PROGRAM_ID cannot be the system-program placeholder." });
  }
  if (process.env.PROGRAM_ID && process.env.NEXT_PUBLIC_PROGRAM_ID && process.env.PROGRAM_ID !== process.env.NEXT_PUBLIC_PROGRAM_ID) {
    issues.push({ code: "PROGRAM_ID_MISMATCH", severity: "fatal", message: "PROGRAM_ID and NEXT_PUBLIC_PROGRAM_ID must match." });
  }
  if ((process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true" && !process.env.OPENAI_API_KEY) {
    issues.push({ code: "OPENAI_MISSING", severity: appEnv === "production" ? "warning" : "info", message: "OPENAI_API_KEY is required when ENABLE_AI_IMAGE_GENERATION=true." });
  }

  if (appEnv === "production") {
    if ((process.env.ENABLE_MOCK_MINT ?? "false") === "true") issues.push({ code: "MOCK_MINT_ENABLED", severity: "warning", message: "ENABLE_MOCK_MINT should be false in production." });
    if ((process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock") === "mock") issues.push({ code: "MOCK_SOLANA_PROVIDER", severity: "warning", message: "SOLANA_TRANSACTION_PROVIDER=mock disables production transactions." });
    if ((process.env.FINAL_ASSET_STORAGE_PROVIDER ?? "mock") === "mock") issues.push({ code: "MOCK_FINAL_STORAGE", severity: "warning", message: "FINAL_ASSET_STORAGE_PROVIDER=mock blocks public production launch." });
    if (!process.env.HELIUS_API_KEY) issues.push({ code: "HELIUS_MISSING", severity: "warning", message: "HELIUS_API_KEY is required for CA-first token scanning." });
    if (!process.env.PROGRAM_ID) issues.push({ code: "PROGRAM_ID_MISSING", severity: "warning", message: "PROGRAM_ID is required for devnet/mainnet actions." });
    if ((process.env.DESIGN_MODEL_PROVIDER ?? "mock") === "mock") issues.push({ code: "DESIGN_PROVIDER_MOCK", severity: "warning", message: "DESIGN_MODEL_PROVIDER=mock blocks production art launch." });
    if ((process.env.LAYER_PACK_PROVIDER ?? "mock") === "mock") issues.push({ code: "LAYER_PROVIDER_MOCK", severity: "warning", message: "LAYER_PACK_PROVIDER=mock blocks production art launch." });
    if ((process.env.LEGENDARY_ASSET_PROVIDER ?? "mock") === "mock") issues.push({ code: "LEGENDARY_PROVIDER_MOCK", severity: "warning", message: "LEGENDARY_ASSET_PROVIDER=mock blocks production art launch." });
    if ((process.env.FINAL_ASSET_STORAGE_PROVIDER ?? "mock") === "pinata" && !process.env.PINATA_JWT) issues.push({ code: "PINATA_JWT_MISSING", severity: "warning", message: "PINATA_JWT is required for FINAL_ASSET_STORAGE_PROVIDER=pinata." });
    if ((process.env.METAPLEX_NFT_STANDARD ?? "METAPLEX_CORE") !== "METAPLEX_CORE") issues.push({ code: "NFT_STANDARD_UNSUPPORTED", severity: "warning", message: "METAPLEX_NFT_STANDARD must be METAPLEX_CORE until fallback minting is implemented." });
  }

  const validation = {
    valid: !issues.some((issue) => issue.severity === "fatal"),
    strict,
    issues
  };
  recordStartupValidation(validation);
  if ((strict || appEnv === "production") && issues.some((issue) => issue.severity === "fatal")) {
    throw new Error(`Phew.run startup validation failed: ${issues.filter((issue) => issue.severity === "fatal").map((issue) => issue.message).join(" ")}`);
  }
  return validation;
}
