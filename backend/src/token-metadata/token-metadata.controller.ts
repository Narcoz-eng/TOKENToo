import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { WalletAddress } from "../auth/wallet-address.decorator";
import { WalletAuthGuard } from "../auth/wallet-auth.guard";
import { TokenMetadataService } from "./token-metadata.service";

const metadataSchema = z.object({
  mint: z.string().min(32),
  name: z.string().min(1),
  symbol: z.string().min(1),
  description: z.string().optional(),
  logoDataUri: z.string().optional(),
  logoUrl: z.string().optional(),
  externalUrl: z.string().optional(),
  extensions: z.record(z.string(), z.string().optional()).optional()
});

const submitSchema = z.object({
  txSignature: z.string().optional(),
  signedTransaction: z.string().optional(),
  signedTransactionBase64: z.string().optional()
});

@Controller("token-metadata")
export class TokenMetadataController {
  constructor(@Inject(TokenMetadataService) private readonly metadata: TokenMetadataService) {}

  @Get("status")
  status() {
    return this.metadata.status();
  }

  @Get(":mint")
  fetch(@Param("mint") mint: string) {
    return this.metadata.fetchTokenMetadata(mint);
  }

  @Get(":mint/verify")
  verify(@Param("mint") mint: string) {
    return this.metadata.verifyTokenMetadata(mint);
  }

  @Post("create-or-update")
  @UseGuards(WalletAuthGuard)
  createOrUpdate(@Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.metadata.createOrUpdateTokenMetadata(metadataSchema.parse(body), walletAddress);
  }

  @Post(":mint/submit")
  @UseGuards(WalletAuthGuard)
  submit(@Param("mint") mint: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    const parsed = submitSchema.parse(body);
    return this.metadata.submitTokenMetadataWrite(mint, { signedTransaction: parsed.signedTransaction ?? parsed.signedTransactionBase64, txSignature: parsed.txSignature }, walletAddress);
  }
}
