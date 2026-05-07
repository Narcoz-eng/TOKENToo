import { Injectable } from "@nestjs/common";
import { PrismaService } from "../db/prisma.service";
import { isDatabaseSetupError } from "../db/database-errors";

export type SystemCapabilities = {
  databaseAvailable: boolean;
  openaiImagesAvailable: boolean;
  pinataAvailable: boolean;
  solanaAvailable: boolean;
  walletConfigured: boolean;
  devnetProgramConfigured: boolean;
  aiGenerationEnabled: boolean;
  productionStorageAvailable: boolean;
  tokenMetadataAvailable: boolean;
};

const PLACEHOLDER_PROGRAM_ID = "11111111111111111111111111111111";

@Injectable()
export class CapabilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async status() {
    const databaseAvailable = await this.databaseAvailable();
    const capabilities: SystemCapabilities = {
      databaseAvailable,
      openaiImagesAvailable: Boolean(process.env.OPENAI_API_KEY),
      pinataAvailable: Boolean(process.env.PINATA_JWT),
      solanaAvailable: this.solanaAvailable(),
      walletConfigured: Boolean(process.env.DEVNET_TEST_WALLET_PUBLIC_KEY || process.env.ANCHOR_WALLET),
      devnetProgramConfigured: this.devnetProgramConfigured(),
      aiGenerationEnabled: (process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true",
      productionStorageAvailable: this.productionStorageAvailable(),
      tokenMetadataAvailable: this.tokenMetadataAvailable()
    };

    const warnings = this.warnings(capabilities);
    return {
      ok: true,
      mode: process.env.APP_MODE ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
      singleUserMode: (process.env.SINGLE_USER_MODE ?? "false") === "true",
      capabilities,
      warnings
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

  private tokenMetadataAvailable() {
    return this.productionStorageAvailable() && this.solanaAvailable() && this.devnetProgramConfigured();
  }

  private warnings(capabilities: SystemCapabilities) {
    const warnings: string[] = [];
    if (!capabilities.databaseAvailable) warnings.push("Database is unavailable; public reads use empty states and writes are blocked.");
    if (capabilities.aiGenerationEnabled && !capabilities.openaiImagesAvailable) warnings.push("AI image generation is enabled but OPENAI_API_KEY is not configured.");
    if (!capabilities.pinataAvailable) warnings.push("Pinata is not configured; final immutable asset uploads are blocked.");
    if (!capabilities.walletConfigured) warnings.push("Founder wallet is not configured; wallet-required actions need a connected wallet.");
    if (!capabilities.devnetProgramConfigured) warnings.push("PROGRAM_ID is missing or placeholder; devnet actions are disabled.");
    if (!capabilities.tokenMetadataAvailable) warnings.push("Token metadata/logo writes need Solana plus permanent asset storage.");
    return warnings;
  }
}
