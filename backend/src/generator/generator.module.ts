import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaService } from "../db/prisma.service";
import { SolanaTransactionAdapterService } from "../vault-mint/solana-transaction-adapter.service";
import { ArtPreviewGeneratorService } from "./art-preview-generator.service";
import { AssetProductionLayerService } from "./asset-production-layer.service";
import { AssetStorageService } from "./asset-storage.service";
import { CollectionDistinctivenessScorerService } from "./collection-distinctiveness-scorer.service";
import { CommunityContextService } from "./community-context.service";
import { CompatibilityEngineService } from "./compatibility-engine.service";
import { GeneratorController } from "./generator.controller";
import { GeneratorService } from "./generator.service";
import { LogoAnalysisService } from "./logo-analysis.service";
import { MetadataGeneratorService } from "./metadata-generator.service";
import { QualityValidatorService } from "./quality-validator.service";
import { RarityEngineService } from "./rarity-engine.service";
import { StyleProfileGeneratorService } from "./style-profile-generator.service";
import { TraitPackGeneratorService } from "./trait-pack-generator.service";
import { CuratedAssetProvider, HybridAssetProvider, MockImageProvider, OpenAIImageProvider } from "./image-providers";

@Module({
  imports: [AuthModule],
  controllers: [GeneratorController],
  providers: [
    PrismaService,
    GeneratorService,
    AssetProductionLayerService,
    AssetStorageService,
    LogoAnalysisService,
    CommunityContextService,
    StyleProfileGeneratorService,
    TraitPackGeneratorService,
    RarityEngineService,
    CompatibilityEngineService,
    QualityValidatorService,
    CollectionDistinctivenessScorerService,
    ArtPreviewGeneratorService,
    MetadataGeneratorService,
    SolanaTransactionAdapterService,
    OpenAIImageProvider,
    MockImageProvider,
    CuratedAssetProvider,
    HybridAssetProvider
  ],
  exports: [GeneratorService, AssetProductionLayerService, AssetStorageService, MetadataGeneratorService]
})
export class GeneratorModule {}
