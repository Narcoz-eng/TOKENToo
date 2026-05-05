import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { WalletAddress } from "../auth/wallet-address.decorator";
import { WalletAuthGuard } from "../auth/wallet-auth.guard";
import { VaultMintOrchestratorService } from "./vault-mint-orchestrator.service";
import type { CreateMintIntentInput, SubmitMintTransactionInput } from "./vault-mint.types";

const mintIntentSchema = z.object({
  idempotencyKey: z.string().min(8),
  collectionId: z.string().min(1),
  tokenMint: z.string().min(20),
  amount: z.string().regex(/^[\d,]+$/),
  lockDurationDays: z.number().int().nonnegative()
});

const submitSchema = z.object({
  txSignature: z.string().optional(),
  signedTransaction: z.string().optional(),
  nftMint: z.string().optional(),
  vaultPositionPda: z.string().optional(),
  confirmMock: z.boolean().optional()
});

@Controller("vault")
@UseGuards(WalletAuthGuard)
export class VaultMintController {
  constructor(private readonly orchestrator: VaultMintOrchestratorService) {}

  @Post("mint/intents")
  createMintIntent(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.orchestrator.createOrResumeMint({ ...(mintIntentSchema.parse(body) as CreateMintIntentInput), walletAddress });
  }

  @Get("mint/transactions/:id")
  getMintTransaction(@Param("id") id: string, @WalletAddress() walletAddress: string) {
    return this.orchestrator.getMintTransaction(id, walletAddress);
  }

  @Post("mint/transactions/:id/submit")
  submitMintTransaction(@Param("id") id: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.orchestrator.submitMintTransaction(id, submitSchema.parse(body) as SubmitMintTransactionInput, walletAddress);
  }
}
