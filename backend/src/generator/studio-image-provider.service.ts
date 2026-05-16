import { HttpException, Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
import { GeminiStudioPromptError, GeminiStudioPromptProviderService, type StudioPromptGenerationResult } from "./gemini-studio-prompt-provider.service";
import { OpenAIImageProvider } from "./image-providers";
import { ImagenStudioImageError, ImagenStudioImageProviderService, type ImagenStudioErrorCode } from "./imagen-studio-image-provider.service";
import { DEFAULT_GEMINI_TEXT_MODEL, DEFAULT_IMAGEN_MODEL, IMAGEN_STUDIO_BIBLE_FALLBACK_CHAIN, normalizeGeminiTextModel, normalizeImagenModel, SUPPORTED_GEMINI_TEXT_MODELS, SUPPORTED_IMAGEN_MODELS } from "./imagen-models";
import { DEFAULT_OPENAI_IMAGE_MODEL, SUPPORTED_OPENAI_IMAGE_MODELS } from "./openai-image-request";
import {
  markStudioModelDisabled,
  markStudioProviderUnavailable,
  recordStudioProbe,
  recordStudioProviderSuccess,
  studioCircuitSnapshot,
  studioModelDisabled,
  studioProviderUnavailable
} from "./studio-provider-circuit-breaker";
import type {
  GeneratedStyleProfile,
  PreviewAssetPlan,
  StudioCacheStatus,
  StudioGenerationCostLine,
  StudioGenerationSummary,
  StudioGenerationType,
  StudioProviderFailureCode,
  StudioProviderDiagnostics,
  StyleBiblePlan
} from "./generator.types";

export type StudioAssetType = Extract<PreviewAssetPlan["type"], "STYLE_BIBLE" | "TRAIT_CATALOG" | "RARITY_LADDER" | "MOOD_SHEET" | "LAYER_BREAKDOWN">;

type StudioAssetRequest = {
  type: StudioAssetType;
  generationType: StudioGenerationType;
  promptKey: keyof StyleBiblePlan["promptPack"];
};

type GenerateStudioAssetsInput = {
  tokenMint: string;
  style: GeneratedStyleProfile;
  plan: StyleBiblePlan;
  /**
   * Kept for explicit local/dev deterministic fallback only. These assets must
   * never be counted as creator-facing Gemini Studio Bible sheets.
   */
  deterministicAssets: PreviewAssetPlan[];
  styleVersion: number;
  rarityVersion?: string;
  cachedAssets?: PreviewAssetPlan[];
  routeCalled?: string;
};

type ProviderDecision = {
  provider: "imagen" | "openai" | "deterministic-render";
  canCallImage: boolean;
  useDeterministic: boolean;
  branch: string;
  modelCandidates: StudioModelCandidate[];
  unsupportedModels: string[];
  disabledModels: string[];
  activeImageProvider?: "imagen" | "openai";
  activeImageModel?: string;
  failureCode?: StudioProviderFailureCode;
  fallbackReason?: string;
  openaiStudioFallbackEnabled: boolean;
  noBillableGenerationAttempted?: boolean;
};

type StudioModelCandidate = {
  provider: "imagen" | "openai";
  model: string;
};

type StudioGeneratedAsset = {
  asset: PreviewAssetPlan;
  request: StudioAssetRequest;
  studioCacheKey: string;
};

type StudioFallbackGenerationResult = {
  results: StudioGeneratedAsset[];
  assets: PreviewAssetPlan[];
  activeImageProvider?: "imagen" | "openai";
  activeModel?: string;
  attemptedModels: string[];
  fallbackModelUsed?: string;
  billableGenerationAttempted: boolean;
  failureCode?: StudioProviderFailureCode;
  failureReason?: string;
  error?: unknown;
};

export const studioAssetRequests: StudioAssetRequest[] = [
  { type: "STYLE_BIBLE", generationType: "studio_bible", promptKey: "styleBibleImage" },
  { type: "TRAIT_CATALOG", generationType: "trait_catalog", promptKey: "traitCatalogSheet" },
  { type: "RARITY_LADDER", generationType: "rarity_ladder", promptKey: "rarityLadder" },
  { type: "MOOD_SHEET", generationType: "mood_sheet", promptKey: "moodSheet" },
  { type: "LAYER_BREAKDOWN", generationType: "layer_breakdown", promptKey: "layerBreakdown" }
];

const studioAssetTypeSet = new Set<StudioAssetType>(studioAssetRequests.map((request) => request.type));

@Injectable()
export class StudioImageProviderService {
  private readonly logger = new Logger(StudioImageProviderService.name);

  constructor(
    @Optional()
    @Inject(ImagenStudioImageProviderService)
    private readonly imagenProvider: ImagenStudioImageProviderService = new ImagenStudioImageProviderService(),
    @Optional()
    @Inject(GeminiStudioPromptProviderService)
    private readonly promptProvider: GeminiStudioPromptProviderService = new GeminiStudioPromptProviderService(),
    @Optional()
    @Inject(OpenAIImageProvider)
    private readonly openaiProvider: OpenAIImageProvider = new OpenAIImageProvider()
  ) {}

  validatePlan(style: GeneratedStyleProfile, plan: StyleBiblePlan, tokenMint: string, styleVersion = 1, rarityVersion = "rarity-v1"): StudioGenerationSummary {
    const decision = this.providerDecision("POST /generator/ai-concept/validate-request", "miss");
    const model = decision.activeImageModel ?? this.model();
    const costBreakdown = studioAssetRequests.map((request) => {
      const prompt = this.promptFor(plan, request);
      return {
        provider: this.costProviderForDecision(decision),
        model: decision.canCallImage ? model : decision.provider === "deterministic-render" ? "style-bible-engine" : model,
        generationType: request.generationType,
        promptHash: this.hash(prompt),
        estimatedCostUsd: decision.canCallImage ? decision.activeImageProvider === "openai" ? this.estimatedOpenAIStudioCostUsd() : this.estimatedImagenCostUsd() : 0,
        cacheStatus: decision.canCallImage ? "miss" as StudioCacheStatus : "disabled" as StudioCacheStatus
      };
    });
    void style;
    void tokenMint;
    void styleVersion;
    void rarityVersion;
    return this.summary({
      provider: decision.canCallImage ? decision.activeImageProvider ?? "imagen" : decision.provider === "deterministic-render" ? "deterministic-render" : "imagen-unavailable",
      model: decision.canCallImage ? model : decision.provider === "deterministic-render" ? "style-bible-engine" : model,
      assets: [],
      costBreakdown,
      cacheStatus: decision.canCallImage ? "miss" : "disabled",
      imagesThisRun: decision.canCallImage ? studioAssetRequests.length : 0,
      estimatedCostUsd: this.sumCost(costBreakdown),
      diagnostics: this.diagnostics(decision, "POST /generator/ai-concept/validate-request", decision.canCallImage ? "miss" : "disabled", undefined, this.promptPlanDiagnostics()),
      failureCode: decision.failureCode,
      failureReason: decision.failureCode,
      activeImageProvider: decision.activeImageProvider,
      activeModel: decision.activeImageModel,
      noBillableGenerationAttempted: !decision.canCallImage
    });
  }

  async generateStudioAssets(input: GenerateStudioAssetsInput) {
    const routeCalled = input.routeCalled ?? "POST /generator/preview";
    const warnings: string[] = [];
    const assets: PreviewAssetPlan[] = [];
    const costBreakdown: StudioGenerationCostLine[] = [];
    const cachedEntries: Array<[string, PreviewAssetPlan]> = (input.cachedAssets ?? [])
      .filter((asset) => isRealStudioBibleAsset(asset))
      .map((asset) => [
        String(asset.metadata.studioCacheKey ?? asset.generationMetadata?.studioCacheKey ?? ""),
        asset
      ])
      .filter((entry): entry is [string, PreviewAssetPlan] => Boolean(entry[0]));
    const cachedByKey = new Map<string, PreviewAssetPlan>(cachedEntries);

    const generationRequests: Array<{
      request: StudioAssetRequest;
      basePrompt: string;
      promptHash: string;
      studioCacheKey: string;
    }> = [];

    for (const request of studioAssetRequests) {
      const prompt = this.promptFor(input.plan, request);
      const promptHash = this.hash(prompt);
      const studioCacheKey = this.cacheKey(input.tokenMint, input.style, input.plan, input.styleVersion, input.rarityVersion ?? "rarity-v1", request.generationType, promptHash);
      const cached = cachedByKey.get(studioCacheKey);
      if (cached) {
        const cachedSourceProvider = this.realAssetSourceProvider(cached);
        const asset = this.withStudioMetadata(cached, request, {
          provider: cachedSourceProvider === "gemini" ? "cached-gemini" : cachedSourceProvider === "imagen" ? "cached-imagen" : "cached",
          sourceProvider: cachedSourceProvider,
          model: String(cached.generationMetadata?.model ?? cached.metadata.model ?? this.model()),
          prompt,
          promptHash,
          studioCacheKey,
          estimatedCostUsd: 0,
          cacheStatus: "hit"
        });
        assets.push(asset);
        costBreakdown.push(this.costLine(asset, request, "hit"));
        continue;
      }

      generationRequests.push({ request, basePrompt: prompt, promptHash, studioCacheKey });
    }

    if (!generationRequests.length) {
      const cacheStatus: StudioCacheStatus = "hit";
      const provider = assets.every((asset) => this.realAssetSourceProvider(asset) === "gemini") ? "cached-gemini" : assets.every((asset) => this.realAssetSourceProvider(asset) === "imagen") ? "cached-imagen" : "cached";
      const decision = this.cachedDecision(provider);
      return {
        assets,
        summary: this.summary({
          provider,
          model: String(assets[0]?.generationMetadata?.model ?? assets[0]?.metadata.model ?? this.model()),
          assets,
          costBreakdown,
          cacheStatus,
          imagesThisRun: 0,
          estimatedCostUsd: 0,
          diagnostics: this.diagnostics(decision, routeCalled, cacheStatus, undefined, this.cacheHitPromptDiagnostics()),
          billableGenerationAttempted: false,
          noBillableGenerationAttempted: true
        }),
        warnings
      };
    }

    const decision = this.providerDecision(routeCalled, assets.length ? "miss" : "miss");
    const model = decision.activeImageModel ?? this.model();

    if (!decision.canCallImage) {
      if (decision.failureCode) warnings.push(`${decision.failureCode}: ${this.failureMessage(decision.failureCode)}`);
      warnings.push("No billable generation attempted.");
      const deterministicAssets = decision.useDeterministic ? this.deterministicFallbackAssets(input.deterministicAssets, input.plan) : [];
      const blockedAssets = [...assets, ...deterministicAssets];
      const deterministicCost = deterministicAssets.map((asset) => this.costLine(asset, this.requestForAsset(asset.type), "disabled"));
      return {
        assets: blockedAssets,
        summary: this.summary({
          provider: decision.provider === "deterministic-render" ? "deterministic-render" : "imagen-unavailable",
          model: decision.provider === "deterministic-render" ? "style-bible-engine" : model,
          assets: blockedAssets,
          costBreakdown: [...costBreakdown, ...deterministicCost],
          cacheStatus: "disabled",
          imagesThisRun: 0,
          estimatedCostUsd: 0,
          diagnostics: this.diagnostics(decision, routeCalled, "disabled"),
          failureCode: decision.failureCode,
          failureReason: decision.fallbackReason ?? decision.failureCode,
          activeImageProvider: decision.activeImageProvider,
          activeModel: decision.activeImageModel,
          noBillableGenerationAttempted: true,
          unavailableReason: decision.fallbackReason ?? decision.failureCode
        }),
        warnings
      };
    }

    const promptResult = generationRequests.length
      ? await this.generatePromptPack(input, generationRequests.map(({ request, basePrompt }) => ({ request, basePrompt })), routeCalled)
      : this.cacheHitPromptDiagnostics();

    const generated = await this.generateMissingAssetsWithFallback(generationRequests, promptResult, input.plan, decision, routeCalled);
    if (generated.failureCode) {
      warnings.push(`${generated.failureCode}: ${this.failureMessage(generated.failureCode)}`);
      if (!generated.billableGenerationAttempted) warnings.push("No billable generation attempted.");
      this.logger.warn(
        JSON.stringify({
          event: "studio_bible_generation_blocked",
          code: generated.failureCode,
          generationType: "studio_bible_batch",
          routeCalled,
          attemptedModels: generated.attemptedModels,
          billableGenerationAttempted: generated.billableGenerationAttempted,
          errorClass: generated.error instanceof Error ? generated.error.name : typeof generated.error,
          message: generated.error instanceof Error ? generated.error.message : generated.error ? String(generated.error) : undefined
        })
      );
      const failedDecision = {
        ...decision,
        branch: generated.billableGenerationAttempted ? "studio-generation-failed-after-attempt" : "studio-preflight-failed-before-billable-call",
        activeImageProvider: generated.activeImageProvider ?? decision.activeImageProvider,
        activeImageModel: generated.activeModel ?? decision.activeImageModel,
        fallbackReason: generated.failureReason ?? generated.failureCode
      };
      return {
        assets: [...assets, ...generated.assets],
        summary: this.summary({
          provider: generated.activeImageProvider ?? decision.activeImageProvider ?? "imagen",
          model: generated.activeModel ?? model,
          assets: [...assets, ...generated.assets],
          costBreakdown: [...costBreakdown, ...generated.assets.map((asset) => this.costLine(asset, this.requestForAsset(asset.type), "generated"))],
          cacheStatus: assets.length ? "miss" : "disabled",
          imagesThisRun: generated.assets.length,
          estimatedCostUsd: this.sumCost([...costBreakdown, ...generated.assets.map((asset) => this.costLine(asset, this.requestForAsset(asset.type), "generated"))]),
          diagnostics: this.diagnostics(failedDecision, routeCalled, assets.length ? "miss" : "disabled", generated.failureCode, promptResult, generated),
          failureCode: generated.failureCode,
          failureReason: generated.failureReason ?? generated.failureCode,
          activeImageProvider: generated.activeImageProvider ?? decision.activeImageProvider,
          activeModel: generated.activeModel ?? decision.activeImageModel,
          fallbackModelUsed: generated.fallbackModelUsed,
          billableGenerationAttempted: generated.billableGenerationAttempted,
          noBillableGenerationAttempted: !generated.billableGenerationAttempted,
          unavailableReason: generated.failureReason ?? generated.failureCode
        }),
        warnings
      };
    }

    for (const result of generated.results) {
      assets.push(result.asset);
      costBreakdown.push(this.costLine(result.asset, result.request, "generated"));
    }

    const cacheStatus: StudioCacheStatus = assets.length === studioAssetRequests.length && assets.every((asset) => asset.generationMetadata?.cacheStatus === "hit") ? "hit" : "miss";
    const provider = cacheStatus === "hit" ? assets.every((asset) => this.realAssetSourceProvider(asset) === "gemini") ? "cached-gemini" : "cached-imagen" : generated.activeImageProvider ?? decision.activeImageProvider ?? "imagen";
    return {
      assets,
      summary: this.summary({
        provider,
        model: generated.activeModel ?? model,
        assets,
        costBreakdown,
        cacheStatus,
        imagesThisRun: generated.results.length,
        estimatedCostUsd: this.sumCost(costBreakdown),
        diagnostics: this.diagnostics(
          {
            ...decision,
            branch: cacheStatus === "hit" ? "cache-hit-imagen" : `${generated.activeImageProvider ?? "imagen"}-generated`,
            activeImageProvider: generated.activeImageProvider ?? decision.activeImageProvider,
            activeImageModel: generated.activeModel ?? decision.activeImageModel
          },
          routeCalled,
          cacheStatus,
          undefined,
          promptResult,
          generated
        ),
        activeImageProvider: generated.activeImageProvider ?? decision.activeImageProvider,
        activeModel: generated.activeModel ?? decision.activeImageModel,
        fallbackModelUsed: generated.fallbackModelUsed,
        billableGenerationAttempted: generated.billableGenerationAttempted,
        noBillableGenerationAttempted: !generated.billableGenerationAttempted
      }),
      warnings
    };
  }

  imageProviderStatus() {
    const imagenDecision = this.providerDecision("GET /system/image-providers", "miss");
    const imagenCircuit = studioCircuitSnapshot("imagen", SUPPORTED_IMAGEN_MODELS);
    const openaiCircuit = studioCircuitSnapshot("openai", SUPPORTED_OPENAI_IMAGE_MODELS);
    const geminiText = this.geminiTextModelNormalization();
    const geminiCircuit = studioCircuitSnapshot("gemini-text", SUPPORTED_GEMINI_TEXT_MODELS);
    const providers = [
      {
        provider: "imagen",
        authPresent: Boolean(this.imagenApiKey()),
        selectedModel: this.model(),
        supportedModels: [...SUPPORTED_IMAGEN_MODELS],
        unsupportedModels: imagenDecision.unsupportedModels,
        disabledModels: imagenCircuit.disabledModels,
        quotaStatus: imagenCircuit.quotaStatus,
        lastProbeResult: imagenCircuit.lastProbeResult ?? (imagenDecision.canCallImage ? "local-validation-passed" : "local-validation-blocked"),
        lastErrorCode: imagenCircuit.lastErrorCode ?? imagenDecision.failureCode,
        canGenerateStudioBible: imagenDecision.modelCandidates.some((candidate) => candidate.provider === "imagen")
      },
      {
        provider: "gemini-text",
        authPresent: Boolean(this.geminiTextApiKey()),
        selectedModel: this.geminiTextModel(),
        supportedModels: [...SUPPORTED_GEMINI_TEXT_MODELS],
        unsupportedModels: geminiText.ok ? [] : [geminiText.rawModel],
        disabledModels: geminiCircuit.disabledModels,
        quotaStatus: geminiCircuit.quotaStatus,
        lastProbeResult: geminiCircuit.lastProbeResult ?? (geminiText.ok ? "local-validation-passed" : "local-validation-blocked"),
        lastErrorCode: geminiCircuit.lastErrorCode ?? (geminiText.ok ? undefined : "GEMINI_MODEL_UNSUPPORTED"),
        canGenerateStudioBible: false
      },
      {
        provider: "openai",
        authPresent: Boolean(process.env.OPENAI_API_KEY),
        selectedModel: this.openAIStudioModelChain()[0] ?? DEFAULT_OPENAI_IMAGE_MODEL,
        supportedModels: [...SUPPORTED_OPENAI_IMAGE_MODELS],
        unsupportedModels: [],
        disabledModels: openaiCircuit.disabledModels,
        quotaStatus: openaiCircuit.quotaStatus,
        lastProbeResult: openaiCircuit.lastProbeResult ?? (this.openAIStudioFallbackEnabled() ? "local-validation-passed" : "fallback-disabled"),
        lastErrorCode: openaiCircuit.lastErrorCode,
        canGenerateStudioBible: this.paidAiAllowed() && this.openAIStudioFallbackEnabled() && Boolean(process.env.OPENAI_API_KEY) && !studioProviderUnavailable("openai")
      }
    ];
    return {
      ok: true,
      active: providers.find((provider) => provider.provider === imagenDecision.activeImageProvider) ?? providers[0],
      providers
    };
  }

  private async generateMissingAssetsWithFallback(
    generationRequests: Array<{ request: StudioAssetRequest; basePrompt: string; promptHash: string; studioCacheKey: string }>,
    promptResult: StudioPromptGenerationResult,
    plan: StyleBiblePlan,
    decision: ProviderDecision,
    routeCalled: string
  ): Promise<StudioFallbackGenerationResult> {
    const attemptedModels: string[] = [];
    const fallbackModels: string[] = [];
    let billableGenerationAttempted = false;
    let lastFailureCode: StudioProviderFailureCode | undefined;
    let lastFailureReason: string | undefined;
    let lastError: unknown;

    for (const candidate of decision.modelCandidates) {
      if (studioProviderUnavailable(candidate.provider)) {
        lastFailureCode = candidate.provider === "openai" ? "OPENAI_BILLING_UNAVAILABLE" : "IMAGEN_QUOTA_EXCEEDED";
        lastFailureReason = `${candidate.provider} provider is temporarily unavailable due to quota or billing backoff.`;
        continue;
      }
      if (studioModelDisabled(candidate.provider, candidate.model)) {
        fallbackModels.push(candidate.model);
        continue;
      }
      attemptedModels.push(`${candidate.provider}:${candidate.model}`);
      const candidateResults: StudioGeneratedAsset[] = [];
      try {
        for (const item of generationRequests) {
          const prompt = promptResult.prompts[item.request.type] ?? item.basePrompt;
          const generated = await this.generateOne(candidate, item.request, prompt, item.promptHash, item.studioCacheKey, plan);
          billableGenerationAttempted = true;
          candidateResults.push(generated);
        }
        recordStudioProviderSuccess(candidate.provider, "generation-succeeded");
        return {
          results: candidateResults,
          assets: candidateResults.map((result) => result.asset),
          activeImageProvider: candidate.provider,
          activeModel: candidate.model,
          attemptedModels,
          fallbackModelUsed: fallbackModels.length ? candidate.model : undefined,
          billableGenerationAttempted
        };
      } catch (error) {
        const failureCode = this.providerFailureCode(error, candidate.provider);
        lastFailureCode = failureCode;
        lastFailureReason = this.failureMessage(failureCode);
        lastError = error;
        if (this.isUnsupportedModelFailure(failureCode) && candidateResults.length === 0) {
          markStudioModelDisabled(candidate.provider, candidate.model, failureCode);
          fallbackModels.push(candidate.model);
          this.logger.warn(
            JSON.stringify({
              event: "studio_model_disabled",
              provider: candidate.provider,
              model: candidate.model,
              code: failureCode,
              routeCalled
            })
          );
          continue;
        }
        if (this.isQuotaFailure(failureCode)) {
          markStudioProviderUnavailable(candidate.provider, failureCode);
        }
        return {
          results: candidateResults,
          assets: candidateResults.map((result) => result.asset),
          activeImageProvider: candidate.provider,
          activeModel: candidate.model,
          attemptedModels,
          fallbackModelUsed: fallbackModels.length ? candidate.model : undefined,
          billableGenerationAttempted,
          failureCode,
          failureReason: lastFailureReason,
          error
        };
      }
    }

    return {
      results: [] as StudioGeneratedAsset[],
      assets: [] as PreviewAssetPlan[],
      activeImageProvider: decision.activeImageProvider,
      activeModel: decision.activeImageModel,
      attemptedModels,
      fallbackModelUsed: fallbackModels.length ? fallbackModels[fallbackModels.length - 1] : undefined,
      billableGenerationAttempted,
      failureCode: lastFailureCode ?? "STUDIO_IMAGE_PROVIDER_UNAVAILABLE" as const,
      failureReason: lastFailureReason ?? "All Studio Bible image models are unavailable or unsupported.",
      error: lastError
    };
  }

  private async generateOne(
    candidate: StudioModelCandidate,
    request: StudioAssetRequest,
    prompt: string,
    promptHash: string,
    studioCacheKey: string,
    plan: StyleBiblePlan
  ) {
    if (candidate.provider === "openai") {
      const generated = await this.openaiProvider.generate({
        prompt,
        model: candidate.model,
        size: "1024x1024",
        quality: "high"
      });
      const uri = generated.dataUri ?? `data:${generated.mimeType};base64,${generated.bytes?.toString("base64") ?? ""}`;
      const asset = this.withStudioMetadata(this.emptyStudioAsset(request, plan), request, {
        provider: "openai",
        sourceProvider: "openai",
        model: candidate.model,
        prompt,
        promptHash,
        studioCacheKey,
        estimatedCostUsd: this.estimatedOpenAIStudioCostUsd(),
        cacheStatus: "generated",
        uri
      });
      return { asset, request, studioCacheKey };
    }

    const generated = await this.imagenProvider.generateStudioBible({
      prompt,
      generationType: request.generationType,
      studioCacheKey,
      model: candidate.model,
      apiKey: this.imagenApiKey(),
      timeoutMs: Number(process.env.IMAGEN_IMAGE_TIMEOUT_MS ?? 90_000)
    });
    const asset = this.withStudioMetadata(this.emptyStudioAsset(request, plan), request, {
      provider: "imagen",
      sourceProvider: "imagen",
      model: candidate.model,
      prompt,
      promptHash,
      studioCacheKey,
      estimatedCostUsd: this.estimatedImagenCostUsd(),
      cacheStatus: "generated",
      uri: generated.uri
    });
    return { asset, request, studioCacheKey };
  }

  private withStudioMetadata(
    base: PreviewAssetPlan,
    request: StudioAssetRequest,
    values: {
      provider: PreviewAssetPlan["provider"];
      sourceProvider: "imagen" | "gemini" | "openai" | "deterministic-render";
      model: string;
      prompt: string;
      promptHash: string;
      studioCacheKey: string;
      estimatedCostUsd: number;
      cacheStatus: StudioCacheStatus;
      uri?: string;
    }
  ): PreviewAssetPlan {
    return {
      ...base,
      uri: values.uri ?? base.uri,
      provider: values.provider,
      promptHash: values.promptHash,
      productionAssetStatus: "AI_CONCEPT",
      previewClassification: "AI_CONCEPT_PREVIEW",
      generationMetadata: {
        ...(base.generationMetadata ?? {}),
        provider: values.provider,
        sourceProvider: values.sourceProvider,
        model: values.model,
        generationType: request.generationType,
        promptHash: values.promptHash,
        studioCacheKey: values.studioCacheKey,
        estimatedCostUsd: values.estimatedCostUsd,
        cacheStatus: values.cacheStatus,
        prompt: values.prompt,
        artDirectionOnly: true,
        finalLayerAsset: false
      },
      metadata: {
        ...base.metadata,
        provider: values.provider,
        sourceProvider: values.sourceProvider,
        model: values.model,
        generationType: request.generationType,
        promptHash: values.promptHash,
        studioCacheKey: values.studioCacheKey,
        estimatedCostUsd: values.estimatedCostUsd,
        cacheStatus: values.cacheStatus,
        artDirectionOnly: true,
        finalLayerAsset: false
      }
    };
  }

  private emptyStudioAsset(request: StudioAssetRequest, plan: StyleBiblePlan): PreviewAssetPlan {
    return {
      type: request.type,
      label: this.labelFor(request.type),
      uri: "",
      productionAssetStatus: "AI_CONCEPT",
      previewClassification: "AI_CONCEPT_PREVIEW",
      provider: "imagen",
      metadata: {
        artTeam: plan.artTeam.id,
        collectionName: plan.collectionName
      },
      generationMetadata: {}
    };
  }

  private deterministicFallbackAssets(deterministicAssets: PreviewAssetPlan[], plan: StyleBiblePlan) {
    if ((process.env.APP_ENV ?? process.env.NODE_ENV ?? "development") === "production") return [];
    return deterministicAssets
      .filter((asset) => studioAssetTypeSet.has(asset.type as StudioAssetType) && Boolean(asset.uri))
      .map((asset) => ({
        ...asset,
        provider: "deterministic-render" as const,
        productionAssetStatus: "WIREFRAME" as const,
        previewClassification: "WIREFRAME_CONCEPT" as const,
        generationMetadata: {
          ...(asset.generationMetadata ?? {}),
          provider: "deterministic-render",
          sourceProvider: "deterministic-render",
          model: "style-bible-engine",
          cacheStatus: "disabled",
          artDirectionOnly: true,
          finalLayerAsset: false,
          devFallbackOnly: true
        },
        metadata: {
          ...asset.metadata,
          provider: "deterministic-render",
          sourceProvider: "deterministic-render",
          model: "style-bible-engine",
          cacheStatus: "disabled",
          artTeam: plan.artTeam.id,
          collectionName: plan.collectionName,
          artDirectionOnly: true,
          finalLayerAsset: false,
          devFallbackOnly: true
        }
      }));
  }

  private labelFor(type: StudioAssetType) {
    if (type === "STYLE_BIBLE") return "Full NFT Studio Bible";
    if (type === "TRAIT_CATALOG") return "Trait Catalog Sheet";
    if (type === "RARITY_LADDER") return "Rarity Ladder Sheet";
    if (type === "MOOD_SHEET") return "Mood / Expression Sheet";
    return "Layer Breakdown Sheet";
  }

  private costLine(asset: PreviewAssetPlan, request: StudioAssetRequest, cacheStatus?: StudioCacheStatus): StudioGenerationCostLine {
    const sourceProvider = String(asset.generationMetadata?.sourceProvider ?? asset.metadata.sourceProvider ?? asset.provider);
    return {
      provider: asset.provider === "cached-imagen" || (asset.provider === "cached" && sourceProvider === "imagen") ? "cached-imagen" : asset.provider === "cached-gemini" || (asset.provider === "cached" && sourceProvider === "gemini") ? "cached-gemini" : this.costProvider(asset.provider),
      model: String(asset.generationMetadata?.model ?? asset.metadata.model ?? "unknown"),
      generationType: request.generationType,
      promptHash: String(asset.promptHash ?? asset.generationMetadata?.promptHash ?? ""),
      estimatedCostUsd: Number(asset.generationMetadata?.estimatedCostUsd ?? asset.metadata.estimatedCostUsd ?? 0),
      cacheStatus: cacheStatus ?? (asset.generationMetadata?.cacheStatus ?? asset.metadata.cacheStatus ?? "generated") as StudioCacheStatus
    };
  }

  private costProvider(provider: PreviewAssetPlan["provider"]): StudioGenerationCostLine["provider"] {
    if (provider === "imagen" || provider === "imagen-unavailable" || provider === "cached-imagen" || provider === "gemini" || provider === "gemini-unavailable" || provider === "cached-gemini" || provider === "cached" || provider === "deterministic-render" || provider === "openai") return provider;
    return "deterministic-render";
  }

  private costProviderForDecision(decision: ProviderDecision): StudioGenerationCostLine["provider"] {
    if (decision.canCallImage) return decision.activeImageProvider ?? "imagen";
    if (decision.provider === "deterministic-render") return "deterministic-render";
    return "imagen-unavailable";
  }

  private realAssetSourceProvider(asset: PreviewAssetPlan): "imagen" | "gemini" | "openai" {
    const provider = String(asset.provider ?? asset.metadata.provider ?? asset.generationMetadata?.provider ?? "").toLowerCase();
    const sourceProvider = String(asset.metadata.sourceProvider ?? asset.generationMetadata?.sourceProvider ?? "").toLowerCase();
    const model = String(asset.metadata.model ?? asset.generationMetadata?.model ?? "").toLowerCase();
    if (provider === "openai" || sourceProvider === "openai" || model.includes("gpt-image")) return "openai";
    if (provider === "gemini" || provider === "cached-gemini" || sourceProvider === "gemini" || model.includes("gemini")) return "gemini";
    return "imagen";
  }

  private requestForAsset(type: PreviewAssetPlan["type"]) {
    return studioAssetRequests.find((request) => request.type === type) ?? studioAssetRequests[0];
  }

  private async generatePromptPack(
    input: GenerateStudioAssetsInput,
    requests: Array<{ request: StudioAssetRequest; basePrompt: string }>,
    routeCalled: string
  ): Promise<StudioPromptGenerationResult> {
    const local = (branch: string, fallbackReason?: string): StudioPromptGenerationResult => ({
      prompts: Object.fromEntries(requests.map(({ request, basePrompt }) => [request.type, basePrompt])),
      provider: "local-prompt-pack",
      model: this.geminiTextModel(),
      branch,
      fallbackReason
    });

    if (!this.geminiTextPromptEnabled()) return local("gemini-text-disabled-local-prompt-pack", "GEMINI_DISABLED");
    if (!this.geminiTextApiKey()) return local("gemini-text-key-missing-local-prompt-pack", "GEMINI_KEY_MISSING");

    try {
      return await this.promptProvider.generateStudioPrompts({
        style: input.style,
        plan: input.plan,
        requests: requests.map(({ request, basePrompt }) => ({
          key: request.type,
          generationType: request.generationType,
          basePrompt
        })),
        model: this.geminiTextModel(),
        apiKey: this.geminiTextApiKey(),
        timeoutMs: Number(process.env.GEMINI_TEXT_TIMEOUT_MS ?? 30_000)
      });
    } catch (error) {
      const failureCode = error instanceof GeminiStudioPromptError ? error.code : "GEMINI_REQUEST_FAILED";
      this.logger.warn(
        JSON.stringify({
          event: "gemini_studio_prompt_fallback",
          code: failureCode,
          routeCalled,
          model: this.geminiTextModel(),
          errorClass: error instanceof Error ? error.name : typeof error,
          message: error instanceof Error ? error.message : String(error)
        })
      );
      return local("gemini-text-failed-local-prompt-pack", failureCode);
    }
  }

  private cacheHitPromptDiagnostics(): StudioPromptGenerationResult {
    return {
      prompts: {},
      provider: "local-prompt-pack",
      model: this.geminiTextModel(),
      branch: "cache-hit-no-prompt-provider-call"
    };
  }

  private promptPlanDiagnostics(): StudioPromptGenerationResult {
    if (!this.geminiTextPromptEnabled()) return { prompts: {}, provider: "local-prompt-pack", model: this.geminiTextModel(), branch: "gemini-text-disabled-local-prompt-pack", fallbackReason: "GEMINI_DISABLED" };
    if (!this.geminiTextApiKey()) return { prompts: {}, provider: "local-prompt-pack", model: this.geminiTextModel(), branch: "gemini-text-key-missing-local-prompt-pack", fallbackReason: "GEMINI_KEY_MISSING" };
    return { prompts: {}, provider: "gemini-text", model: this.geminiTextModel(), branch: "gemini-text-configured" };
  }

  private promptFor(plan: StyleBiblePlan, request: StudioAssetRequest) {
    const raw = plan.promptPack[request.promptKey];
    return [
      raw,
      "",
      "Generate one complete cohesive raster NFT Studio Bible sheet directly. Do not output an SVG, UI dashboard, vector template, placeholder grid, wireframe concept, or icon system.",
      "Use hand-directed art-team sheet artwork with natural imperfections: sketch marks, brushwork, texture, uneven spacing, annotated thumbnails, paper grain, ink variance, and composition asymmetry.",
      "Different sections should feel intentionally composed by an artist, not auto-laid out by admin software. Use readable labels but avoid sterile boxes and repeated vector symbols.",
      "Every trait example must be visually distinct and collection-native. Legendary and Mythic examples must avoid generic hood, halo, void, staff, cosmic deity, and repeated archetype shortcuts.",
      "The output is art direction only. Do not imply transparent layers, mint-ready assets, metadata export, or final production approval."
    ].join("\n");
  }

  private cacheKey(tokenMint: string, style: GeneratedStyleProfile, plan: StyleBiblePlan, styleVersion: number, rarityVersion: string, generationType: StudioGenerationType, promptHash: string) {
    return this.hash(
      JSON.stringify({
        tokenMint,
        creativeDnaHash: this.creativeDnaHash(style),
        artTeam: plan.artTeam.id,
        styleVersion,
        promptHash,
        rarityVersion,
        generationType
      })
    );
  }

  private creativeDnaHash(style: GeneratedStyleProfile) {
    return this.hash(JSON.stringify({
      collection: style.collection,
      mintAddress: style.brandDna?.mintAddress,
      creativeDna: style.creativeUniverse?.creativeDna,
      palette: style.colors,
      traitLanguage: style.traitLanguage
    }));
  }

  private providerDecision(routeCalled: string, cacheStatus: StudioCacheStatus, fallbackReason?: string): ProviderDecision {
    void routeCalled;
    void cacheStatus;
    const provider = this.configuredStudioImageProvider();
    if (provider === "deterministic-render") {
      const production = (process.env.APP_ENV ?? process.env.NODE_ENV ?? "development") === "production";
      return {
        provider,
        canCallImage: false,
        useDeterministic: !production,
        branch: production ? "deterministic-blocked-production" : "explicit-deterministic-dev-fallback",
        modelCandidates: [],
        unsupportedModels: [],
        disabledModels: [],
        openaiStudioFallbackEnabled: this.openAIStudioFallbackEnabled(),
        fallbackReason: production ? "DETERMINISTIC_BLOCKED_PRODUCTION" : "EXPLICIT_DETERMINISTIC_PROVIDER"
      };
    }

    const unsupportedModels: string[] = [];
    const disabledModels: string[] = [];
    const candidates: StudioModelCandidate[] = [];
    const imagenUnavailable = studioProviderUnavailable("imagen");
    if (imagenUnavailable) {
      disabledModels.push("imagen-provider");
    } else if (this.imagenApiKey() && this.studioImageGenerationEnabled()) {
      for (const model of this.imagenModelChain()) {
        if (studioModelDisabled("imagen", model)) {
          disabledModels.push(model);
          continue;
        }
        candidates.push({ provider: "imagen", model });
      }
    }

    if (this.paidAiAllowed() && this.openAIStudioFallbackEnabled() && process.env.OPENAI_API_KEY && !studioProviderUnavailable("openai")) {
      for (const model of this.openAIStudioModelChain()) {
        if (studioModelDisabled("openai", model)) {
          disabledModels.push(model);
          continue;
        }
        candidates.push({ provider: "openai", model });
      }
    }

    const configuredModel = this.modelNormalization();
    if (!configuredModel.ok) unsupportedModels.push(configuredModel.rawModel);

    const active = candidates[0];
    if (active) {
      recordStudioProbe(active.provider, "local-validation-passed");
      return {
        provider,
        canCallImage: true,
        useDeterministic: false,
        branch: active.provider === "openai" ? "openai-studio-fallback-configured" : "imagen-configured",
        modelCandidates: candidates,
        unsupportedModels,
        disabledModels,
        activeImageProvider: active.provider,
        activeImageModel: active.model,
        openaiStudioFallbackEnabled: this.openAIStudioFallbackEnabled(),
        fallbackReason
      };
    }

    if (!this.imagenApiKey()) {
      return {
        provider,
        canCallImage: false,
        useDeterministic: false,
        branch: "imagen-key-missing",
        modelCandidates: [],
        unsupportedModels,
        disabledModels,
        activeImageProvider: this.openAIStudioFallbackEnabled() ? "openai" : "imagen",
        activeImageModel: this.openAIStudioFallbackEnabled() ? this.openAIStudioModelChain()[0] : this.model(),
        failureCode: "IMAGEN_KEY_MISSING",
        fallbackReason: fallbackReason ?? (this.openAIStudioFallbackEnabled() ? "IMAGEN_KEY_MISSING_AND_OPENAI_FALLBACK_UNAVAILABLE" : "IMAGEN_OR_GOOGLE_API_KEY_MISSING"),
        openaiStudioFallbackEnabled: this.openAIStudioFallbackEnabled(),
        noBillableGenerationAttempted: true
      };
    }
    if (!this.paidAiAllowed()) {
      return {
        provider,
        canCallImage: false,
        useDeterministic: false,
        branch: "paid-ai-disabled-by-global-guard",
        modelCandidates: [],
        unsupportedModels,
        disabledModels,
        activeImageProvider: "imagen",
        activeImageModel: this.model(),
        failureCode: "PAID_AI_DISABLED",
        fallbackReason: "PAID_AI_GENERATION_ENABLED must be true and DEV_DISABLE_PAID_AI must be false before any Gemini/Imagen/OpenAI Studio image call.",
        openaiStudioFallbackEnabled: this.openAIStudioFallbackEnabled(),
        noBillableGenerationAttempted: true
      };
    }
    if (!this.studioImageGenerationEnabled()) {
      return {
        provider,
        canCallImage: false,
        useDeterministic: false,
        branch: "imagen-disabled-by-env",
        modelCandidates: [],
        unsupportedModels,
        disabledModels,
        activeImageProvider: "imagen",
        activeImageModel: this.model(),
        failureCode: "IMAGEN_DISABLED",
        fallbackReason: fallbackReason ?? "STUDIO_IMAGE_GENERATION_DISABLED",
        openaiStudioFallbackEnabled: this.openAIStudioFallbackEnabled(),
        noBillableGenerationAttempted: true
      };
    }

    return {
      provider,
      canCallImage: false,
      useDeterministic: false,
      branch: "studio-image-provider-unavailable",
      modelCandidates: [],
      unsupportedModels,
      disabledModels,
      activeImageProvider: "imagen",
      activeImageModel: this.model(),
      failureCode: "STUDIO_IMAGE_PROVIDER_UNAVAILABLE",
      fallbackReason: fallbackReason ?? (unsupportedModels.length ? `Unsupported configured model: ${unsupportedModels.join(", ")}` : "All Studio Bible image providers are in circuit-breaker backoff or unavailable."),
      openaiStudioFallbackEnabled: this.openAIStudioFallbackEnabled(),
      noBillableGenerationAttempted: true
    };
  }

  private cachedDecision(provider: "cached" | "cached-imagen" | "cached-gemini"): ProviderDecision {
    return {
      provider: "imagen",
      canCallImage: false,
      useDeterministic: false,
      branch: provider === "cached-gemini" ? "cache-hit-gemini" : "cache-hit-imagen",
      modelCandidates: [],
      unsupportedModels: [],
      disabledModels: [],
      activeImageProvider: provider === "cached-gemini" ? "imagen" : "imagen",
      activeImageModel: this.model(),
      openaiStudioFallbackEnabled: this.openAIStudioFallbackEnabled(),
      noBillableGenerationAttempted: true
    };
  }

  private diagnostics(
    decision: ProviderDecision,
    routeCalled: string,
    cacheStatus: StudioCacheStatus,
    fallbackReason?: string,
    promptResult = this.promptPlanDiagnostics(),
    generation?: {
      attemptedModels?: string[];
      fallbackModelUsed?: string;
      billableGenerationAttempted?: boolean;
    }
  ): StudioProviderDiagnostics {
    const circuit = decision.activeImageProvider ? studioCircuitSnapshot(decision.activeImageProvider, decision.activeImageProvider === "openai" ? SUPPORTED_OPENAI_IMAGE_MODELS : SUPPORTED_IMAGEN_MODELS) : undefined;
    return {
      envStudioProvider: process.env.STUDIO_PROVIDER?.trim() || "local-component",
      envStudioImageProvider: process.env.STUDIO_IMAGE_PROVIDER?.trim() || "deterministic-render",
      geminiApiKeyPresent: Boolean(this.geminiTextApiKey()),
      imagenApiKeyPresent: Boolean(this.imagenApiKey()),
      studioImageGenerationEnabled: this.studioImageGenerationEnabled(),
      modelSelected: this.model(),
      geminiTextModelSelected: this.geminiTextModel(),
      promptProvider: promptResult.provider,
      promptProviderDecisionBranch: promptResult.branch,
      promptFallbackReason: promptResult.fallbackReason,
      routeCalled,
      providerDecisionBranch: decision.branch,
      activeImageProvider: decision.activeImageProvider,
      activeImageModel: decision.activeImageModel,
      supportedModels: [...SUPPORTED_IMAGEN_MODELS, ...SUPPORTED_OPENAI_IMAGE_MODELS],
      unsupportedModels: decision.unsupportedModels,
      disabledModels: decision.disabledModels,
      attemptedModels: generation?.attemptedModels,
      fallbackModelUsed: generation?.fallbackModelUsed,
      billableGenerationAttempted: generation?.billableGenerationAttempted ?? false,
      noBillableGenerationAttempted: !(generation?.billableGenerationAttempted ?? false),
      quotaStatus: circuit?.quotaStatus,
      lastProbeResult: circuit?.lastProbeResult,
      lastErrorCode: circuit?.lastErrorCode,
      openaiStudioFallbackEnabled: decision.openaiStudioFallbackEnabled,
      canGenerateStudioBible: decision.canCallImage,
      cacheStatus,
      fallbackReason: fallbackReason ?? decision.fallbackReason
    };
  }

  private summary(input: {
    provider: StudioGenerationSummary["provider"];
    model: string;
    assets: PreviewAssetPlan[];
    costBreakdown: StudioGenerationCostLine[];
    cacheStatus: StudioCacheStatus;
    imagesThisRun: number;
    estimatedCostUsd: number;
    diagnostics: StudioProviderDiagnostics;
    failureCode?: StudioProviderFailureCode;
    failureReason?: string;
    activeImageProvider?: string;
    activeModel?: string;
    fallbackModelUsed?: string;
    billableGenerationAttempted?: boolean;
    noBillableGenerationAttempted?: boolean;
    unavailableReason?: string;
  }): StudioGenerationSummary {
    return {
      provider: input.provider,
      model: input.model,
      imageCount: input.imagesThisRun,
      imagesThisRun: input.imagesThisRun,
      estimatedCostUsd: Number(input.estimatedCostUsd.toFixed(4)),
      cacheStatus: input.cacheStatus,
      generationType: "fast_studio_preview",
      costBreakdown: input.costBreakdown,
      assets: input.assets.map((asset) => asset.type),
      providerFailureCode: input.failureCode,
      providerFailureReason: input.failureReason,
      activeImageProvider: input.activeImageProvider,
      activeModel: input.activeModel,
      fallbackModelUsed: input.fallbackModelUsed,
      billableGenerationAttempted: input.billableGenerationAttempted ?? false,
      noBillableGenerationAttempted: input.noBillableGenerationAttempted ?? !(input.billableGenerationAttempted ?? false),
      unavailableReason: input.unavailableReason,
      diagnostics: input.diagnostics
    };
  }

  private providerFailureCode(error: unknown, provider: "imagen" | "openai" = "imagen"): StudioProviderFailureCode {
    if (error instanceof ImagenStudioImageError) return error.code;
    if (error instanceof DOMException && error.name === "AbortError") return provider === "openai" ? "OPENAI_IMAGE_TIMEOUT" : "IMAGEN_TIMEOUT";
    if (error instanceof HttpException) {
      const response = error.getResponse();
      const code = typeof response === "object" && response ? String((response as Record<string, unknown>).code ?? "") : "";
      if (code === "OPENAI_UNSUPPORTED_MODEL" || code === "OPENAI_IMAGE_MODEL_UNSUPPORTED") return "OPENAI_UNSUPPORTED_MODEL";
      if (code === "OPENAI_BILLING_UNAVAILABLE") return "OPENAI_BILLING_UNAVAILABLE";
      if (code === "OPENAI_IMAGE_TIMEOUT") return "OPENAI_IMAGE_TIMEOUT";
      if (provider === "openai") return "OPENAI_REQUEST_FAILED";
    }
    return provider === "openai" ? "OPENAI_REQUEST_FAILED" : "IMAGEN_REQUEST_FAILED";
  }

  private failureMessage(code: StudioProviderFailureCode) {
    if (code === "STUDIO_IMAGE_PROVIDER_UNAVAILABLE") return "All Studio Bible image providers are unavailable. No billable generation attempted.";
    if (code === "PAID_AI_DISABLED") return "Paid AI generation is disabled by the global guard. No billable generation attempted.";
    if (code === "STUDIO_PREFLIGHT_FAILED") return "Studio Bible image provider preflight failed. No billable generation attempted.";
    if (code === "OPENAI_DISABLED") return "OpenAI Studio fallback is disabled. Set ENABLE_OPENAI_STUDIO_FALLBACK=true to allow it after Imagen fallback fails.";
    if (code === "OPENAI_KEY_MISSING") return "OPENAI_API_KEY is missing for the explicit Studio Bible fallback.";
    return code;
  }

  private isUnsupportedModelFailure(code: StudioProviderFailureCode) {
    return code === "IMAGEN_MODEL_UNSUPPORTED" || code === "OPENAI_UNSUPPORTED_MODEL";
  }

  private isQuotaFailure(code: StudioProviderFailureCode) {
    return code === "IMAGEN_QUOTA_EXCEEDED" || code === "OPENAI_BILLING_UNAVAILABLE";
  }

  private configuredStudioImageProvider(): ProviderDecision["provider"] {
    const provider = (process.env.STUDIO_IMAGE_PROVIDER ?? process.env.STUDIO_PROVIDER ?? "deterministic-render").trim().toLowerCase();
    if (provider === "openai") return "openai";
    if (provider === "deterministic-render" || provider === "deterministic") return "deterministic-render";
    return "imagen";
  }

  private studioImageGenerationEnabled() {
    return this.paidAiAllowed() && ((process.env.ENABLE_STUDIO_IMAGE_GENERATION ?? "false") === "true" || (process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true");
  }

  private paidAiAllowed() {
    const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
    const paidEnabled = (process.env.PAID_AI_GENERATION_ENABLED ?? "false") === "true";
    const devDisabled = (process.env.DEV_DISABLE_PAID_AI ?? "true") === "true" && appEnv !== "production";
    return paidEnabled && !devDisabled;
  }

  private model() {
    const model = this.modelNormalization();
    return model.ok ? model.model : model.rawModel;
  }

  private modelNormalization() {
    return normalizeImagenModel(this.configuredImagenModel());
  }

  private imagenModelChain() {
    const configured = this.modelNormalization();
    const models = configured.ok ? [configured.model, ...IMAGEN_STUDIO_BIBLE_FALLBACK_CHAIN] : [...IMAGEN_STUDIO_BIBLE_FALLBACK_CHAIN];
    return [...new Set(models)];
  }

  private configuredImagenModel() {
    return process.env.IMAGEN_IMAGE_MODEL?.trim() || process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGEN_MODEL;
  }

  private geminiTextModel() {
    const model = this.geminiTextModelNormalization();
    return model.ok ? model.model : model.rawModel || DEFAULT_GEMINI_TEXT_MODEL;
  }

  private geminiTextModelNormalization() {
    return normalizeGeminiTextModel(process.env.GEMINI_TEXT_MODEL?.trim() || process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_TEXT_MODEL);
  }

  private geminiTextPromptEnabled() {
    const provider = (process.env.STUDIO_PROVIDER ?? "local-component").trim().toLowerCase();
    const explicitlyDisabled = (process.env.ENABLE_GEMINI_TEXT_PROMPTS ?? "true") === "false";
    return this.paidAiAllowed() && !explicitlyDisabled && provider !== "local-component" && provider !== "deterministic" && provider !== "deterministic-render" && provider !== "openai";
  }

  private geminiTextApiKey() {
    return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? process.env.IMAGEN_API_KEY;
  }

  private imagenApiKey() {
    return process.env.IMAGEN_API_KEY ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  }

  private openAIStudioFallbackEnabled() {
    return (process.env.ENABLE_OPENAI_STUDIO_FALLBACK ?? "false") === "true";
  }

  private openAIStudioModelChain() {
    const configured = process.env.OPENAI_STUDIO_IMAGE_MODEL?.trim() || process.env.OPENAI_IMAGE_MODEL?.trim();
    const configuredModel = configured && (SUPPORTED_OPENAI_IMAGE_MODELS as readonly string[]).includes(configured) ? configured : undefined;
    return [...new Set([configuredModel, DEFAULT_OPENAI_IMAGE_MODEL, ...SUPPORTED_OPENAI_IMAGE_MODELS].filter(Boolean) as string[])];
  }

  private estimatedImagenCostUsd() {
    const configured = Number(process.env.IMAGEN_IMAGE_ESTIMATED_COST_USD);
    return Number.isFinite(configured) && configured >= 0 ? configured : 0.02;
  }

  private estimatedOpenAIStudioCostUsd() {
    const configured = Number(process.env.OPENAI_STUDIO_IMAGE_ESTIMATED_COST_USD ?? process.env.OPENAI_IMAGE_ESTIMATED_COST_USD);
    return Number.isFinite(configured) && configured >= 0 ? configured : 0.08;
  }

  private sumCost(lines: StudioGenerationCostLine[]) {
    return Number(lines.reduce((sum, line) => sum + Number(line.estimatedCostUsd ?? 0), 0).toFixed(4));
  }

  private hash(value: string) {
    return createHash("sha256").update(value).digest("hex").slice(0, 32);
  }
}

export function isRealStudioBibleAsset(asset: PreviewAssetPlan | undefined | null): asset is PreviewAssetPlan {
  if (!asset || !studioAssetTypeSet.has(asset.type as StudioAssetType) || !asset.uri) return false;
  const provider = String(asset.provider ?? asset.metadata.provider ?? asset.generationMetadata?.provider ?? "").toLowerCase();
  const sourceProvider = String(asset.metadata.sourceProvider ?? asset.generationMetadata?.sourceProvider ?? "").toLowerCase();
  const model = String(asset.metadata.model ?? asset.generationMetadata?.model ?? "").toLowerCase();
  const uri = String(asset.uri).toLowerCase();
  if (/deterministic|wireframe|placeholder|premium-fallback/.test(`${provider} ${sourceProvider}`)) return false;
  if (uri.startsWith("data:image/svg+xml")) return false;
  return provider === "imagen" || provider === "cached-imagen" || sourceProvider === "imagen" || model.includes("imagen") || provider === "gemini" || provider === "cached-gemini" || sourceProvider === "gemini" || model.includes("gemini") || provider === "openai" || sourceProvider === "openai" || model.includes("gpt-image");
}

export function hasAllRealStudioBibleAssets(assets: PreviewAssetPlan[]) {
  return studioAssetRequests.every((request) => assets.some((asset) => asset.type === request.type && isRealStudioBibleAsset(asset)));
}
