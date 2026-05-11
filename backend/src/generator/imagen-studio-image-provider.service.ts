import { Injectable, Logger } from "@nestjs/common";
import { normalizeImagenModel } from "./imagen-models";
import type { StudioGenerationType } from "./generator.types";

export type ImagenStudioErrorCode =
  | "IMAGEN_KEY_MISSING"
  | "IMAGEN_DISABLED"
  | "IMAGEN_REQUEST_FAILED"
  | "IMAGEN_QUOTA_EXCEEDED"
  | "IMAGEN_MODEL_UNSUPPORTED"
  | "IMAGEN_TIMEOUT";

export class ImagenStudioImageError extends Error {
  constructor(
    readonly code: ImagenStudioErrorCode,
    message: string,
    readonly details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "ImagenStudioImageError";
  }
}

type ImagenPredictResponse = {
  predictions?: Array<{
    bytesBase64Encoded?: string;
    mimeType?: string;
    image?: {
      imageBytes?: string;
      bytesBase64Encoded?: string;
      mimeType?: string;
    };
  }>;
  generatedImages?: Array<{
    image?: {
      imageBytes?: string;
      mimeType?: string;
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
export class ImagenStudioImageProviderService {
  private readonly logger = new Logger(ImagenStudioImageProviderService.name);

  async generateStudioBible(input: GenerateStudioBibleInput) {
    const model = normalizeImagenModel(input.model);
    if (!model.ok) {
      throw new ImagenStudioImageError("IMAGEN_MODEL_UNSUPPORTED", "IMAGEN_MODEL_UNSUPPORTED", {
        generationType: input.generationType,
        studioCacheKey: input.studioCacheKey,
        model: input.model,
        supportedModels: model.supportedModels
      });
    }
    const apiKey = input.apiKey ?? process.env.IMAGEN_API_KEY ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new ImagenStudioImageError("IMAGEN_KEY_MISSING", "IMAGEN_KEY_MISSING", {
        generationType: input.generationType,
        studioCacheKey: input.studioCacheKey
      });
    }

    const controller = new AbortController();
    const abortFromParent = () => controller.abort(input.signal?.reason);
    if (input.signal?.aborted) abortFromParent();
    else input.signal?.addEventListener("abort", abortFromParent, { once: true });
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? Number(process.env.IMAGEN_IMAGE_TIMEOUT_MS ?? 90_000));

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.model)}:predict`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          instances: [{ prompt: input.prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: process.env.IMAGEN_ASPECT_RATIO ?? "1:1",
            personGeneration: process.env.IMAGEN_PERSON_GENERATION ?? "allow_adult"
          }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const body = (await response.text().catch(() => "")).slice(0, 1000);
        const error = this.errorForResponse(response.status, body, input);
        this.logger.warn(
          JSON.stringify({
            event: "imagen_studio_image_request_failed",
            code: error.code,
            status: response.status,
            generationType: input.generationType,
            studioCacheKey: input.studioCacheKey,
            model: model.model,
            body
          })
        );
        throw error;
      }

      const payload = (await response.json()) as ImagenPredictResponse;
      const image = this.extractImage(payload);
      if (!image?.data) {
        throw new ImagenStudioImageError("IMAGEN_REQUEST_FAILED", "IMAGEN_REQUEST_FAILED", {
          generationType: input.generationType,
          studioCacheKey: input.studioCacheKey,
          model: model.model,
          reason: "missing_imagen_image_bytes"
        });
      }
      return {
        uri: `data:${image.mimeType ?? "image/png"};base64,${image.data}`,
        mimeType: image.mimeType ?? "image/png",
        model: model.model
      };
    } catch (error) {
      if (error instanceof ImagenStudioImageError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ImagenStudioImageError("IMAGEN_TIMEOUT", "IMAGEN_TIMEOUT", {
          generationType: input.generationType,
          studioCacheKey: input.studioCacheKey,
          model: model.model
        });
      }
      const name = error instanceof Error ? error.name : typeof error;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        JSON.stringify({
          event: "imagen_studio_image_request_error",
          generationType: input.generationType,
          studioCacheKey: input.studioCacheKey,
          model: input.model,
          normalizedModel: model.model,
          errorClass: name,
          message
        })
      );
      throw new ImagenStudioImageError("IMAGEN_REQUEST_FAILED", "IMAGEN_REQUEST_FAILED", {
        generationType: input.generationType,
        studioCacheKey: input.studioCacheKey,
        model: model.model,
        errorClass: name,
        raw: message
      });
    } finally {
      input.signal?.removeEventListener("abort", abortFromParent);
      clearTimeout(timeout);
    }
  }

  private extractImage(payload: ImagenPredictResponse) {
    const prediction = payload.predictions?.[0];
    if (prediction?.bytesBase64Encoded) return { data: prediction.bytesBase64Encoded, mimeType: prediction.mimeType };
    if (prediction?.image?.imageBytes) return { data: prediction.image.imageBytes, mimeType: prediction.image.mimeType ?? prediction.mimeType };
    if (prediction?.image?.bytesBase64Encoded) return { data: prediction.image.bytesBase64Encoded, mimeType: prediction.image.mimeType ?? prediction.mimeType };
    const generated = payload.generatedImages?.[0]?.image;
    if (generated?.imageBytes) return { data: generated.imageBytes, mimeType: generated.mimeType };
    return undefined;
  }

  private errorForResponse(status: number, body: string, input: GenerateStudioBibleInput) {
    const lower = body.toLowerCase();
    if (status === 429 || /quota|rate limit|resource exhausted|paid plan|upgrade|billing|payment/.test(lower)) {
      return new ImagenStudioImageError("IMAGEN_QUOTA_EXCEEDED", "IMAGEN_QUOTA_EXCEEDED", {
        status,
        generationType: input.generationType,
        studioCacheKey: input.studioCacheKey,
        model: input.model
      });
    }
    if (status === 400 || status === 404 || /unsupported|not supported|not found|model/.test(lower)) {
      return new ImagenStudioImageError("IMAGEN_MODEL_UNSUPPORTED", "IMAGEN_MODEL_UNSUPPORTED", {
        status,
        generationType: input.generationType,
        studioCacheKey: input.studioCacheKey,
        model: input.model
      });
    }
    return new ImagenStudioImageError("IMAGEN_REQUEST_FAILED", "IMAGEN_REQUEST_FAILED", {
      status,
      generationType: input.generationType,
      studioCacheKey: input.studioCacheKey,
      model: input.model
    });
  }
}
