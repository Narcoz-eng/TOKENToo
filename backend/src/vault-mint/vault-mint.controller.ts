import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { WalletAddress } from "../auth/wallet-address.decorator";
import { WalletAuthGuard } from "../auth/wallet-auth.guard";
import { VaultMintOrchestratorService } from "./vault-mint-orchestrator.service";
import { VaultRedeemOrchestratorService } from "./vault-redeem-orchestrator.service";
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
  signedTransactionBase64: z.string().optional(),
  nftMint: z.string().optional(),
  vaultPositionPda: z.string().optional(),
  confirmMock: z.boolean().optional()
});

const redeemCreateSchema = z.object({
  idempotencyKey: z.string().min(8),
  vaultNftId: z.string().min(1)
});

@Controller("vault")
@UseGuards(WalletAuthGuard)
export class VaultMintController {
  constructor(
    private readonly orchestrator: VaultMintOrchestratorService,
    private readonly redeem: VaultRedeemOrchestratorService
  ) {}

  @Post("mint/intents")
  createMintIntent(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.orchestrator.createOrResumeMint({ ...(mintIntentSchema.parse(body) as CreateMintIntentInput), walletAddress });
  }

  @Post("mint/transactions/create")
  createMintTransactionAlias(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.createMintIntent(body, walletAddress);
  }

  @Get("mint/transactions/:id")
  getMintTransaction(@Param("id") id: string, @WalletAddress() walletAddress: string) {
    return this.orchestrator.getMintTransaction(id, walletAddress);
  }

  @Post("mint/transactions/:id/build")
  buildMintTransaction(@Param("id") id: string, @WalletAddress() walletAddress: string) {
    return this.orchestrator.buildMintTransaction(id, walletAddress);
  }

  @Post("mint-transactions/:id/build")
  buildMintTransactionAlias(@Param("id") id: string, @WalletAddress() walletAddress: string) {
    return this.orchestrator.buildMintTransaction(id, walletAddress);
  }

  @Post("mint/transactions/:id/submit")
  submitMintTransaction(@Param("id") id: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    const parsed = submitSchema.parse(body);
    return this.orchestrator.submitMintTransaction(
      id,
      { ...parsed, signedTransaction: parsed.signedTransaction ?? parsed.signedTransactionBase64 } as SubmitMintTransactionInput,
      walletAddress
    );
  }

  @Post("mint-transactions/:id/submit")
  submitMintTransactionAlias(@Param("id") id: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.submitMintTransaction(id, body, walletAddress);
  }

  @Post("redeem-transactions/create")
  createRedeem(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.redeem.createRedeem({ ...redeemCreateSchema.parse(body), walletAddress });
  }

  @Post("redeem-transactions/:id/build")
  buildRedeem(@Param("id") id: string, @WalletAddress() walletAddress: string) {
    return this.redeem.buildRedeem(id, walletAddress);
  }

  @Post("redeem-transactions/:id/submit")
  submitRedeem(@Param("id") id: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    const parsed = submitSchema.parse(body);
    return this.redeem.submitRedeem(id, { signedTransaction: parsed.signedTransaction ?? parsed.signedTransactionBase64, txSignature: parsed.txSignature }, walletAddress);
  }
}
