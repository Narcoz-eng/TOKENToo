import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaService } from "../db/prisma.service";
import { SolanaTransactionAdapterService } from "../vault-mint/solana-transaction-adapter.service";
import { ArtPreviewGeneratorService } from "./art-preview-generator.service";
import { AssetProductionLayerService } from "./asset-production-layer.service";
import { AssetStorageService } from "./asset-storage.service";
import { AiConceptPipelineService } from "./ai-concept-pipeline.service";
import { AiOutputQualityValidatorService } from "./ai-output-quality-validator.service";
import { CollectionDistinctivenessScorerService } from "./collection-distinctiveness-scorer.service";
import { CommunityContextService } from "./community-context.service";
import { CompatibilityEngineService } from "./compatibility-engine.service";
import { CreativeDnaService } from "./creative-dna.service";
import { CuratedLayerPackService } from "./curated-layer-pack.service";
import { DeterministicRenderService } from "./deterministic-render.service";
import { GeminiStudioImageProviderService } from "./gemini-studio-image-provider.service";
import { GeneratorController } from "./generator.controller";
import { GeneratorService } from "./generator.service";
import { LogoAnalysisService } from "./logo-analysis.service";
import { MetadataGeneratorService } from "./metadata-generator.service";
import { QualityValidatorService } from "./quality-validator.service";
import { StyleBibleEngineService } from "./style-bible-engine.service";
import { StudioImageProviderService } from "./studio-image-provider.service";
import { RarityEngineService } from "./rarity-engine.service";
import { StyleProfileGeneratorService } from "./style-profile-generator.service";
import { TraitCoverageEngineService } from "./trait-coverage-engine.service";
import { TraitPackGeneratorService } from "./trait-pack-generator.service";
import { CuratedAssetProvider, HybridAssetProvider, MockImageProvider, OpenAIImageProvider } from "./image-providers";
import { ProductionLayerPackService } from "./production-layer-pack.service";

@Module({
  imports: [AuthModule],
  controllers: [GeneratorController],
  providers: [
    PrismaService,
    GeneratorService,
    AiConceptPipelineService,
    AiOutputQualityValidatorService,
    AssetProductionLayerService,
    AssetStorageService,
    CreativeDnaService,
    CuratedLayerPackService,
    DeterministicRenderService,
    GeminiStudioImageProviderService,
    ProductionLayerPackService,
    LogoAnalysisService,
    CommunityContextService,
    StyleProfileGeneratorService,
    StyleBibleEngineService,
    StudioImageProviderService,
    TraitCoverageEngineService,
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
  exports: [GeneratorService, AssetProductionLayerService, AssetStorageService, MetadataGeneratorService, ProductionLayerPackService, DeterministicRenderService, GeminiStudioImageProviderService, StudioImageProviderService, CuratedLayerPackService]
})
export class GeneratorModule {}
