import { Inject, Injectable } from "@nestjs/common";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { PrismaService } from "../db/prisma.service";
import { isDatabaseSetupError } from "../db/database-errors";
import { loadedLocalEnvFiles } from "../env/load-local-env";
import { startupState } from "../env/startup-state";

export type SystemCapabilities = {
  databaseAvailable: boolean;
  heliusConfigured: boolean;
  heliusReachable: boolean;
  heliusAvailable: boolean;
  openaiImagesAvailable: boolean;
  pinataAvailable: boolean;
  solanaAvailable: boolean;
  walletConfigured: boolean;
  devnetProgramConfigured: boolean;
  programAccountExists: boolean;
  programAccountExecutable: boolean;
  aiGenerationEnabled: boolean;
  productionStorageAvailable: boolean;
  tokenMetadataAvailable: boolean;
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
    const [databaseAvailable, heliusReachable, programAccount] = await Promise.all([
      this.databaseAvailable(),
      this.heliusReachable(),
      this.programAccountStatus()
    ]);
    const heliusConfigured = Boolean(process.env.HELIUS_API_KEY);
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
        openaiImagesAvailable: Boolean(process.env.OPENAI_API_KEY),
        pinataAvailable: Boolean(process.env.PINATA_JWT),
        solanaAvailable: this.solanaAvailable(),
        walletConfigured: Boolean(process.env.DEVNET_TEST_WALLET_PUBLIC_KEY || process.env.ANCHOR_WALLET),
        devnetProgramConfigured: this.devnetProgramConfigured(),
        programAccountExists: programAccount.exists,
        programAccountExecutable: programAccount.executable,
        aiGenerationEnabled: (process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true",
        productionStorageAvailable: this.productionStorageAvailable(),
        tokenMetadataAvailable: this.tokenMetadataAvailable(heliusConfigured && heliusReachable, programAccount.executable)
      })
    };
  }

  async status() {
    const [databaseAvailable, heliusReachable, programAccount] = await Promise.all([
      this.databaseAvailable(),
      this.heliusReachable(),
      this.programAccountStatus()
    ]);
    const heliusConfigured = Boolean(process.env.HELIUS_API_KEY);
    const capabilities: SystemCapabilities = {
      databaseAvailable,
      heliusConfigured,
      heliusReachable,
      heliusAvailable: heliusConfigured && heliusReachable,
      openaiImagesAvailable: Boolean(process.env.OPENAI_API_KEY),
      pinataAvailable: Boolean(process.env.PINATA_JWT),
      solanaAvailable: this.solanaAvailable(),
      walletConfigured: Boolean(process.env.DEVNET_TEST_WALLET_PUBLIC_KEY || process.env.ANCHOR_WALLET),
      devnetProgramConfigured: this.devnetProgramConfigured(),
      programAccountExists: programAccount.exists,
      programAccountExecutable: programAccount.executable,
      aiGenerationEnabled: (process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true",
      productionStorageAvailable: this.productionStorageAvailable(),
      tokenMetadataAvailable: this.tokenMetadataAvailable(heliusConfigured && heliusReachable, programAccount.executable)
    };

    const warnings = this.warnings(capabilities);
    return {
      ok: true,
      mode: process.env.APP_MODE ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
      singleUserMode: (process.env.SINGLE_USER_MODE ?? "false") === "true",
      rpcUrl: this.sanitizedRpcUrl(),
      cluster: this.cluster(),
      programId: process.env.PROGRAM_ID ?? null,
      capabilities,
      warnings
    };
  }

  async diagnostics() {
    const status = await this.status();
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
          PROGRAM_ID: process.env.PROGRAM_ID ?? null,
          SOLANA_RPC_URL: this.sanitizedRpcUrl()
        }
      },
      capabilities: status.capabilities,
      warnings: status.warnings
    };
  }

  private async databaseAvailable() {
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

  private devnetProgramConfigured() {
    const programId = process.env.PROGRAM_ID;
    return Boolean(programId && programId !== PLACEHOLDER_PROGRAM_ID);
  }

  private productionStorageAvailable() {
    const provider = process.env.FINAL_ASSET_STORAGE_PROVIDER ?? process.env.ASSET_STORAGE_PROVIDER;
    if (provider === "pinata") return Boolean(process.env.PINATA_JWT);
    if (provider === "arweave" || provider === "irys") return Boolean(process.env.IRYS_PRIVATE_KEY || process.env.ARWEAVE_KEY);
    if (provider === "supabase") return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    return false;
  }

  private tokenMetadataAvailable(heliusAvailable: boolean, programExecutable: boolean) {
    return heliusAvailable && this.productionStorageAvailable() && this.solanaAvailable() && this.devnetProgramConfigured() && programExecutable;
  }

  private async heliusReachable() {
    const apiKey = process.env.HELIUS_API_KEY;
    if (!apiKey) return false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(this.heliusRpcUrl(apiKey), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "phew-health", method: "getHealth" }),
        signal: controller.signal
      });
      if (response.status === 429) return false;
      if (!response.ok) return false;
      const payload = (await response.json()) as { result?: string; error?: unknown };
      return !payload.error && payload.result === "ok";
    } catch {
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
      const info = await new Connection(this.rpcUrl(), "confirmed").getAccountInfo(key, "confirmed");
      return { exists: Boolean(info), executable: Boolean(info?.executable) };
    } catch {
      return { exists: false, executable: false };
    }
  }

  private heliusRpcUrl(apiKey: string) {
    return `https://${this.cluster() === "mainnet-beta" ? "mainnet" : "devnet"}.helius-rpc.com/?api-key=${encodeURIComponent(apiKey)}`;
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
      "SOLANA_RPC_URL",
      "ANCHOR_PROVIDER_URL",
      "PROGRAM_ID",
      "NEXT_PUBLIC_PROGRAM_ID",
      "SOLANA_TRANSACTION_PROVIDER",
      "METAPLEX_NFT_STANDARD",
      "FINAL_ASSET_STORAGE_PROVIDER",
      "PINATA_JWT",
      "IRYS_PRIVATE_KEY",
      "ARWEAVE_KEY",
      "DATABASE_URL",
      "DIRECT_URL"
    ];
  }

  private warnings(capabilities: SystemCapabilities) {
    const warnings: string[] = [];
    if (!capabilities.databaseAvailable) warnings.push("Database is unavailable; public reads use empty states and writes are blocked.");
    if (!capabilities.heliusConfigured) warnings.push("HELIUS_API_KEY is missing; CA-first token scanning is blocked.");
    if (capabilities.heliusConfigured && !capabilities.heliusReachable) warnings.push("HELIUS_API_KEY is set but Helius is unreachable or unhealthy.");
    if (capabilities.aiGenerationEnabled && !capabilities.openaiImagesAvailable) warnings.push("AI image generation is enabled but OPENAI_API_KEY is not configured.");
    if (!capabilities.pinataAvailable) warnings.push("Pinata is not configured; final immutable asset uploads are blocked.");
    if (!capabilities.walletConfigured) warnings.push("Founder wallet is not configured; wallet-required actions need a connected wallet.");
    if (!capabilities.devnetProgramConfigured) warnings.push("PROGRAM_ID is missing or placeholder; devnet actions are disabled.");
    if (capabilities.devnetProgramConfigured && !capabilities.programAccountExecutable) warnings.push("PROGRAM_ID is configured but no executable program account was found on the configured RPC/cluster.");
    if (!capabilities.tokenMetadataAvailable) warnings.push("Token metadata/logo writes need Solana plus permanent asset storage.");
    return warnings;
  }
}
