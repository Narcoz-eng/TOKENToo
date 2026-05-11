import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
import { GeminiStudioPromptError, GeminiStudioPromptProviderService, type StudioPromptGenerationResult } from "./gemini-studio-prompt-provider.service";
import { ImagenStudioImageError, ImagenStudioImageProviderService, type ImagenStudioErrorCode } from "./imagen-studio-image-provider.service";
import { DEFAULT_IMAGEN_MODEL, normalizeImagenModel } from "./imagen-models";
import type {
  GeneratedStyleProfile,
  PreviewAssetPlan,
  StudioCacheStatus,
  StudioGenerationCostLine,
  StudioGenerationSummary,
  StudioGenerationType,
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
  failureCode?: ImagenStudioErrorCode;
  fallbackReason?: string;
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
    private readonly promptProvider: GeminiStudioPromptProviderService = new GeminiStudioPromptProviderService()
  ) {}

  validatePlan(style: GeneratedStyleProfile, plan: StyleBiblePlan, tokenMint: string, styleVersion = 1, rarityVersion = "rarity-v1"): StudioGenerationSummary {
    const model = this.model();
    const decision = this.providerDecision("POST /generator/ai-concept/validate-request", "miss");
    const costBreakdown = studioAssetRequests.map((request) => {
      const prompt = this.promptFor(plan, request);
      return {
        provider: this.costProviderForDecision(decision),
        model: decision.canCallImage ? model : decision.provider === "deterministic-render" ? "style-bible-engine" : model,
        generationType: request.generationType,
        promptHash: this.hash(prompt),
        estimatedCostUsd: decision.canCallImage ? this.estimatedImagenCostUsd() : 0,
        cacheStatus: decision.canCallImage ? "miss" as StudioCacheStatus : "disabled" as StudioCacheStatus
      };
    });
    void style;
    void tokenMint;
    void styleVersion;
    void rarityVersion;
    return this.summary({
      provider: decision.canCallImage ? "imagen" : decision.provider === "deterministic-render" ? "deterministic-render" : "imagen-unavailable",
      model: decision.canCallImage ? model : decision.provider === "deterministic-render" ? "style-bible-engine" : model,
      assets: [],
      costBreakdown,
      cacheStatus: decision.canCallImage ? "miss" : "disabled",
      imagesThisRun: decision.canCallImage ? studioAssetRequests.length : 0,
      estimatedCostUsd: this.sumCost(costBreakdown),
      diagnostics: this.diagnostics(decision, "POST /generator/ai-concept/validate-request", decision.canCallImage ? "miss" : "disabled", undefined, this.promptPlanDiagnostics()),
      failureCode: decision.failureCode,
      failureReason: decision.failureCode
    });
  }

  async generateStudioAssets(input: GenerateStudioAssetsInput) {
    const routeCalled = input.routeCalled ?? "POST /generator/preview";
    const warnings: string[] = [];
    const assets: PreviewAssetPlan[] = [];
    const costBreakdown: StudioGenerationCostLine[] = [];
    const model = this.model();
    const decision = this.providerDecision(routeCalled, "miss");

    if (decision.provider === "openai") {
      warnings.push("IMAGEN_DISABLED: STUDIO_PROVIDER=openai is not allowed for Studio Bible generation; OpenAI is reserved for explicit Premium Cinematic Render.");
    }

    if (!decision.canCallImage) {
      if (decision.failureCode) warnings.push(`${decision.failureCode}: ${this.failureMessage(decision.failureCode)}`);
      const deterministicAssets = decision.useDeterministic ? this.deterministicFallbackAssets(input.deterministicAssets, input.plan) : [];
      const deterministicCost = deterministicAssets.map((asset) => this.costLine(asset, this.requestForAsset(asset.type), "disabled"));
      return {
        assets: deterministicAssets,
        summary: this.summary({
          provider: decision.provider === "deterministic-render" ? "deterministic-render" : "imagen-unavailable",
          model: decision.provider === "deterministic-render" ? "style-bible-engine" : model,
          assets: deterministicAssets,
          costBreakdown: deterministicCost,
          cacheStatus: "disabled",
          imagesThisRun: 0,
          estimatedCostUsd: 0,
          diagnostics: this.diagnostics(decision, routeCalled, "disabled"),
          failureCode: decision.failureCode,
          failureReason: decision.failureCode
        }),
        warnings
      };
    }

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
          provider: cachedSourceProvider === "gemini" ? "cached-gemini" : "cached-imagen",
          sourceProvider: cachedSourceProvider,
          model: String(cached.generationMetadata?.model ?? cached.metadata.model ?? model),
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

    const promptResult = generationRequests.length
      ? await this.generatePromptPack(input, generationRequests.map(({ request, basePrompt }) => ({ request, basePrompt })), routeCalled)
      : this.cacheHitPromptDiagnostics();

    const batchController = new AbortController();
    const generatedPromises = generationRequests.map(async ({ request, basePrompt, promptHash, studioCacheKey }) => {
      const prompt = promptResult.prompts[request.type] ?? basePrompt;
      const generated = await this.imagenProvider.generateStudioBible({
        prompt,
        generationType: request.generationType,
        studioCacheKey,
        model,
        apiKey: this.imagenApiKey(),
        timeoutMs: Number(process.env.IMAGEN_IMAGE_TIMEOUT_MS ?? 90_000),
        signal: batchController.signal
      });
      const asset = this.withStudioMetadata(this.emptyStudioAsset(request, input.plan), request, {
        provider: "imagen",
        sourceProvider: "imagen",
        model,
        prompt,
        promptHash,
        studioCacheKey,
        estimatedCostUsd: this.estimatedImagenCostUsd(),
        cacheStatus: "generated",
        uri: generated.uri
      });
      return { asset, request, studioCacheKey };
    });

    let generatedResults: Awaited<(typeof generatedPromises)[number]>[];
    try {
      generatedResults = await Promise.all(generatedPromises);
    } catch (error) {
      batchController.abort(error);
      const failureCode = this.providerFailureCode(error);
      const failureReason = this.failureMessage(failureCode);
      warnings.push(`${failureCode}: ${failureReason}`);
      this.logger.warn(
        JSON.stringify({
          event: "imagen_studio_generation_aborted",
          code: failureCode,
          generationType: "studio_bible_batch",
          model,
          routeCalled,
          errorClass: error instanceof Error ? error.name : typeof error,
          message: error instanceof Error ? error.message : String(error)
        })
      );
      return {
        assets: [],
        summary: this.summary({
          provider: "imagen",
          model,
          assets: [],
          costBreakdown,
          cacheStatus: "miss",
          imagesThisRun: 0,
          estimatedCostUsd: 0,
          diagnostics: this.diagnostics({ ...decision, branch: "imagen-request-failed", fallbackReason: failureCode }, routeCalled, "miss", failureCode, promptResult),
          failureCode,
          failureReason: failureCode
        }),
        warnings
      };
    }

    for (const result of generatedResults) {
      assets.push(result.asset);
      costBreakdown.push(this.costLine(result.asset, result.request, "generated"));
    }

    const cacheStatus: StudioCacheStatus = assets.length === studioAssetRequests.length && assets.every((asset) => asset.generationMetadata?.cacheStatus === "hit") ? "hit" : "miss";
    const provider = cacheStatus === "hit" ? assets.every((asset) => this.realAssetSourceProvider(asset) === "gemini") ? "cached-gemini" : "cached-imagen" : "imagen";
    return {
      assets,
      summary: this.summary({
        provider,
        model,
        assets,
        costBreakdown,
        cacheStatus,
        imagesThisRun: assets.length,
        estimatedCostUsd: this.sumCost(costBreakdown),
        diagnostics: this.diagnostics({ ...decision, branch: cacheStatus === "hit" ? "cache-hit-imagen" : "imagen-generated" }, routeCalled, cacheStatus, undefined, promptResult)
      }),
      warnings
    };
  }

  private withStudioMetadata(
    base: PreviewAssetPlan,
    request: StudioAssetRequest,
    values: {
      provider: PreviewAssetPlan["provider"];
      sourceProvider: "imagen" | "gemini" | "deterministic-render";
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
    if (decision.canCallImage) return "imagen";
    if (decision.provider === "deterministic-render") return "deterministic-render";
    return "imagen-unavailable";
  }

  private realAssetSourceProvider(asset: PreviewAssetPlan): "imagen" | "gemini" {
    const provider = String(asset.provider ?? asset.metadata.provider ?? asset.generationMetadata?.provider ?? "").toLowerCase();
    const sourceProvider = String(asset.metadata.sourceProvider ?? asset.generationMetadata?.sourceProvider ?? "").toLowerCase();
    const model = String(asset.metadata.model ?? asset.generationMetadata?.model ?? "").toLowerCase();
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
    if (provider === "openai") {
      return {
        provider,
        canCallImage: false,
        useDeterministic: false,
        branch: "studio-image-provider-openai-disabled",
        failureCode: "IMAGEN_DISABLED",
        fallbackReason: fallbackReason ?? "STUDIO_PROVIDER_OPENAI"
      };
    }
    if (provider === "deterministic-render") {
      const production = (process.env.APP_ENV ?? process.env.NODE_ENV ?? "development") === "production";
      return {
        provider,
        canCallImage: false,
        useDeterministic: !production,
        branch: production ? "deterministic-blocked-production" : "explicit-deterministic-dev-fallback",
        fallbackReason: production ? "DETERMINISTIC_BLOCKED_PRODUCTION" : "EXPLICIT_DETERMINISTIC_PROVIDER"
      };
    }
    const model = this.modelNormalization();
    if (!model.ok) {
      return {
        provider,
        canCallImage: false,
        useDeterministic: false,
        branch: "imagen-model-unsupported",
        failureCode: "IMAGEN_MODEL_UNSUPPORTED",
        fallbackReason: fallbackReason ?? `IMAGEN_MODEL_UNSUPPORTED:${model.rawModel}`
      };
    }
    if (!this.imagenApiKey()) {
      return {
        provider,
        canCallImage: false,
        useDeterministic: false,
        branch: "imagen-key-missing",
        failureCode: "IMAGEN_KEY_MISSING",
        fallbackReason: fallbackReason ?? "IMAGEN_OR_GOOGLE_API_KEY_MISSING"
      };
    }
    if (!this.studioImageGenerationEnabled()) {
      return {
        provider,
        canCallImage: false,
        useDeterministic: false,
        branch: "imagen-disabled-by-env",
        failureCode: "IMAGEN_DISABLED",
        fallbackReason: fallbackReason ?? "STUDIO_IMAGE_GENERATION_DISABLED"
      };
    }
    return { provider, canCallImage: true, useDeterministic: false, branch: "imagen-configured" };
  }

  private diagnostics(decision: ProviderDecision, routeCalled: string, cacheStatus: StudioCacheStatus, fallbackReason?: string, promptResult = this.promptPlanDiagnostics()): StudioProviderDiagnostics {
    return {
      envStudioProvider: process.env.STUDIO_PROVIDER?.trim() || "gemini",
      envStudioImageProvider: process.env.STUDIO_IMAGE_PROVIDER?.trim() || "imagen",
      geminiApiKeyPresent: Boolean(process.env.GEMINI_API_KEY),
      imagenApiKeyPresent: Boolean(this.imagenApiKey()),
      studioImageGenerationEnabled: this.studioImageGenerationEnabled(),
      modelSelected: this.model(),
      geminiTextModelSelected: this.geminiTextModel(),
      promptProvider: promptResult.provider,
      promptProviderDecisionBranch: promptResult.branch,
      promptFallbackReason: promptResult.fallbackReason,
      routeCalled,
      providerDecisionBranch: decision.branch,
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
    failureCode?: ImagenStudioErrorCode;
    failureReason?: string;
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
      diagnostics: input.diagnostics
    };
  }

  private providerFailureCode(error: unknown): ImagenStudioErrorCode {
    if (error instanceof ImagenStudioImageError) return error.code;
    if (error instanceof DOMException && error.name === "AbortError") return "IMAGEN_TIMEOUT";
    return "IMAGEN_REQUEST_FAILED";
  }

  private failureMessage(code: ImagenStudioErrorCode) {
    return code;
  }

  private configuredStudioImageProvider(): ProviderDecision["provider"] {
    const provider = (process.env.STUDIO_IMAGE_PROVIDER ?? process.env.STUDIO_PROVIDER ?? "imagen").trim().toLowerCase();
    if (provider === "openai") return "openai";
    if (provider === "deterministic-render" || provider === "deterministic") return "deterministic-render";
    return "imagen";
  }

  private studioImageGenerationEnabled() {
    return (process.env.ENABLE_STUDIO_IMAGE_GENERATION ?? "false") === "true" || (process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true";
  }

  private model() {
    const model = this.modelNormalization();
    return model.ok ? model.model : model.rawModel;
  }

  private modelNormalization() {
    return normalizeImagenModel(this.configuredImagenModel());
  }

  private configuredImagenModel() {
    return process.env.IMAGEN_IMAGE_MODEL?.trim() || process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGEN_MODEL;
  }

  private geminiTextModel() {
    return process.env.GEMINI_TEXT_MODEL?.trim() || process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  }

  private geminiTextPromptEnabled() {
    const provider = (process.env.STUDIO_PROVIDER ?? "gemini").trim().toLowerCase();
    const explicitlyDisabled = (process.env.ENABLE_GEMINI_TEXT_PROMPTS ?? "true") === "false";
    return !explicitlyDisabled && provider !== "deterministic" && provider !== "deterministic-render" && provider !== "openai";
  }

  private geminiTextApiKey() {
    return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? process.env.IMAGEN_API_KEY;
  }

  private imagenApiKey() {
    return process.env.IMAGEN_API_KEY ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  }

  private estimatedImagenCostUsd() {
    const configured = Number(process.env.IMAGEN_IMAGE_ESTIMATED_COST_USD);
    return Number.isFinite(configured) && configured >= 0 ? configured : 0.02;
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
  if (/deterministic|wireframe|placeholder|openai|premium-fallback/.test(`${provider} ${sourceProvider}`)) return false;
  if (uri.startsWith("data:image/svg+xml")) return false;
  return provider === "imagen" || provider === "cached-imagen" || sourceProvider === "imagen" || model.includes("imagen") || provider === "gemini" || provider === "cached-gemini" || sourceProvider === "gemini" || model.includes("gemini");
}

export function hasAllRealStudioBibleAssets(assets: PreviewAssetPlan[]) {
  return studioAssetRequests.every((request) => assets.some((asset) => asset.type === request.type && isRealStudioBibleAsset(asset)));
}
