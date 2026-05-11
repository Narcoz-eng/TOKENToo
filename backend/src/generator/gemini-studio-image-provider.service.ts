import { Injectable, Logger } from "@nestjs/common";
import type { StudioGenerationType } from "./generator.types";

export type GeminiStudioErrorCode =
  | "GEMINI_KEY_MISSING"
  | "GEMINI_DISABLED"
  | "GEMINI_REQUEST_FAILED"
  | "GEMINI_QUOTA_EXCEEDED"
  | "GEMINI_MODEL_UNSUPPORTED"
  | "GEMINI_TIMEOUT";

export class GeminiStudioImageError extends Error {
  constructor(
    readonly code: GeminiStudioErrorCode,
    message: string,
    readonly details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "GeminiStudioImageError";
  }
}

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

type GenerateStudioBibleInput = {
  prompt: string;
  generationType: StudioGenerationType;
  studioCacheKey: string;
  model: string;
  apiKey?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
};

@Injectable()
export class GeminiStudioImageProviderService {
  private readonly logger = new Logger(GeminiStudioImageProviderService.name);

  async generateStudioBible(input: GenerateStudioBibleInput) {
    const apiKey = input.apiKey ?? process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new GeminiStudioImageError("GEMINI_KEY_MISSING", "GEMINI_KEY_MISSING", {
        generationType: input.generationType,
        studioCacheKey: input.studioCacheKey
      });
    }

    const controller = new AbortController();
    const abortFromParent = () => controller.abort(input.signal?.reason);
    if (input.signal?.aborted) abortFromParent();
    else input.signal?.addEventListener("abort", abortFromParent, { once: true });
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? Number(process.env.GEMINI_IMAGE_TIMEOUT_MS ?? 90_000));
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: input.prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const body = (await response.text().catch(() => "")).slice(0, 1000);
        const error = this.errorForResponse(response.status, body, input);
        this.logger.warn(
          JSON.stringify({
            event: "gemini_studio_image_request_failed",
            code: error.code,
            status: response.status,
            generationType: input.generationType,
            studioCacheKey: input.studioCacheKey,
            model: input.model,
            body
          })
        );
        throw error;
      }

      const payload = (await response.json()) as GeminiResponse;
      const image = payload.candidates?.flatMap((candidate) => candidate.content?.parts ?? []).find((part) => part.inlineData?.data)?.inlineData;
      if (!image?.data) {
        throw new GeminiStudioImageError("GEMINI_REQUEST_FAILED", "GEMINI_REQUEST_FAILED", {
          generationType: input.generationType,
          studioCacheKey: input.studioCacheKey,
          model: input.model,
          reason: "missing_inline_image"
        });
      }
      return { uri: `data:${image.mimeType ?? "image/png"};base64,${image.data}` };
    } catch (error) {
      if (error instanceof GeminiStudioImageError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new GeminiStudioImageError("GEMINI_TIMEOUT", "GEMINI_TIMEOUT", {
          generationType: input.generationType,
          studioCacheKey: input.studioCacheKey,
          model: input.model
        });
      }
      const name = error instanceof Error ? error.name : typeof error;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        JSON.stringify({
          event: "gemini_studio_image_request_error",
          generationType: input.generationType,
          studioCacheKey: input.studioCacheKey,
          model: input.model,
          errorClass: name,
          message
        })
      );
      throw new GeminiStudioImageError("GEMINI_REQUEST_FAILED", "GEMINI_REQUEST_FAILED", {
        generationType: input.generationType,
        studioCacheKey: input.studioCacheKey,
        model: input.model,
        errorClass: name,
        raw: message
      });
    } finally {
      input.signal?.removeEventListener("abort", abortFromParent);
      clearTimeout(timeout);
    }
  }

  private errorForResponse(status: number, body: string, input: GenerateStudioBibleInput) {
    const lower = body.toLowerCase();
    if (status === 429 || /quota|rate limit|resource exhausted/.test(lower)) {
      return new GeminiStudioImageError("GEMINI_QUOTA_EXCEEDED", "GEMINI_QUOTA_EXCEEDED", {
        status,
        generationType: input.generationType,
        studioCacheKey: input.studioCacheKey,
        model: input.model
      });
    }
    if (status === 400 || status === 404 || /unsupported|not supported|not found|model/.test(lower)) {
      return new GeminiStudioImageError("GEMINI_MODEL_UNSUPPORTED", "GEMINI_MODEL_UNSUPPORTED", {
        status,
        generationType: input.generationType,
        studioCacheKey: input.studioCacheKey,
        model: input.model
      });
    }
    return new GeminiStudioImageError("GEMINI_REQUEST_FAILED", "GEMINI_REQUEST_FAILED", {
      status,
      generationType: input.generationType,
      studioCacheKey: input.studioCacheKey,
      model: input.model
    });
  }
}
