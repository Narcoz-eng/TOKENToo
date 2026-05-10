import { BadRequestException, GatewayTimeoutException, HttpException, Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  buildOpenAIImageRequest,
  openAIImageConfigFix,
  OPENAI_IMAGE_EDIT_ENDPOINT,
  referenceImageBase64FromDataUrl,
  referenceImageFileName,
  referenceImageMimeTypeFromDataUrl,
  sanitizedOpenAIImagePayload,
  summarizeOpenAIImageRequest,
  validateOpenAIImageRequest,
  type OpenAIImageQuality,
  type OpenAIImageRequest,
  type OpenAIImageSize
} from "./openai-image-request";

export type ImageGenerationInput = {
  prompt: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  referenceImageUrl?: string;
  size?: OpenAIImageSize;
  quality?: OpenAIImageQuality;
};

export type ImageGenerationOutput = {
  provider: "openai" | "mock" | "curated" | "hybrid";
  mimeType: string;
  bytes?: Buffer;
  dataUri?: string;
  productionReady: boolean;
};

export interface ImageProvider {
  generate(input: ImageGenerationInput): Promise<ImageGenerationOutput>;
}

@Injectable()
export class OpenAIImageProvider implements ImageProvider {
  private readonly logger = new Logger(OpenAIImageProvider.name);

  async generate(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw openAiProviderException("OPENAI_KEY_MISSING", "OpenAI key missing. Configure image generation before creating an AI studio preview.");
    const request = buildOpenAIImageRequest(input);
    const validation = validateOpenAIImageRequest(request);
    if (!validation.valid) {
      this.logger.warn(
        JSON.stringify({
          event: "openai_image_request_validation_failed",
          request: summarizeOpenAIImageRequest(request),
          issues: validation.issues
        })
      );
      const firstIssue = validation.issues[0];
      throw openAiProviderException("OPENAI_IMAGE_REQUEST_INVALID", `OpenAI image request rejected: ${firstIssue ? `${firstIssue.message}${firstIssue.fix ? ` ${firstIssue.fix}` : ""}` : "request payload is invalid"}`, {
        request: summarizeOpenAIImageRequest(request),
        issues: validation.issues
      }, "bad_request");
    }
    const attempts = Math.max(1, Number(process.env.OPENAI_IMAGE_RETRY_ATTEMPTS ?? 2));
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this.requestImage(request, apiKey);
      } catch (error) {
        if (error instanceof BadRequestException || isOpenAINonRetryable(error)) throw error;
        lastError = error;
        if (attempt === attempts) break;
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    }
    if (lastError instanceof ServiceUnavailableException) throw lastError;
    if (lastError instanceof BadRequestException) throw lastError;
    if (lastError instanceof GatewayTimeoutException) throw lastError;
    throw openAiProviderException("OPENAI_REQUEST_FAILED", "OpenAI request failed while creating the AI studio preview.", lastError);
  }

  private async requestImage(request: OpenAIImageRequest, apiKey: string): Promise<ImageGenerationOutput> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.OPENAI_IMAGE_TIMEOUT_MS ?? 120_000));
    try {
      this.logger.log(
        JSON.stringify({
          event: "openai_image_request_started",
          providerSelected: "openai",
          request: sanitizedOpenAIImagePayload(request),
          promptHash: hashForLog(String(request.payload.prompt ?? ""))
        })
      );
      const response = await this.imageRequest(request, apiKey, controller.signal);
      if (!response.ok) throw await openAiResponseException(response, request, this.logger);
      const result = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
      const item = result.data?.[0];
      if (item?.b64_json) return { provider: "openai", mimeType: "image/png", bytes: Buffer.from(item.b64_json, "base64"), productionReady: false };
      if (item?.url) return { provider: "openai", mimeType: "image/png", dataUri: item.url, productionReady: false };
      throw openAiProviderException("OPENAI_REQUEST_FAILED", "OpenAI request failed: no image was returned.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw openAiProviderException("OPENAI_IMAGE_TIMEOUT", "OpenAI image generation timed out before a preview image was returned.", error);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async imageRequest(request: OpenAIImageRequest, apiKey: string, signal: AbortSignal) {
    if (request.endpoint === OPENAI_IMAGE_EDIT_ENDPOINT) {
      const form = new FormData();
      form.append("model", request.model);
      form.append("prompt", String(request.payload.prompt ?? ""));
      form.append("size", request.size);
      form.append("quality", request.quality);
      form.append("n", String(request.payload.n ?? 1));
      const reference = await this.referenceImageBlob(request, signal);
      form.append("image[]", reference.blob, reference.fileName);
      return fetch(request.endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`
        },
        body: form,
        signal
      });
    }
    return fetch(request.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(request.payload),
      signal
    });
  }

  private async referenceImageBlob(request: OpenAIImageRequest, signal: AbortSignal) {
    const referenceImage = request.referenceImage;
    const imageUrl = referenceImage?.imageUrl;
    if (!referenceImage || !imageUrl) throw openAiProviderException("OPENAI_IMAGE_REFERENCE_REQUIRED", "OpenAI image edit request is missing the reference image upload.", { request: summarizeOpenAIImageRequest(request) }, "bad_request");
    if (imageUrl.startsWith("data:")) {
      const mimeType = referenceImageMimeTypeFromDataUrl(imageUrl) ?? referenceImage.mimeType ?? "image/png";
      const base64 = referenceImageBase64FromDataUrl(imageUrl);
      if (!base64) throw openAiProviderException("OPENAI_IMAGE_REFERENCE_INVALID", "OpenAI image edit reference is not a valid base64 data image.", { request: summarizeOpenAIImageRequest(request) }, "bad_request");
      return {
        blob: new Blob([Buffer.from(base64, "base64")], { type: mimeType }),
        fileName: referenceImageFileName(mimeType)
      };
    }
    const response = await fetch(imageUrl, { signal });
    if (!response.ok) {
      throw openAiProviderException("OPENAI_IMAGE_REFERENCE_FETCH_FAILED", `OpenAI image edit reference could not be fetched: HTTP ${response.status}.`, { request: summarizeOpenAIImageRequest(request) }, "bad_request");
    }
    const mimeType = response.headers.get("content-type")?.split(";")[0]?.toLowerCase() || referenceImage.mimeType || "image/png";
    if (!["image/png", "image/jpeg", "image/webp"].includes(mimeType)) {
      throw openAiProviderException("OPENAI_IMAGE_REFERENCE_MIME_UNSUPPORTED", `OpenAI image edit reference returned unsupported MIME type "${mimeType}".`, { request: summarizeOpenAIImageRequest(request) }, "bad_request");
    }
    return {
      blob: new Blob([await response.arrayBuffer()], { type: mimeType }),
      fileName: referenceImageFileName(mimeType)
    };
  }
}

@Injectable()
export class MockImageProvider implements ImageProvider {
  async generate(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    const title = escapeXml(input.prompt.split(/[.,\n]/)[0]?.slice(0, 44) || "Premium concept poster");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#010403"/><stop offset=".48" stop-color="#071017"/><stop offset="1" stop-color="#101019"/></linearGradient>
    <radialGradient id="glow" cx="52%" cy="34%" r="62%"><stop stop-color="#baff00" stop-opacity=".45"/><stop offset=".5" stop-color="#16d7d2" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="16" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="frame" x1="0" x2="1"><stop stop-color="#baff00"/><stop offset=".58" stop-color="#16d7d2"/><stop offset="1" stop-color="#f4c542"/></linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>
  <path d="M0 690 C170 608 325 766 498 678 S820 594 1024 700 L1024 1024 L0 1024Z" fill="#000" opacity=".48"/>
  <g filter="url(#soft)">
    <ellipse cx="512" cy="456" rx="310" ry="108" fill="none" stroke="#16d7d2" stroke-width="5" opacity=".2"/>
    <ellipse cx="512" cy="456" rx="220" ry="74" fill="none" stroke="#baff00" stroke-width="7" opacity=".26"/>
    <path d="M322 824 L404 312 L492 180 L618 288 L736 824 Z" fill="#050b0f" stroke="url(#frame)" stroke-width="12" opacity=".96"/>
    <path d="M452 760 L502 332 L620 764" fill="none" stroke="#baff00" stroke-width="10" opacity=".36"/>
    <path d="M350 262 L206 130 M676 248 L840 116 M512 250 L512 64" stroke="#f4c542" stroke-width="6" stroke-linecap="round" opacity=".28"/>
  </g>
  <rect x="36" y="36" width="952" height="952" rx="42" fill="none" stroke="url(#frame)" stroke-width="6" opacity=".88"/>
  <text x="72" y="838" fill="#baff00" font-size="18" font-family="Arial, sans-serif" font-weight="900">PREMIUM STUDIO</text>
  <text x="72" y="900" fill="#ffffff" font-size="42" font-family="Arial, sans-serif" font-weight="900">${title}</text>
  <text x="72" y="936" fill="#16d7d2" font-size="18" font-family="Arial, sans-serif" font-weight="800">Cinematic faction splash</text>
</svg>`;
    return {
      provider: "mock",
      mimeType: "image/svg+xml",
      dataUri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
      productionReady: false
    };
  }
}

@Injectable()
export class CuratedAssetProvider implements ImageProvider {
  async generate(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    return new MockImageProvider().generate(input);
  }
}

@Injectable()
export class HybridAssetProvider implements ImageProvider {
  constructor(
    @Inject(OpenAIImageProvider) private readonly openai: OpenAIImageProvider,
    @Inject(CuratedAssetProvider) private readonly curated: CuratedAssetProvider
  ) {}

  async generate(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    if ((process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true" && process.env.OPENAI_API_KEY) return this.openai.generate(input);
    return this.curated.generate(input);
  }
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char] ?? char);
}

export async function openAiResponseException(response: Response, request: OpenAIImageRequest, logger = new Logger(OpenAIImageProvider.name)) {
  const body = await response.text().catch(() => "");
  const parsed = safeJson(body);
  const openaiError = openAiErrorDetail(parsed, body);
  logger.error(
    JSON.stringify({
      event: "openai_image_request_failed",
      status: response.status,
      request: sanitizedOpenAIImagePayload(request),
      promptHash: hashForLog(String(request.payload.prompt ?? "")),
      openaiError,
      accountBillingError: isOpenAIBillingIssue(openaiError)
    })
  );
  const reason = openaiError.message || `OpenAI returned HTTP ${response.status}`;
  const billingIssue = isOpenAIBillingIssue(openaiError);
  const moderationIssue = /moderation|content policy|safety|policy|blocked|rejected/i.test(`${response.status} ${reason} ${openaiError.code ?? ""} ${openaiError.type ?? ""}`);
  const unsupportedModel = /unsupported_model|model_not_found|does not exist|unsupported model|invalid model/i.test(`${openaiError.code ?? ""} ${openaiError.type ?? ""} ${reason}`);
  const code = billingIssue ? "OPENAI_BILLING_UNAVAILABLE" : unsupportedModel ? "OPENAI_UNSUPPORTED_MODEL" : moderationIssue ? "OPENAI_PROMPT_REJECTED" : response.status >= 400 && response.status < 500 ? "OPENAI_REQUEST_REJECTED" : "OPENAI_REQUEST_FAILED";
  const publicReason = billingIssue ? `${reason} Add credits, raise the OpenAI billing limit, or use AI_CONCEPT_PROVIDER=premium-fallback until billing is restored.` : unsupportedModel ? `${reason} ${openAIImageConfigFix(request.model)}` : reason;
  const publicMessage = `OpenAI image request rejected: ${publicReason}`;
  return openAiProviderException(code, publicMessage, {
    status: response.status,
    request: summarizeOpenAIImageRequest(request),
    openaiError
  }, billingIssue || response.status === 429 ? "service_unavailable" : response.status >= 400 && response.status < 500 ? "bad_request" : "service_unavailable");
}

function openAiProviderException(code: string, message: string, cause?: unknown, kind?: "bad_request" | "gateway_timeout" | "service_unavailable") {
  const payload = {
    code,
    message,
    details: {
      provider: "openai",
      stage: "ai_concept_image_generation",
      errorClass: cause instanceof Error ? cause.name : cause ? typeof cause : undefined,
      raw: sanitizeProviderDetail(cause)
    }
  };
  if (kind === "bad_request" || code === "OPENAI_PROMPT_REJECTED" || code === "OPENAI_REQUEST_REJECTED" || code === "OPENAI_UNSUPPORTED_MODEL") return new BadRequestException(payload);
  if (kind === "gateway_timeout" || code === "OPENAI_IMAGE_TIMEOUT") return new GatewayTimeoutException(payload);
  return new ServiceUnavailableException(payload);
}

function isOpenAINonRetryable(error: unknown) {
  if (!(error instanceof HttpException)) return false;
  const response = error.getResponse();
  const code = typeof response === "object" && response ? (response as Record<string, unknown>).code : undefined;
  return code === "OPENAI_BILLING_UNAVAILABLE";
}

function isOpenAIBillingIssue(openaiError: { code?: string; type?: string; message?: string }) {
  return /billing|hard limit|quota|credit|insufficient_quota|usage limit|payment required/i.test(`${openaiError.code ?? ""} ${openaiError.type ?? ""} ${openaiError.message ?? ""}`);
}

function safeJson(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function openAiErrorDetail(value: Record<string, unknown> | undefined, body: string) {
  const error = value?.error;
  if (!error || typeof error !== "object") {
    return {
      message: sanitizeOpenAiText(body.slice(0, 500))
    };
  }
  const record = error as Record<string, unknown>;
  return {
    code: typeof record.code === "string" ? sanitizeOpenAiText(record.code) : undefined,
    type: typeof record.type === "string" ? sanitizeOpenAiText(record.type) : undefined,
    message: typeof record.message === "string" ? sanitizeOpenAiText(record.message) : undefined,
    param: typeof record.param === "string" ? sanitizeOpenAiText(record.param) : undefined
  };
}

function sanitizeProviderDetail(value: unknown) {
  if (!value) return undefined;
  if (value instanceof Error) return sanitizeOpenAiText(value.message);
  if (typeof value === "object") return sanitizeOpenAiText(JSON.stringify(value));
  return sanitizeOpenAiText(String(value));
}

function sanitizeOpenAiText(value: string) {
  return value
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-...")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ...")
    .replace(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/gi, "data:image/...;base64,...")
    .replace(/https?:\/\/[^\s"'<>]+/gi, "https://...")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1_000);
}

function hashForLog(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
