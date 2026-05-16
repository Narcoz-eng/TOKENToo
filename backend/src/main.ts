import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { HttpAdapterHost } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DatabaseExceptionFilter } from "./db/database-exception.filter";
import { loadLocalEnv } from "./env/load-local-env";
import { validateStartupEnvironment } from "./env/startup-validation";
import { loadedLocalEnvFiles } from "./env/load-local-env";
import { recordStartupComplete, recordStartupFailure, recordStartupListening, recordStartupModules, startupState } from "./env/startup-state";
import { normalizeHeliusConfig } from "./token-scanner/helius-config";
import { databaseUrlDiagnostics } from "./db/database-url";

async function bootstrap() {
  let bootStage = "load_env";
  try {
    bootStage = "load_env";
    loadLocalEnv();
    bootStage = "validate_env";
    validateStartupEnvironment();
    bootStage = "record_modules";
    recordStartupModules(["AuthModule", "GeneratorModule", "VaultMintModule", "ProductDataModule", "ProtocolController", "CommunityProtocolController", "StrategyEngineService", "SystemController"]);
    bootStage = "create_nest_app";
    const app = await NestFactory.create(AppModule, {
      logger: process.env.PHEW_SILENT_LOGS === "true" ? false : undefined
    });
    bootStage = "configure_filters";
    app.useGlobalFilters(new DatabaseExceptionFilter(app.get(HttpAdapterHost)));
    app.use((request: any, response: any, next: () => void) => {
      const requestId = request.headers?.["x-request-id"] ?? `api_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      request.headers["x-request-id"] = requestId;
      response.setHeader?.("x-request-id", requestId);
      next();
    });
    app.enableCors({
      origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"
    });

    const port = Number(process.env.PORT ?? 4000);
    bootStage = "record_startup_complete";
    recordStartupComplete(port);
    logBoot(port);
    bootStage = "listen";
    await app.listen(port);
    recordStartupListening(port);
  } catch (error) {
    recordStartupFailure(error);
    console.error("[startup] backend failed to bootstrap", {
      stage: bootStage,
      name: error instanceof Error ? error.name : "UnknownError",
      error: error instanceof Error ? error.message : String(error),
      boot: startupState()
    });
    throw error;
  }
}

void bootstrap();

function logBoot(port: number) {
  const rpcUrl = sanitizeUrl(process.env.SOLANA_RPC_URL ?? process.env.ANCHOR_PROVIDER_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com");
  const helius = normalizeHeliusConfig();
  const database = databaseUrlDiagnostics();
  const heliusConfigured = Boolean(helius.heliusApiKey);
  console.info("[startup] backend boot", {
    url: `http://localhost:${port}`,
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
    loadedEnvFiles: loadedLocalEnvFiles(),
    rpcUrl,
    heliusConfigured,
    heliusKeySource: helius.heliusKeySource,
    heliusRpcUrlHost: helius.heliusRpcUrlHost,
    heliusNetwork: helius.network,
    dbConfigured: database.databaseUrlPresent,
    dbUrlSource: database.databaseUrlSource,
    programId: process.env.PROGRAM_ID ?? null,
    cluster: process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? process.env.SOLANA_CLUSTER ?? "devnet",
    modules: startupState().modules,
    validation: startupState().validation
  });
}

function sanitizeUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.search) url.search = "?...";
    return url.toString();
  } catch {
    return value.replace(/api-key=[^&]+/i, "api-key=...");
  }
}
