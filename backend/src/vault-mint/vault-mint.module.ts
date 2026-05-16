import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaService } from "../db/prisma.service";
import { GeneratorModule } from "../generator/generator.module";
import { SolanaTransactionAdapterService } from "./solana-transaction-adapter.service";
import { VaultMintController } from "./vault-mint.controller";
import { VaultMintOrchestratorService } from "./vault-mint-orchestrator.service";
import { VaultRedeemOrchestratorService } from "./vault-redeem-orchestrator.service";
import { ProtocolAccountingService } from "../protocol/protocol-accounting.service";
import { ProtocolService } from "../protocol/protocol.service";

@Module({
  imports: [AuthModule, GeneratorModule],
  controllers: [VaultMintController],
  providers: [PrismaService, SolanaTransactionAdapterService, ProtocolAccountingService, ProtocolService, VaultMintOrchestratorService, VaultRedeemOrchestratorService],
  exports: [VaultMintOrchestratorService, VaultRedeemOrchestratorService]
})
export class VaultMintModule {}
