import { Injectable, Logger } from "@nestjs/common";
import type { GeneratedStyleProfile, StudioGenerationType, StyleBiblePlan } from "./generator.types";

export type GeminiStudioPromptErrorCode =
  | "GEMINI_KEY_MISSING"
  | "GEMINI_DISABLED"
  | "GEMINI_REQUEST_FAILED"
  | "GEMINI_QUOTA_EXCEEDED"
  | "GEMINI_MODEL_UNSUPPORTED"
  | "GEMINI_TIMEOUT";

export class GeminiStudioPromptError extends Error {
  constructor(
    readonly code: GeminiStudioPromptErrorCode,
    message: string,
    readonly details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "GeminiStudioPromptError";
  }
}

export type GeminiPromptRequest = {
  key: string;
  generationType: StudioGenerationType;
  basePrompt: string;
};

export type StudioPromptGenerationResult = {
  prompts: Record<string, string>;
  provider: "gemini-text" | "local-prompt-pack";
  model: string;
  branch: string;
  fallbackReason?: string;
};

type GenerateStudioPromptsInput = {
  style: GeneratedStyleProfile;
  plan: StyleBiblePlan;
  requests: GeminiPromptRequest[];
  model: string;
  apiKey?: string;
  timeoutMs?: number;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

@Injectable()
export class GeminiStudioPromptProviderService {
  private readonly logger = new Logger(GeminiStudioPromptProviderService.name);

  async generateStudioPrompts(input: GenerateStudioPromptsInput): Promise<StudioPromptGenerationResult> {
    const apiKey = input.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? process.env.IMAGEN_API_KEY;
    if (!apiKey) {
      throw new GeminiStudioPromptError("GEMINI_KEY_MISSING", "GEMINI_KEY_MISSING", {
        model: input.model
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? Number(process.env.GEMINI_TEXT_TIMEOUT_MS ?? 30_000));
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: this.prompt(input) }]
            }
          ],
          generationConfig: {
            temperature: Number(process.env.GEMINI_TEXT_TEMPERATURE ?? 0.35),
            responseMimeType: "application/json"
          }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const body = (await response.text().catch(() => "")).slice(0, 1000);
        const error = this.errorForResponse(response.status, body, input.model);
        this.logger.warn(
          JSON.stringify({
            event: "gemini_studio_prompt_request_failed",
            code: error.code,
            status: response.status,
            model: input.model,
            body
          })
        );
        throw error;
      }

      const payload = (await response.json()) as GeminiGenerateContentResponse;
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();
      const prompts = this.parsePromptJson(text ?? "", input.requests);
      return {
        prompts,
        provider: "gemini-text",
        model: input.model,
        branch: "gemini-text-generated"
      };
    } catch (error) {
      if (error instanceof GeminiStudioPromptError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new GeminiStudioPromptError("GEMINI_TIMEOUT", "GEMINI_TIMEOUT", { model: input.model });
      }
      const name = error instanceof Error ? error.name : typeof error;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        JSON.stringify({
          event: "gemini_studio_prompt_request_error",
          model: input.model,
          errorClass: name,
          message
        })
      );
      throw new GeminiStudioPromptError("GEMINI_REQUEST_FAILED", "GEMINI_REQUEST_FAILED", {
        model: input.model,
        errorClass: name,
        raw: message
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private prompt(input: GenerateStudioPromptsInput) {
    return [
      "You are the Gemini text planning model for an NFT Studio Bible workflow.",
      "Return only valid JSON. Do not include markdown.",
      "Use the provided Creative DNA and base prompts to write production-grade art-direction prompts for Imagen 4 Fast Generate.",
      "The image output is art direction only: no transparent layer claims, no mint-ready approval, no wireframe concept, no placeholder grids.",
      "Each prompt must ask for one complete raster sheet with readable labels and hand-directed artist-sheet texture.",
      "",
      JSON.stringify({
        collection: input.style.collection,
        tokenSymbol: input.style.brandDna?.tokenSymbol,
        theme: input.style.theme,
        mascot: input.style.mascot,
        artStyle: input.style.artStyle,
        palette: input.style.colors,
        world: input.style.backgroundWorld,
        traitLanguage: input.style.traitLanguage,
        rarityStructure: input.style.rarityStructure,
        creativeDna: input.style.creativeUniverse?.creativeDna ?? input.style.creativeUniverse,
        artTeam: input.plan.artTeam,
        requests: input.requests
      })
    ].join("\n");
  }

  private parsePromptJson(text: string, requests: GeminiPromptRequest[]) {
    const json = text
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
    const parsed = JSON.parse(json) as Record<string, unknown> & { prompts?: Record<string, unknown> };
    const source: Record<string, unknown> = parsed.prompts && typeof parsed.prompts === "object" ? parsed.prompts : parsed;
    const prompts: Record<string, string> = {};
    for (const request of requests) {
      const value = source[request.key];
      if (typeof value !== "string" || !value.trim()) {
        throw new GeminiStudioPromptError("GEMINI_REQUEST_FAILED", "GEMINI_REQUEST_FAILED", {
          model: "unknown",
          reason: "missing_prompt_key",
          promptKey: request.key
        });
      }
      prompts[request.key] = value.trim();
    }
    return prompts;
  }

  private errorForResponse(status: number, body: string, model: string) {
    const lower = body.toLowerCase();
    if (status === 429 || /quota|rate limit|resource exhausted/.test(lower)) {
      return new GeminiStudioPromptError("GEMINI_QUOTA_EXCEEDED", "GEMINI_QUOTA_EXCEEDED", { status, model });
    }
    if (status === 400 || status === 404 || /unsupported|not supported|not found|model/.test(lower)) {
      return new GeminiStudioPromptError("GEMINI_MODEL_UNSUPPORTED", "GEMINI_MODEL_UNSUPPORTED", { status, model });
    }
    return new GeminiStudioPromptError("GEMINI_REQUEST_FAILED", "GEMINI_REQUEST_FAILED", { status, model });
  }
}
