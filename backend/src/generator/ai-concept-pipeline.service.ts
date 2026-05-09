import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { GeneratedStyleProfile, PreviewAssetPlan, TraitPackPlan } from "./generator.types";
import { OpenAIImageProvider, type ImageGenerationInput } from "./image-providers";
import { buildOpenAIImageRequest, resolveOpenAIImageModel, resolveOpenAIImageQuality, summarizeOpenAIImageRequest, validateOpenAIImageRequest } from "./openai-image-request";
import type { Rarity } from "./renderers/render-types";

type ConceptRequest = {
  type: PreviewAssetPlan["type"];
  label: string;
  kind: string;
  rarity?: Rarity;
  size: ImageGenerationInput["size"];
  prompt: string;
};

export class AiConceptGenerationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "AiConceptGenerationError";
  }
}

@Injectable()
export class AiConceptPipelineService {
  constructor(@Inject(OpenAIImageProvider) private readonly openai: OpenAIImageProvider) {}

  enabled() {
    return (process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true" && Boolean(process.env.OPENAI_API_KEY);
  }

  availability() {
    if ((process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") !== "true") {
      return {
        ready: false,
        code: "OPENAI_DISABLED",
        message: "OpenAI disabled. AI concept preview generation is not enabled on this server."
      };
    }
    if (!process.env.OPENAI_API_KEY) {
      return {
        ready: false,
        code: "OPENAI_KEY_MISSING",
        message: "OpenAI key missing. Configure image generation before creating an AI concept preview."
      };
    }
    return { ready: true, code: "OPENAI_READY", message: "OpenAI image generation is ready." };
  }

  async generate(style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string, logoData?: string, logoUri?: string): Promise<PreviewAssetPlan[]> {
    if (!this.enabled()) return [];
    return this.generateRequired(style, pack, seedKey, logoData, logoUri);
  }

  async generateRequired(style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string, logoData?: string, logoUri?: string): Promise<PreviewAssetPlan[]> {
    const availability = this.availability();
    if (!availability.ready) throw new AiConceptGenerationError(availability.code, availability.message, { stage: "ai_concept_configuration" });
    const reference = this.parseReference(logoData, logoUri);
    const requests = this.requests(style, pack, seedKey);
    const quality = resolveOpenAIImageQuality() as ImageGenerationInput["quality"];
    const outputs: PreviewAssetPlan[] = await Promise.all(requests.map(async (request): Promise<PreviewAssetPlan> => {
      const output = await this.openai.generate({
        prompt: request.prompt,
        size: request.size,
        quality,
        referenceImageBase64: reference?.base64,
        referenceImageMimeType: reference?.mimeType,
        referenceImageUrl: reference?.url
      });
      const uri = output.dataUri ?? `data:${output.mimeType};base64,${output.bytes?.toString("base64") ?? ""}`;
      return {
        type: request.type,
        label: request.label,
        uri,
        productionAssetStatus: "AI_CONCEPT",
        previewClassification: "AI_CONCEPT_PREVIEW",
        provider: "openai",
        promptHash: this.hash(request.prompt),
        generationMetadata: {
          kind: request.kind,
          model: resolveOpenAIImageModel(),
          quality,
          size: request.size,
          seedKey,
          prompt: request.prompt
        },
        metadata: {
          rarity: request.rarity,
          artProductionStatus: "AI_CONCEPT",
          productionAssetStatus: "AI_CONCEPT",
          previewClassification: "AI_CONCEPT_PREVIEW",
          conceptOnly: true,
          notMintable: true,
          promptHash: this.hash(request.prompt),
          visualSystem: style.creativeUniverse.creativeDna.visualSystem
        }
      };
    }));
    if (!this.hasRequiredConceptSet(outputs)) {
      throw new AiConceptGenerationError("OPENAI_REQUEST_FAILED", "OpenAI request failed: the concept preview did not include the required hero, common, epic, and legendary images.", {
        stage: "ai_concept_validation",
        outputTypes: outputs.map((asset) => `${asset.type}:${asset.metadata.rarity ?? asset.type}`)
      });
    }
    return outputs;
  }

  validateRequestPlan(style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string, logoData?: string, logoUri?: string) {
    const reference = this.parseReference(logoData, logoUri);
    const quality = resolveOpenAIImageQuality() as ImageGenerationInput["quality"];
    const requests = this.requests(style, pack, seedKey).map((request) => {
      const openaiRequest = buildOpenAIImageRequest({
        prompt: request.prompt,
        size: request.size,
        quality,
        referenceImageBase64: reference?.base64,
        referenceImageMimeType: reference?.mimeType,
        referenceImageUrl: reference?.url
      });
      const validation = validateOpenAIImageRequest(openaiRequest);
      return {
        type: request.type,
        label: request.label,
        kind: request.kind,
        rarity: request.rarity,
        ...summarizeOpenAIImageRequest(openaiRequest),
        valid: validation.valid,
        issues: validation.issues
      };
    });
    const issues = requests.flatMap((request) => request.issues.map((issue) => ({ ...issue, requestLabel: request.label, requestKind: request.kind })));
    return {
      ok: true,
      valid: issues.length === 0,
      model: resolveOpenAIImageModel(),
      quality,
      requestCount: requests.length,
      referenceImageBase64Present: Boolean(reference?.base64),
      referenceImageUrlPresent: Boolean(reference?.url),
      requests,
      issues
    };
  }

  private requests(style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string): ConceptRequest[] {
    const base = this.baseBrief(style, pack, seedKey);
    const hero = {
      type: "BANNER" as const,
      label: `${style.collection} AI hero concept`,
      kind: "collection-hero",
      size: "1536x1024" as const,
      prompt: `${base}
Create collection hero key art. Show the civilization, subject silhouette, atmosphere, and mythology in one polished scene. No text, no logos, no watermark.`
    };
    const requiredRarities: Rarity[] = ["Common", "Epic", "Legendary"];
    const samples = requiredRarities.map((rarity) => {
      const rule = style.brandDna.rarityVisualRules[rarity];
      const frame = style.creativeUniverse.creativeDna.visualSystem.rarityFrames?.[rarity];
      return {
        type: "SAMPLE_NFT" as const,
        label: `${style.collection} ${rarity} AI concept`,
        kind: "rarity-exemplar",
        rarity,
        size: "1024x1536" as const,
        prompt: `${base}
Create a ${rarity} rarity exemplar.
Rarity story: ${rule?.composition ?? style.creativeUniverse.creativeDna.rarityPhilosophy}
Pose rule: ${rule?.pose ?? "unique pose for this rarity"}
Environment rule: ${rule?.background ?? style.backgroundWorld}
Creative DNA rarity frame:
- Composition: ${frame?.composition ?? "use the rarity progression"}
- Camera: ${frame?.camera ?? "distinct camera"}
- Face/emotion: ${frame?.faceTreatment ?? "readable emotional face"}
- Body language: ${frame?.bodyLanguage ?? "non-neutral body language"}
- Environment: ${frame?.environment ?? style.backgroundWorld}
- Lighting: ${frame?.lighting ?? style.creativeUniverse.creativeDna.visualSystem.lightingModel}
- Event: ${frame?.event ?? style.creativeUniverse.creativeDna.legendaryMythology}
- Silhouette change: ${frame?.silhouetteMutation ?? "rarity-specific silhouette"}
Trait stack intensity: ${rule?.minTraits ?? 2} to ${rule?.maxTraits ?? 12} visible curated traits.
Common must be clean and simple. Epic must be richer and more expressive. Legendary must be cinematic scene-level art. Mythic must be a near-one-of-one unique composition.
This ${rarity} sample must use a visibly different pose, camera, expression, and composition from every other rarity. No text, no logos, no watermark.`
      };
    });
    return [hero, ...samples];
  }

  private baseBrief(style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string) {
    const dna = style.creativeUniverse.creativeDna;
    const visual = dna.visualSystem;
    const signals = style.creativeUniverse.signalProfile;
    const dominantSignals = Object.entries(signals.semanticWeights ?? {})
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .filter(([, value]) => Number(value) > 0)
      .slice(0, 4)
      .map(([key, value]) => `${key} ${value}`)
      .join(", ");
    return `Professional NFT collection concept art direction.
Collection: ${style.collection}
Seed key: ${seedKey}
Creative DNA world: ${dna.worldConcept}
Dominant creative signals: ${dominantSignals || "collection metadata only"}
Object anchors: ${signals.objects.slice(0, 10).join(", ")}
World anchors: ${signals.worldReferences.slice(0, 10).join(", ")}
Meme/culture cues: ${signals.memeLanguage.slice(0, 8).join(", ")}
Danger/emotion cues: ${signals.dangerSafetyCues.slice(0, 8).join(", ")}
Subject/silhouette language: ${dna.mascotOrSubject}; ${dna.baseSilhouetteRules.join("; ")}
Emotional culture: ${style.creativeUniverse.moodCulture.map((mood) => `${mood.name}: ${mood.expression}`).join("; ")}
Trait taxonomy: ${style.creativeUniverse.taxonomy.map((category) => `${category.role}: ${category.label} (${category.nouns.slice(0, 4).join(", ")})`).join("; ")}
Rarity storytelling: ${dna.rarityPhilosophy}
Mythology: ${dna.legendaryMythology}
Renderer medium only: ${visual.rendererFamily}; do not let the medium define the civilization.
Camera language: ${visual.cameraSystem}
Lighting philosophy: ${visual.lightingModel}
Composition rules: ${style.brandDna.compositionRules.join("; ")}
Palette direction: ${dna.palette.join(", ")}
Animation language: ${dna.animationLanguage}
Production note: this is AI_CONCEPT art direction only, not mintable final art; final NFTs require curated layer packs and deterministic rendering.
Quality bar: polished character design, strong silhouette, clean face/expression, visible emotion and body language, intentional trait placement, consistent collection style, premium collectible framing, no messy artifacts, no random text, no fake logos, no malformed anatomy.
Do not output placeholder cards, abstract boxes, UI mockups, SVG-like blocks, wireframe diagrams, fake badges, fake interface labels, or production-looking final mints.
Every image must visibly communicate the Creative DNA world, emotional culture, rarity story, and collection-specific object anchors. Secondary metadata may add texture but must not overpower the dominant creative signals.
IP safety: do not copy or imitate famous NFT collections, apes, monkeys, skeleton traits, known collection poses, recognizable backgrounds, or trademarked designs.
Available scalable trait categories for later curated layers: ${Object.keys(pack.categories).join(", ")}.`;
  }

  private hasRequiredConceptSet(outputs: PreviewAssetPlan[]) {
    const hasHero = outputs.some((asset) => asset.type === "BANNER" && asset.uri);
    const rarities = new Set(outputs.filter((asset) => asset.type === "SAMPLE_NFT" && asset.uri).map((asset) => asset.metadata.rarity));
    return hasHero && rarities.has("Common") && rarities.has("Epic") && rarities.has("Legendary");
  }

  private parseReference(logoData?: string, logoUri?: string) {
    const match = /^data:([^;,]+);base64,(.+)$/s.exec(logoData ?? "");
    if (match) return { mimeType: match[1], base64: match[2], url: undefined };
    const url = logoUri?.trim();
    if (url) return { mimeType: undefined, base64: undefined, url };
    return undefined;
  }

  private hash(value: string) {
    return createHash("sha256").update(value).digest("hex").slice(0, 32);
  }
}
