import { BadRequestException, GatewayTimeoutException, Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";

export type ImageGenerationInput = {
  prompt: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024";
  quality?: "low" | "medium" | "high";
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
  async generate(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw openAiProviderException("OPENAI_KEY_MISSING", "OpenAI key missing. Configure image generation before creating an AI concept preview.");
    const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5";
    const attempts = Math.max(1, Number(process.env.OPENAI_IMAGE_RETRY_ATTEMPTS ?? 2));
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this.requestImage({ ...input, model, apiKey });
      } catch (error) {
        lastError = error;
        if (attempt === attempts) break;
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    }
    if (lastError instanceof ServiceUnavailableException) throw lastError;
    if (lastError instanceof BadRequestException) throw lastError;
    if (lastError instanceof GatewayTimeoutException) throw lastError;
    throw openAiProviderException("OPENAI_REQUEST_FAILED", "OpenAI request failed while creating the AI concept preview.", lastError);
  }

  private async requestImage(input: ImageGenerationInput & { apiKey: string; model: string }): Promise<ImageGenerationOutput> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.OPENAI_IMAGE_TIMEOUT_MS ?? 120_000));
    try {
      const response = input.referenceImageBase64 ? await this.editRequest(input, controller.signal) : await this.generationRequest(input, controller.signal);
      if (!response.ok) throw await openAiResponseException(response);
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

  private generationRequest(input: ImageGenerationInput & { apiKey: string; model: string }, signal: AbortSignal) {
    return fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: input.model,
        prompt: input.prompt,
        size: input.size ?? "1024x1024",
        quality: input.quality ?? process.env.OPENAI_IMAGE_QUALITY ?? "high",
        n: 1
      }),
      signal
    });
  }

  private editRequest(input: ImageGenerationInput & { apiKey: string; model: string }, signal: AbortSignal) {
    const mimeType = input.referenceImageMimeType ?? "image/png";
    const bytes = Buffer.from(input.referenceImageBase64 ?? "", "base64");
    const form = new FormData();
    form.append("model", input.model);
    form.append("prompt", input.prompt);
    form.append("size", input.size ?? "1024x1024");
    form.append("quality", input.quality ?? process.env.OPENAI_IMAGE_QUALITY ?? "high");
    form.append("n", "1");
    form.append("image", new Blob([bytes], { type: mimeType }), `reference.${mimeType.includes("jpeg") ? "jpg" : "png"}`);
    return fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { authorization: `Bearer ${input.apiKey}` },
      body: form,
      signal
    });
  }
}

@Injectable()
export class MockImageProvider implements ImageProvider {
  async generate(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    const title = escapeXml(input.prompt.split(/[.,\n]/)[0]?.slice(0, 42) || "Phew.run preview");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="72%"><stop offset="0" stop-color="#16d7d2" stop-opacity=".75"/><stop offset=".42" stop-color="#baff00" stop-opacity=".22"/><stop offset="1" stop-color="#05070f"/></radialGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="18" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="frame" x1="0" x2="1"><stop stop-color="#baff00"/><stop offset=".6" stop-color="#16d7d2"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <path d="M140 760 260 360 420 700 570 240 720 710 860 430 930 760Z" fill="#06131a" opacity=".72"/>
  <circle cx="512" cy="470" r="245" fill="#baff00" opacity=".14" filter="url(#glow)"/>
  <path d="M322 400 Q350 218 512 246 Q674 218 702 400 Q734 640 512 780 Q290 640 322 400Z" fill="#0a1620" stroke="#baff00" stroke-width="14" filter="url(#glow)"/>
  <circle cx="430" cy="445" r="54" fill="#d8ffd8" stroke="#05070f" stroke-width="10"/>
  <circle cx="594" cy="445" r="54" fill="#d8ffd8" stroke="#05070f" stroke-width="10"/>
  <circle cx="430" cy="445" r="20" fill="#05070f"/>
  <circle cx="594" cy="445" r="20" fill="#05070f"/>
  <path d="M392 592 Q512 660 632 592" fill="none" stroke="#16d7d2" stroke-width="18" stroke-linecap="round"/>
  <rect x="36" y="36" width="952" height="952" rx="42" fill="none" stroke="url(#frame)" stroke-width="6" opacity=".88"/>
  <text x="80" y="900" fill="#ffffff" font-size="42" font-family="Arial, sans-serif" font-weight="900">${title}</text>
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

async function openAiResponseException(response: Response) {
  const body = await response.text().catch(() => "");
  const parsed = safeJson(body);
  const message = openAiErrorText(parsed) || body.slice(0, 240);
  const moderationIssue = /moderation|content policy|safety|policy|blocked|rejected/i.test(`${response.status} ${message}`);
  const code = moderationIssue ? "OPENAI_PROMPT_REJECTED" : "OPENAI_REQUEST_FAILED";
  const publicMessage = moderationIssue
    ? "OpenAI rejected the image prompt or moderation policy."
    : `OpenAI request failed while creating the AI concept preview (${response.status}).`;
  return openAiProviderException(code, publicMessage, { status: response.status, message });
}

function openAiProviderException(code: string, message: string, cause?: unknown) {
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
  if (code === "OPENAI_PROMPT_REJECTED") return new BadRequestException(payload);
  if (code === "OPENAI_IMAGE_TIMEOUT") return new GatewayTimeoutException(payload);
  return new ServiceUnavailableException(payload);
}

function safeJson(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function openAiErrorText(value?: Record<string, unknown>) {
  const error = value?.error;
  if (!error || typeof error !== "object") return undefined;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" ? message : undefined;
}

function sanitizeProviderDetail(value: unknown) {
  if (!value) return undefined;
  if (value instanceof Error) return value.message.replace(/sk-[A-Za-z0-9_-]+/g, "sk-...");
  if (typeof value === "object") return JSON.stringify(value).replace(/sk-[A-Za-z0-9_-]+/g, "sk-...").slice(0, 500);
  return String(value).replace(/sk-[A-Za-z0-9_-]+/g, "sk-...").slice(0, 500);
}
