import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import type {
  GeneratedStyleProfile,
  PreviewAssetPlan,
  StudioCacheStatus,
  StudioGenerationCostLine,
  StudioGenerationSummary,
  StudioGenerationType,
  StyleBiblePlan
} from "./generator.types";

type StudioAssetType = Extract<PreviewAssetPlan["type"], "STYLE_BIBLE" | "TRAIT_CATALOG" | "RARITY_LADDER" | "MOOD_SHEET" | "LAYER_BREAKDOWN">;

type StudioAssetRequest = {
  type: StudioAssetType;
  generationType: StudioGenerationType;
  promptKey: keyof StyleBiblePlan["promptPack"];
};

type GenerateStudioAssetsInput = {
  tokenMint: string;
  style: GeneratedStyleProfile;
  plan: StyleBiblePlan;
  deterministicAssets: PreviewAssetPlan[];
  styleVersion: number;
  rarityVersion?: string;
  cachedAssets?: PreviewAssetPlan[];
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }>;
    };
  }>;
};

const studioAssetRequests: StudioAssetRequest[] = [
  { type: "STYLE_BIBLE", generationType: "studio_bible", promptKey: "styleBibleImage" },
  { type: "TRAIT_CATALOG", generationType: "trait_catalog", promptKey: "traitCatalogSheet" },
  { type: "RARITY_LADDER", generationType: "rarity_ladder", promptKey: "rarityLadder" },
  { type: "MOOD_SHEET", generationType: "mood_sheet", promptKey: "moodSheet" },
  { type: "LAYER_BREAKDOWN", generationType: "layer_breakdown", promptKey: "layerBreakdown" }
];

@Injectable()
export class StudioImageProviderService {
  private readonly logger = new Logger(StudioImageProviderService.name);

  validatePlan(style: GeneratedStyleProfile, plan: StyleBiblePlan, tokenMint: string, styleVersion = 1, rarityVersion = "rarity-v1"): StudioGenerationSummary {
    const model = this.model();
    const provider: StudioGenerationCostLine["provider"] = this.canUseGemini() ? "gemini" : this.configuredStudioProvider() === "gemini" ? "gemini-unavailable" : "deterministic-render";
    const costBreakdown = studioAssetRequests.map((request) => {
      const prompt = this.promptFor(plan, request);
      return {
        provider,
        model: provider === "gemini" ? model : "style-bible-engine",
        generationType: request.generationType,
        promptHash: this.hash(prompt),
        estimatedCostUsd: this.canUseGemini() ? this.estimatedGeminiCostUsd() : 0,
        cacheStatus: "miss" as StudioCacheStatus
      };
    });
    return {
      provider,
      model: provider === "gemini" ? model : "style-bible-engine",
      imageCount: studioAssetRequests.length,
      estimatedCostUsd: this.sumCost(costBreakdown),
      cacheStatus: "miss",
      generationType: "fast_studio_preview",
      costBreakdown
    };
  }

  async generateStudioAssets(input: GenerateStudioAssetsInput) {
    const warnings: string[] = [];
    const assets: PreviewAssetPlan[] = [];
    const costBreakdown: StudioGenerationCostLine[] = [];
    const deterministicByType = new Map(input.deterministicAssets.map((asset) => [asset.type, asset]));
    const cachedByKey = new Map(
      (input.cachedAssets ?? []).map((asset) => [
        String(asset.metadata.studioCacheKey ?? asset.generationMetadata?.studioCacheKey ?? ""),
        asset
      ])
    );
    const model = this.model();
    const styleProvider = this.configuredStudioProvider();
    if (styleProvider === "openai") {
      warnings.push("STUDIO_PROVIDER=openai is not allowed for Studio Bible generation; OpenAI is reserved for explicit Premium Cinematic Render.");
    }
    if (styleProvider === "gemini" && !this.canUseGemini()) {
      warnings.push("GEMINI_API_KEY is missing; generated deterministic Studio Bible sheets are shown as art direction only.");
    }

    for (const request of studioAssetRequests) {
      const deterministic = deterministicByType.get(request.type);
      if (!deterministic) continue;
      const prompt = this.promptFor(input.plan, request);
      const promptHash = this.hash(prompt);
      const studioCacheKey = this.cacheKey(input.tokenMint, input.style, input.plan, input.styleVersion, input.rarityVersion ?? "rarity-v1", request.generationType, promptHash);
      const cached = cachedByKey.get(studioCacheKey);
      if (cached) {
        const asset = this.withStudioMetadata(cached, request, {
          provider: "cached",
          model: String(cached.generationMetadata?.model ?? cached.metadata.model ?? "cached"),
          prompt,
          promptHash,
          studioCacheKey,
          estimatedCostUsd: 0,
          cacheStatus: "hit"
        });
        assets.push(asset);
        costBreakdown.push(this.costLine(asset, request));
        continue;
      }

      const generated = this.canUseGemini() ? await this.tryGemini(prompt, request, studioCacheKey) : undefined;
      const asset = generated
        ? this.withStudioMetadata(deterministic, request, {
            provider: "gemini",
            model,
            prompt,
            promptHash,
            studioCacheKey,
            estimatedCostUsd: this.estimatedGeminiCostUsd(),
            cacheStatus: "generated",
            uri: generated.uri
          })
        : this.withStudioMetadata(deterministic, request, {
            provider: this.configuredStudioProvider() === "gemini" ? "gemini-unavailable" : "deterministic-render",
            model: "style-bible-engine",
            prompt,
            promptHash,
            studioCacheKey,
            estimatedCostUsd: 0,
            cacheStatus: "generated"
          });
      assets.push(asset);
      costBreakdown.push(this.costLine(asset, request));
    }

    const provider = assets.some((asset) => asset.provider === "gemini")
      ? "gemini"
      : assets.some((asset) => asset.provider === "cached")
        ? "cached"
        : assets.some((asset) => asset.provider === "gemini-unavailable")
          ? "gemini-unavailable"
          : "deterministic-render";
    const summary: StudioGenerationSummary = {
      provider,
      model: provider === "gemini" ? model : provider === "cached" ? "cached" : "style-bible-engine",
      imageCount: assets.length,
      estimatedCostUsd: this.sumCost(costBreakdown),
      cacheStatus: assets.every((asset) => asset.generationMetadata?.cacheStatus === "hit") ? "hit" : assets.some((asset) => asset.generationMetadata?.cacheStatus === "hit") ? "generated" : "miss",
      generationType: "fast_studio_preview",
      costBreakdown
    };
    return { assets, summary, warnings };
  }

  private async tryGemini(prompt: string, request: StudioAssetRequest, studioCacheKey: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.GEMINI_IMAGE_TIMEOUT_MS ?? 90_000));
    try {
      const model = this.model();
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        this.logger.warn(
          JSON.stringify({
            event: "gemini_studio_image_request_failed",
            status: response.status,
            generationType: request.generationType,
            studioCacheKey,
            body: (await response.text().catch(() => "")).slice(0, 600)
          })
        );
        return undefined;
      }
      const payload = (await response.json()) as GeminiResponse;
      const image = payload.candidates?.flatMap((candidate) => candidate.content?.parts ?? []).find((part) => part.inlineData?.data)?.inlineData;
      if (!image?.data) return undefined;
      return { uri: `data:${image.mimeType ?? "image/png"};base64,${image.data}` };
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: "gemini_studio_image_request_error",
          generationType: request.generationType,
          studioCacheKey,
          errorClass: error instanceof Error ? error.name : typeof error,
          message: error instanceof Error ? error.message : String(error)
        })
      );
      return undefined;
    } finally {
      clearTimeout(timeout);
    }
  }

  private withStudioMetadata(
    base: PreviewAssetPlan,
    request: StudioAssetRequest,
    values: {
      provider: PreviewAssetPlan["provider"];
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

  private costLine(asset: PreviewAssetPlan, request: StudioAssetRequest): StudioGenerationCostLine {
    return {
      provider: (asset.provider === "cached" || asset.provider === "gemini" || asset.provider === "gemini-unavailable" ? asset.provider : "deterministic-render") as StudioGenerationCostLine["provider"],
      model: String(asset.generationMetadata?.model ?? asset.metadata.model ?? "unknown"),
      generationType: request.generationType,
      promptHash: String(asset.promptHash ?? asset.generationMetadata?.promptHash ?? ""),
      estimatedCostUsd: Number(asset.generationMetadata?.estimatedCostUsd ?? asset.metadata.estimatedCostUsd ?? 0),
      cacheStatus: (asset.generationMetadata?.cacheStatus ?? asset.metadata.cacheStatus ?? "generated") as StudioCacheStatus
    };
  }

  private promptFor(plan: StyleBiblePlan, request: StudioAssetRequest) {
    const raw = plan.promptPack[request.promptKey];
    return [
      raw,
      "",
      "Render one complete NFT Studio Bible sheet, not a cinematic poster and not final NFT art.",
      "Use a paper-and-ink studio layout with clear labeled sections, readable trait drawings, rarity separation, and consistent art-team style.",
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

  private canUseGemini() {
    return this.configuredStudioProvider() === "gemini" && Boolean(process.env.GEMINI_API_KEY);
  }

  private configuredStudioProvider(): "gemini" | "openai" | "deterministic-render" {
    const provider = (process.env.STUDIO_PROVIDER ?? "gemini").trim().toLowerCase();
    if (provider === "openai") return "openai";
    if (provider === "deterministic-render" || provider === "deterministic") return "deterministic-render";
    return "gemini";
  }

  private model() {
    return process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-2.5-flash-image";
  }

  private estimatedGeminiCostUsd() {
    const configured = Number(process.env.GEMINI_IMAGE_ESTIMATED_COST_USD);
    return Number.isFinite(configured) && configured >= 0 ? configured : 0.039;
  }

  private sumCost(lines: StudioGenerationCostLine[]) {
    return Number(lines.reduce((sum, line) => sum + Number(line.estimatedCostUsd ?? 0), 0).toFixed(4));
  }

  private hash(value: string) {
    return createHash("sha256").update(value).digest("hex").slice(0, 32);
  }
}
