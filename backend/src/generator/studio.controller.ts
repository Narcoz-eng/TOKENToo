import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { WalletAddress } from "../auth/wallet-address.decorator";
import { WalletAuthGuard } from "../auth/wallet-auth.guard";
import type { CreateGenerationRunInput } from "./generator.types";
import { GeneratorService } from "./generator.service";
import { ProviderCostGuard } from "./provider-abstractions";

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

const premiumGenerateSchema = runSchema.extend({
  explicitPaidAiConfirmation: z.boolean()
});

const updateProjectSchema = z.object({
  description: z.string().min(1).optional(),
  selectedPreset: z.string().min(1).optional(),
  hints: z.record(z.string(), z.unknown()).optional()
});

const approveTraitsSchema = z.object({
  note: z.string().optional()
});

@Controller("studio")
export class StudioController {
  constructor(@Inject(GeneratorService) private readonly generator: GeneratorService) {}

  @Post("preview/free")
  freePreview(@Body() body: unknown) {
    return this.generator.preview(runSchema.parse(body) as CreateGenerationRunInput);
  }

  @Post("preview/premium-estimate")
  premiumEstimate(@Body() body: unknown) {
    return this.generator.validateAiConceptRequest(runSchema.parse(body) as CreateGenerationRunInput);
  }

  @Post("preview/premium-generate")
  @UseGuards(WalletAuthGuard)
  premiumGenerate(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    const parsed = premiumGenerateSchema.parse(body);
    new ProviderCostGuard().assertAllowed({
      provider: process.env.STUDIO_IMAGE_PROVIDER ?? process.env.STUDIO_PROVIDER ?? "deterministic-render",
      kind: "premium_image",
      estimatedCostUsd: 0,
      explicitUserAction: parsed.explicitPaidAiConfirmation
    });
    const { explicitPaidAiConfirmation, ...input } = parsed;
    void explicitPaidAiConfirmation;
    return this.generator.createRun(input as CreateGenerationRunInput, walletAddress);
  }

  @Get("projects")
  @UseGuards(WalletAuthGuard)
  projects(@WalletAddress() walletAddress: string) {
    return this.generator.listProjectsForWallet(walletAddress);
  }

  @Get("projects/:id")
  @UseGuards(WalletAuthGuard)
  project(@Param("id") id: string, @WalletAddress() walletAddress: string) {
    return this.generator.getRunForWallet(id, walletAddress);
  }

  @Patch("projects/:id")
  @UseGuards(WalletAuthGuard)
  updateProject(@Param("id") id: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.generator.updateProject(id, updateProjectSchema.parse(body), walletAddress);
  }

  @Post("projects/:id/approve-traits")
  @UseGuards(WalletAuthGuard)
  approveTraits(@Param("id") id: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.generator.approveTraits(id, walletAddress, approveTraitsSchema.parse(body ?? {}).note);
  }

  @Post("projects/:id/approve-layer-pack")
  @UseGuards(WalletAuthGuard)
  approveLayerPack(@Param("id") id: string, @WalletAddress() walletAddress: string) {
    return this.generator.approveLayerPack(id, walletAddress);
  }
}
