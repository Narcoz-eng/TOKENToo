import { BadRequestException, ConflictException, GatewayTimeoutException, HttpException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
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
import type {
  ApproveGenerationRunInput,
  CreateGenerationRunInput,
  GeneratedStyleProfile,
  LaunchCollectionInput,
  PreviewAssetPlan,
  PreviewClassification,
  ProductionAssetStatus,
  SubmitCollectionLaunchInput,
  TraitPackPlan
} from "./generator.types";
import { seedFrom } from "./generator.util";
import { LogoAnalysisService } from "./logo-analysis.service";
import { MetadataGeneratorService } from "./metadata-generator.service";
import { QualityValidatorService } from "./quality-validator.service";
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
    const compatibilityRules = this.traitPacks.compatibilityRules(pack);
    const compatibilityResult = this.compatibility.validateRules(pack, compatibilityRules);
    const wireframes = this.previews.generate(style, pack, `${normalized.tokenMint}:preview`, 0);
    const aiPreviews = await this.aiConcepts.generateRequired(style, pack, `${normalized.tokenMint}:preview`, normalized.logoData).catch((error) => {
      throw this.aiPreviewException(error);
    });
    if (aiPreviews.length) {
      style.productionAssetStatus = "AI_CONCEPT";
      style.artSource = "AI_ASSISTED";
      style.productionAssetPolicy.defaultAssetStatus = "AI_CONCEPT";
    }
    this.applyConfiguredProductionStatus(style, pack);
    const previews = aiPreviews.length ? aiPreviews : wireframes;
    const distinctiveness = this.distinctiveness.score(style, []);
    const quality = this.quality.validate(style, pack, compatibilityRules, previews, distinctiveness);
    if (!compatibilityResult.passed) quality.issues.push(...compatibilityResult.issues);
    quality.issues.push(...this.aiQuality.validate(previews));
    const readiness = this.tenKReadinessReport(pack, style, quality);

    return {
      ok: true,
      mode: "preview-only",
      assetProvider: aiPreviews.length ? "openai-ai-concept-preview" : "wireframe-concept-preview",
      previewClassification: aiPreviews.length ? "AI_CONCEPT_PREVIEW" : "WIREFRAME_CONCEPT",
      productionAssetStatus: style.productionAssetStatus,
      finalProductionReady: false,
      brandDna: style.brandDna,
      creativeUniverse: style.creativeUniverse,
      productionAssetPolicy: style.productionAssetPolicy,
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
        issues: [...quality.issues, `${style.productionAssetStatus === "AI_CONCEPT" ? "AI concept preview only" : "Wireframe concept preview only"}; final collection requires curated or artist-approved asset pack.`]
      },
      distinctiveness: {
        ...distinctiveness,
        fingerprint: style.visualFingerprint,
        estimate: distinctiveness.score >= 86 ? "highly distinct" : distinctiveness.score >= 72 ? "distinct with review" : "too close"
      },
      tenKReadiness: readiness,
      capabilities: {
        openaiImagesAvailable: Boolean(process.env.OPENAI_API_KEY),
        pinataAvailable: Boolean(process.env.PINATA_JWT),
        aiGenerationEnabled: (process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true",
        productionStorageAvailable: (process.env.FINAL_ASSET_STORAGE_PROVIDER ?? "mock") !== "mock" && Boolean(process.env.PINATA_JWT)
      },
      warnings: [
        "Preview generated without DB persistence.",
        style.productionAssetStatus === "AI_CONCEPT"
          ? "AI concept preview only; final launch requires curated or artist-approved production assets and permanent storage."
          : "Wireframe only - enable OpenAI image generation or curated asset provider for professional NFT previews.",
        "OpenAI image generation is art direction only and is never used in mint, final render, redeem, stake, or unstake flows."
      ]
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

    await this.createProfileVersion(run.id, normalized, analysis, context, 1, 0);
    await this.prisma.generationRun.update({ where: { id: run.id }, data: { status: "PREVIEWED" } });
    return this.getRun(run.id);
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
    if (!run.logoAnalysis || !run.communityContext) throw new NotFoundException("Generation run is missing analysis data");
    const version = (run.styleProfiles[0]?.version ?? 0) + 1;
    const input = this.inputFromRun(run);
    const analysis = this.analysisFromRun(run.logoAnalysis);
    const context = this.contextFromRun(run.communityContext);
    await this.createProfileVersion(id, input, analysis, context, version, run.regenerationCount + 1);
    await this.prisma.generationRun.update({
      where: { id },
      data: { regenerationCount: { increment: 1 }, status: "PREVIEWED", approvedVersion: null }
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
    const wireframes = this.previews.generate(style, pack, run.seed, version);
    const aiPreviews = await this.aiConcepts.generate(style, pack, run.seed, run.logoData ?? undefined).catch(() => []);
    const previews = aiPreviews.length ? aiPreviews : wireframes;
    if (aiPreviews.length) await this.prisma.styleProfile.update({ where: { id: latest.id }, data: { artSource: "AI_ASSISTED", productionAssetStatus: "AI_CONCEPT" } });
    await this.persistPreviews(id, latest.id, version, previews);
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
    if (input.acceptedVersion && input.acceptedVersion !== latest.version) throw new ConflictException("The accepted version is no longer the latest generated version.");
    if (!input.explicitConfirmation) throw new BadRequestException("Explicit creator confirmation is required before approval.");
    if (!report.passed || report.tier === "BASIC") throw new BadRequestException("Only Premium or Legendary-ready generator outputs can be approved.");
    if (!distinctiveness?.passed || distinctiveness.score < 72) throw new BadRequestException("Collection distinctiveness score is below the approval threshold.");
    const manifest = pack ? this.assetProduction.manifest(this.styleFromRecord(latest), pack, report.tier) : null;
    if (latest.productionAssetStatus === "WIREFRAME" || latest.artSource === "PROCEDURAL_FALLBACK") throw new BadRequestException("Wireframe previews are planning/debug assets and cannot be approved for launch.");
    if (latest.productionAssetStatus === "AI_CONCEPT") throw new BadRequestException("AI concept art can be reviewed as art direction, but cannot be approved for launch without a curated layer pack.");
    if (!manifest?.productionReady || !readiness?.canProduce10kPremiumOutputs) throw new BadRequestException("Asset provider readiness report does not allow scalable deterministic output approval.");

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
          raidTheme: latest.raidTheme
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
    if (profile.productionAssetStatus === "AI_CONCEPT") throw new BadRequestException("AI concepts are art direction only. Configure and approve a curated layer pack before launch.");
    this.assertLaunchProviders(this.styleFromRecord(profile), this.packFromRecord(profile.traitPack), report.tier);

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

    const launchTx = await this.solana.buildCollectionAssetTransaction({
      walletAddress,
      name: profile.collection,
      metadataUri
    });

    return this.prisma.collection.update({
      where: { id: collection.id },
      data: {
        collectionMetadataUri: metadataUri,
        metadataUri,
        collectionAssetAddress: launchTx.collectionAssetAddress,
        launchUnsignedTransaction: this.json(launchTx),
        launchStatus: launchTx.base64UnsignedTransaction ? "TX_BUILT" : "PENDING"
      }
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
    return this.prisma.collection.update({
      where: { id: collection.id },
      data: {
        launchStatus: result.confirmed ? "CONFIRMED" : result.status,
        launchTxSignature: result.txSignature,
        launchedAt: result.confirmed ? new Date() : collection.launchedAt
      }
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
  ) {
    const style = this.styleProfiles.generate(input, analysis, context, version);
    const pack = this.traitPacks.generate(style);
    const compatibilityRules = this.traitPacks.compatibilityRules(pack);
    const compatibilityResult = this.compatibility.validateRules(pack, compatibilityRules);
    const wireframes = this.previews.generate(style, pack, `${input.tokenMint}:${version}`, reroll);
    const aiPreviews = await this.aiConcepts.generate(style, pack, `${input.tokenMint}:${version}`, input.logoData).catch(() => []);
    if (aiPreviews.length) {
      style.productionAssetStatus = "AI_CONCEPT";
      style.artSource = "AI_ASSISTED";
      style.productionAssetPolicy.defaultAssetStatus = "AI_CONCEPT";
    }
    this.applyConfiguredProductionStatus(style, pack);
    const previews = aiPreviews.length ? aiPreviews : wireframes;
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
            message: aiConcept ? "Storage failed while saving the generated concept preview." : "Storage failed while saving the preview asset.",
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
        type: preview.type,
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
      ...(style.productionAssetStatus === "AI_CONCEPT" ? ["AI concept previews are not mintable final art."] : []),
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
      message: "OpenAI request failed while creating the AI concept preview.",
      details: {
        stage: "ai_concept_preview",
        errorClass: error instanceof Error ? error.name : typeof error,
        raw: error instanceof Error ? error.message : String(error)
      }
    });
  }

  private assertLaunchProviders(style: GeneratedStyleProfile, pack: TraitPackPlan, qualityTier: "BASIC" | "PREMIUM" | "LEGENDARY_READY") {
    const manifest = this.assetProduction.manifest(style, pack, qualityTier);
    const issues = manifest.readinessReport.reasonIfNo ? [manifest.readinessReport.reasonIfNo] : [];
    const storageProvider = process.env.FINAL_ASSET_STORAGE_PROVIDER ?? process.env.ASSET_STORAGE_PROVIDER ?? "mock";
    if (!manifest.productionReady) issues.push(`Launch requires ${process.env.REQUIRED_LAUNCH_ASSET_STATUS ?? "CURATED_LAYER_READY/ARTIST_APPROVED"} assets; current status is ${manifest.productionAssetStatus}.`);
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
        artistReviewRequiredFor: ["Epic", "Legendary", "Mythic"],
        productionReadyRequires: ["approved layer pack", "curated final assets"]
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
