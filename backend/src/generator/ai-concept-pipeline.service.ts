import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { GeneratedStyleProfile, PreviewAssetPlan, TraitPackPlan } from "./generator.types";
import { OpenAIImageProvider, type ImageGenerationInput } from "./image-providers";
import { rarityLadder, type Rarity } from "./renderers/render-types";

type ConceptRequest = {
  type: PreviewAssetPlan["type"];
  label: string;
  kind: string;
  rarity?: Rarity;
  size: ImageGenerationInput["size"];
  prompt: string;
};

@Injectable()
export class AiConceptPipelineService {
  constructor(@Inject(OpenAIImageProvider) private readonly openai: OpenAIImageProvider) {}

  enabled() {
    return (process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true" && Boolean(process.env.OPENAI_API_KEY);
  }

  async generate(style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string, logoData?: string): Promise<PreviewAssetPlan[]> {
    if (!this.enabled()) return [];
    const reference = this.parseReference(logoData);
    const requests = this.requests(style, pack, seedKey);
    const outputs: PreviewAssetPlan[] = [];
    for (const request of requests) {
      const output = await this.openai.generate({
        prompt: request.prompt,
        size: request.size,
        quality: "high",
        referenceImageBase64: reference?.base64,
        referenceImageMimeType: reference?.mimeType
      });
      const uri = output.dataUri ?? `data:${output.mimeType};base64,${output.bytes?.toString("base64") ?? ""}`;
      outputs.push({
        type: request.type,
        label: request.label,
        uri,
        productionAssetStatus: "AI_CONCEPT",
        previewClassification: "AI_CONCEPT_PREVIEW",
        provider: "openai",
        promptHash: this.hash(request.prompt),
        generationMetadata: {
          kind: request.kind,
          model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
          quality: "high",
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
      });
    }
    return outputs;
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
    const avatar = {
      type: "AVATAR" as const,
      label: `${style.collection} AI avatar concept`,
      kind: "collection-avatar",
      size: "1024x1024" as const,
      prompt: `${base}
Create one clean avatar concept for the collection lead subject. Strong silhouette, readable face, intentional expression, collectible-ready crop. No text, no logos, no watermark.`
    };
    const samples = rarityLadder.map((rarity) => {
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
    const traitSheet = {
      type: "TRAIT_SHEET" as const,
      label: `${style.collection} AI trait sheet concept`,
      kind: "trait-sheet",
      size: "1536x1024" as const,
      prompt: `${base}
Create a professional text-free trait sheet concept showing how curated production layers should be organized: base silhouettes, heads, eyes, mouths, bodies, props, aura effects, frames, and legendary scene overlays. Do not include labels or text.`
    };
    const animation = {
      type: "ANIMATION_KEYFRAME" as const,
      label: `${style.collection} AI animation keyframe concept`,
      kind: "animation-keyframe",
      size: "1536x1024" as const,
      prompt: `${base}
Create animation keyframe concept art for idle, reveal, reward, and legendary event moments. Show motion intent through poses and staging, but no text, no logos, no UI labels, no watermark.`
    };
    return [hero, avatar, ...samples, traitSheet, animation];
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

  private parseReference(logoData?: string) {
    const match = /^data:([^;,]+);base64,(.+)$/s.exec(logoData ?? "");
    if (!match) return undefined;
    return { mimeType: match[1], base64: match[2] };
  }

  private hash(value: string) {
    return createHash("sha256").update(value).digest("hex").slice(0, 32);
  }
}
