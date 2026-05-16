import { Body, Controller, Inject, Param, Post, UseGuards, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { WalletAddress } from "../auth/wallet-address.decorator";
import { WalletAuthGuard } from "../auth/wallet-auth.guard";
import { PrismaService } from "../db/prisma.service";
import { StakingService } from "../staking/staking.service";
import { VaultMintOrchestratorService } from "../vault-mint/vault-mint-orchestrator.service";
import { VaultRedeemOrchestratorService } from "../vault-mint/vault-redeem-orchestrator.service";
import type { CreateMintIntentInput, SubmitMintTransactionInput } from "../vault-mint/vault-mint.types";

const mintIntentSchema = z.object({
  idempotencyKey: z.string().min(8),
  collectionId: z.string().min(1),
  tokenMint: z.string().min(20),
  amount: z.string().regex(/^[\d,]+$/),
  lockDurationDays: z.number().int().nonnegative()
});

const mintTransactionRefSchema = z.object({
  mintTransactionId: z.string().min(1).optional(),
  transactionId: z.string().min(1).optional(),
  id: z.string().min(1).optional()
});

const submitSchema = mintTransactionRefSchema.extend({
  txSignature: z.string().optional(),
  signedTransaction: z.string().optional(),
  signedTransactionBase64: z.string().optional(),
  nftMint: z.string().optional(),
  vaultPositionPda: z.string().optional(),
  confirmMock: z.boolean().optional()
});

const redeemSchema = z.object({
  idempotencyKey: z.string().min(8).optional(),
  redeemTransactionId: z.string().min(1).optional(),
  txSignature: z.string().optional(),
  signedTransaction: z.string().optional(),
  signedTransactionBase64: z.string().optional()
});

const stakeSchema = z.object({
  idempotencyKey: z.string().optional()
});

const unstakeSchema = z.object({
  stakingPositionId: z.string().min(1).optional(),
  idempotencyKey: z.string().optional()
});

@Controller("vaults")
@UseGuards(WalletAuthGuard)
export class VaultProtocolController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(VaultMintOrchestratorService) private readonly mint: VaultMintOrchestratorService,
    @Inject(VaultRedeemOrchestratorService) private readonly redeem: VaultRedeemOrchestratorService,
    @Inject(StakingService) private readonly staking: StakingService
  ) {}

  @Post("mint/intent")
  mintIntent(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.mint.createOrResumeMint({ ...(mintIntentSchema.parse(body) as CreateMintIntentInput), walletAddress });
  }

  @Post("mint/build")
  buildMint(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.mint.buildMintTransaction(this.transactionId(mintTransactionRefSchema.parse(body)), walletAddress);
  }

  @Post("mint/submit")
  submitMint(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    const parsed = submitSchema.parse(body);
    return this.mint.submitMintTransaction(
      this.transactionId(parsed),
      { ...parsed, signedTransaction: parsed.signedTransaction ?? parsed.signedTransactionBase64 } as SubmitMintTransactionInput,
      walletAddress
    );
  }

  @Post(":mint/redeem/build")
  async buildRedeem(@Param("mint") mint: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    const parsed = redeemSchema.parse(body ?? {});
    const txId = await this.redeemTransactionId(mint, walletAddress, parsed);
    return this.redeem.buildRedeem(txId, walletAddress);
  }

  @Post(":mint/redeem/submit")
  async submitRedeem(@Param("mint") mint: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    const parsed = redeemSchema.parse(body ?? {});
    const txId = await this.redeemTransactionId(mint, walletAddress, parsed);
    const current = await this.prisma.redeemTransaction.findUnique({ where: { id: txId } });
    if (current?.status === "PENDING") await this.redeem.buildRedeem(txId, walletAddress);
    return this.redeem.submitRedeem(txId, { signedTransaction: parsed.signedTransaction ?? parsed.signedTransactionBase64, txSignature: parsed.txSignature }, walletAddress);
  }

  @Post(":mint/stake")
  async stake(@Param("mint") mint: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    const parsed = stakeSchema.parse(body ?? {});
    const nft = await this.vaultNftByMint(mint);
    return this.staking.createStakeIntent({ walletAddress, vaultNftId: nft.id, idempotencyKey: parsed.idempotencyKey });
  }

  @Post(":mint/unstake")
  async unstake(@Param("mint") mint: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    const parsed = unstakeSchema.parse(body ?? {});
    const stakingPositionId = parsed.stakingPositionId ?? (await this.activeStakingPositionId(mint, walletAddress));
    return this.staking.createUnstakeIntent({ walletAddress, stakingPositionId, idempotencyKey: parsed.idempotencyKey });
  }

  private transactionId(input: { mintTransactionId?: string; transactionId?: string; id?: string }) {
    const id = input.mintTransactionId ?? input.transactionId ?? input.id;
    if (!id) throw new NotFoundException("mintTransactionId is required.");
    return id;
  }

  private async redeemTransactionId(mint: string, walletAddress: string, input: { redeemTransactionId?: string; idempotencyKey?: string }) {
    if (input.redeemTransactionId) return input.redeemTransactionId;
    const nft = await this.vaultNftByMint(mint);
    const tx = await this.redeem.createRedeem({
      vaultNftId: nft.id,
      walletAddress,
      idempotencyKey: input.idempotencyKey ?? `redeem:${mint}:${walletAddress}`
    });
    return tx.id;
  }

  private async vaultNftByMint(mint: string) {
    const nft = await this.prisma.vaultNFT.findUnique({ where: { mint } });
    if (!nft) throw new NotFoundException("Vault NFT not found.");
    return nft;
  }

  private async activeStakingPositionId(mint: string, walletAddress: string) {
    const nft = await this.vaultNftByMint(mint);
    const user = await this.prisma.user.findUnique({ where: { walletAddress } });
    if (!user) throw new NotFoundException("Active staking position not found for this Vault NFT.");
    const position = await this.prisma.stakingPosition.findFirst({
      where: {
        status: "ACTIVE",
        userId: user.id,
        vaultNftId: nft.id
      },
      orderBy: { stakedAt: "desc" }
    });
    if (!position) throw new NotFoundException("Active staking position not found for this Vault NFT.");
    return position.id;
  }
}
