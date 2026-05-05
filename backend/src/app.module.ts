import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { ArtGeneratorService } from "./art-generator/art-generator.service";
import { PrismaService } from "./db/prisma.service";
import { FeeEngineService } from "./fee-engine/fee-engine.service";
import { GeneratorModule } from "./generator/generator.module";
import { IdentityEngineService } from "./identity-engine/identity-engine.service";
import { MarketplaceEngineService } from "./marketplace/marketplace.service";
import { MarketplaceController } from "./marketplace/marketplace.controller";
import { RaidEngineService } from "./raid-engine/raid-engine.service";
import { RaidController } from "./raid-engine/raid.controller";
import { RiskService } from "./risk/risk.service";
import { TokenScannerService } from "./token-scanner/token-scanner.service";
import { VaultMintModule } from "./vault-mint/vault-mint.module";

@Module({
  imports: [GeneratorModule, VaultMintModule],
  controllers: [AppController, MarketplaceController, RaidController],
  providers: [
    PrismaService,
    TokenScannerService,
    IdentityEngineService,
    ArtGeneratorService,
    RaidEngineService,
    FeeEngineService,
    RiskService,
    MarketplaceEngineService
  ]
})
export class AppModule {}
