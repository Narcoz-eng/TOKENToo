import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../db/prisma.service";
import { ArtPreviewGeneratorService } from "./art-preview-generator.service";
import { AssetStorageService } from "./asset-storage.service";
import { artPresets } from "./art-presets";
import { CollectionDistinctivenessScorerService } from "./collection-distinctiveness-scorer.service";
import { CommunityContextService } from "./community-context.service";
import { CompatibilityEngineService } from "./compatibility-engine.service";
import type { CreateGenerationRunInput, GeneratedStyleProfile, PreviewAssetPlan, TraitPackPlan } from "./generator.types";
import { seedFrom } from "./generator.util";
import { LogoAnalysisService } from "./logo-analysis.service";
import { MetadataGeneratorService } from "./metadata-generator.service";
import { QualityValidatorService } from "./quality-validator.service";
import { StyleProfileGeneratorService } from "./style-profile-generator.service";
import { TraitPackGeneratorService } from "./trait-pack-generator.service";

@Injectable()
export class GeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logoAnalysis: LogoAnalysisService,
    private readonly communityContext: CommunityContextService,
    private readonly styleProfiles: StyleProfileGeneratorService,
    private readonly traitPacks: TraitPackGeneratorService,
    private readonly compatibility: CompatibilityEngineService,
    private readonly previews: ArtPreviewGeneratorService,
    private readonly assetStorage: AssetStorageService,
    private readonly distinctiveness: CollectionDistinctivenessScorerService,
    private readonly quality: QualityValidatorService,
    private readonly metadata: MetadataGeneratorService
  ) {}

  presets() {
    return artPresets;
  }

  async createRun(input: CreateGenerationRunInput) {
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

  async regenerateStyle(id: string) {
    const run = await this.getRun(id);
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

  async regeneratePreviews(id: string) {
    const run = await this.getRun(id);
    const latest = run.styleProfiles[0];
    if (!latest?.traitPack) throw new NotFoundException("Generation run has no style profile to preview");
    const style = this.styleFromRecord(latest);
    const pack = this.packFromRecord(latest.traitPack);
    const version = Math.max(1, ...latest.previewAssets.map((asset) => asset.version)) + 1;
    const previews = this.previews.generate(style, pack, run.seed, version);
    await this.persistPreviews(id, latest.id, latest.version, previews);
    return this.getRun(id);
  }

  async approve(id: string) {
    const run = await this.getRun(id);
    const latest = run.styleProfiles[0];
    const report = latest?.qualityReports[0];
    if (!latest || !report) throw new NotFoundException("Generation run has no preview to approve");

    await this.prisma.styleProfile.updateMany({ where: { generationRunId: id }, data: { isApproved: false } });
    await this.prisma.styleProfile.update({ where: { id: latest.id }, data: { isApproved: true } });
    await this.prisma.generationRun.update({
      where: { id },
      data: { status: "APPROVED", approvedVersion: latest.version }
    });
    return this.getRun(id);
  }

  async sampleMetadata(id: string) {
    const run = await this.getRun(id);
    const profile = run.styleProfiles.find((item) => item.isApproved) ?? run.styleProfiles[0];
    if (!profile?.traitPack) throw new NotFoundException("Generation run has no trait pack");
    const style = this.styleFromRecord(profile);
    const pack = this.packFromRecord(profile.traitPack);
    const preview = profile.previewAssets.find((asset) => asset.type === "SAMPLE_NFT");
    return this.metadata.sample(style, pack, preview ? { type: "SAMPLE_NFT", label: preview.label, uri: preview.uri, metadata: this.record(preview.metadata) } : undefined);
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
    const previews = this.previews.generate(style, pack, `${input.tokenMint}:${version}`, reroll);
    const existing = await this.prisma.styleProfile.findMany({
      where: { generationRunId: { not: runId } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, collection: true, mascot: true, colors: true, backgroundWorld: true, traitLanguage: true }
    });
    const distinctiveness = this.distinctiveness.score(style, existing);
    const quality = this.quality.validate(style, pack, compatibilityRules, previews, distinctiveness);
    if (!compatibilityResult.passed) quality.issues.push(...compatibilityResult.issues);

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
        roleNames: this.json(style.roleNames)
      }
    });

    const traitPack = await this.prisma.generatorTraitPack.create({
      data: {
        styleProfileId: profile.id,
        collectionSize: pack.collectionSize,
        categories: this.json(pack.categories),
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
      previews.map(async (preview, index) => ({
        ...preview,
        uri: await this.assetStorage.storePreviewAsset(`${generationRunId}/v${version}/${index + 1}-${preview.type.toLowerCase()}.svg`, preview.uri)
      }))
    );

    await this.prisma.previewAsset.createMany({
      data: storedPreviews.map((preview) => ({
        generationRunId,
        styleProfileId,
        type: preview.type,
        label: preview.label,
        uri: preview.uri,
        metadata: this.json(preview.metadata),
        version
      }))
    });
  }

  private normalize(input: CreateGenerationRunInput): CreateGenerationRunInput {
    if (!input.tokenName?.trim()) throw new Error("tokenName is required");
    if (!input.tokenSymbol?.trim()) throw new Error("tokenSymbol is required");
    if (!input.tokenMint?.trim()) throw new Error("tokenMint is required");
    if (!input.description?.trim()) throw new Error("description is required");
    return {
      ...input,
      tokenName: input.tokenName.trim(),
      tokenSymbol: input.tokenSymbol.trim().startsWith("$") ? input.tokenSymbol.trim() : `$${input.tokenSymbol.trim()}`,
      tokenMint: input.tokenMint.trim(),
      description: input.description.trim(),
      selectedPreset: input.selectedPreset ?? process.env.GENERATOR_DEFAULT_PRESET ?? "mystic-pixel-cult"
    };
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
      roleNames: this.strings(record.roleNames)
    };
  }

  private packFromRecord(record: any): TraitPackPlan {
    return {
      collectionSize: record.collectionSize,
      categories: this.record(record.categories) as Record<string, string[]>,
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
}
