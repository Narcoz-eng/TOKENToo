import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { ArtGeneratorService } from "./art-generator/art-generator.service";
import { PrismaService } from "./db/prisma.service";
import { FeeEngineService } from "./fee-engine/fee-engine.service";
import { GeneratorModule } from "./generator/generator.module";
import { IdentityEngineService } from "./identity-engine/identity-engine.service";
import { MarketplaceEngineService } from "./marketplace/marketplace.service";
import { RaidEngineService } from "./raid-engine/raid-engine.service";
import { RiskService } from "./risk/risk.service";
import { TokenScannerService } from "./token-scanner/token-scanner.service";

@Module({
  imports: [GeneratorModule],
  controllers: [AppController],
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
