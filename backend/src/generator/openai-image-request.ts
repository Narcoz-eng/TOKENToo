export const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-1.5";
export const DEFAULT_OPENAI_IMAGE_SIZE = "1024x1024";
export const DEFAULT_OPENAI_IMAGE_QUALITY = "high";
export const OPENAI_IMAGE_PROMPT_MAX_LENGTH = 32_000;
export const OPENAI_REFERENCE_IMAGE_URL_MAX_LENGTH = 20_971_520;

export const OPENAI_IMAGE_GENERATION_ENDPOINT = "https://api.openai.com/v1/images/generations";
export const OPENAI_IMAGE_EDIT_ENDPOINT = "https://api.openai.com/v1/images/edits";

export const SUPPORTED_OPENAI_IMAGE_MODELS = ["gpt-image-1.5", "gpt-image-2", "gpt-image-2-2026-04-21", "gpt-image-1", "gpt-image-1-mini"] as const;
export const SUPPORTED_OPENAI_IMAGE_SIZES = ["1024x1024", "1024x1536", "1536x1024"] as const;
export const SUPPORTED_OPENAI_IMAGE_QUALITIES = ["low", "medium", "high", "auto"] as const;
export const SUPPORTED_REFERENCE_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export type OpenAIImageModel = (typeof SUPPORTED_OPENAI_IMAGE_MODELS)[number];
export type OpenAIImageSize = (typeof SUPPORTED_OPENAI_IMAGE_SIZES)[number];
export type OpenAIImageQuality = (typeof SUPPORTED_OPENAI_IMAGE_QUALITIES)[number];

export type OpenAIImageRequestInput = {
  prompt: string;
  model?: string;
  size?: string;
  quality?: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  referenceImageUrl?: string;
};

export type OpenAIImageRequest = {
  endpoint: typeof OPENAI_IMAGE_GENERATION_ENDPOINT | typeof OPENAI_IMAGE_EDIT_ENDPOINT;
  payload: Record<string, unknown>;
  model: string;
  size: string;
  quality: string;
  promptLength: number;
  requestFields: string[];
  imageReferenceFields: string[];
  referenceImageBase64Present: boolean;
  referenceImageUrlPresent: boolean;
  referenceImageMimeType?: string;
};

export type OpenAIImageRequestIssue = {
  code: string;
  field: string;
  message: string;
  fix?: string;
};

export type OpenAIImageRequestValidation = {
  valid: boolean;
  issues: OpenAIImageRequestIssue[];
};

export function resolveOpenAIImageModel() {
  return (process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_OPENAI_IMAGE_MODEL) as string;
}

export function resolveOpenAIImageQuality() {
  return (process.env.OPENAI_IMAGE_QUALITY?.trim() || DEFAULT_OPENAI_IMAGE_QUALITY) as string;
}

export function buildOpenAIImageRequest(input: OpenAIImageRequestInput): OpenAIImageRequest {
  const model = input.model?.trim() || resolveOpenAIImageModel();
  const size = input.size?.trim() || DEFAULT_OPENAI_IMAGE_SIZE;
  const quality = input.quality?.trim() || resolveOpenAIImageQuality();
  const prompt = input.prompt ?? "";
  const reference = referenceImage(input);
  const payload = reference
    ? {
        model,
        prompt,
        size,
        quality,
        n: 1,
        images: [{ image_url: reference.imageUrl }]
      }
    : {
        model,
        prompt,
        size,
        quality,
        n: 1
      };

  return {
    endpoint: reference ? OPENAI_IMAGE_EDIT_ENDPOINT : OPENAI_IMAGE_GENERATION_ENDPOINT,
    payload,
    model,
    size,
    quality,
    promptLength: prompt.length,
    requestFields: Object.keys(payload),
    imageReferenceFields: reference ? ["image_url"] : [],
    referenceImageBase64Present: Boolean(input.referenceImageBase64),
    referenceImageUrlPresent: Boolean(input.referenceImageUrl?.trim()),
    referenceImageMimeType: reference?.mimeType ?? input.referenceImageMimeType
  };
}

export function validateOpenAIImageRequest(request: OpenAIImageRequest): OpenAIImageRequestValidation {
  const issues: OpenAIImageRequestIssue[] = [];
  if (!isSupportedModel(request.model)) {
    issues.push({
      code: "OPENAI_IMAGE_MODEL_UNSUPPORTED",
      field: "model",
      message: `Unsupported OpenAI image model "${request.model}".`,
      fix: `Set OPENAI_IMAGE_MODEL=${DEFAULT_OPENAI_IMAGE_MODEL} or one of: ${SUPPORTED_OPENAI_IMAGE_MODELS.join(", ")}.`
    });
  }
  if (!isSupportedSize(request.model, request.size)) {
    issues.push({
      code: "OPENAI_IMAGE_SIZE_UNSUPPORTED",
      field: "size",
      message: `Unsupported OpenAI image size "${request.size}".`,
      fix: isFlexibleSizeModel(request.model) ? "Use WIDTHxHEIGHT with both dimensions divisible by 16, aspect ratio between 1:3 and 3:1, and maximum 3840x2160." : `Use one of: ${SUPPORTED_OPENAI_IMAGE_SIZES.join(", ")}.`
    });
  }
  if (!isSupportedQuality(request.quality)) {
    issues.push({
      code: "OPENAI_IMAGE_QUALITY_UNSUPPORTED",
      field: "quality",
      message: `Unsupported OpenAI image quality "${request.quality}".`,
      fix: `Use one of: ${SUPPORTED_OPENAI_IMAGE_QUALITIES.join(", ")}.`
    });
  }
  if (!request.payload.prompt || typeof request.payload.prompt !== "string") {
    issues.push({
      code: "OPENAI_IMAGE_PROMPT_REQUIRED",
      field: "prompt",
      message: "Image prompt is required."
    });
  } else if (request.promptLength > OPENAI_IMAGE_PROMPT_MAX_LENGTH) {
    issues.push({
      code: "OPENAI_IMAGE_PROMPT_TOO_LONG",
      field: "prompt",
      message: `Image prompt is ${request.promptLength} characters; maximum is ${OPENAI_IMAGE_PROMPT_MAX_LENGTH}.`,
      fix: "Shorten the generated AI concept prompt before calling OpenAI."
    });
  }
  for (const field of ["model", "prompt", "size", "quality", "n"]) {
    if (!(field in request.payload)) {
      issues.push({
        code: "OPENAI_IMAGE_REQUIRED_FIELD_MISSING",
        field,
        message: `OpenAI image request is missing required field "${field}".`
      });
    }
  }
  if (request.endpoint === OPENAI_IMAGE_EDIT_ENDPOINT) {
    const images = request.payload.images;
    if (!Array.isArray(images) || !images.length) {
      issues.push({
        code: "OPENAI_IMAGE_REFERENCE_REQUIRED",
        field: "images",
        message: "Image edit requests require an images array."
      });
    } else {
      const first = images[0] as Record<string, unknown>;
      const imageUrl = first.image_url;
      if (typeof imageUrl !== "string" || !isValidReferenceImageUrl(imageUrl)) {
        issues.push({
          code: "OPENAI_IMAGE_REFERENCE_URL_INVALID",
          field: "images[0].image_url",
          message: "Reference image must be an absolute http(s) URL or a base64 data:image URL.",
          fix: "Use a publicly reachable https logo URL, upload a data:image reference, or omit the reference image."
        });
      }
      if (typeof imageUrl === "string" && imageUrl.length > OPENAI_REFERENCE_IMAGE_URL_MAX_LENGTH) {
        issues.push({
          code: "OPENAI_IMAGE_REFERENCE_URL_TOO_LONG",
          field: "images[0].image_url",
          message: "Reference image URL/data URL is too large for the OpenAI Images API.",
          fix: "Use a smaller reference image."
        });
      }
    }
    if (request.referenceImageMimeType && !isSupportedReferenceMimeType(request.referenceImageMimeType)) {
      issues.push({
        code: "OPENAI_IMAGE_REFERENCE_MIME_UNSUPPORTED",
        field: "referenceImageMimeType",
        message: `Unsupported reference image MIME type "${request.referenceImageMimeType}".`,
        fix: `Use one of: ${SUPPORTED_REFERENCE_IMAGE_MIME_TYPES.join(", ")}.`
      });
    }
  }
  return { valid: issues.length === 0, issues };
}

export function summarizeOpenAIImageRequest(request: OpenAIImageRequest) {
  return {
    endpoint: request.endpoint,
    model: request.model,
    size: request.size,
    quality: request.quality,
    requestFields: request.requestFields,
    imageReferenceFields: request.imageReferenceFields,
    promptLength: request.promptLength,
    referenceImageBase64Present: request.referenceImageBase64Present,
    referenceImageUrlPresent: request.referenceImageUrlPresent,
    referenceImageMimeType: request.referenceImageMimeType
  };
}

export function sanitizedOpenAIImagePayload(request: OpenAIImageRequest) {
  return {
    ...summarizeOpenAIImageRequest(request),
    n: request.payload.n,
    imagesCount: Array.isArray(request.payload.images) ? request.payload.images.length : 0
  };
}

export function openAIImageConfigFix(model = resolveOpenAIImageModel()) {
  return `Set OPENAI_IMAGE_MODEL=${DEFAULT_OPENAI_IMAGE_MODEL} in the backend environment and restart the backend. Current value: ${model}.`;
}

function referenceImage(input: OpenAIImageRequestInput) {
  const url = input.referenceImageUrl?.trim();
  if (input.referenceImageBase64) {
    const mimeType = input.referenceImageMimeType?.trim() || "image/png";
    return { imageUrl: `data:${mimeType};base64,${input.referenceImageBase64}`, mimeType };
  }
  if (url) return { imageUrl: url, mimeType: undefined };
  return undefined;
}

function isSupportedModel(value: string): value is OpenAIImageModel {
  return (SUPPORTED_OPENAI_IMAGE_MODELS as readonly string[]).includes(value);
}

function isSupportedSize(model: string, value: string) {
  return (SUPPORTED_OPENAI_IMAGE_SIZES as readonly string[]).includes(value) || (isFlexibleSizeModel(model) && isValidFlexibleImageSize(value));
}

function isSupportedQuality(value: string): value is OpenAIImageQuality {
  return (SUPPORTED_OPENAI_IMAGE_QUALITIES as readonly string[]).includes(value);
}

function isSupportedReferenceMimeType(value: string) {
  return (SUPPORTED_REFERENCE_IMAGE_MIME_TYPES as readonly string[]).includes(value.toLowerCase());
}

function isFlexibleSizeModel(model: string) {
  return model === "gpt-image-2" || model === "gpt-image-2-2026-04-21";
}

function isValidFlexibleImageSize(value: string) {
  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match) return false;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) return false;
  if (width % 16 !== 0 || height % 16 !== 0) return false;
  if (width > 3840 || height > 2160) return false;
  const ratio = width / height;
  return ratio >= 1 / 3 && ratio <= 3;
}

function isValidReferenceImageUrl(value: string) {
  if (/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=\s]+$/i.test(value)) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
