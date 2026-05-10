import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { WalletAddress } from "../auth/wallet-address.decorator";
import { WalletAuthGuard } from "../auth/wallet-auth.guard";
import type { ApproveGenerationRunInput, CreateGenerationRunInput, LaunchCollectionInput, StudioWorkflowInput, SubmitCollectionLaunchInput } from "./generator.types";
import { GeneratorService } from "./generator.service";

const runSchema = z.object({
  tokenName: z.string().min(1).optional(),
  tokenSymbol: z.string().min(1).optional(),
  tokenMint: z.string().min(20),
  logoUri: z.string().optional(),
  logoData: z.string().optional(),
  description: z.string().min(1).optional(),
  selectedPreset: z.string().optional(),
  hints: z.record(z.string(), z.unknown()).optional()
});

const approveSchema = z.object({
  explicitConfirmation: z.boolean(),
  acceptedVersion: z.number().int().positive().optional()
});

const studioActionSchema = z.object({
  action: z.enum([
    "lock-art-direction",
    "lock-style",
    "lock-mood",
    "lock-rarity-direction",
    "regenerate-rarity-tier",
    "regenerate-mood-set",
    "regenerate-legendary-scene",
    "approve-silhouette-system",
    "approve-faction-culture",
    "approve-trait-family",
    "approve-cinematic-direction"
  ]),
  target: z.string().optional(),
  note: z.string().optional()
});

const launchSchema = z.object({
  slug: z.string().optional(),
  collectionAssetAddress: z.string().optional(),
  metadataUri: z.string().optional()
});

const submitLaunchSchema = z.object({
  signedTransactionBase64: z.string().optional(),
  signedTransaction: z.string().optional(),
  txSignature: z.string().optional()
});

@Controller("generator")
export class GeneratorController {
  constructor(@Inject(GeneratorService) private readonly generator: GeneratorService) {}

  @Get("presets")
  presets() {
    return this.generator.presets();
  }

  @Post("runs")
  @UseGuards(WalletAuthGuard)
  createRun(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.generator.createRun(runSchema.parse(body) as CreateGenerationRunInput, walletAddress);
  }

  @Post("preview")
  preview(@Body() body: unknown) {
    const parsed = runSchema.parse(body);
    return this.generator.preview(parsed as CreateGenerationRunInput);
  }

  @Post("ai-concept/validate-request")
  validateAiConceptRequest(@Body() body: unknown) {
    const parsed = runSchema.parse(body);
    return this.generator.validateAiConceptRequest(parsed as CreateGenerationRunInput);
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

  @Post("runs/:id/premium-cinematic")
  @UseGuards(WalletAuthGuard)
  premiumCinematicRender(@Param("id") id: string, @WalletAddress() walletAddress: string) {
    return this.generator.premiumCinematicRender(id, walletAddress);
  }

  @Post("runs/:id/studio-action")
  @UseGuards(WalletAuthGuard)
  studioAction(@Param("id") id: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.generator.studioAction(id, { ...(studioActionSchema.parse(body) as StudioWorkflowInput), walletAddress });
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

  @Post("runs/:id/launch-collection/build")
  @UseGuards(WalletAuthGuard)
  buildCollectionLaunch(@Param("id") id: string, @WalletAddress() walletAddress: string) {
    return this.generator.buildCollectionLaunch(id, walletAddress);
  }

  @Post("runs/:id/launch-collection/submit")
  @UseGuards(WalletAuthGuard)
  submitCollectionLaunch(@Param("id") id: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    const parsed = submitLaunchSchema.parse(body);
    return this.generator.submitCollectionLaunch(id, {
      ...(parsed as SubmitCollectionLaunchInput),
      signedTransaction: parsed.signedTransaction ?? parsed.signedTransactionBase64,
      walletAddress
    });
  }

  @Post("runs/:id/sample-metadata")
  @UseGuards(WalletAuthGuard)
  sampleMetadata(@Param("id") id: string, @WalletAddress() walletAddress: string) {
    return this.generator.sampleMetadata(id, walletAddress);
  }
}
