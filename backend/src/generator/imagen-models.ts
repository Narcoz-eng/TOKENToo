export const DEFAULT_IMAGEN_MODEL = "imagen-4.0-fast-generate-001";

export const SUPPORTED_IMAGEN_MODELS = [
  "imagen-4.0-fast-generate-001",
  "imagen-4.0-generate-001",
  "imagen-4.0-ultra-generate-001",
  "imagen-3.0-generate-002"
] as const;

export type SupportedImagenModel = (typeof SUPPORTED_IMAGEN_MODELS)[number];

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

function stripModelPrefix(value: string) {
  try {
    return decodeURIComponent(value).replace(/^models\//i, "");
  } catch {
    return value.replace(/^models\//i, "");
  }
}
