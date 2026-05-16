import { BadRequestException, ConflictException, GatewayTimeoutException, HttpException, Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../db/prisma.service";
import { requireDbForWrite } from "../db/db-safety";
import { ArtPreviewGeneratorService } from "./art-preview-generator.service";
import { AiConceptGenerationError, AiConceptPipelineService } from "./ai-concept-pipeline.service";
import { AiOutputQualityValidatorService } from "./ai-output-quality-validator.service";
import { AssetProductionLayerService } from "./asset-production-layer.service";
import { AssetStorageService } from "./asset-storage.service";
import { CollectionDistinctivenessScorerService } from "./collection-distinctiveness-scorer.service";
import { CommunityContextService } from "./community-context.service";
import { CompatibilityEngineService } from "./compatibility-engine.service";
import { CuratedLayerPackService, type CuratedLayerPackImportInput } from "./curated-layer-pack.service";
import type {
  ApproveGenerationRunInput,
  CreateGenerationRunInput,
  GeneratedStyleProfile,
  LaunchCollectionInput,
  PreviewAssetPlan,
  PreviewClassification,
  ProductionAssetStatus,
  StudioGenerationSummary,
  StudioWorkflowInput,
  StudioWorkflowState,
  StyleBiblePlan,
  SubmitCollectionLaunchInput,
  TraitPackPlan
} from "./generator.types";
import { seedFrom } from "./generator.util";
import { LogoAnalysisService } from "./logo-analysis.service";
import { MetadataGeneratorService } from "./metadata-generator.service";
import { QualityValidatorService } from "./quality-validator.service";
import { StyleBibleEngineService } from "./style-bible-engine.service";
import { hasAllRealStudioBibleAssets, isRealStudioBibleAsset, StudioImageProviderService } from "./studio-image-provider.service";
import { StyleProfileGeneratorService } from "./style-profile-generator.service";
import { TraitPackGeneratorService } from "./trait-pack-generator.service";
import { SolanaTransactionAdapterService } from "../vault-mint/solana-transaction-adapter.service";

type NormalizedGenerationRunInput = CreateGenerationRunInput & {
  tokenName: string;
  tokenSymbol: string;
  tokenMint: string;
  description: string;
  selectedPreset: string;
};

@Injectable()
export class GeneratorService {
  private readonly logger = new Logger(GeneratorService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LogoAnalysisService) private readonly logoAnalysis: LogoAnalysisService,
    @Inject(CommunityContextService) private readonly communityContext: CommunityContextService,
    @Inject(StyleProfileGeneratorService) private readonly styleProfiles: StyleProfileGeneratorService,
    @Inject(TraitPackGeneratorService) private readonly traitPacks: TraitPackGeneratorService,
    @Inject(CompatibilityEngineService) private readonly compatibility: CompatibilityEngineService,
    @Inject(ArtPreviewGeneratorService) private readonly previews: ArtPreviewGeneratorService,
    @Inject(AiConceptPipelineService) private readonly aiConcepts: AiConceptPipelineService,
    @Inject(AiOutputQualityValidatorService) private readonly aiQuality: AiOutputQualityValidatorService,
    @Inject(AssetProductionLayerService) private readonly assetProduction: AssetProductionLayerService,
    @Inject(AssetStorageService) private readonly assetStorage: AssetStorageService,
    @Inject(CollectionDistinctivenessScorerService) private readonly distinctiveness: CollectionDistinctivenessScorerService,
    @Inject(QualityValidatorService) private readonly quality: QualityValidatorService,
    @Inject(StyleBibleEngineService) private readonly styleBible: StyleBibleEngineService,
    @Inject(StudioImageProviderService) private readonly studioImages: StudioImageProviderService,
    @Inject(CuratedLayerPackService) private readonly curatedLayers: CuratedLayerPackService,
    @Inject(MetadataGeneratorService) private readonly metadata: MetadataGeneratorService,
    @Inject(SolanaTransactionAdapterService) private readonly solana: SolanaTransactionAdapterService
  ) {}

  presets() {
    return [
      {
        id: "creative-dna-generated",
        name: "Creative DNA Generated",
        artStyle: "Generated from token metadata, logo analysis, socials, creator hints, and fallback market/social text.",
        mood: "Generated per collection.",
        shapeLanguage: "Generated per collection.",
        visualFx: ["dynamic visual design system", "metadata-derived rendering language", "rarity scene progression"],
        mascotBias: ["metadata-derived subject"],
        backgroundWorlds: ["metadata-derived world concept"],
        traitNouns: ["dynamic community taxonomy"],
        legendaryDirection: "Generated as a scene, event, or emotional snapshot.",
        animationDirection: "Generated from the collection mood and visual system."
      }
    ];
  }

  async preview(input: CreateGenerationRunInput) {
    const normalized = this.normalizePreviewInput(input);
    const analysis = this.logoAnalysis.analyze(normalized);
    const context = this.communityContext.build(normalized.tokenSymbol, normalized.description, normalized.hints, analysis);
    const style = this.styleProfiles.generate(normalized, analysis, context, 1);
    const pack = this.traitPacks.generate(style);
    const styleBible = this.buildStyleBible(style, pack);
    const wireframes = this.previews.generate(style, pack, `${normalized.tokenMint}:preview`, 0);
    const studioResult = await this.studioAssetsWithCache(normalized.tokenMint, style, pack, styleBible, 1, "preview");
    const studioAssets = studioResult.assets.filter(isRealStudioBibleAsset);
    const studioBibleReady = hasAllRealStudioBibleAssets(studioAssets);
    const studioAsset = (type: PreviewAssetPlan["type"]) => studioAssets.find((asset) => asset.type === type);
    const compatibilityRules = this.traitPacks.compatibilityRules(pack);
    const compatibilityResult = this.compatibility.validateRules(pack, compatibilityRules);
    if (studioBibleReady) {
      style.productionAssetStatus = "AI_CONCEPT";
      style.artSource = "AI_ASSISTED";
      style.productionAssetPolicy.defaultAssetStatus = "AI_CONCEPT";
    }
    this.applyConfiguredProductionStatus(style, pack);
    const previews = [...studioAssets, ...wireframes];
    const distinctiveness = this.distinctiveness.score(style, []);
    const quality = this.quality.validate(style, pack, compatibilityRules, previews, distinctiveness);
    if (!compatibilityResult.passed) quality.issues.push(...compatibilityResult.issues);
    quality.issues.push(...this.aiQuality.validate(previews));
    const readiness = this.tenKReadinessReport(pack, style, quality);
    const providerDiagnostics = studioResult.summary as unknown as Record<string, unknown>;

    return {
      ok: true,
      mode: "preview-only",
      assetProvider: this.studioProviderLabel(studioResult.summary),
      previewClassification: studioBibleReady ? "AI_CONCEPT_PREVIEW" : "WIREFRAME_CONCEPT",
      productionAssetStatus: style.productionAssetStatus,
      finalProductionReady: false,
      brandDna: style.brandDna,
      creativeUniverse: style.creativeUniverse,
      productionAssetPolicy: style.productionAssetPolicy,
      styleBible,
      studioAssets,
      styleBibleAsset: studioAsset("STYLE_BIBLE"),
      traitCatalogAsset: studioAsset("TRAIT_CATALOG"),
      rarityLadderAsset: studioAsset("RARITY_LADDER"),
      moodSheetAsset: studioAsset("MOOD_SHEET"),
      layerBreakdownAsset: studioAsset("LAYER_BREAKDOWN"),
      artTeam: styleBible.artTeam,
      traitCoverageScore: styleBible.qaReport.traitCoverageScore,
      rarityDiversityScore: styleBible.qaReport.rarityDiversityScore,
      providerStatus: String(providerDiagnostics.providerFailureCode ?? providerDiagnostics.provider ?? this.studioProviderLabel(studioResult.summary)),
      collection: {
        name: style.collection,
        palette: style.colors,
        mascotArchetype: style.brandDna.mascotArchetype,
        description: style.lore,
        theme: style.theme,
        world: style.backgroundWorld,
        shapeLanguage: style.brandDna.shapeLanguage,
        renderStyle: style.artStyle,
        visualFxLanguage: style.brandDna.legendaryDirection,
        forbiddenSimilarities: style.brandDna.forbiddenSimilarities
      },
      avatarPreviewSpec: previews.find((preview) => preview.type === "AVATAR"),
      bannerPreviewSpec: previews.find((preview) => preview.type === "BANNER"),
      samples: previews.filter((preview) => preview.type === "SAMPLE_NFT"),
      traitTable: this.traitTable(pack),
      rarityTable: pack.rarityWeights,
      animationMoments: this.animationMoments(style),
      animationMetadata: style.creativeUniverse.animationReadiness,
      quality: {
        ...quality,
        issues: [...quality.issues, `${style.productionAssetStatus === "AI_CONCEPT" ? "Studio Bible art direction only" : "Fast Studio Preview required"}; final export requires approved transparent PNG/WebP layers, deterministic composition, metadata, and provenance.`]
      },
      distinctiveness: {
        ...distinctiveness,
        fingerprint: style.visualFingerprint,
        estimate: distinctiveness.score >= 86 ? "highly distinct" : distinctiveness.score >= 72 ? "distinct with review" : "too close"
      },
      tenKReadiness: readiness,
      exportPlan: styleBible.exportPlan,
      capabilities: {
        openaiImagesAvailable: Boolean(process.env.OPENAI_API_KEY),
        pinataAvailable: Boolean(process.env.PINATA_JWT),
        geminiTextAvailable: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.IMAGEN_API_KEY),
        imagenImagesAvailable: Boolean(process.env.IMAGEN_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY),
        aiGenerationEnabled: (process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true",
        productionStorageAvailable: (process.env.FINAL_ASSET_STORAGE_PROVIDER ?? "mock") !== "mock" && Boolean(process.env.PINATA_JWT)
      },
      conceptRequest: this.studioConceptSummary(studioResult.summary),
      warnings: [
        "Preview generated without DB persistence.",
        ...studioResult.warnings,
        studioBibleReady ? "Fast Studio Preview is art direction only; final launch/export requires an approved transparent layer manifest and deterministic local composition." : "Fast Studio Preview required before reviewing collection visuals.",
        studioResult.summary.activeImageProvider === "openai" ? "OpenAI Studio fallback generated Studio Bible sheets because Imagen was unavailable and ENABLE_OPENAI_STUDIO_FALLBACK=true." : "OpenAI is only used for Studio Bible generation when ENABLE_OPENAI_STUDIO_FALLBACK=true after Imagen fallback is unavailable."
      ].filter(Boolean)
    };
  }

  async createRun(input: CreateGenerationRunInput, creatorWallet?: string) {
    await requireDbForWrite(this.prisma);
    const normalized = this.normalize(input);
    const seed = `${normalized.tokenMint}:${seedFrom(`${process.env.GENERATOR_SEED_SALT ?? "vaultx"}:${JSON.stringify(normalized)}`)}`;
    const run = await this.prisma.generationRun.create({
      data: {
        tokenName: normalized.tokenName,
        tokenSymbol: normalized.tokenSymbol,
        tokenMint: normalized.tokenMint,
        logoUri: normalized.logoUri,
        logoData: normalized.logoData,
        description: normalized.description,
        communityHints: this.json(normalized.hints ?? {}),
        selectedPreset: normalized.selectedPreset,
        creatorWallet,
        seed
      }
    });

    const analysis = this.logoAnalysis.analyze(normalized);
    const context = this.communityContext.build(normalized.tokenSymbol, normalized.description, normalized.hints, analysis);

    await this.prisma.logoAnalysis.create({
      data: {
        generationRunId: run.id,
        palette: this.json(analysis.palette),
        mascot: analysis.mascot,
        style: analysis.style,
        mood: analysis.mood,
        shapeLanguage: analysis.shapeLanguage,
        visualKeywords: this.json(analysis.visualKeywords)
      }
    });

    await this.prisma.communityContext.create({
      data: {
        generationRunId: run.id,
        memes: this.json(context.memes),
        slogans: this.json(context.slogans),
        phrases: this.json(context.phrases),
        lore: context.lore,
        extractedVocabulary: this.json(context.extractedVocabulary),
        traitSeeds: this.json(context.traitSeeds),
        roleNames: this.json(context.roleNames),
        raidNames: this.json(context.raidNames),
        backgroundNames: this.json(context.backgroundNames)
      }
    });

    const studioSummary = await this.createProfileVersion(run.id, normalized, analysis, context, 1, 0);
    await this.prisma.generationRun.update({
      where: { id: run.id },
      data: {
        status: "PREVIEWED",
        studioProvider: studioSummary.provider,
        cinematicProvider: this.cinematicProvider(),
        estimatedCostUsd: studioSummary.estimatedCostUsd,
        generationCostBreakdown: this.json(studioSummary.costBreakdown)
      }
    });
    return this.getRun(run.id);
  }

  validateAiConceptRequest(input: CreateGenerationRunInput) {
    const normalized = this.normalizePreviewInput(input);
    const analysis = this.logoAnalysis.analyze(normalized);
    const context = this.communityContext.build(normalized.tokenSymbol, normalized.description, normalized.hints, analysis);
    const style = this.styleProfiles.generate(normalized, analysis, context, 1);
    const pack = this.traitPacks.generate(style);
    const styleBible = this.buildStyleBible(style, pack);
    return {
      ok: true,
      ...this.studioConceptSummary(this.studioImages.validatePlan(style, styleBible, normalized.tokenMint, 1, "preview")),
      requests: styleBible.promptPack,
      issues: []
    };
  }

  async getRun(id: string) {
    const run = await this.prisma.generationRun.findUnique({
      where: { id },
      include: {
        logoAnalysis: true,
        communityContext: true,
        styleProfiles: {
          orderBy: { version: "desc" },
          include: {
            traitPack: {
              include: {
                traits: true,
                compatibilityRules: true
              }
            },
            previewAssets: { orderBy: { createdAt: "desc" } },
            qualityReports: { orderBy: { createdAt: "desc" }, take: 1 },
            distinctivenessReports: { orderBy: { createdAt: "desc" }, take: 1 }
          }
        },
        curatedLayerPacks: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { assets: { orderBy: [{ zIndex: "asc" }, { category: "asc" }, { traitName: "asc" }] } }
        }
      }
    });

    if (!run) throw new NotFoundException("Generation run not found");
    return run;
  }

  async getRunForWallet(id: string, walletAddress: string) {
    const run = await this.getRun(id);
    this.assertOwner(run, walletAddress);
    return run;
  }

  async regenerateStyle(id: string, walletAddress?: string) {
    const run = await this.getRun(id);
    this.assertOwner(run, walletAddress);
    if (run.status === "APPROVED") throw new ConflictException("Approved generator runs are immutable. Regenerate before approval or create a new run.");
    const workflow = this.studioWorkflowState(this.record(run.communityHints).studioWorkflow);
    if (workflow.locks.artDirection || workflow.locks.style) throw new ConflictException("Art direction or style is locked. Use selective rerenders or create a new run to replace the locked style.");
    if (!run.logoAnalysis || !run.communityContext) throw new NotFoundException("Generation run is missing analysis data");
    const version = (run.styleProfiles[0]?.version ?? 0) + 1;
    const input = this.inputFromRun(run);
    const analysis = this.analysisFromRun(run.logoAnalysis);
    const context = this.contextFromRun(run.communityContext);
    const studioSummary = await this.createProfileVersion(id, input, analysis, context, version, run.regenerationCount + 1);
    await this.prisma.generationRun.update({
      where: { id },
      data: {
        regenerationCount: { increment: 1 },
        status: "PREVIEWED",
        approvedVersion: null,
        studioProvider: studioSummary.provider,
        estimatedCostUsd: studioSummary.estimatedCostUsd,
        generationCostBreakdown: this.json(studioSummary.costBreakdown)
      }
    });
    return this.getRun(id);
  }

  async regeneratePreviews(id: string, walletAddress?: string) {
    const run = await this.getRun(id);
    this.assertOwner(run, walletAddress);
    if (run.status === "APPROVED") throw new ConflictException("Approved generator runs are immutable. Regenerate previews before approval or create a new run.");
    const latest = run.styleProfiles[0];
    if (!latest?.traitPack) throw new NotFoundException("Generation run has no style profile to preview");
    const style = this.styleFromRecord(latest);
    const pack = this.packFromRecord(latest.traitPack);
    const version = Math.max(1, ...latest.previewAssets.map((asset) => asset.version)) + 1;
    const styleBible = this.buildStyleBible(style, pack);
    const wireframes = this.previews.generate(style, pack, run.seed, version);
    const studioResult = await this.studioAssetsWithCache(run.tokenMint, style, pack, styleBible, latest.version, `v${version}`);
    const studioAssets = studioResult.assets.filter(isRealStudioBibleAsset);
    const previews = [...studioAssets, ...wireframes];
    if (hasAllRealStudioBibleAssets(studioAssets)) await this.prisma.styleProfile.update({ where: { id: latest.id }, data: { artSource: "AI_ASSISTED", productionAssetStatus: "AI_CONCEPT" } });
    await this.persistPreviews(id, latest.id, version, previews);
    await this.prisma.generationRun.update({
      where: { id },
      data: {
        studioProvider: studioResult.summary.provider,
        estimatedCostUsd: studioResult.summary.estimatedCostUsd,
        generationCostBreakdown: this.json(studioResult.summary.costBreakdown)
      }
    });
    return this.getRun(id);
  }

  async premiumCinematicRender(id: string, walletAddress?: string) {
    await requireDbForWrite(this.prisma);
    const run = await this.getRun(id);
    this.assertOwner(run, walletAddress);
    if (run.status === "APPROVED") throw new ConflictException("Approved generator runs are immutable. Create a new run to add premium cinematic art.");
    if (this.cinematicProvider() !== "openai") throw new BadRequestException("Premium Cinematic Render currently requires CINEMATIC_PROVIDER=openai.");
    const latest = run.styleProfiles[0];
    if (!latest?.traitPack) throw new NotFoundException("Generation run has no style profile for premium cinematic render");
    const style = this.styleFromRecord(latest);
    const pack = this.packFromRecord(latest.traitPack);
    const version = this.nextPreviewVersion(latest.previewAssets);
    try {
      const previews = await this.withProviderTimeout(this.aiConcepts.generateHeroConcept(style, pack, `${run.seed}:premium-cinematic:${version}`, run.logoData ?? undefined, run.logoUri ?? undefined), 60_000);
      if (!previews.length) throw new BadRequestException("Premium Cinematic Render did not produce a hero concept.");
      await this.persistPreviews(id, latest.id, version, previews);
      const costBreakdown = previews.map((preview) => ({
        provider: preview.provider,
        model: String(preview.generationMetadata?.model ?? "unknown"),
        generationType: "hero_concept",
        promptHash: String(preview.promptHash ?? ""),
        estimatedCostUsd: Number(preview.generationMetadata?.estimatedCostUsd ?? 0),
        cacheStatus: "generated"
      }));
      const existingBreakdown = Array.isArray(run.generationCostBreakdown) ? run.generationCostBreakdown : [];
      const existingCost = Number(run.estimatedCostUsd ?? 0);
      await this.prisma.generationRun.update({
        where: { id },
        data: {
          cinematicProvider: "openai",
          estimatedCostUsd: Number((existingCost + costBreakdown.reduce((sum, line) => sum + line.estimatedCostUsd, 0)).toFixed(6)),
          generationCostBreakdown: this.json([...existingBreakdown, ...costBreakdown])
        }
      });
      return this.getRun(id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException(this.aiUnavailableWarning(error));
    }
  }

  async importCuratedLayerPack(id: string, input: CuratedLayerPackImportInput, walletAddress?: string) {
    await requireDbForWrite(this.prisma);
    const run = await this.getRun(id);
    this.assertOwner(run, walletAddress);
    if (run.status === "APPROVED") throw new ConflictException("Approved generator runs are immutable. Import curated layers on a draft run before approval.");
    const latest = run.styleProfiles[0];
    if (!latest?.traitPack) throw new NotFoundException("Generation run has no style profile for curated layer import");
    const style = this.styleFromRecord(latest);
    const pack = this.packFromRecord(latest.traitPack);
    const imported = await this.curatedLayers.importForStyle({
      generationRunId: run.id,
      styleProfileId: latest.id,
      style,
      pack,
      layerPack: input
    });
    if (imported?.status === "VALID") {
      style.assetPackId = imported.id;
      style.artSource = "CURATED_PACK";
      style.productionAssetStatus = "CURATED_LAYER_READY";
      style.productionAssetPolicy.defaultAssetStatus = "CURATED_LAYER_READY";
      await this.persistPreviewQualityReport(run.id, latest.id, style, pack, latest, []);
    }
    return this.getRun(id);
  }

  async exportCuratedLayerPack(id: string, input: { count?: number } = {}, walletAddress?: string) {
    await requireDbForWrite(this.prisma);
    const run = await this.getRun(id);
    this.assertOwner(run, walletAddress);
    const latest = run.styleProfiles[0];
    if (!latest?.traitPack) throw new NotFoundException("Generation run has no style profile for deterministic export");
    const style = this.styleFromRecord(latest);
    style.productionAssetStatus = "CURATED_LAYER_READY";
    style.artSource = "CURATED_PACK";
    const result = await this.curatedLayers.exportForStyle({
      styleProfileId: latest.id,
      style,
      pack: this.packFromRecord(latest.traitPack),
      count: input.count
    });
    return { run: await this.getRun(id), export: result };
  }

  async studioAction(id: string, input: StudioWorkflowInput) {
    await requireDbForWrite(this.prisma);
    const run = await this.getRun(id);
    this.assertOwner(run, input.walletAddress);
    if (run.status === "APPROVED") throw new ConflictException("Approved generator runs are immutable. Studio refinements must happen before final approval.");

    const latest = run.styleProfiles[0];
    if (!latest?.traitPack) throw new NotFoundException("Generation run has no style profile to refine");

    const communityHints = this.record(run.communityHints);
    const currentWorkflow = this.studioWorkflowState(communityHints.studioWorkflow);
    if (input.action === "regenerate-mood-set" && currentWorkflow.locks.mood) throw new ConflictException("Mood set is locked. Unlocking requires creating a new draft run.");
    if (input.action === "regenerate-rarity-tier" && currentWorkflow.locks.rarityDirection) throw new ConflictException("Rarity direction is locked. Unlocking requires creating a new draft run.");
    if (input.action === "regenerate-legendary-scene" && currentWorkflow.approvals.cinematicDirection) throw new ConflictException("Cinematic direction is already approved. Create a new draft run to replace the approved scene language.");
    const studioWorkflow = this.nextStudioWorkflow(currentWorkflow, input);
    await this.prisma.generationRun.update({
      where: { id },
      data: { communityHints: this.json({ ...communityHints, studioWorkflow }) }
    });

    if (this.isStudioRegeneration(input.action)) {
      const style = this.styleFromRecord(latest);
      const pack = this.packFromRecord(latest.traitPack);
      const version = this.nextPreviewVersion(latest.previewAssets);
      const seedKey = `${run.seed}:${input.action}:${input.target ?? "set"}:${version}`;
      const styleBible = this.buildStyleBible(style, pack);
      const studioResult = await this.studioAssetsWithCache(run.tokenMint, style, pack, styleBible, latest.version, seedKey, { bypassCache: true });
      const previews = this.annotateStudioPreviews(this.selectStudioAssets(studioResult.assets, input), input, studioWorkflow);
      if (!previews.length) throw new BadRequestException("Studio refinement did not produce any preview assets.");
      if (previews.some((preview) => preview.productionAssetStatus === "AI_CONCEPT")) {
        await this.prisma.styleProfile.update({ where: { id: latest.id }, data: { artSource: "AI_ASSISTED", productionAssetStatus: "AI_CONCEPT" } });
        style.artSource = "AI_ASSISTED";
        style.productionAssetStatus = "AI_CONCEPT";
        style.productionAssetPolicy.defaultAssetStatus = "AI_CONCEPT";
      }
      await this.persistPreviews(id, latest.id, version, previews);
      await this.prisma.generationRun.update({
        where: { id },
        data: {
          studioProvider: studioResult.summary.provider,
          estimatedCostUsd: studioResult.summary.estimatedCostUsd,
          generationCostBreakdown: this.json(studioResult.summary.costBreakdown)
        }
      });
      await this.persistPreviewQualityReport(id, latest.id, style, pack, latest, previews);
    }

    return this.getRun(id);
  }

  async approve(id: string, input: ApproveGenerationRunInput = {}) {
    await requireDbForWrite(this.prisma);
    const run = await this.getRun(id);
    this.assertOwner(run, input.walletAddress);
    const latest = run.styleProfiles[0];
    const report = latest?.qualityReports[0];
    const distinctiveness = latest?.distinctivenessReports[0];
    if (!latest || !report) throw new NotFoundException("Generation run has no preview to approve");
    const pack = latest.traitPack ? this.packFromRecord(latest.traitPack) : null;
    const readiness = pack ? this.assetProduction.manifest(this.styleFromRecord(latest), pack, report.tier).readinessReport : null;
    const curatedReadiness = await this.curatedLayers.readinessForStyle(latest.id);
    if (input.acceptedVersion && input.acceptedVersion !== latest.version) throw new ConflictException("The accepted version is no longer the latest generated version.");
    if (!input.explicitConfirmation) throw new BadRequestException("Explicit creator confirmation is required before approval.");
    const studioIssues = this.studioApprovalIssues(this.studioWorkflowState(this.record(run.communityHints).studioWorkflow));
    if (studioIssues.length) throw new BadRequestException(`Studio approval incomplete: ${studioIssues.join(", ")}.`);
    if (!report.passed || report.tier === "BASIC") throw new BadRequestException("Only Premium or Legendary-ready generator outputs can be approved.");
    if (!distinctiveness?.passed || distinctiveness.score < 72) throw new BadRequestException("Collection distinctiveness score is below the approval threshold.");
    const manifest = pack ? this.assetProduction.manifest(this.styleFromRecord(latest), pack, report.tier) : null;
    if (latest.productionAssetStatus === "WIREFRAME" || latest.artSource === "PROCEDURAL_FALLBACK") throw new BadRequestException("Wireframe previews are planning/debug assets and cannot be approved for launch.");
    if (latest.productionAssetStatus === "AI_CONCEPT" && !curatedReadiness.approvalReady) throw new BadRequestException("AI Studio Bible assets can be reviewed as art direction, but cannot be approved until a real curated transparent layer pack is imported and validated.");
    if (!curatedReadiness.approvalReady && (!manifest?.productionReady || !readiness?.canProduce10kPremiumOutputs)) throw new BadRequestException("Asset provider readiness report does not allow scalable deterministic output approval.");
    if (!curatedReadiness.approvalReady) throw new BadRequestException(`Curated layer pack approval gate failed: ${curatedReadiness.errors.join(" ") || "manifest valid, transparency validation, preview render, and metadata generation are required."}`);

    await this.prisma.styleProfile.updateMany({ where: { generationRunId: id }, data: { isApproved: false } });
    await this.prisma.styleProfile.update({ where: { id: latest.id }, data: { isApproved: true } });
    await this.prisma.generationRun.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedVersion: latest.version,
        approvedByWallet: input.walletAddress?.trim(),
        approvedAt: new Date(),
        approvalSnapshot: this.json({
          styleProfileId: latest.id,
          styleProfileVersion: latest.version,
          qualityTier: report.tier,
          qualityScore: report.previewQualityScore,
          distinctivenessScore: distinctiveness.score,
          productionAssetStatus: latest.productionAssetStatus,
          collection: latest.collection,
          mascot: latest.mascot,
          raidTheme: latest.raidTheme,
          studioWorkflow: this.studioWorkflowState(this.record(run.communityHints).studioWorkflow)
        })
      }
    });
    return this.getRun(id);
  }

  async launchCollection(id: string, input: LaunchCollectionInput) {
    await requireDbForWrite(this.prisma);
    const walletAddress = input.walletAddress?.trim();
    if (!walletAddress) throw new BadRequestException("walletAddress is required to launch a collection");

    const run = await this.getRun(id);
    this.assertOwner(run, input.walletAddress);
    if (run.status !== "APPROVED" || !run.approvedVersion) throw new BadRequestException("Approve a Premium+ generator run before launch.");
    const profile = run.styleProfiles.find((item) => item.version === run.approvedVersion && item.isApproved);
    const report = profile?.qualityReports[0];
    const distinctiveness = profile?.distinctivenessReports[0];
    if (!profile?.traitPack || !report?.passed || report.tier === "BASIC" || !distinctiveness?.passed) {
      throw new BadRequestException("Approved run no longer satisfies launch quality gates.");
    }
    if (profile.productionAssetStatus === "WIREFRAME" || profile.artSource === "PROCEDURAL_FALLBACK") throw new BadRequestException("Collection launch requires curated, artist-approved, or final production assets; wireframes cannot launch.");
    if (profile.productionAssetStatus === "AI_CONCEPT") throw new BadRequestException("AI studio previews are art direction only. Configure locked creator approval plus layered, curated, or artist-approved production assets before launch.");
    const curatedReadiness = await this.curatedLayers.readinessForStyle(profile.id);
    if (!curatedReadiness.exportReady) throw new BadRequestException("Collection launch blocked: run deterministic curated-layer export successfully before launch. AI Studio Bible assets are not mint-ready assets.");
    this.assertLaunchProviders(this.styleFromRecord(profile), this.packFromRecord(profile.traitPack), report.tier, curatedReadiness.exportReady);

    const slug = this.slug(input.slug ?? profile.collection);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { walletAddress },
        update: {},
        create: { walletAddress, username: walletAddress.slice(0, 6) }
      });
      const token = await tx.token.upsert({
        where: { mint: run.tokenMint },
        update: {
          symbol: run.tokenSymbol,
          name: run.tokenName,
          metadataUri: input.metadataUri ?? undefined,
          imageUri: profile.previewAssets.find((asset) => asset.type === "AVATAR")?.uri
        },
        create: {
          mint: run.tokenMint,
          symbol: run.tokenSymbol,
          name: run.tokenName,
          decimals: 0,
          metadataUri: input.metadataUri,
          imageUri: profile.previewAssets.find((asset) => asset.type === "AVATAR")?.uri
        }
      });
      const existing = await tx.collection.findUnique({ where: { tokenId: token.id } });
      if (existing?.identityLockedAt) throw new ConflictException("This token already has a launched immutable collection profile.");

      return tx.collection.upsert({
        where: { tokenId: token.id },
        update: {
          creatorUserId: user.id,
          approvedGenerationRunId: run.id,
          styleProfileVersion: profile.version,
          traitPackVersion: profile.version,
          metadataSchemaVersion: "phew-v1",
          collectionAssetAddress: input.collectionAssetAddress,
          collectionMetadataUri: input.metadataUri,
          launchStatus: input.collectionAssetAddress ? "CONFIRMED" : "PENDING",
          metadataUri: input.metadataUri,
          identityLockedAt: new Date(),
          launchedAt: new Date(),
          name: profile.collection,
          slug,
          logoUri: profile.previewAssets.find((asset) => asset.type === "AVATAR")?.uri,
          bannerUri: profile.previewAssets.find((asset) => asset.type === "BANNER")?.uri,
          colorPalette: this.json(profile.colors ?? []),
          mascot: profile.mascot,
          theme: profile.theme,
          vibe: profile.artStyle,
          lore: profile.lore,
          roleNames: this.json(profile.roleNames ?? []),
          raidTheme: profile.raidTheme,
          rarityTable: this.json(profile.rarityStructure ?? {})
        },
        create: {
          tokenId: token.id,
          creatorUserId: user.id,
          approvedGenerationRunId: run.id,
          styleProfileVersion: profile.version,
          traitPackVersion: profile.version,
          metadataSchemaVersion: "phew-v1",
          collectionAssetAddress: input.collectionAssetAddress,
          collectionMetadataUri: input.metadataUri,
          launchStatus: input.collectionAssetAddress ? "CONFIRMED" : "PENDING",
          metadataUri: input.metadataUri,
          identityLockedAt: new Date(),
          launchedAt: new Date(),
          name: profile.collection,
          slug,
          logoUri: profile.previewAssets.find((asset) => asset.type === "AVATAR")?.uri,
          bannerUri: profile.previewAssets.find((asset) => asset.type === "BANNER")?.uri,
          colorPalette: this.json(profile.colors ?? []),
          mascot: profile.mascot,
          theme: profile.theme,
          vibe: profile.artStyle,
          lore: profile.lore,
          roleNames: this.json(profile.roleNames ?? []),
          raidTheme: profile.raidTheme,
          rarityTable: this.json(profile.rarityStructure ?? {})
        }
      });
    });
  }

  async buildCollectionLaunch(id: string, walletAddress: string) {
    await requireDbForWrite(this.prisma);
    const run = await this.getRunForWallet(id, walletAddress);
    const profile = run.styleProfiles.find((item) => item.version === run.approvedVersion && item.isApproved);
    if (!profile) throw new BadRequestException("Approve a collection profile before building launch transaction.");
    const collection = await this.prisma.collection.findFirst({ where: { approvedGenerationRunId: run.id }, include: { creator: true } });
    if (!collection) throw new BadRequestException("Create the collection record before building launch transaction.");
    if (collection.creator.walletAddress !== walletAddress) throw new ConflictException("Wallet does not own this collection.");
    if (collection.launchStatus === "CONFIRMED" && collection.collectionAssetAddress) return collection;

    const metadataUri =
      collection.collectionMetadataUri ??
      collection.metadataUri ??
      (await this.assetStorage.storeFinalNftMetadata(`${collection.id}/collection.json`, {
        name: profile.collection,
        description: profile.lore,
        image: profile.previewAssets.find((asset) => asset.type === "AVATAR")?.uri,
        banner: profile.previewAssets.find((asset) => asset.type === "BANNER")?.uri,
        external_url: process.env.NEXT_PUBLIC_APP_URL,
        properties: {
          phew: {
            generationRunId: run.id,
            styleProfileVersion: profile.version,
            brandDna: profile.brandDna,
            assetPackId: profile.assetPackId
          }
        }
      }));

    const launchTx = await this.solana.buildCommunityLaunchTransaction({
      walletAddress,
      tokenMint: run.tokenMint,
      collectionName: profile.collection,
      metadataUri,
      theme: profile.theme,
      mascot: profile.mascot,
      vibe: profile.artStyle
    });

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.collection.update({
        where: { id: collection.id },
        data: {
          collectionMetadataUri: metadataUri,
          metadataUri,
          collectionAssetAddress: launchTx.collectionAssetAddress,
          onchainProfilePda: launchTx.onchainProfilePda,
          feeVaultPda: launchTx.feeVaultPda,
          tokenVaultPda: launchTx.reserveVaultTokenAccount,
          launchUnsignedTransaction: this.json(launchTx),
          launchStatus: launchTx.base64UnsignedTransaction ? "TX_BUILT" : "PENDING"
        }
      });
      await tx.reserveVault.upsert({
        where: { collectionId: collection.id },
        update: {
          tokenMint: run.tokenMint,
          reserveVaultPda: launchTx.reserveVaultTokenAccount,
          status: "ACTIVE",
          verificationMetadata: this.json({
            source: "launch-transaction-built",
            tokenVaultAuthority: launchTx.tokenVaultAuthority,
            tokenVaultStatePda: launchTx.tokenVaultStatePda,
            warning: "Reserve custody is not confirmed until the launch transaction is signed and verified."
          })
        },
        create: {
          collectionId: collection.id,
          tokenMint: run.tokenMint,
          reserveVaultPda: launchTx.reserveVaultTokenAccount,
          totalLocked: "0",
          totalRedeemed: "0",
          totalStaked: "0",
          availableBacking: "0",
          reserveRatioBps: 10000,
          status: "ACTIVE",
          verificationMetadata: this.json({
            source: "launch-transaction-built",
            tokenVaultAuthority: launchTx.tokenVaultAuthority,
            tokenVaultStatePda: launchTx.tokenVaultStatePda,
            warning: "Reserve custody is not confirmed until the launch transaction is signed and verified."
          })
        }
      });
      return updated;
    });
  }

  async submitCollectionLaunch(id: string, input: SubmitCollectionLaunchInput) {
    await requireDbForWrite(this.prisma);
    const run = await this.getRunForWallet(id, input.walletAddress);
    const collection = await this.prisma.collection.findFirst({ where: { approvedGenerationRunId: run.id }, include: { creator: true } });
    if (!collection) throw new BadRequestException("Collection launch record not found.");
    if (collection.creator.walletAddress !== input.walletAddress) throw new ConflictException("Wallet does not own this collection.");
    const result = await this.solana.submitAndConfirm({
      transactionId: collection.id,
      signedTransaction: input.signedTransaction,
      txSignature: input.txSignature
    });
    if (!result.confirmed) {
      return this.prisma.collection.update({
        where: { id: collection.id },
        data: {
          launchStatus: result.status,
          launchTxSignature: result.txSignature
        }
      });
    }

    const verification = await this.solana.verifyCommunityProfileInitialization({
      walletAddress: input.walletAddress,
      tokenMint: run.tokenMint,
      collectionAssetAddress: collection.collectionAssetAddress
    });
    if (verification.verificationAvailable && !verification.passed) {
      await this.prisma.collection.update({
        where: { id: collection.id },
        data: {
          launchStatus: "FAILED",
          launchTxSignature: result.txSignature
        }
      });
      throw new BadRequestException(`Collection launch transaction confirmed but protocol account verification failed: ${verification.issues.join(" ")}`);
    }
    const addresses = verification.addresses ?? this.solana.deriveCommunityAddresses({ tokenMint: run.tokenMint, walletAddress: input.walletAddress });
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.collection.update({
        where: { id: collection.id },
        data: {
          launchStatus: "CONFIRMED",
          launchTxSignature: result.txSignature,
          launchedAt: new Date(),
          onchainProfilePda: addresses.collectionProfile,
          feeVaultPda: addresses.feeVault,
          tokenVaultPda: addresses.reserveVaultTokenAccount
        }
      });
      await tx.reserveVault.upsert({
        where: { collectionId: collection.id },
        update: {
          tokenMint: run.tokenMint,
          reserveVaultPda: addresses.reserveVaultTokenAccount,
          availableBacking: verification.reserve?.balance ?? "0",
          reserveRatioBps: 10000,
          status: "ACTIVE",
          lastOnChainVerifiedAt: verification.verificationAvailable ? new Date() : undefined,
          verificationMetadata: this.json({
            source: "launch-post-confirm",
            txSignature: result.txSignature,
            tokenVaultAuthority: addresses.tokenVaultAuthority,
            tokenVaultStatePda: addresses.tokenVaultState,
            collectionAssetExists: verification.collectionAssetExists,
            issues: verification.issues
          })
        },
        create: {
          collectionId: collection.id,
          tokenMint: run.tokenMint,
          reserveVaultPda: addresses.reserveVaultTokenAccount,
          totalLocked: "0",
          totalRedeemed: "0",
          totalStaked: "0",
          availableBacking: verification.reserve?.balance ?? "0",
          reserveRatioBps: 10000,
          status: "ACTIVE",
          lastOnChainVerifiedAt: verification.verificationAvailable ? new Date() : undefined,
          verificationMetadata: this.json({
            source: "launch-post-confirm",
            txSignature: result.txSignature,
            tokenVaultAuthority: addresses.tokenVaultAuthority,
            tokenVaultStatePda: addresses.tokenVaultState,
            collectionAssetExists: verification.collectionAssetExists,
            issues: verification.issues
          })
        }
      });
      return updated;
    });
  }

  async sampleMetadata(id: string, walletAddress?: string) {
    const run = await this.getRun(id);
    this.assertOwner(run, walletAddress);
    const profile = run.styleProfiles.find((item) => item.isApproved) ?? run.styleProfiles[0];
    if (!profile?.traitPack) throw new NotFoundException("Generation run has no trait pack");
    const style = this.styleFromRecord(profile);
    const pack = this.packFromRecord(profile.traitPack);
    const preview = profile.previewAssets.find((asset) => asset.type === "SAMPLE_NFT");
    return this.metadata.sample(
      style,
      pack,
      preview
        ? {
            type: "SAMPLE_NFT",
            label: preview.label,
            uri: preview.uri,
            productionAssetStatus: (preview.productionAssetStatus ?? "WIREFRAME") as ProductionAssetStatus,
            previewClassification: (preview.previewClassification ?? "WIREFRAME_CONCEPT") as PreviewClassification,
            provider: (preview.provider ?? "wireframe") as PreviewAssetPlan["provider"],
            generationMetadata: this.record(preview.generationMetadata),
            metadata: this.record(preview.metadata)
          }
        : undefined
    );
  }

  private async createProfileVersion(
    runId: string,
    input: CreateGenerationRunInput,
    analysis: ReturnType<LogoAnalysisService["analyze"]>,
    context: ReturnType<CommunityContextService["build"]>,
    version: number,
    reroll: number
  ): Promise<StudioGenerationSummary> {
    const style = this.styleProfiles.generate(input, analysis, context, version);
    const pack = this.traitPacks.generate(style);
    const styleBible = this.buildStyleBible(style, pack);
    const compatibilityRules = this.traitPacks.compatibilityRules(pack);
    const compatibilityResult = this.compatibility.validateRules(pack, compatibilityRules);
    const wireframes = this.previews.generate(style, pack, `${input.tokenMint}:${version}`, reroll);
    const studioResult = await this.studioAssetsWithCache(input.tokenMint, style, pack, styleBible, version, `v${version}`);
    const studioAssets = studioResult.assets.filter(isRealStudioBibleAsset);
    if (hasAllRealStudioBibleAssets(studioAssets)) {
      style.productionAssetStatus = "AI_CONCEPT";
      style.artSource = "AI_ASSISTED";
      style.productionAssetPolicy.defaultAssetStatus = "AI_CONCEPT";
    }
    this.applyConfiguredProductionStatus(style, pack);
    const previews = [...studioAssets, ...wireframes];
    const existing = await this.prisma.styleProfile.findMany({
      where: { generationRunId: { not: runId } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, collection: true, mascot: true, artStyle: true, colors: true, backgroundWorld: true, traitLanguage: true, visualFingerprint: true, brandDna: true }
    });
    const distinctiveness = this.distinctiveness.score(style, existing);
    const quality = this.quality.validate(style, pack, compatibilityRules, previews, distinctiveness);
    if (!compatibilityResult.passed) quality.issues.push(...compatibilityResult.issues);
    quality.issues.push(...this.aiQuality.validate(previews));

    const profile = await this.prisma.styleProfile.create({
      data: {
        generationRunId: runId,
        version,
        collection: style.collection,
        theme: style.theme,
        mascot: style.mascot,
        artStyle: style.artStyle,
        colors: this.json(style.colors),
        backgroundWorld: style.backgroundWorld,
        traitLanguage: this.json(style.traitLanguage),
        rarityStructure: this.json(style.rarityStructure),
        legendaryTheme: style.legendaryTheme,
        animationStyle: style.animationStyle,
        raidTheme: style.raidTheme,
        lore: style.lore,
        roleNames: this.json(style.roleNames),
        brandDna: this.json(style.brandDna),
        visualFingerprint: this.json(style.visualFingerprint),
        assetPackId: style.assetPackId,
        artSource: style.artSource,
        productionAssetStatus: style.productionAssetStatus,
        tenKReadinessReport: this.json(style.tenKReadiness)
      }
    });

    const traitPack = await this.prisma.generatorTraitPack.create({
      data: {
        styleProfileId: profile.id,
        collectionSize: pack.collectionSize,
        categories: this.json(pack.categories),
        categoryRoles: this.json(pack.categoryRoles),
        categoryLabels: this.json(pack.categoryLabels),
        rarityWeights: this.json(pack.rarityWeights),
        unlockSchedule: this.json(pack.unlockSchedule),
        uniquenessRules: this.json(pack.uniquenessRules)
      }
    });

    await this.prisma.traitDefinition.createMany({
      data: pack.traits.map((trait) => ({
        traitPackId: traitPack.id,
        category: trait.category,
        name: trait.name,
        rarity: trait.rarity,
        weightBps: trait.weightBps,
        unlockLevel: trait.unlockLevel,
        compatibilityTags: this.json(trait.compatibilityTags),
        visualDescription: trait.visualDescription
      }))
    });

    await this.prisma.compatibilityRule.createMany({
      data: compatibilityRules.map((rule) => ({
        traitPackId: traitPack.id,
        trait: rule.trait,
        incompatibleWith: this.json(rule.incompatibleWith),
        reason: rule.reason
      }))
    });

    await this.persistPreviews(runId, profile.id, version, previews);
    await this.prisma.distinctivenessReport.create({
      data: {
        generationRunId: runId,
        styleProfileId: profile.id,
        silhouetteUniqueness: distinctiveness.silhouetteUniqueness,
        paletteUniqueness: distinctiveness.paletteUniqueness,
        mascotUniqueness: distinctiveness.mascotUniqueness,
        backgroundWorldUniqueness: distinctiveness.backgroundWorldUniqueness,
        traitLanguageUniqueness: distinctiveness.traitLanguageUniqueness,
        score: distinctiveness.score,
        passed: distinctiveness.passed,
        nearestCollection: distinctiveness.nearestCollection ? this.json(distinctiveness.nearestCollection) : undefined
      }
    });
    await this.prisma.qualityReport.create({
      data: {
        generationRunId: runId,
        styleProfileId: profile.id,
        previewQualityScore: quality.previewQualityScore,
        uniquenessScore: quality.uniquenessScore,
        colorHarmonyScore: quality.colorHarmonyScore,
        rarityDistributionScore: quality.rarityDistributionScore,
        duplicateRiskScore: quality.duplicateRiskScore,
        compatibilityScore: quality.compatibilityScore,
        tier: quality.tier,
        passed: quality.passed,
        issues: this.json(quality.issues)
      }
    });
    return studioResult.summary;
  }

  private async persistPreviewQualityReport(
    generationRunId: string,
    styleProfileId: string,
    style: GeneratedStyleProfile,
    pack: TraitPackPlan,
    latest: any,
    refreshedPreviews: PreviewAssetPlan[]
  ) {
    const compatibilityRules = this.traitPacks.compatibilityRules(pack);
    const distinctivenessRecord = latest.distinctivenessReports?.[0];
    const distinctiveness = distinctivenessRecord
      ? {
          silhouetteUniqueness: distinctivenessRecord.silhouetteUniqueness,
          paletteUniqueness: distinctivenessRecord.paletteUniqueness,
          mascotUniqueness: distinctivenessRecord.mascotUniqueness,
          backgroundWorldUniqueness: distinctivenessRecord.backgroundWorldUniqueness,
          traitLanguageUniqueness: distinctivenessRecord.traitLanguageUniqueness,
          score: distinctivenessRecord.score,
          passed: distinctivenessRecord.passed,
          nearestCollection: this.record(distinctivenessRecord.nearestCollection)
        }
      : this.distinctiveness.score(style, []);
    const activePreviews = this.activePreviewSet(latest.previewAssets, refreshedPreviews);
    const quality = this.quality.validate(style, pack, compatibilityRules, activePreviews, distinctiveness);
    quality.issues.push(...this.aiQuality.validate(activePreviews));
    await this.prisma.qualityReport.create({
      data: {
        generationRunId,
        styleProfileId,
        previewQualityScore: quality.previewQualityScore,
        uniquenessScore: quality.uniquenessScore,
        colorHarmonyScore: quality.colorHarmonyScore,
        rarityDistributionScore: quality.rarityDistributionScore,
        duplicateRiskScore: quality.duplicateRiskScore,
        compatibilityScore: quality.compatibilityScore,
        tier: quality.tier,
        passed: quality.passed,
        issues: this.json([
          ...quality.issues,
          `Studio action ${String(refreshedPreviews[0]?.metadata.studioAction ?? "selective-regeneration")} refreshed selected preview assets.`
        ])
      }
    });
  }

  private activePreviewSet(records: any[], overrides: PreviewAssetPlan[] = []) {
    const seen = new Set<string>();
    const all = [
      ...overrides,
      ...records
        .slice()
        .sort((left, right) => Number(right.version ?? 0) - Number(left.version ?? 0))
        .map((record) => this.previewAssetFromRecord(record))
    ];
    return all.filter((asset) => {
      const key = `${asset.type}:${asset.type === "SAMPLE_NFT" ? String(asset.metadata.rarity ?? asset.label) : asset.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private previewAssetFromRecord(record: any): PreviewAssetPlan {
    return {
      type: record.type as PreviewAssetPlan["type"],
      label: record.label,
      uri: record.uri,
      productionAssetStatus: (record.productionAssetStatus ?? "WIREFRAME") as ProductionAssetStatus,
      previewClassification: (record.previewClassification ?? "WIREFRAME_CONCEPT") as PreviewClassification,
      provider: ((record.provider as PreviewAssetPlan["provider"] | null) ?? "wireframe") as PreviewAssetPlan["provider"],
      promptHash: record.promptHash ?? undefined,
      generationMetadata: this.record(record.generationMetadata),
      metadata: this.record(record.metadata)
    };
  }

  private nextPreviewVersion(records: Array<{ version?: number }>) {
    return Math.max(1, ...records.map((asset) => Number(asset.version ?? 1))) + 1;
  }

  private isStudioRegeneration(action: StudioWorkflowInput["action"]) {
    return action === "regenerate-rarity-tier" || action === "regenerate-mood-set" || action === "regenerate-legendary-scene";
  }

  private selectStudioPreviews(previews: PreviewAssetPlan[], input: StudioWorkflowInput) {
    if (input.action === "regenerate-rarity-tier") {
      const target = this.rarityTarget(input.target);
      return previews.filter((preview) => preview.type === "SAMPLE_NFT" && String(preview.metadata.rarity) === target);
    }
    if (input.action === "regenerate-mood-set") {
      return previews.filter((preview) => preview.type === "SAMPLE_NFT");
    }
    if (input.action === "regenerate-legendary-scene") {
      return previews.filter((preview) => preview.type === "SAMPLE_NFT" && /Legendary|Mythic/.test(String(preview.metadata.rarity)));
    }
    return [];
  }

  private selectStudioAssets(previews: PreviewAssetPlan[], input: StudioWorkflowInput) {
    if (input.action === "regenerate-rarity-tier") return previews.filter((preview) => preview.type === "RARITY_LADDER" || preview.type === "TRAIT_CATALOG");
    if (input.action === "regenerate-mood-set") return previews.filter((preview) => preview.type === "MOOD_SHEET");
    if (input.action === "regenerate-legendary-scene") return previews.filter((preview) => preview.type === "RARITY_LADDER" || preview.type === "LAYER_BREAKDOWN");
    return [];
  }

  private annotateStudioPreviews(previews: PreviewAssetPlan[], input: StudioWorkflowInput, workflow: StudioWorkflowState) {
    return previews.map((preview) => ({
      ...preview,
      label: `${preview.label} / ${this.studioActionLabel(input)}`,
      generationMetadata: {
        ...(preview.generationMetadata ?? {}),
        studioWorkflow: workflow,
        studioAction: input.action,
        studioTarget: input.target,
        selectiveRegeneration: true
      },
      metadata: {
        ...preview.metadata,
        studioWorkflow: workflow,
        studioAction: input.action,
        studioTarget: input.target,
        selectiveRegeneration: true
      }
    }));
  }

  private studioActionLabel(input: StudioWorkflowInput) {
    if (input.action === "regenerate-rarity-tier") return `${this.rarityTarget(input.target)} rerender`;
    if (input.action === "regenerate-mood-set") return "mood set rerender";
    if (input.action === "regenerate-legendary-scene") return "legendary scene rerender";
    return input.action.replace(/-/g, " ");
  }

  private rarityTarget(target?: string) {
    const normalized = String(target ?? "Legendary").trim().toLowerCase();
    const match = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"].find((rarity) => rarity.toLowerCase() === normalized);
    return match ?? "Legendary";
  }

  private studioWorkflowState(value: unknown): StudioWorkflowState {
    const raw = this.record(value);
    const locks = this.record(raw.locks);
    const approvals = this.record(raw.approvals);
    const rerolls = this.record(raw.rerolls);
    return {
      locks: {
        artDirection: locks.artDirection === true,
        style: locks.style === true,
        mood: locks.mood === true,
        rarityDirection: locks.rarityDirection === true
      },
      approvals: {
        silhouetteSystem: approvals.silhouetteSystem === true,
        factionCulture: approvals.factionCulture === true,
        traitFamily: approvals.traitFamily === true,
        cinematicDirection: approvals.cinematicDirection === true
      },
      rerolls: {
        rarityTiers: this.record(rerolls.rarityTiers) as Record<string, number>,
        moodSet: Number(rerolls.moodSet ?? 0),
        legendaryScene: Number(rerolls.legendaryScene ?? 0)
      },
      lastAction: raw.lastAction && typeof raw.lastAction === "object" ? raw.lastAction as StudioWorkflowState["lastAction"] : undefined
    };
  }

  private nextStudioWorkflow(current: StudioWorkflowState, input: StudioWorkflowInput): StudioWorkflowState {
    const next: StudioWorkflowState = {
      locks: { ...current.locks },
      approvals: { ...current.approvals },
      rerolls: {
        rarityTiers: { ...current.rerolls.rarityTiers },
        moodSet: current.rerolls.moodSet,
        legendaryScene: current.rerolls.legendaryScene
      },
      lastAction: {
        action: input.action,
        target: input.target,
        note: input.note,
        walletAddress: input.walletAddress,
        at: new Date().toISOString()
      }
    };

    if (input.action === "lock-art-direction") next.locks.artDirection = true;
    if (input.action === "lock-style") next.locks.style = true;
    if (input.action === "lock-mood") next.locks.mood = true;
    if (input.action === "lock-rarity-direction") next.locks.rarityDirection = true;
    if (input.action === "approve-silhouette-system") next.approvals.silhouetteSystem = true;
    if (input.action === "approve-faction-culture") next.approvals.factionCulture = true;
    if (input.action === "approve-trait-family") next.approvals.traitFamily = true;
    if (input.action === "approve-cinematic-direction") next.approvals.cinematicDirection = true;
    if (input.action === "regenerate-rarity-tier") {
      const target = this.rarityTarget(input.target);
      next.rerolls.rarityTiers[target] = Number(next.rerolls.rarityTiers[target] ?? 0) + 1;
    }
    if (input.action === "regenerate-mood-set") next.rerolls.moodSet += 1;
    if (input.action === "regenerate-legendary-scene") next.rerolls.legendaryScene += 1;
    return next;
  }

  private studioApprovalIssues(workflow: StudioWorkflowState) {
    return [
      workflow.locks.artDirection ? "" : "lock art direction",
      workflow.approvals.silhouetteSystem ? "" : "approve silhouette system",
      workflow.approvals.factionCulture ? "" : "approve faction culture",
      workflow.approvals.traitFamily ? "" : "approve trait family",
      workflow.approvals.cinematicDirection ? "" : "approve cinematic direction"
    ].filter(Boolean);
  }

  private async persistPreviews(generationRunId: string, styleProfileId: string, version: number, previews: PreviewAssetPlan[]) {
    const storedPreviews = await Promise.all(
      previews.map(async (preview, index) => {
        try {
          return {
            ...preview,
            uri: await this.assetStorage.storePreviewAsset(`${generationRunId}/v${version}/${index + 1}-${preview.type.toLowerCase()}${this.previewExtension(preview.uri)}`, preview.uri)
          };
        } catch (error) {
          const aiConcept = preview.productionAssetStatus === "AI_CONCEPT";
          throw new ServiceUnavailableException({
            code: aiConcept ? "AI_PREVIEW_STORAGE_FAILED" : "PREVIEW_STORAGE_FAILED",
            message: aiConcept ? "Storage failed while saving the generated studio preview." : "Storage failed while saving the preview asset.",
            details: {
              stage: "preview_asset_storage",
              assetType: preview.type,
              provider: preview.provider,
              errorClass: error instanceof Error ? error.name : typeof error,
              raw: error instanceof Error ? error.message : String(error)
            }
          });
        }
      })
    );

    await this.prisma.previewAsset.createMany({
      data: storedPreviews.map((preview) => ({
        generationRunId,
        styleProfileId,
        type: preview.type as Prisma.PreviewAssetCreateManyInput["type"],
        label: preview.label,
        uri: preview.uri,
        productionAssetStatus: preview.productionAssetStatus,
        previewClassification: preview.previewClassification,
        provider: preview.provider,
        promptHash: preview.promptHash,
        generationMetadata: this.json(preview.generationMetadata ?? {}),
        metadata: this.json(preview.metadata),
        version
      }))
    });
  }

  private previewExtension(uri: string) {
    if (uri.startsWith("data:image/png")) return ".png";
    if (uri.startsWith("data:image/jpeg")) return ".jpg";
    if (uri.startsWith("data:image/webp")) return ".webp";
    return ".svg";
  }

  private normalize(input: CreateGenerationRunInput): NormalizedGenerationRunInput {
    if (!input.tokenMint?.trim()) throw new Error("tokenMint is required");
    const source = input.hints?.sourceMetadata;
    const override = input.hints?.overrides;
    const tokenName = input.tokenName?.trim() || override?.tokenName?.trim() || source?.name?.trim() || "Resolved Token";
    const tokenSymbol = input.tokenSymbol?.trim() || override?.tokenSymbol?.trim() || source?.symbol?.trim() || "TOKEN";
    const description =
      input.description?.trim() ||
      override?.description?.trim() ||
      source?.description?.trim() ||
      `${tokenName} holder community generated from Solana token metadata.`;
    const logoUri = input.logoUri?.trim() || override?.logoUri?.trim() || source?.imageUri || source?.logoUri;
    return {
      ...input,
      tokenName,
      tokenSymbol: tokenSymbol.startsWith("$") ? tokenSymbol : `$${tokenSymbol}`,
      tokenMint: input.tokenMint.trim(),
      logoUri,
      description,
      selectedPreset: input.selectedPreset ?? process.env.GENERATOR_DEFAULT_PRESET ?? "creative-dna-generated"
    };
  }

  private normalizePreviewInput(input: CreateGenerationRunInput): NormalizedGenerationRunInput {
    const description = input.description?.trim() || input.hints?.sourceMetadata?.description?.trim() || input.hints?.lore?.trim() || `${input.tokenName || input.hints?.sourceMetadata?.name || "Token"} founder community on Phew.run`;
    return this.normalize({ ...input, description });
  }

  private traitTable(pack: TraitPackPlan) {
    return Object.entries(pack.categories).map(([category, values]) => ({
      category: pack.categoryLabels?.[category] ?? category,
      role: Object.entries(pack.categoryRoles ?? {}).find(([, id]) => id === category)?.[0] ?? "custom",
      count: values.length,
      examples: values.slice(0, 8),
      productionReady: false,
      conceptOnly: true,
      rarityTiers: [...new Set(pack.traits.filter((trait) => trait.category === category).map((trait) => trait.rarity))]
    }));
  }

  private animationMoments(style: GeneratedStyleProfile) {
    return [
      { moment: "Stake NFT", spec: "NFT card slides into a neon vault chamber, ring lights up, lock seals, token energy pulse confirms stake." },
      { moment: "Unstake NFT", spec: "Vault opens, card rises through cyan haze, lock fragments dissolve into particles, release aura expands." },
      { moment: "Claim Rewards", spec: "Token shards burst from the reward badge, amount highlight counts up, progress rail emits a lime pulse." },
      { moment: "Open Chest", spec: "Chest shakes, hinge glow blooms, rarity color floods the frame, rare+ receives stronger particle density." },
      { moment: "Mint Vault NFT", spec: `Forge energy wraps the ${style.mascot}, collection frame assembles, final NFT lands in a showcase glow.` },
      { moment: "Redeem NFT", spec: "NFT dissolves cleanly, vault unlocks, token stream returns to wallet, confirmation state snaps into focus." },
      { moment: "Raid Success", spec: "Raid boss mark breaks, squad cards flare, XP trail sweeps across the board." },
      { moment: "Raid Level Up", spec: "Community level badge rotates through a cyan ring and emits a lime shockwave." },
      { moment: "Collection Upgrade", spec: "Trait pack tile unlocks with layered glass panels and a short aura pass." },
      { moment: "Legendary Reveal", spec: `${style.legendaryTheme}; darkened background, premium frame assembly, high-intensity aura, final freeze-frame.` }
    ];
  }

  private tenKReadinessReport(pack: TraitPackPlan, style: GeneratedStyleProfile, quality: { duplicateRiskScore: number; rarityDistributionScore: number; issues: string[] }) {
    const possible =
      BigInt(this.roleValues(pack, "base").length) *
      BigInt(this.roleValues(pack, "background").length) *
      BigInt(this.roleValues(pack, "head").length) *
      BigInt(this.roleValues(pack, "eyes").length) *
      BigInt(this.roleValues(pack, "mouth").length) *
      BigInt(this.roleValues(pack, "body").length) *
      BigInt(this.roleValues(pack, "prop").length) *
      BigInt(this.roleValues(pack, "aura").length) *
      BigInt(this.roleValues(pack, "frame").length);
    const blockers = [
      ...quality.issues,
      ...(style.artSource === "PROCEDURAL_FALLBACK" ? ["Production asset provider is not configured."] : []),
      ...(style.productionAssetStatus === "WIREFRAME" ? ["Wireframe previews are planning/debug only."] : []),
      ...(style.productionAssetStatus === "AI_CONCEPT" ? ["AI studio previews need creator approval plus curated/layered or artist-approved production assets before mint."] : []),
      ...(!style.tenKReadiness.pass ? ["10k readiness needs logo/reference input and non-generic silhouette validation."] : [])
    ];
    return {
      possibleUniqueCombinations: possible.toString(),
      validUniqueCombinations: possible.toString(),
      estimated10kFeasible: blockers.length === 0 && possible >= 10_000n,
      duplicateRisk: quality.duplicateRiskScore >= 90 ? "LOW" : quality.duplicateRiskScore >= 75 ? "MEDIUM" : "HIGH",
      visualDiversityScore: Math.min(98, Math.round((quality.duplicateRiskScore + quality.rarityDistributionScore) / 2)),
      rarityDistributionReport: pack.rarityWeights,
      backgroundDistributionCorrectness: this.roleValues(pack, "background").length >= 40 ? "PASS" : "BLOCKED",
      legendaryCaps: { maxPct: pack.uniquenessRules.legendaryCapPct, configured: true },
      compatibilityValidated: true,
      blockers
    };
  }

  private applyConfiguredProductionStatus(style: GeneratedStyleProfile, pack: TraitPackPlan) {
    const manifest = this.assetProduction.manifest(style, pack, "PREMIUM");
    if (manifest.productionReady) {
      style.productionAssetStatus = manifest.productionAssetStatus;
      style.productionAssetPolicy.defaultAssetStatus = manifest.productionAssetStatus;
      style.artSource = manifest.productionAssetStatus === "ARTIST_APPROVED" || manifest.productionAssetStatus === "FINAL_PRODUCTION" ? "HANDMADE_PACK" : "CURATED_PACK";
    }
  }

  private buildStyleBible(style: GeneratedStyleProfile, pack: TraitPackPlan): StyleBiblePlan {
    const plan = this.styleBible.build(style, pack);
    this.styleBible.attach(style, plan);
    return plan;
  }

  private async studioAssetsWithCache(
    tokenMint: string,
    style: GeneratedStyleProfile,
    pack: TraitPackPlan,
    plan: StyleBiblePlan,
    styleVersion: number,
    rarityVersion: string,
    options: { bypassCache?: boolean } = {}
  ) {
    void pack;
    const deterministicAssets = this.styleBible.studioAssets(plan);
    const cachedAssets = options.bypassCache ? [] : await this.persistedStudioAssetCache(tokenMint);
    return this.studioImages.generateStudioAssets({
      tokenMint,
      style,
      plan,
      deterministicAssets,
      styleVersion,
      rarityVersion,
      cachedAssets
    });
  }

  private async persistedStudioAssetCache(tokenMint: string): Promise<PreviewAssetPlan[]> {
    try {
      const runs = await this.prisma.generationRun.findMany({
        where: { tokenMint },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          styleProfiles: {
            orderBy: { version: "desc" },
            take: 3,
            include: {
              previewAssets: {
                where: {
                  type: { in: ["STYLE_BIBLE", "TRAIT_CATALOG", "RARITY_LADDER", "MOOD_SHEET", "LAYER_BREAKDOWN"] as any }
                },
                orderBy: { createdAt: "desc" }
              }
            }
          }
        }
      });
      return runs.flatMap((run) =>
        run.styleProfiles.flatMap((profile) =>
          profile.previewAssets.map((asset): PreviewAssetPlan => ({
            type: asset.type as PreviewAssetPlan["type"],
            label: asset.label,
            uri: asset.uri,
            productionAssetStatus: (asset.productionAssetStatus ?? "AI_CONCEPT") as ProductionAssetStatus,
            previewClassification: (asset.previewClassification ?? "AI_CONCEPT_PREVIEW") as PreviewClassification,
            provider: ((asset.provider as PreviewAssetPlan["provider"] | null) ?? "cached") as PreviewAssetPlan["provider"],
            promptHash: asset.promptHash ?? undefined,
            generationMetadata: this.record(asset.generationMetadata),
            metadata: this.record(asset.metadata)
          }))
        )
      );
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: "studio_asset_persistent_cache_lookup_failed",
          tokenMint: this.shortMint(tokenMint),
          errorClass: error instanceof Error ? error.name : typeof error,
          message: error instanceof Error ? error.message : String(error)
        })
      );
      return [];
    }
  }

  private studioConceptSummary(summary: StudioGenerationSummary) {
    return {
      provider: summary.provider,
      imageCount: summary.imageCount,
      imagesThisRun: summary.imagesThisRun,
      estimatedOpenAIRequestCount: 0,
      usesPaidOpenAIImageGeneration: false,
      lowCostMode: true,
      maxImagesPerRun: summary.imageCount,
      cacheTtlSeconds: 7 * 24 * 60 * 60,
      cachedResultAvailable: summary.cacheStatus === "hit",
      confirmationRequired: false,
      confirmationThreshold: 0,
      model: summary.model,
      quality: summary.generationType === "fast_studio_preview" ? "Fast Studio Preview" : "Premium Cinematic Render",
      estimatedCostUsd: summary.estimatedCostUsd,
      generationType: summary.generationType,
      cacheStatus: summary.cacheStatus,
      assets: summary.assets,
      costBreakdown: summary.costBreakdown,
      providerFailureReason: summary.providerFailureReason,
      providerFailureCode: summary.providerFailureCode,
      activeImageProvider: summary.activeImageProvider,
      activeModel: summary.activeModel,
      fallbackModelUsed: summary.fallbackModelUsed,
      billableGenerationAttempted: summary.billableGenerationAttempted,
      noBillableGenerationAttempted: summary.noBillableGenerationAttempted,
      unavailableReason: summary.unavailableReason,
      diagnostics: summary.diagnostics
    };
  }

  private studioProviderLabel(summary: StudioGenerationSummary) {
    if (summary.provider === "imagen") return "imagen-fast-studio-preview";
    if (summary.provider === "cached-imagen") return "cached-imagen-studio-bible-preview";
    if (summary.provider === "imagen-unavailable") return "imagen-unavailable-no-studio-sheets";
    if (summary.provider === "gemini") return "gemini-fast-studio-preview";
    if (summary.provider === "cached" || summary.provider === "cached-gemini") return "cached-gemini-studio-bible-preview";
    if (summary.provider === "gemini-unavailable") return "gemini-unavailable-no-studio-sheets";
    return "deterministic-dev-fallback-preview";
  }

  private cinematicProvider() {
    const provider = (process.env.CINEMATIC_PROVIDER ?? "openai").trim().toLowerCase();
    return provider === "gemini" ? "gemini" : "openai";
  }

  private async conceptPreviewsWithFallback(tokenMint: string, style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string, logoData?: string, logoUri?: string, options: { bypassCache?: boolean } = {}) {
    const conceptRequest = this.aiConcepts.conceptRunSummary(style, pack, seedKey, logoData, logoUri);
    const cacheKey = String(conceptRequest.cacheKey);
    const dnaHash = this.aiConcepts.dnaHash(style);
    const memoryCached = options.bypassCache ? [] : this.aiConcepts.cachedConcepts(cacheKey);
    if (memoryCached.length) {
      const result = {
        previews: memoryCached,
        warnings: ["Cached AI studio preview reused; no new OpenAI image request was made."],
        conceptRequest: { ...conceptRequest, provider: "cached", cachedResultAvailable: true, usesPaidOpenAIImageGeneration: false, estimatedOpenAIRequestCount: 0 }
      };
      this.logPreviewTrace("memory-cache", tokenMint, result.previews, result.conceptRequest);
      return result;
    }

    const persistedCached = options.bypassCache ? [] : await this.persistedConceptCache(tokenMint, dnaHash);
    if (persistedCached.length) {
      this.aiConcepts.rememberConcepts(cacheKey, persistedCached);
      const result = {
        previews: persistedCached,
        warnings: ["Previous AI studio preview for this token and Creative DNA hash reused; no new OpenAI image request was made."],
        conceptRequest: { ...conceptRequest, provider: "cached", cachedResultAvailable: true, usesPaidOpenAIImageGeneration: false, estimatedOpenAIRequestCount: 0 }
      };
      this.logPreviewTrace("persistent-cache", tokenMint, result.previews, result.conceptRequest);
      return result;
    }

    if (conceptRequest.provider === "cached-only") {
      const result = {
        previews: [] as PreviewAssetPlan[],
        warnings: ["AI_CONCEPT_PROVIDER=cached-only is configured, but no cached studio art exists. No fake collection art is shown; use the style bible and controls until cached or OpenAI assets are available."],
        conceptRequest: { ...conceptRequest, provider: "cached-only", cachedResultAvailable: false, usesPaidOpenAIImageGeneration: false, estimatedOpenAIRequestCount: 0 }
      };
      this.logPreviewTrace("cached-only-no-art", tokenMint, result.previews, result.conceptRequest);
      return result;
    }

    try {
      const previews = await this.withProviderTimeout(this.aiConcepts.generateRequired(style, pack, seedKey, logoData, logoUri), 20_000);
      const provider = this.previewProviderLabel(previews);
      const visiblePreviews = provider === "premium-fallback-poster" || provider === "legacy-placeholder-hidden" ? [] : previews;
      const warnings = visiblePreviews.length ? [] : ["Configured image provider returned fallback or placeholder art. It is hidden from creator-facing collection output."];
      const result = {
        previews: visiblePreviews,
        warnings,
        conceptRequest: { ...conceptRequest, provider, cachedResultAvailable: false, usesPaidOpenAIImageGeneration: provider === "openai-ai-concept-preview", estimatedOpenAIRequestCount: provider === "openai-ai-concept-preview" ? conceptRequest.imageCount : 0 }
      };
      this.logPreviewTrace("provider-success", tokenMint, result.previews, result.conceptRequest);
      return result;
    } catch (error) {
      const unavailable = this.aiUnavailableWarning(error);
      const result = {
        previews: [] as PreviewAssetPlan[],
        warnings: [
          unavailable,
          "OpenAI generation is unavailable. No fake NFT art is shown; creators can keep editing the style bible, traits, moods, rarity plan, and exports, then rerender after billing/provider repair."
        ],
        conceptRequest: { ...conceptRequest, provider: "openai-unavailable", cachedResultAvailable: false, usesPaidOpenAIImageGeneration: false, estimatedOpenAIRequestCount: 0, providerFailureReason: unavailable, providerFailureCode: this.providerFailureCode(error) }
      };
      this.logPreviewTrace("openai-unavailable-no-art", tokenMint, result.previews, result.conceptRequest);
      return result;
    }
  }

  private async withProviderTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new GatewayTimeoutException(`OpenAI image provider timed out after ${timeoutMs}ms`)), timeoutMs);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async persistedConceptCache(tokenMint: string, dnaHash: string): Promise<PreviewAssetPlan[]> {
    try {
      const runs = await this.prisma.generationRun.findMany({
        where: { tokenMint },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          styleProfiles: {
            orderBy: { version: "desc" },
            take: 3,
            include: {
              previewAssets: {
                where: { previewClassification: "AI_CONCEPT_PREVIEW" },
                orderBy: { createdAt: "desc" }
              }
            }
          }
        }
      });
      for (const run of runs) {
        for (const profile of run.styleProfiles) {
          const assets = profile.previewAssets
            .map((asset): PreviewAssetPlan => {
              const metadata = this.record(asset.metadata);
              const generationMetadata = this.record(asset.generationMetadata);
              return {
                type: asset.type as PreviewAssetPlan["type"],
                label: asset.label,
                uri: asset.uri,
                productionAssetStatus: (asset.productionAssetStatus ?? "AI_CONCEPT") as ProductionAssetStatus,
                previewClassification: (asset.previewClassification ?? "AI_CONCEPT_PREVIEW") as PreviewClassification,
                provider: ((asset.provider as PreviewAssetPlan["provider"] | null) ?? "cached") as PreviewAssetPlan["provider"],
                promptHash: asset.promptHash ?? undefined,
                generationMetadata: { ...generationMetadata, servedFromPersistentCache: true },
                metadata: { ...metadata, servedFromPersistentCache: true }
              };
            })
            .filter((asset) => String(asset.metadata.dnaHash ?? asset.generationMetadata?.dnaHash ?? "") === dnaHash);
          if (this.aiConcepts.usableConceptSet(assets)) return assets;
        }
      }
      return [];
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: "ai_concept_persistent_cache_lookup_failed",
          tokenMint: this.shortMint(tokenMint),
          errorClass: error instanceof Error ? error.name : typeof error,
          message: error instanceof Error ? error.message : String(error)
        })
      );
      return [];
    }
  }

  private previewProviderLabel(previews: PreviewAssetPlan[]) {
    if (previews.some((preview) => preview.provider === "openai")) return "openai-ai-concept-preview";
    if (previews.some((preview) => preview.provider === "cached")) return "cached-ai-concept-preview";
    if (previews.some((preview) => preview.provider === "premium-fallback")) return "premium-fallback-poster";
    if (previews.some((preview) => preview.provider === "local-placeholder")) return "legacy-placeholder-hidden";
    if (previews.some((preview) => preview.provider === "curated")) return "curated-layer-preview";
    return "wireframe-concept-preview";
  }

  private logPreviewTrace(stage: string, tokenMint: string, previews: PreviewAssetPlan[], conceptRequest: Record<string, unknown>) {
    this.logger.log(
      JSON.stringify({
        event: "generator_preview_generation_trace",
        stage,
        tokenMint: this.shortMint(tokenMint),
        providerSelected: conceptRequest.provider,
        model: conceptRequest.model,
        imageCountRequested: conceptRequest.imageCount,
        estimatedOpenAIRequestCount: conceptRequest.estimatedOpenAIRequestCount,
        paidOpenAI: conceptRequest.usesPaidOpenAIImageGeneration,
        cachedResultAvailable: conceptRequest.cachedResultAvailable,
        previewAssetCount: previews.length,
        previewClassification: previews[0]?.previewClassification,
        productionAssetStatus: previews[0]?.productionAssetStatus,
        promptHashes: previews.map((preview) => preview.promptHash).filter(Boolean),
        assetStorageResult: "not-persisted-for-preview-only-or-inline-before-persist"
      })
    );
  }

  private shortMint(value: string) {
    return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-6)}` : value;
  }

  private aiPreviewException(error: unknown) {
    if (error instanceof HttpException) return error;
    if (error instanceof AiConceptGenerationError) {
      const payload = {
        code: error.code,
        message: error.message,
        details: {
          stage: "ai_concept_preview",
          ...error.details
        }
      };
      if (error.code === "OPENAI_PROMPT_REJECTED") return new BadRequestException(payload);
      if (error.code === "OPENAI_IMAGE_TIMEOUT") return new GatewayTimeoutException(payload);
      return new ServiceUnavailableException(payload);
    }
    return new ServiceUnavailableException({
      code: "OPENAI_REQUEST_FAILED",
      message: "OpenAI request failed while creating the AI studio preview.",
      details: {
        stage: "ai_concept_preview",
        errorClass: error instanceof Error ? error.name : typeof error,
        raw: error instanceof Error ? error.message : String(error)
      }
    });
  }

  private aiUnavailableWarning(error: unknown) {
    return `AI studio generation unavailable: ${this.publicErrorMessage(error)}`;
  }

  private publicErrorMessage(error: unknown) {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === "string") return this.sanitizePublicError(response);
      if (response && typeof response === "object") {
        const record = response as Record<string, unknown>;
        const code = typeof record.code === "string" ? record.code : undefined;
        const message = typeof record.message === "string" ? record.message : undefined;
        if (message) return this.sanitizePublicError(code ? `${code}: ${message}` : message);
      }
    }
    if (error instanceof AiConceptGenerationError) return this.sanitizePublicError(error.message);
    if (error instanceof Error) return this.sanitizePublicError(error.message);
    return "OpenAI did not return a usable studio preview.";
  }

  private providerFailureCode(error: unknown) {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (response && typeof response === "object") {
        const code = (response as Record<string, unknown>).code;
        if (typeof code === "string") return code;
      }
    }
    if (error instanceof AiConceptGenerationError) return error.code;
    return "OPENAI_REQUEST_FAILED";
  }

  private sanitizePublicError(value: string) {
    return value
      .replace(/sk-[A-Za-z0-9_-]+/g, "sk-...")
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ...")
      .replace(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/gi, "data:image/...;base64,...")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 600) || "OpenAI did not return a usable studio preview.";
  }

  private assertLaunchProviders(style: GeneratedStyleProfile, pack: TraitPackPlan, qualityTier: "BASIC" | "PREMIUM" | "LEGENDARY_READY", deterministicExportReady = false) {
    const manifest = this.assetProduction.manifest(style, pack, qualityTier);
    const issues = manifest.readinessReport.reasonIfNo ? [manifest.readinessReport.reasonIfNo] : [];
    const storageProvider = process.env.FINAL_ASSET_STORAGE_PROVIDER ?? process.env.ASSET_STORAGE_PROVIDER ?? "mock";
    if (!deterministicExportReady && !manifest.productionReady) issues.push(`Launch requires ${process.env.REQUIRED_LAUNCH_ASSET_STATUS ?? "CURATED_LAYER_READY/ARTIST_APPROVED"} assets; current status is ${manifest.productionAssetStatus}.`);
    if (storageProvider === "mock") issues.push("Permanent storage is missing. Set FINAL_ASSET_STORAGE_PROVIDER to pinata, arweave, irys, or a supported permanent adapter.");
    if (!process.env.FINAL_RENDER_STORAGE_ROOT && !this.demoLayerPackAllowed()) issues.push("FINAL_RENDER_STORAGE_ROOT is required for cached/pre-generated deterministic render outputs.");
    if (storageProvider === "pinata" && !process.env.PINATA_JWT) issues.push("PINATA_JWT is required for FINAL_ASSET_STORAGE_PROVIDER=pinata.");
    if ((storageProvider === "arweave" || storageProvider === "irys") && !(process.env.IRYS_PRIVATE_KEY || process.env.ARWEAVE_KEY)) issues.push(`${storageProvider} requires IRYS_PRIVATE_KEY or ARWEAVE_KEY.`);
    if (issues.length) throw new BadRequestException(`Collection launch blocked: ${[...new Set(issues)].join(" ")}`);
  }

  private demoLayerPackAllowed() {
    return (process.env.DEMO_CURATED_LAYER_PACK ?? "false") === "true" && (process.env.APP_ENV ?? process.env.NODE_ENV ?? "development") !== "production";
  }

  private inputFromRun(run: any): CreateGenerationRunInput {
    return {
      tokenName: run.tokenName,
      tokenSymbol: run.tokenSymbol,
      tokenMint: run.tokenMint,
      logoUri: run.logoUri ?? undefined,
      logoData: run.logoData ?? undefined,
      description: run.description,
      selectedPreset: run.selectedPreset ?? undefined,
      hints: this.record(run.communityHints)
    };
  }

  private analysisFromRun(value: any) {
    return {
      palette: this.strings(value.palette),
      mascot: value.mascot,
      style: value.style,
      mood: value.mood,
      shapeLanguage: value.shapeLanguage,
      visualKeywords: this.strings(value.visualKeywords)
    };
  }

  private contextFromRun(value: any) {
    return {
      memes: this.strings(value.memes),
      slogans: this.strings(value.slogans),
      phrases: this.strings(value.phrases),
      lore: value.lore ?? undefined,
      extractedVocabulary: this.strings(value.extractedVocabulary),
      traitSeeds: this.strings(value.traitSeeds),
      roleNames: this.strings(value.roleNames),
      raidNames: this.strings(value.raidNames),
      backgroundNames: this.strings(value.backgroundNames)
    };
  }

  private styleFromRecord(record: any): GeneratedStyleProfile {
    const brandDna = this.record(record.brandDna) as GeneratedStyleProfile["brandDna"];
    const productionAssetPolicy =
      brandDna.productionAssetPolicy ??
      {
        launchClassification: "CONCEPT_PREVIEW",
        defaultAssetStatus: "WIREFRAME",
        commonToRareSource: "approved_layer_pack_required",
        epicLegendaryMythicSource: "curated_composition_required",
        aiFinalImageAllowed: false,
        aiAssistedFinalOutputsAllowed: true,
        layeredExportsAllowed: true,
        artistCleanupAllowed: true,
        selectiveManualCurationAllowed: true,
        creatorApprovalRequiredBeforeMint: true,
        massAutomaticPublicMintGeneration: false,
        previewQualityTarget: "MINT_WORTHY_STUDIO_PREVIEW",
        artistReviewRequiredFor: ["Epic", "Legendary", "Mythic"],
        productionReadyRequires: ["locked art direction", "approved trait families", "approved cinematic direction", "curated final assets"]
      };
    const creativeUniverse = {
      archetype: String((record.visualFingerprint as Record<string, unknown> | undefined)?.archetype ?? "legacy"),
      inferredCommunityLanguage: this.strings((record.visualFingerprint as Record<string, unknown> | undefined)?.loreMemeLanguage),
      artStyle: record.artStyle,
      artStyleReason: "Loaded from saved style profile.",
      taxonomy: Array.isArray(brandDna.traitTaxonomy) ? brandDna.traitTaxonomy : [],
      baseSilhouettes: Array.isArray(brandDna.baseSilhouettes) ? brandDna.baseSilhouettes : [],
      moodCulture: Array.isArray(brandDna.moodCulture) ? brandDna.moodCulture : [],
      animationReadiness: brandDna.animationReadiness,
      productionAssetPolicy,
      antiGenericRules: this.strings(brandDna.forbiddenSimilarities)
    } as GeneratedStyleProfile["creativeUniverse"];
    return {
      collection: record.collection,
      theme: record.theme,
      mascot: record.mascot,
      artStyle: record.artStyle,
      colors: this.strings(record.colors),
      backgroundWorld: record.backgroundWorld,
      traitLanguage: this.strings(record.traitLanguage),
      rarityStructure: this.record(record.rarityStructure) as Record<string, number>,
      legendaryTheme: record.legendaryTheme,
      animationStyle: record.animationStyle,
      raidTheme: record.raidTheme,
      lore: record.lore,
      roleNames: this.strings(record.roleNames),
      brandDna,
      visualFingerprint: this.record(record.visualFingerprint),
      assetPackId: record.assetPackId ?? "unknown",
      artSource: record.artSource ?? "PROCEDURAL_FALLBACK",
      productionAssetStatus: record.productionAssetStatus ?? brandDna.productionAssetPolicy?.defaultAssetStatus ?? "WIREFRAME",
      tenKReadiness: this.record(record.tenKReadinessReport) as GeneratedStyleProfile["tenKReadiness"],
      creativeUniverse,
      productionAssetPolicy: productionAssetPolicy as GeneratedStyleProfile["productionAssetPolicy"]
    };
  }

  private packFromRecord(record: any): TraitPackPlan {
    return {
      collectionSize: record.collectionSize,
      categories: this.record(record.categories) as Record<string, string[]>,
      categoryRoles: this.record(record.categoryRoles) as TraitPackPlan["categoryRoles"],
      categoryLabels: this.record(record.categoryLabels) as TraitPackPlan["categoryLabels"],
      rarityWeights: this.record(record.rarityWeights) as Record<string, number>,
      unlockSchedule: this.record(record.unlockSchedule) as Record<string, string[]>,
      uniquenessRules: this.record(record.uniquenessRules) as unknown as TraitPackPlan["uniquenessRules"],
      traits: record.traits.map((trait: any) => ({
        category: trait.category,
        name: trait.name,
        rarity: trait.rarity,
        weightBps: trait.weightBps,
        unlockLevel: trait.unlockLevel,
        compatibilityTags: this.strings(trait.compatibilityTags),
        visualDescription: trait.visualDescription
      }))
    };
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private strings(value: unknown) {
    return Array.isArray(value) ? value.map(String) : [];
  }

  private record(value: unknown) {
    return (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
  }

  private assertOwner(run: { creatorWallet?: string | null; approvedByWallet?: string | null }, walletAddress?: string) {
    const owner = run.creatorWallet ?? run.approvedByWallet;
    if (owner && owner !== walletAddress) throw new ConflictException("Wallet does not own this generator run.");
  }

  private slug(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72);
  }

  private roleValues(pack: TraitPackPlan, role: keyof TraitPackPlan["categoryRoles"]) {
    const categoryId = pack.categoryRoles?.[role];
    const values = categoryId ? pack.categories[categoryId] ?? [] : [];
    return values.length ? values : ["None"];
  }
}
