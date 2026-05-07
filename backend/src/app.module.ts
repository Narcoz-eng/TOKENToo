import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { RateLimitGuard } from "./auth/rate-limit.guard";
import { ArtGeneratorService } from "./art-generator/art-generator.service";
import { PrismaService } from "./db/prisma.service";
import { FeeEngineService } from "./fee-engine/fee-engine.service";
import { CommunityFeeRouterService } from "./fee-engine/community-fee-router.service";
import { GeneratorModule } from "./generator/generator.module";
import { IdentityEngineService } from "./identity-engine/identity-engine.service";
import { MarketplaceEngineService } from "./marketplace/marketplace.service";
import { MarketplaceController } from "./marketplace/marketplace.controller";
import { RaidEngineService } from "./raid-engine/raid-engine.service";
import { RaidController } from "./raid-engine/raid.controller";
import { RiskService } from "./risk/risk.service";
import { TokenScannerService } from "./token-scanner/token-scanner.service";
import { VaultMintModule } from "./vault-mint/vault-mint.module";
import { ProductDataModule } from "./product-data/product-data.module";
import { SystemController } from "./system/system.controller";
import { CapabilitiesService } from "./system/capabilities.service";
import { TokenMetadataController } from "./token-metadata/token-metadata.controller";
import { TokenMetadataService } from "./token-metadata/token-metadata.service";
import { AssetStorageService } from "./generator/asset-storage.service";
import { StakingController } from "./staking/staking.controller";
import { StakingService } from "./staking/staking.service";

@Module({
  imports: [AuthModule, GeneratorModule, VaultMintModule, ProductDataModule],
  controllers: [AppController, MarketplaceController, RaidController, StakingController, SystemController, TokenMetadataController],
  providers: [
    PrismaService,
    TokenScannerService,
    IdentityEngineService,
    ArtGeneratorService,
    RaidEngineService,
    FeeEngineService,
    CommunityFeeRouterService,
    RiskService,
    MarketplaceEngineService,
    StakingService,
    CapabilitiesService,
    TokenMetadataService,
    AssetStorageService,
    { provide: APP_GUARD, useClass: RateLimitGuard }
  ]
})
export class AppModule {}
