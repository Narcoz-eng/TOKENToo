export const DEFAULT_IMAGEN_MODEL = "imagen-4.0-fast-generate-001";
export const DEFAULT_GEMINI_TEXT_MODEL = "gemini-2.5-flash";

export const SUPPORTED_IMAGEN_MODELS = [
  "imagen-4.0-fast-generate-001",
  "imagen-4.0-generate-001",
  "imagen-4.0-ultra-generate-001",
  "imagen-3.0-generate-002"
] as const;

export const IMAGEN_STUDIO_BIBLE_FALLBACK_CHAIN = [
  "imagen-4.0-fast-generate-001",
  "imagen-4.0-generate-001",
  "imagen-3.0-generate-002"
] as const satisfies readonly SupportedImagenModel[];

export const SUPPORTED_GEMINI_TEXT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash"
] as const;

export type SupportedImagenModel = (typeof SUPPORTED_IMAGEN_MODELS)[number];
export type SupportedGeminiTextModel = (typeof SUPPORTED_GEMINI_TEXT_MODELS)[number];

type ImagenModelNormalization =
  | {
      ok: true;
      model: SupportedImagenModel;
      rawModel: string;
      normalized: boolean;
    }
  | {
      ok: false;
      rawModel: string;
      code: "IMAGEN_MODEL_UNSUPPORTED";
      supportedModels: readonly SupportedImagenModel[];
    };

const IMAGEN_MODEL_NORMALIZATION_MAP: Record<string, SupportedImagenModel> = {
  "imagen-4.0-fast-generate-001": "imagen-4.0-fast-generate-001",
  "imagen-4-fast-generate-001": "imagen-4.0-fast-generate-001",
  "imagen-4.0-fast-generate": "imagen-4.0-fast-generate-001",
  "imagen-4-fast-generate": "imagen-4.0-fast-generate-001",
  "imagen-4.0-fast": "imagen-4.0-fast-generate-001",
  "imagen-4-fast": "imagen-4.0-fast-generate-001",
  "imagen-fast": "imagen-4.0-fast-generate-001",
  "imagen-4.0-generate-001": "imagen-4.0-generate-001",
  "imagen-4-generate-001": "imagen-4.0-generate-001",
  "imagen-4.0-generate": "imagen-4.0-generate-001",
  "imagen-4-generate": "imagen-4.0-generate-001",
  "imagen-4.0": "imagen-4.0-generate-001",
  "imagen-4": "imagen-4.0-generate-001",
  "imagen-4.0-ultra-generate-001": "imagen-4.0-ultra-generate-001",
  "imagen-4-ultra-generate-001": "imagen-4.0-ultra-generate-001",
  "imagen-4.0-ultra-generate": "imagen-4.0-ultra-generate-001",
  "imagen-4-ultra-generate": "imagen-4.0-ultra-generate-001",
  "imagen-4.0-ultra": "imagen-4.0-ultra-generate-001",
  "imagen-4-ultra": "imagen-4.0-ultra-generate-001",
  "imagen-ultra": "imagen-4.0-ultra-generate-001",
  "imagen-3.0-generate-002": "imagen-3.0-generate-002",
  "imagen-3-generate-002": "imagen-3.0-generate-002",
  "imagen-3.0-generate": "imagen-3.0-generate-002",
  "imagen-3-generate": "imagen-3.0-generate-002",
  "imagen-3.0": "imagen-3.0-generate-002",
  "imagen-3": "imagen-3.0-generate-002"
};

export function normalizeImagenModel(value?: string | null): ImagenModelNormalization {
  const rawModel = (value?.trim() || DEFAULT_IMAGEN_MODEL).replace(/^["']|["']$/g, "");
  const normalizedKey = stripModelPrefix(rawModel).toLowerCase();
  const model = IMAGEN_MODEL_NORMALIZATION_MAP[normalizedKey];
  if (!model) {
    return {
      ok: false,
      rawModel,
      code: "IMAGEN_MODEL_UNSUPPORTED",
      supportedModels: SUPPORTED_IMAGEN_MODELS
    };
  }
  return {
    ok: true,
    model,
    rawModel,
    normalized: model !== rawModel
  };
}

export function normalizeGeminiTextModel(value?: string | null) {
  const rawModel = (value?.trim() || DEFAULT_GEMINI_TEXT_MODEL).replace(/^["']|["']$/g, "");
  const normalized = stripModelPrefix(rawModel).toLowerCase();
  if ((SUPPORTED_GEMINI_TEXT_MODELS as readonly string[]).includes(normalized)) {
    return {
      ok: true as const,
      model: normalized as SupportedGeminiTextModel,
      rawModel,
      normalized: normalized !== rawModel
    };
  }
  return {
    ok: false as const,
    rawModel,
    code: "GEMINI_MODEL_UNSUPPORTED" as const,
    supportedModels: SUPPORTED_GEMINI_TEXT_MODELS
  };
}

function stripModelPrefix(value: string) {
  try {
    return decodeURIComponent(value).replace(/^models\//i, "");
  } catch {
    return value.replace(/^models\//i, "");
  }
}
