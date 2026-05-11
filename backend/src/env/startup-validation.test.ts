import { startupState } from "./startup-state";
import { validateStartupEnvironment } from "./startup-validation";

const ENV_KEYS = [
  "APP_ENV",
  "NODE_ENV",
  "STRICT_STARTUP_VALIDATION",
  "DEMO_CURATED_LAYER_PACK",
  "PROGRAM_ID",
  "NEXT_PUBLIC_PROGRAM_ID",
  "OPENAI_IMAGE_MODEL",
  "OPENAI_IMAGE_QUALITY",
  "PAID_AI_GENERATION_ENABLED",
  "DEV_DISABLE_PAID_AI",
  "ENABLE_AI_IMAGE_GENERATION",
  "REQUIRED_LAUNCH_ASSET_STATUS",
  "OPENAI_API_KEY",
  "ENABLE_MOCK_MINT",
  "SOLANA_TRANSACTION_PROVIDER",
  "FINAL_ASSET_STORAGE_PROVIDER",
  "FINAL_RENDER_STORAGE_ROOT",
  "CURATED_LAYER_PACK_MANIFEST_URI",
  "CURATED_LAYER_PACK_ROOT",
  "APPROVED_LAYER_PACK_ID",
  "HELIUS_API_KEY",
  "HELIUS_RPC_URL",
  "SOLANA_RPC_URL",
  "DESIGN_MODEL_PROVIDER",
  "LAYER_PACK_PROVIDER",
  "LEGENDARY_ASSET_PROVIDER",
  "PINATA_JWT",
  "METAPLEX_NFT_STANDARD",
  "DATABASE_URL",
  "DIRECT_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PASSWORD"
];

type TestCase = {
  name: string;
  run: () => void;
};

const PROGRAM_ID = "8i9Xd9ikQSEdDstcV9L8ikru8nZFBsNWx2Y5TQpgAnU6";

const tests: TestCase[] = [
  {
    name: "production demo layer pack marks validation invalid without blocking boot",
    run: () => {
      withCleanEnv({
        APP_ENV: "production",
        NODE_ENV: "production",
        STRICT_STARTUP_VALIDATION: "false",
        DEMO_CURATED_LAYER_PACK: "true",
        PROGRAM_ID,
        NEXT_PUBLIC_PROGRAM_ID: PROGRAM_ID,
        SOLANA_TRANSACTION_PROVIDER: "mock",
        FINAL_ASSET_STORAGE_PROVIDER: "mock"
      }, () => {
        const validation = validateStartupEnvironment();
        const issue = validation.issues.find((item) => item.code === "DEMO_LAYER_PACK_IN_PRODUCTION");
        assert(issue?.severity === "fatal", "Demo layer pack must remain a production launch blocker.");
        assert(!validation.valid, "Validation should remain invalid while production launch blockers exist.");
        assert(startupState().degraded, "Startup state should be degraded while fatal setup blockers exist.");
        assert(startupState().lastError?.includes("DEMO_CURATED_LAYER_PACK"), "Startup state should preserve the setup blocker.");
      });
    }
  },
  {
    name: "strict startup validation still blocks boot on fatal issues",
    run: () => {
      withCleanEnv({
        APP_ENV: "production",
        NODE_ENV: "production",
        STRICT_STARTUP_VALIDATION: "true",
        DEMO_CURATED_LAYER_PACK: "true",
        PROGRAM_ID,
        NEXT_PUBLIC_PROGRAM_ID: PROGRAM_ID
      }, () => {
        const error = expectThrows(() => validateStartupEnvironment());
        assert(error.message.includes("DEMO_CURATED_LAYER_PACK"), "Strict validation should include the blocker message.");
      });
    }
  }
];

for (const test of tests) {
  test.run();
  console.log(`PASS ${test.name}`);
}

function withCleanEnv(overrides: Record<string, string>, run: () => void) {
  const original = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
  try {
    for (const key of ENV_KEYS) delete process.env[key];
    for (const [key, value] of Object.entries(overrides)) process.env[key] = value;
    run();
  } finally {
    for (const [key, value] of original.entries()) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function expectThrows(fn: () => unknown): Error {
  try {
    fn();
  } catch (error) {
    if (error instanceof Error) return error;
    throw new Error(`Expected Error, got ${String(error)}`);
  }
  throw new Error("Expected Error");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
