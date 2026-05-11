import { Inject, Injectable } from "@nestjs/common";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { PrismaService } from "../db/prisma.service";
import { isDatabaseSetupError } from "../db/database-errors";
import { loadedLocalEnvFiles } from "../env/load-local-env";
import { startupState } from "../env/startup-state";
import { getLastHeliusErrorCode, heliusDiagnostics, heliusGetAssetBody, normalizeHeliusConfig, setLastHeliusErrorCode } from "../token-scanner/helius-config";
import { databaseUrlDiagnostics } from "../db/database-url";

export type SystemCapabilities = {
  databaseAvailable: boolean;
  heliusConfigured: boolean;
  heliusReachable: boolean;
  heliusAvailable: boolean;
  geminiImagesAvailable: boolean;
  fastStudioPreviewAvailable: boolean;
  premiumCinematicAvailable: boolean;
  openaiImagesAvailable: boolean;
  pinataAvailable: boolean;
  permanentStorageConfigured: boolean;
  solanaAvailable: boolean;
  solanaRpcConfigured: boolean;
  solanaTransactionProviderDevnet: boolean;
  walletConfigured: boolean;
  devnetProgramConfigured: boolean;
  programAccountExists: boolean;
  programAccountExecutable: boolean;
  aiGenerationEnabled: boolean;
  localPreviewProviderEnabled: boolean;
  approvedLayerPackAvailable: boolean;
  demoCuratedLayerPackEnabled: boolean;
  demoCuratedLayerPackAllowed: boolean;
  productionStorageAvailable: boolean;
  tokenMetadataAvailable: boolean;
};

type SetupMode = {
  id: "creative-preview" | "devnet-test-launch" | "production-launch";
  label: string;
  ready: boolean;
  output: string;
  missing: string[];
  blockedBy: string[];
};

const PLACEHOLDER_PROGRAM_ID = "11111111111111111111111111111111";

@Injectable()
export class CapabilitiesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async health() {
    const boot = startupState();
    return {
      ok: boot.bootstrapped,
      success: true,
      service: "phew-run-backend",
      boot: {
        bootstrapped: boot.bootstrapped,
        ready: boot.ready,
        degraded: boot.degraded,
        startedAt: boot.startedAt,
        completedAt: boot.completedAt,
        lastError: boot.lastError
      }
    };
  }

  async ready() {
    const heliusConfig = normalizeHeliusConfig();
    const [databaseAvailable, heliusReachable, programAccount] = await Promise.all([
      this.databaseAvailable(),
      this.heliusReachable(heliusConfig),
      this.programAccountStatus()
    ]);
    const heliusConfigured = Boolean(heliusConfig.heliusApiKey);
    const boot = startupState();
    const checks = {
      bootComplete: boot.ready,
      dbConnectivity: databaseAvailable,
      heliusConfigured,
      heliusReachable,
      rpcConfigured: this.solanaAvailable(),
      programIdConfigured: this.devnetProgramConfigured(),
      programAccountExists: programAccount.exists,
      programAccountExecutable: programAccount.executable,
      envValidationValid: boot.validation.valid
    };
    return {
      ok: boot.ready && boot.validation.valid,
      success: true,
      degraded: !databaseAvailable || !heliusReachable || !programAccount.executable,
      checks,
      warnings: this.warnings({
        databaseAvailable,
        heliusConfigured,
        heliusReachable,
        heliusAvailable: heliusConfigured && heliusReachable,
        geminiImagesAvailable: Boolean(process.env.GEMINI_API_KEY),
        fastStudioPreviewAvailable: this.fastStudioPreviewAvailable(),
        premiumCinematicAvailable: this.premiumCinematicAvailable(),
        openaiImagesAvailable: Boolean(process.env.OPENAI_API_KEY),
        pinataAvailable: Boolean(process.env.PINATA_JWT),
        permanentStorageConfigured: this.permanentStorageConfigured(),
        solanaAvailable: this.solanaAvailable(),
        solanaRpcConfigured: this.solanaRpcConfigured(),
        solanaTransactionProviderDevnet: this.solanaTransactionProviderDevnet(),
        walletConfigured: Boolean(process.env.DEVNET_TEST_WALLET_PUBLIC_KEY || process.env.ANCHOR_WALLET),
        devnetProgramConfigured: this.devnetProgramConfigured(),
        programAccountExists: programAccount.exists,
        programAccountExecutable: programAccount.executable,
        aiGenerationEnabled: (process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true",
        localPreviewProviderEnabled: this.localPreviewProviderEnabled(),
        approvedLayerPackAvailable: this.approvedLayerPackAvailable(),
        demoCuratedLayerPackEnabled: this.demoCuratedLayerPackEnabled(),
        demoCuratedLayerPackAllowed: this.demoCuratedLayerPackAllowed(),
        productionStorageAvailable: this.productionStorageAvailable(),
        tokenMetadataAvailable: this.tokenMetadataAvailable(heliusConfigured && heliusReachable, programAccount.executable)
      })
    };
  }

  async status(options: { includeTechnicalDiagnostics?: boolean } = {}) {
    const heliusConfig = normalizeHeliusConfig();
    const [databaseAvailable, heliusReachable, programAccount] = await Promise.all([
      this.databaseAvailable(),
      this.heliusReachable(heliusConfig),
      this.programAccountStatus()
    ]);
    const heliusConfigured = Boolean(heliusConfig.heliusApiKey);
    const capabilities: SystemCapabilities = {
      databaseAvailable,
      heliusConfigured,
      heliusReachable,
      heliusAvailable: heliusConfigured && heliusReachable,
      geminiImagesAvailable: Boolean(process.env.GEMINI_API_KEY),
      fastStudioPreviewAvailable: this.fastStudioPreviewAvailable(),
      premiumCinematicAvailable: this.premiumCinematicAvailable(),
      openaiImagesAvailable: Boolean(process.env.OPENAI_API_KEY),
      pinataAvailable: Boolean(process.env.PINATA_JWT),
      permanentStorageConfigured: this.permanentStorageConfigured(),
      solanaAvailable: this.solanaAvailable(),
      solanaRpcConfigured: this.solanaRpcConfigured(),
      solanaTransactionProviderDevnet: this.solanaTransactionProviderDevnet(),
      walletConfigured: Boolean(process.env.DEVNET_TEST_WALLET_PUBLIC_KEY || process.env.ANCHOR_WALLET),
      devnetProgramConfigured: this.devnetProgramConfigured(),
      programAccountExists: programAccount.exists,
      programAccountExecutable: programAccount.executable,
      aiGenerationEnabled: (process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true",
      localPreviewProviderEnabled: this.localPreviewProviderEnabled(),
      approvedLayerPackAvailable: this.approvedLayerPackAvailable(),
      demoCuratedLayerPackEnabled: this.demoCuratedLayerPackEnabled(),
      demoCuratedLayerPackAllowed: this.demoCuratedLayerPackAllowed(),
      productionStorageAvailable: this.productionStorageAvailable(),
      tokenMetadataAvailable: this.tokenMetadataAvailable(heliusConfigured && heliusReachable, programAccount.executable)
    };

    const includeTechnicalDiagnostics = options.includeTechnicalDiagnostics ?? this.includeTechnicalDiagnostics();
    const technicalSetupModes = this.setupModes(capabilities);
    const warnings = includeTechnicalDiagnostics ? this.warnings(capabilities) : this.publicWarnings(capabilities, technicalSetupModes);
    const setupModes = includeTechnicalDiagnostics ? technicalSetupModes : this.publicSetupModes(capabilities, technicalSetupModes);
    const responseCapabilities: Record<string, boolean> = includeTechnicalDiagnostics ? capabilities : this.publicCapabilities(capabilities, technicalSetupModes);
    return {
      ok: true,
      mode: process.env.APP_MODE ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
      singleUserMode: (process.env.SINGLE_USER_MODE ?? "false") === "true",
      rpcUrl: this.sanitizedRpcUrl(),
      cluster: this.cluster(),
      programId: includeTechnicalDiagnostics ? process.env.PROGRAM_ID ?? null : null,
      setupModes,
      setupChecklist: includeTechnicalDiagnostics ? this.setupChecklist(capabilities, technicalSetupModes) : this.publicSetupChecklist(capabilities, technicalSetupModes),
      publicReadiness: this.publicReadiness(capabilities, technicalSetupModes),
      technicalDiagnosticsEnabled: includeTechnicalDiagnostics,
      capabilities: responseCapabilities,
      warnings
    };
  }

  async diagnostics() {
    const heliusConfig = normalizeHeliusConfig();
    const heliusReachable = await this.heliusReachable(heliusConfig);
    const database = databaseUrlDiagnostics();
    const status = await this.status({ includeTechnicalDiagnostics: true });
    const ready = await this.ready();
    return {
      ok: true,
      boot: startupState(),
      ready,
      env: {
        filesLoaded: loadedLocalEnvFiles(),
        present: Object.fromEntries(this.diagnosticEnvKeys().map((key) => [key, Boolean(process.env[key])])),
        values: {
          APP_ENV: process.env.APP_ENV ?? process.env.NODE_ENV ?? null,
          SOLANA_TRANSACTION_PROVIDER: process.env.SOLANA_TRANSACTION_PROVIDER ?? null,
          METAPLEX_NFT_STANDARD: process.env.METAPLEX_NFT_STANDARD ?? null,
          FINAL_ASSET_STORAGE_PROVIDER: process.env.FINAL_ASSET_STORAGE_PROVIDER ?? null,
          ASSET_STORAGE_PROVIDER: process.env.ASSET_STORAGE_PROVIDER ?? null,
          DATABASE_URL_SOURCE: database.databaseUrlSource ?? null,
          DIRECT_URL_SOURCE: database.directUrlSource ?? null,
          PROGRAM_ID: process.env.PROGRAM_ID ?? null,
          SOLANA_RPC_URL: this.sanitizedRpcUrl()
        }
      },
      database: {
        ...database,
        databaseConnectionStatus: status.capabilities.databaseAvailable ? "connected" : database.databaseConnectionStatus === "unchecked" ? "unreachable" : database.databaseConnectionStatus
      },
      helius: heliusDiagnostics(heliusConfig, heliusReachable),
      capabilities: status.capabilities,
      warnings: status.warnings
    };
  }

  private async databaseAvailable() {
    const diagnostics = databaseUrlDiagnostics();
    if (diagnostics.databaseConnectionStatus === "password-missing-or-malformed" || diagnostics.databaseConnectionStatus === "invalid-url") return false;
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Database capability check timed out.")), 1500))
      ]);
      return true;
    } catch (error) {
      if (isDatabaseSetupError(error) || error instanceof Error) return false;
      return false;
    }
  }

  private solanaAvailable() {
    return Boolean(process.env.SOLANA_RPC_URL || process.env.ANCHOR_PROVIDER_URL || process.env.PROGRAM_ID);
  }

  private solanaRpcConfigured() {
    return Boolean(process.env.SOLANA_RPC_URL || process.env.ANCHOR_PROVIDER_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL);
  }

  private solanaTransactionProviderDevnet() {
    return (process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock") === "devnet";
  }

  private devnetProgramConfigured() {
    const programId = process.env.PROGRAM_ID;
    return Boolean(programId && programId !== PLACEHOLDER_PROGRAM_ID);
  }

  private productionStorageAvailable() {
    const provider = process.env.FINAL_ASSET_STORAGE_PROVIDER ?? process.env.ASSET_STORAGE_PROVIDER;
    const renderRoot = Boolean(process.env.FINAL_RENDER_STORAGE_ROOT || this.demoCuratedLayerPackAllowed());
    const layerPack = this.approvedLayerPackAvailable();
    if (provider === "pinata") return Boolean(process.env.PINATA_JWT) && renderRoot && layerPack;
    if (provider === "arweave" || provider === "irys") return Boolean(process.env.IRYS_PRIVATE_KEY || process.env.ARWEAVE_KEY) && renderRoot && layerPack;
    if (provider === "supabase") return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) && renderRoot && layerPack;
    return false;
  }

  private permanentStorageConfigured() {
    const provider = process.env.FINAL_ASSET_STORAGE_PROVIDER ?? process.env.ASSET_STORAGE_PROVIDER;
    if (provider === "pinata") return Boolean(process.env.PINATA_JWT);
    if (provider === "arweave" || provider === "irys") return Boolean(process.env.IRYS_PRIVATE_KEY || process.env.ARWEAVE_KEY);
    if (provider === "supabase") return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    return false;
  }

  private approvedLayerPackAvailable() {
    return Boolean(process.env.CURATED_LAYER_PACK_MANIFEST_URI || process.env.CURATED_LAYER_PACK_ROOT || process.env.APPROVED_LAYER_PACK_ID || this.demoCuratedLayerPackAllowed());
  }

  private realApprovedLayerPackAvailable() {
    return Boolean(process.env.CURATED_LAYER_PACK_MANIFEST_URI || process.env.CURATED_LAYER_PACK_ROOT || process.env.APPROVED_LAYER_PACK_ID);
  }

  private demoCuratedLayerPackEnabled() {
    return (process.env.DEMO_CURATED_LAYER_PACK ?? "false") === "true";
  }

  private demoCuratedLayerPackAllowed() {
    return this.demoCuratedLayerPackEnabled() && (process.env.APP_ENV ?? process.env.NODE_ENV ?? "development") !== "production";
  }

  private localPreviewProviderEnabled() {
    const provider = (process.env.AI_CONCEPT_PROVIDER ?? "").trim().toLowerCase();
    const localProvider = (process.env.LOCAL_PREVIEW_PROVIDER ?? "").trim().toLowerCase();
    return provider === "premium-fallback" || provider === "local-placeholder" || localProvider === "premium-fallback" || localProvider === "branded-placeholder";
  }

  private studioProvider() {
    const provider = (process.env.STUDIO_PROVIDER ?? "gemini").trim().toLowerCase();
    if (provider === "openai") return "openai";
    if (provider === "deterministic" || provider === "deterministic-render") return "deterministic-render";
    return "gemini";
  }

  private cinematicProvider() {
    const provider = (process.env.CINEMATIC_PROVIDER ?? "openai").trim().toLowerCase();
    return provider === "gemini" ? "gemini" : "openai";
  }

  private fastStudioPreviewAvailable() {
    const provider = this.studioProvider();
    if (provider === "openai") return false;
    if (provider === "deterministic-render") return true;
    return Boolean(process.env.GEMINI_API_KEY) && this.studioImageGenerationEnabled();
  }

  private premiumCinematicAvailable() {
    const provider = this.cinematicProvider();
    if (provider === "gemini") return Boolean(process.env.GEMINI_API_KEY);
    return Boolean(process.env.OPENAI_API_KEY) && (process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true";
  }

  private studioImageGenerationEnabled() {
    return (process.env.ENABLE_STUDIO_IMAGE_GENERATION ?? "false") === "true" || (process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true";
  }

  private tokenMetadataAvailable(heliusAvailable: boolean, programExecutable: boolean) {
    return heliusAvailable && this.productionStorageAvailable() && this.solanaAvailable() && this.devnetProgramConfigured() && programExecutable;
  }

  private finalAssetApprovalGateSatisfied() {
    return (
      (process.env.FINAL_PRODUCTION_ASSETS_APPROVED ?? "false") === "true" ||
      (process.env.ARTIST_APPROVED_ASSETS ?? "false") === "true" ||
      (process.env.AI_ASSISTED_FINAL_ASSETS_APPROVED ?? "false") === "true"
    );
  }

  private async heliusReachable(config = normalizeHeliusConfig()) {
    if (!config.heliusApiKey || !config.heliusRpcUrl || config.errorCode) {
      setLastHeliusErrorCode(config.errorCode);
      return false;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(config.heliusRpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(heliusGetAssetBody("11111111111111111111111111111111")),
        signal: controller.signal
      });
      if (response.status === 401 || response.status === 403) {
        setLastHeliusErrorCode("HELIUS_AUTH_FAILED");
        return false;
      }
      if (response.status === 429) {
        setLastHeliusErrorCode("HELIUS_RATE_LIMITED");
        return false;
      }
      if (!response.ok) {
        setLastHeliusErrorCode("HELIUS_ERROR");
        return false;
      }
      const payload = (await response.json()) as { result?: string; error?: unknown };
      if (payload.error) {
        setLastHeliusErrorCode("TOKEN_NOT_INDEXED");
        return true;
      }
      setLastHeliusErrorCode(undefined);
      return true;
    } catch {
      setLastHeliusErrorCode("HELIUS_UNREACHABLE");
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async programAccountStatus() {
    const programId = process.env.PROGRAM_ID;
    if (!programId || programId === PLACEHOLDER_PROGRAM_ID) return { exists: false, executable: false };
    try {
      const key = new PublicKey(programId);
      if (key.equals(SystemProgram.programId)) return { exists: false, executable: false };
      const info = await Promise.race([
        new Connection(this.rpcUrl(), "confirmed").getAccountInfo(key, "confirmed"),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), this.capabilityTimeoutMs()))
      ]);
      return { exists: Boolean(info), executable: Boolean(info?.executable) };
    } catch (error) {
      this.logCapabilityFailure("program_account_status", error, { programId, rpcUrl: this.sanitizedRpcUrl() });
      return { exists: false, executable: false };
    }
  }

  private capabilityTimeoutMs() {
    return Number(process.env.CAPABILITY_CHECK_TIMEOUT_MS ?? 2500);
  }

  private logCapabilityFailure(stage: string, error: unknown, context: Record<string, unknown> = {}) {
    const detail = error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) };
    console.error("[capabilities] check failed", { stage, ...context, error: detail });
  }

  private cluster() {
    const explicit = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? process.env.SOLANA_CLUSTER ?? "").toLowerCase();
    const rpc = this.rpcUrl().toLowerCase();
    if (explicit === "mainnet-beta" || rpc.includes("mainnet")) return "mainnet-beta";
    if (explicit === "localnet" || rpc.includes("localhost") || rpc.includes("127.0.0.1")) return "localnet";
    return "devnet";
  }

  private rpcUrl() {
    return process.env.SOLANA_RPC_URL ?? process.env.ANCHOR_PROVIDER_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  }

  private sanitizedRpcUrl() {
    try {
      const url = new URL(this.rpcUrl());
      if (url.search) url.search = "?...";
      return url.toString();
    } catch {
      return this.rpcUrl().replace(/api-key=[^&]+/i, "api-key=...");
    }
  }

  private diagnosticEnvKeys() {
    return [
      "HELIUS_API_KEY",
      "HELIUS_RPC_URL",
      "SOLANA_RPC_URL",
      "ANCHOR_PROVIDER_URL",
      "PROGRAM_ID",
      "NEXT_PUBLIC_PROGRAM_ID",
      "SOLANA_TRANSACTION_PROVIDER",
      "METAPLEX_NFT_STANDARD",
      "FINAL_ASSET_STORAGE_PROVIDER",
      "FINAL_RENDER_STORAGE_ROOT",
      "CURATED_LAYER_PACK_MANIFEST_URI",
      "CURATED_LAYER_PACK_ROOT",
      "APPROVED_LAYER_PACK_ID",
      "DEMO_CURATED_LAYER_PACK",
      "AI_ASSISTED_FINAL_ASSETS_APPROVED",
      "STUDIO_PROVIDER",
      "GEMINI_API_KEY",
      "GEMINI_IMAGE_MODEL",
      "GEMINI_IMAGE_TIMEOUT_MS",
      "GEMINI_IMAGE_ESTIMATED_COST_USD",
      "CINEMATIC_PROVIDER",
      "AI_CONCEPT_PROVIDER",
      "AI_CONCEPT_LOW_COST_MODE",
      "AI_CONCEPT_MAX_IMAGES_PER_RUN",
      "AI_CONCEPT_CACHE_TTL",
      "AI_CONCEPT_REQUIRE_CONFIRMATION_ABOVE_IMAGE_COUNT",
      "LOCAL_PREVIEW_PROVIDER",
      "PINATA_JWT",
      "IRYS_PRIVATE_KEY",
      "ARWEAVE_KEY",
      "DATABASE_URL",
      "DIRECT_URL",
      "POSTGRES_URL",
      "POSTGRES_PRISMA_URL",
      "POSTGRES_URL_NON_POOLING",
      "POSTGRES_PASSWORD"
    ];
  }

  private includeTechnicalDiagnostics() {
    return (process.env.NODE_ENV ?? "development") !== "production" || (process.env.ENABLE_PUBLIC_TECHNICAL_DIAGNOSTICS ?? "false") === "true";
  }

  private publicReadiness(capabilities: SystemCapabilities, setupModes: SetupMode[]) {
    const creativePreviewReady = setupModes.find((mode) => mode.id === "creative-preview")?.ready ?? false;
    const launchAvailable = Boolean(setupModes.find((mode) => mode.id === "devnet-test-launch")?.ready || setupModes.find((mode) => mode.id === "production-launch")?.ready);
    return {
      professionalPreviewReady: creativePreviewReady,
      launchAvailable,
      mintingAvailable: launchAvailable && capabilities.productionStorageAvailable,
      creatorSetupRequired: !launchAvailable,
      messages: [
        creativePreviewReady ? "Fast Studio Preview ready" : "Fast Studio Preview not ready yet",
        launchAvailable ? "Launch path available" : "Launch is not available yet",
        launchAvailable && capabilities.productionStorageAvailable ? "Minting setup ready" : "Minting is temporarily unavailable",
        launchAvailable ? "Ready for creator review" : "Creator setup required"
      ]
    };
  }

  private publicWarnings(capabilities: SystemCapabilities, setupModes: SetupMode[]) {
    return this.publicReadiness(capabilities, setupModes).messages.filter((message) =>
      message === "Fast Studio Preview not ready yet" ||
      message === "Launch is not available yet" ||
      message === "Minting is temporarily unavailable" ||
      message === "Creator setup required"
    );
  }

  private publicSetupModes(capabilities: SystemCapabilities, setupModes: SetupMode[]): SetupMode[] {
    const readiness = this.publicReadiness(capabilities, setupModes);
    return [
      {
        id: "creative-preview",
        label: "Creative Preview",
        ready: readiness.professionalPreviewReady,
        output: readiness.professionalPreviewReady ? "Fast Studio Preview ready." : "Fast Studio Preview not ready yet.",
        missing: readiness.professionalPreviewReady ? [] : ["Fast Studio Preview not ready yet"],
        blockedBy: readiness.professionalPreviewReady ? [] : ["Creator setup required"]
      },
      {
        id: "devnet-test-launch",
        label: "Launch Readiness",
        ready: readiness.launchAvailable,
        output: readiness.launchAvailable ? "Launch path available." : "Launch is not available yet.",
        missing: readiness.launchAvailable ? [] : ["Launch is not available yet"],
        blockedBy: readiness.launchAvailable ? [] : ["Creator setup required"]
      },
      {
        id: "production-launch",
        label: "Minting Readiness",
        ready: readiness.mintingAvailable,
        output: readiness.mintingAvailable ? "Minting setup ready." : "Minting is temporarily unavailable.",
        missing: readiness.mintingAvailable ? [] : ["Minting is temporarily unavailable"],
        blockedBy: readiness.mintingAvailable ? [] : ["Creator setup required"]
      }
    ];
  }

  private publicSetupChecklist(capabilities: SystemCapabilities, setupModes: SetupMode[]) {
    const readiness = this.publicReadiness(capabilities, setupModes);
    return {
      storageProvider: "managed",
      creativePreviewReady: readiness.professionalPreviewReady,
      devnetLaunchReady: readiness.launchAvailable,
      productionLaunchReady: readiness.launchAvailable && readiness.mintingAvailable,
      items: [
        {
          key: "PROFESSIONAL_PREVIEW",
          label: "Fast Studio Preview",
          ok: readiness.professionalPreviewReady,
          requiredFor: ["Creative Preview"],
          fix: "Fast Studio Preview not ready yet."
        },
        {
          key: "LAUNCH_AVAILABILITY",
          label: "Launch availability",
          ok: readiness.launchAvailable,
          requiredFor: ["Launch"],
          fix: "Launch is not available yet."
        },
        {
          key: "MINTING_AVAILABILITY",
          label: "Minting availability",
          ok: readiness.mintingAvailable,
          requiredFor: ["Minting"],
          fix: "Minting is temporarily unavailable."
        },
        {
          key: "CREATOR_SETUP",
          label: "Creator setup",
          ok: !readiness.creatorSetupRequired,
          requiredFor: ["Creator Review"],
          fix: "Creator setup required."
        }
      ]
    };
  }

  private publicCapabilities(capabilities: SystemCapabilities, setupModes: SetupMode[]) {
    const readiness = this.publicReadiness(capabilities, setupModes);
    return {
      professionalPreviewReady: readiness.professionalPreviewReady,
      geminiImagesAvailable: capabilities.geminiImagesAvailable,
      fastStudioPreviewAvailable: capabilities.fastStudioPreviewAvailable,
      premiumCinematicAvailable: capabilities.premiumCinematicAvailable,
      launchAvailable: readiness.launchAvailable,
      mintingAvailable: readiness.mintingAvailable,
      creatorSetupRequired: readiness.creatorSetupRequired
    };
  }

  private setupModes(capabilities: SystemCapabilities): SetupMode[] {
    const studioProvider = this.studioProvider();
    const creativeMissing = [
      ...(studioProvider === "gemini" && !capabilities.geminiImagesAvailable ? ["GEMINI_API_KEY"] : []),
      ...(studioProvider === "gemini" && capabilities.geminiImagesAvailable && !this.studioImageGenerationEnabled() ? ["ENABLE_STUDIO_IMAGE_GENERATION=true"] : []),
      ...(studioProvider === "openai" ? ["STUDIO_PROVIDER must be gemini or deterministic-render"] : [])
    ];
    const devnetLayerPackReady = this.realApprovedLayerPackAvailable() || capabilities.demoCuratedLayerPackAllowed;
    const devnetMissing = [
      ...(capabilities.devnetProgramConfigured ? [] : ["PROGRAM_ID"]),
      ...(capabilities.programAccountExecutable ? [] : ["deployed executable program account"]),
      ...(capabilities.solanaRpcConfigured ? [] : ["SOLANA_RPC_URL"]),
      ...(capabilities.solanaTransactionProviderDevnet ? [] : ["SOLANA_TRANSACTION_PROVIDER=devnet"]),
      ...(capabilities.permanentStorageConfigured ? [] : ["PINATA_JWT or permanent storage provider credentials"]),
      ...(devnetLayerPackReady ? [] : ["approved curated layer pack or DEMO_CURATED_LAYER_PACK=true"])
    ];
    const productionMissing = [
      ...(capabilities.devnetProgramConfigured ? [] : ["PROGRAM_ID"]),
      ...(capabilities.programAccountExecutable ? [] : ["deployed executable program account"]),
      ...(capabilities.solanaRpcConfigured ? [] : ["SOLANA_RPC_URL"]),
      ...(capabilities.permanentStorageConfigured ? [] : ["PINATA_JWT or permanent storage provider credentials"]),
      ...(this.realApprovedLayerPackAvailable() ? [] : ["approved curated layer pack"]),
      ...(this.finalAssetApprovalGateSatisfied() ? [] : ["launch gate status satisfied"])
    ];
    return [
      {
        id: "creative-preview",
        label: "Creative Preview Mode",
        ready: creativeMissing.length === 0,
        output: "Fast Studio Preview produces Studio Bible sheets for creator review; final exports still require approved transparent layers.",
        missing: creativeMissing,
        blockedBy: creativeMissing
      },
      {
        id: "devnet-test-launch",
        label: "Devnet Test Launch Mode",
        ready: devnetMissing.length === 0,
        output: "Test collection launch on devnet with curated demo/final layer rendering.",
        missing: devnetMissing,
        blockedBy: devnetMissing
      },
      {
        id: "production-launch",
        label: "Production Launch Mode",
        ready: productionMissing.length === 0 && !capabilities.demoCuratedLayerPackEnabled,
        output: "Production-ready collection launch using real curated or artist-approved assets.",
        missing: capabilities.demoCuratedLayerPackEnabled ? [...productionMissing, "disable DEMO_CURATED_LAYER_PACK"] : productionMissing,
        blockedBy: capabilities.demoCuratedLayerPackEnabled ? [...productionMissing, "DEMO_CURATED_LAYER_PACK is devnet demo only"] : productionMissing
      }
    ];
  }

  private setupChecklist(capabilities: SystemCapabilities, setupModes: SetupMode[]) {
    const storageProvider = process.env.FINAL_ASSET_STORAGE_PROVIDER ?? process.env.ASSET_STORAGE_PROVIDER ?? "mock";
    const storageCredential =
      storageProvider === "pinata"
        ? "PINATA_JWT"
        : storageProvider === "supabase"
          ? "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
          : storageProvider === "arweave" || storageProvider === "irys"
            ? "IRYS_PRIVATE_KEY or ARWEAVE_KEY"
            : "FINAL_ASSET_STORAGE_PROVIDER=pinata plus PINATA_JWT";
    return {
      storageProvider,
      creativePreviewReady: setupModes.find((mode) => mode.id === "creative-preview")?.ready ?? false,
      devnetLaunchReady: setupModes.find((mode) => mode.id === "devnet-test-launch")?.ready ?? false,
      productionLaunchReady: setupModes.find((mode) => mode.id === "production-launch")?.ready ?? false,
      items: [
        {
          key: "STUDIO_PROVIDER",
          label: "STUDIO_PROVIDER",
          ok: this.studioProvider() !== "openai",
          requiredFor: ["Creative Preview Mode"],
          fix: "Set STUDIO_PROVIDER=gemini for Fast Studio Preview sheets. OpenAI is reserved for Premium Cinematic Render."
        },
        {
          key: "GEMINI_API_KEY",
          label: "GEMINI_API_KEY",
          ok: capabilities.geminiImagesAvailable || this.studioProvider() === "deterministic-render",
          requiredFor: ["Creative Preview Mode"],
          fix: "Add GEMINI_API_KEY to use Gemini image sheets. Deterministic local sheets are not used as creator-facing Gemini substitutes."
        },
        {
          key: "ENABLE_STUDIO_IMAGE_GENERATION",
          label: "ENABLE_STUDIO_IMAGE_GENERATION",
          ok: this.studioProvider() !== "gemini" || this.studioImageGenerationEnabled(),
          requiredFor: ["Creative Preview Mode"],
          fix: "Set ENABLE_STUDIO_IMAGE_GENERATION=true or ENABLE_AI_IMAGE_GENERATION=true so Fast Studio Preview can call Gemini."
        },
        {
          key: "CINEMATIC_PROVIDER",
          label: "CINEMATIC_PROVIDER",
          ok: this.cinematicProvider() !== "openai" || capabilities.openaiImagesAvailable,
          requiredFor: ["Premium Cinematic Render"],
          fix: "Set CINEMATIC_PROVIDER=openai plus OPENAI_API_KEY only for explicit hero/key-art renders."
        },
        {
          key: "PROGRAM_ID",
          label: "PROGRAM_ID",
          ok: capabilities.devnetProgramConfigured,
          requiredFor: ["Devnet Test Launch Mode", "Production Launch Mode"],
          fix: "Set PROGRAM_ID to the deployed program id; do not use 11111111111111111111111111111111."
        },
        {
          key: "SOLANA_RPC_URL",
          label: "SOLANA_RPC_URL",
          ok: capabilities.solanaRpcConfigured,
          requiredFor: ["Devnet Test Launch Mode", "Production Launch Mode"],
          fix: "Set SOLANA_RPC_URL to a devnet/mainnet RPC endpoint."
        },
        {
          key: "SOLANA_TRANSACTION_PROVIDER",
          label: "SOLANA_TRANSACTION_PROVIDER",
          ok: capabilities.solanaTransactionProviderDevnet,
          requiredFor: ["Devnet Test Launch Mode"],
          fix: "Set SOLANA_TRANSACTION_PROVIDER=devnet."
        },
        {
          key: "PINATA_JWT_OR_STORAGE_PROVIDER",
          label: "PINATA_JWT or storage provider",
          ok: capabilities.permanentStorageConfigured,
          requiredFor: ["Devnet Test Launch Mode", "Production Launch Mode"],
          fix: `Configure permanent storage. Current provider is ${storageProvider}; required credential is ${storageCredential}.`
        },
        {
          key: "APPROVED_CURATED_LAYER_PACK",
          label: "approved curated layer pack",
          ok: this.realApprovedLayerPackAvailable(),
          requiredFor: ["Production Launch Mode"],
          fix: "Set CURATED_LAYER_PACK_MANIFEST_URI, CURATED_LAYER_PACK_ROOT, or APPROVED_LAYER_PACK_ID."
        },
        {
          key: "DEMO_CURATED_LAYER_PACK",
          label: "DEMO_CURATED_LAYER_PACK",
          ok: capabilities.demoCuratedLayerPackAllowed,
          requiredFor: ["Devnet Test Launch Mode"],
          fix: "For local/devnet testing only, set DEMO_CURATED_LAYER_PACK=true. It is blocked in production."
        }
      ]
    };
  }

  private warnings(capabilities: SystemCapabilities) {
    const warnings: string[] = [];
    if (!capabilities.databaseAvailable) warnings.push("Database is unavailable; public reads use empty states and writes are blocked.");
    if (!capabilities.heliusConfigured) warnings.push("HELIUS_API_KEY is missing; CA-first token scanning is blocked.");
    if (capabilities.heliusConfigured && !capabilities.heliusReachable) warnings.push(`Helius is configured but unreachable or unhealthy${getLastHeliusErrorCode() ? ` (${getLastHeliusErrorCode()})` : ""}.`);
    if (this.studioProvider() === "openai") warnings.push("STUDIO_PROVIDER=openai is not allowed for Studio Bible generation; use gemini or deterministic-render.");
    if (this.studioProvider() === "gemini" && !capabilities.geminiImagesAvailable) warnings.push("GEMINI_API_KEY is missing; Fast Studio Preview will not emit creator-facing Studio Bible sheets until Gemini image generation is configured.");
    if (this.studioProvider() === "gemini" && capabilities.geminiImagesAvailable && !this.studioImageGenerationEnabled()) warnings.push("Gemini Studio Bible generation is disabled; set ENABLE_STUDIO_IMAGE_GENERATION=true or ENABLE_AI_IMAGE_GENERATION=true.");
    if (this.cinematicProvider() === "openai" && !capabilities.openaiImagesAvailable) warnings.push("Premium Cinematic Render is configured for OpenAI but OPENAI_API_KEY is missing.");
    if (!capabilities.permanentStorageConfigured) warnings.push("Permanent storage is not configured; launch and final mint assets are blocked.");
    if (!this.realApprovedLayerPackAvailable()) warnings.push(capabilities.demoCuratedLayerPackAllowed ? "Using devnet demo layer pack; production launch remains blocked until a real curated or artist-approved layer pack is configured." : "Approved curated layer pack is missing; production launch is blocked.");
    if (capabilities.demoCuratedLayerPackEnabled && !capabilities.demoCuratedLayerPackAllowed) warnings.push("DEMO_CURATED_LAYER_PACK is enabled but blocked in production.");
    if (!capabilities.walletConfigured) warnings.push("Founder wallet is not configured; wallet-required actions need a connected wallet.");
    if (!capabilities.devnetProgramConfigured) warnings.push("PROGRAM_ID is missing or placeholder; devnet actions are disabled.");
    if (capabilities.devnetProgramConfigured && !capabilities.programAccountExecutable) warnings.push("PROGRAM_ID is configured but no executable program account was found on the configured RPC/cluster.");
    if (!capabilities.tokenMetadataAvailable) warnings.push("Token metadata/logo writes need Solana plus permanent asset storage.");
    return warnings;
  }
}
