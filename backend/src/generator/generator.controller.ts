import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { WalletAddress } from "../auth/wallet-address.decorator";
import { WalletAuthGuard } from "../auth/wallet-auth.guard";
import type { ApproveGenerationRunInput, CreateGenerationRunInput, LaunchCollectionInput } from "./generator.types";
import { GeneratorService } from "./generator.service";

const runSchema = z.object({
  tokenName: z.string().min(1),
  tokenSymbol: z.string().min(1),
  tokenMint: z.string().min(20),
  logoUri: z.string().optional(),
  logoData: z.string().optional(),
  description: z.string().min(1),
  selectedPreset: z.string().optional(),
  hints: z.record(z.string(), z.unknown()).optional()
});

const approveSchema = z.object({
  explicitConfirmation: z.boolean(),
  acceptedVersion: z.number().int().positive().optional()
});

const launchSchema = z.object({
  slug: z.string().optional(),
  collectionAssetAddress: z.string().optional(),
  metadataUri: z.string().optional()
});

@Controller("generator")
export class GeneratorController {
  constructor(private readonly generator: GeneratorService) {}

  @Get("presets")
  presets() {
    return this.generator.presets();
  }

  @Post("runs")
  @UseGuards(WalletAuthGuard)
  createRun(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.generator.createRun(runSchema.parse(body) as CreateGenerationRunInput, walletAddress);
  }

  @Get("runs/:id")
  @UseGuards(WalletAuthGuard)
  getRun(@Param("id") id: string, @WalletAddress() walletAddress: string) {
    return this.generator.getRunForWallet(id, walletAddress);
  }

  @Post("runs/:id/regenerate-style")
  @UseGuards(WalletAuthGuard)
  regenerateStyle(@Param("id") id: string, @WalletAddress() walletAddress: string) {
    return this.generator.regenerateStyle(id, walletAddress);
  }

  @Post("runs/:id/regenerate-previews")
  @UseGuards(WalletAuthGuard)
  regeneratePreviews(@Param("id") id: string, @WalletAddress() walletAddress: string) {
    return this.generator.regeneratePreviews(id, walletAddress);
  }

  @Post("runs/:id/approve")
  @UseGuards(WalletAuthGuard)
  approve(@Param("id") id: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.generator.approve(id, { ...(approveSchema.parse(body) as ApproveGenerationRunInput), walletAddress });
  }

  @Post("runs/:id/launch-collection")
  @UseGuards(WalletAuthGuard)
  launchCollection(@Param("id") id: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.generator.launchCollection(id, { ...(launchSchema.parse(body) as LaunchCollectionInput), walletAddress });
  }

  @Post("runs/:id/sample-metadata")
  @UseGuards(WalletAuthGuard)
  sampleMetadata(@Param("id") id: string, @WalletAddress() walletAddress: string) {
    return this.generator.sampleMetadata(id, walletAddress);
  }
}
