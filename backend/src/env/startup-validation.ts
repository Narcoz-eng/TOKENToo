import { recordStartupValidation, type StartupCheck } from "./startup-state";
import { normalizeHeliusConfig } from "../token-scanner/helius-config";
import { databaseUrlDiagnostics } from "../db/database-url";
import { DEFAULT_IMAGEN_MODEL, normalizeImagenModel } from "../generator/imagen-models";

export function validateStartupEnvironment() {
  const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
  const placeholderProgramId = "11111111111111111111111111111111";
  const strict = (process.env.STRICT_STARTUP_VALIDATION ?? "false") === "true";
  const issues: StartupCheck[] = [];
  process.env.STUDIO_PROVIDER ??= "gemini";
  process.env.STUDIO_IMAGE_PROVIDER ??= "imagen";
  process.env.CINEMATIC_PROVIDER ??= "openai";
  process.env.GEMINI_IMAGE_MODEL ??= DEFAULT_IMAGEN_MODEL;
  process.env.IMAGEN_IMAGE_MODEL ??= process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_IMAGEN_MODEL;
  process.env.GEMINI_TEXT_MODEL ??= "gemini-2.5-flash";
  process.env.ENABLE_GEMINI_TEXT_PROMPTS ??= "true";
  process.env.OPENAI_IMAGE_MODEL ??= "gpt-image-1.5";
  process.env.OPENAI_IMAGE_QUALITY ??= "high";
  process.env.PAID_AI_GENERATION_ENABLED ??= "false";
  process.env.DEV_DISABLE_PAID_AI ??= appEnv === "production" ? "false" : "true";
  process.env.ENABLE_STUDIO_IMAGE_GENERATION ??= process.env.ENABLE_AI_IMAGE_GENERATION ?? "false";
  process.env.ENABLE_AI_IMAGE_GENERATION ??= "false";
  process.env.COMMUNITY_CREATION_FEE_LAMPORTS ??= "1000000000";
  process.env.COMMUNITY_CREATION_WHALE_MIN_RAW ??= "1";
  process.env.STRATEGY_EXECUTION_PROVIDER ??= "disabled";
  process.env.REQUIRED_LAUNCH_ASSET_STATUS ??= appEnv === "production" ? "ARTIST_APPROVED" : "CURATED_LAYER_READY";
  const helius = normalizeHeliusConfig();
  const database = databaseUrlDiagnostics();
  for (const warning of helius.warnings) {
    issues.push({ code: "HELIUS_CONFIG_WARNING", severity: "warning", message: warning });
  }
  if (database.databaseConnectionStatus === "password-missing-or-malformed") {
    issues.push({ code: "DATABASE_URL_PASSWORD_INVALID", severity: "warning", message: "DATABASE_URL password missing or malformed." });
  }
  if (database.databaseConnectionStatus === "invalid-url") {
    issues.push({ code: "DATABASE_URL_INVALID", severity: "warning", message: database.message ?? "DATABASE_URL is not a valid PostgreSQL connection URL." });
  }
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
  if ((process.env.PAID_AI_GENERATION_ENABLED ?? "false") !== "true" && ((process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true" || (process.env.ENABLE_STUDIO_IMAGE_GENERATION ?? "false") === "true")) {
    issues.push({ code: "PAID_AI_DISABLED", severity: "info", message: "Paid AI image generation env flags are ignored until PAID_AI_GENERATION_ENABLED=true." });
  }
  if ((process.env.DEV_DISABLE_PAID_AI ?? "true") === "true" && appEnv !== "production") {
    process.env.ENABLE_AI_IMAGE_GENERATION = "false";
    process.env.ENABLE_STUDIO_IMAGE_GENERATION = "false";
  }
  if ((process.env.STUDIO_PROVIDER ?? "gemini").toLowerCase() === "openai" || (process.env.STUDIO_IMAGE_PROVIDER ?? "imagen").toLowerCase() === "openai") {
    issues.push({ code: "STUDIO_PROVIDER_OPENAI", severity: appEnv === "production" ? "warning" : "info", message: "OpenAI is not allowed for Studio Bible generation; use Gemini for text planning and Imagen for Studio Bible sheets." });
  }
  const imagenModel = normalizeImagenModel(process.env.IMAGEN_IMAGE_MODEL);
  if (imagenModel.ok) {
    process.env.IMAGEN_IMAGE_MODEL = imagenModel.model;
    process.env.GEMINI_IMAGE_MODEL = imagenModel.model;
  } else {
    issues.push({
      code: "IMAGEN_MODEL_UNSUPPORTED",
      severity: appEnv === "production" ? "warning" : "info",
      message: `Unsupported Imagen model "${imagenModel.rawModel}". Use one of: ${imagenModel.supportedModels.join(", ")}.`
    });
  }
  if ((process.env.STUDIO_IMAGE_PROVIDER ?? "imagen").toLowerCase() === "imagen" && (process.env.IMAGEN_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) && (process.env.ENABLE_STUDIO_IMAGE_GENERATION ?? "false") !== "true" && (process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") !== "true") {
    issues.push({ code: "IMAGEN_DISABLED", severity: appEnv === "production" ? "warning" : "info", message: "Imagen Studio Bible generation is configured but disabled. Set ENABLE_STUDIO_IMAGE_GENERATION=true or ENABLE_AI_IMAGE_GENERATION=true." });
  }
  if ((process.env.DEMO_CURATED_LAYER_PACK ?? "false") === "true" && appEnv === "production") {
    issues.push({ code: "DEMO_LAYER_PACK_IN_PRODUCTION", severity: "fatal", message: "DEMO_CURATED_LAYER_PACK is devnet demo only and must be disabled in production." });
  }

  if (appEnv === "production") {
    if ((process.env.ENABLE_MOCK_MINT ?? "false") === "true") issues.push({ code: "MOCK_MINT_ENABLED", severity: "fatal", message: "ENABLE_MOCK_MINT must be false in production." });
    if ((process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock") === "mock") issues.push({ code: "MOCK_SOLANA_PROVIDER", severity: "fatal", message: "SOLANA_TRANSACTION_PROVIDER=mock is blocked in production." });
    if ((process.env.FINAL_ASSET_STORAGE_PROVIDER ?? "mock") === "mock") issues.push({ code: "MOCK_FINAL_STORAGE", severity: "warning", message: "FINAL_ASSET_STORAGE_PROVIDER=mock blocks public production launch." });
    if (!process.env.FINAL_RENDER_STORAGE_ROOT) issues.push({ code: "FINAL_RENDER_CACHE_MISSING", severity: "warning", message: "FINAL_RENDER_STORAGE_ROOT is required so public minting can reference cached/pre-generated final NFT renders." });
    if (!(process.env.CURATED_LAYER_PACK_MANIFEST_URI || process.env.CURATED_LAYER_PACK_ROOT || process.env.APPROVED_LAYER_PACK_ID)) {
      issues.push({ code: "CURATED_LAYER_PACK_MISSING", severity: "warning", message: "Approved curated layer pack manifest/root is required before launch." });
    }
    if (!helius.heliusApiKey) issues.push({ code: "HELIUS_MISSING", severity: "warning", message: "A Helius api-key is required for CA-first token scanning. Set HELIUS_API_KEY key-only, HELIUS_RPC_URL, or a Helius SOLANA_RPC_URL." });
    if (helius.errorCode) issues.push({ code: helius.errorCode, severity: "warning", message: helius.errorMessage ?? "Helius configuration is invalid." });
    if (!process.env.PROGRAM_ID) issues.push({ code: "PROGRAM_ID_MISSING", severity: "warning", message: "PROGRAM_ID is required for devnet/mainnet actions." });
    if ((process.env.DESIGN_MODEL_PROVIDER ?? "mock") === "mock") issues.push({ code: "DESIGN_PROVIDER_MOCK", severity: "warning", message: "DESIGN_MODEL_PROVIDER=mock blocks production art launch." });
    if ((process.env.LAYER_PACK_PROVIDER ?? "mock") === "mock") issues.push({ code: "LAYER_PROVIDER_MOCK", severity: "warning", message: "LAYER_PACK_PROVIDER=mock blocks production art launch." });
    if ((process.env.LEGENDARY_ASSET_PROVIDER ?? "mock") === "mock") issues.push({ code: "LEGENDARY_PROVIDER_MOCK", severity: "warning", message: "LEGENDARY_ASSET_PROVIDER=mock blocks production art launch." });
    if ((process.env.FINAL_ASSET_STORAGE_PROVIDER ?? "mock") === "pinata" && !process.env.PINATA_JWT) issues.push({ code: "PINATA_JWT_MISSING", severity: "warning", message: "PINATA_JWT is required for FINAL_ASSET_STORAGE_PROVIDER=pinata." });
    if ((process.env.METAPLEX_NFT_STANDARD ?? "METAPLEX_CORE") !== "METAPLEX_CORE") issues.push({ code: "NFT_STANDARD_UNSUPPORTED", severity: "warning", message: "METAPLEX_NFT_STANDARD must be METAPLEX_CORE until fallback minting is implemented." });
    if (!process.env.COMMUNITY_CREATION_FEE_WALLET && !process.env.PROTOCOL_TREASURY_WALLET) issues.push({ code: "COMMUNITY_CREATION_FEE_WALLET_MISSING", severity: "warning", message: "A treasury wallet is required to verify 1 SOL community creation access." });
    if ((process.env.STRATEGY_EXECUTION_PROVIDER ?? "disabled") !== "disabled" && !process.env.STRATEGY_WORKER_SECRET) issues.push({ code: "STRATEGY_WORKER_SECRET_MISSING", severity: "fatal", message: "Production strategy execution requires STRATEGY_WORKER_SECRET." });
  }

  const validation = {
    valid: !issues.some((issue) => issue.severity === "fatal"),
    strict,
    issues
  };
  recordStartupValidation(validation);
  if (strict && issues.some((issue) => issue.severity === "fatal")) {
    throw new Error(`Phew.run startup validation failed: ${issues.filter((issue) => issue.severity === "fatal").map((issue) => issue.message).join(" ")}`);
  }
  return validation;
}
