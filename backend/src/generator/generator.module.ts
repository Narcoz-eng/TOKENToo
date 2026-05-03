import { Module } from "@nestjs/common";
import { PrismaService } from "../db/prisma.service";
import { ArtPreviewGeneratorService } from "./art-preview-generator.service";
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

@Module({
  controllers: [GeneratorController],
  providers: [
    PrismaService,
    GeneratorService,
    LogoAnalysisService,
    CommunityContextService,
    StyleProfileGeneratorService,
    TraitPackGeneratorService,
    RarityEngineService,
    CompatibilityEngineService,
    QualityValidatorService,
    CollectionDistinctivenessScorerService,
    ArtPreviewGeneratorService,
    MetadataGeneratorService
  ],
  exports: [GeneratorService]
})
export class GeneratorModule {}

