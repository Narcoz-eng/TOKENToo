import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { VaultMintOrchestratorService } from "./vault-mint-orchestrator.service";
import type { CreateMintIntentInput, SubmitMintTransactionInput } from "./vault-mint.types";

@Controller("vault")
export class VaultMintController {
  constructor(private readonly orchestrator: VaultMintOrchestratorService) {}

  @Post("mint/intents")
  createMintIntent(@Body() body: CreateMintIntentInput) {
    return this.orchestrator.createOrResumeMint(body);
  }

  @Get("mint/transactions/:id")
  getMintTransaction(@Param("id") id: string) {
    return this.orchestrator.getMintTransaction(id);
  }

  @Post("mint/transactions/:id/submit")
  submitMintTransaction(@Param("id") id: string, @Body() body: SubmitMintTransactionInput) {
    return this.orchestrator.submitMintTransaction(id, body);
  }
}
