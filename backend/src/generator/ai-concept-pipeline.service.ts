import { Inject, Injectable, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { GeneratedStyleProfile, PreviewAssetPlan, TraitPackPlan } from "./generator.types";
import { OpenAIImageProvider, type ImageGenerationInput } from "./image-providers";
import { buildOpenAIImageRequest, resolveOpenAIImageModel, resolveOpenAIImageQuality, summarizeOpenAIImageRequest, validateOpenAIImageRequest } from "./openai-image-request";
import { escapeXml, svgUri } from "./renderers/svg";
import type { Rarity } from "./renderers/render-types";

type AiConceptProviderConfig = "openai" | "premium-fallback" | "cached-only";

type ConceptRequest = {
  type: PreviewAssetPlan["type"];
  label: string;
  kind: string;
  rarity?: Rarity;
  size: ImageGenerationInput["size"];
  prompt: string;
};

type AuthoredIdentityBrief = {
  civilization: string;
  subject: string;
  culture: string;
  world: string;
  ritualObjects: string;
  moodSignature: string;
  palette: string;
  materialLanguage: string;
  memePersonality: string;
  silhouette: string;
};

type CinematicDirection = {
  cameraAngle: string;
  lensStyle: string;
  framing: string;
  lightingMood: string;
  environmentalStorytelling: string;
  compositionFocus: string;
  silhouetteEmphasis: string;
};

type EmotionalDirection = {
  thesis: string;
  eyes: string;
  mouth: string;
  posture: string;
  gesture: string;
  clothingCondition: string;
  fxIntensity: string;
  environment: string;
  colorGrade: string;
  cameraShake: string;
  sceneChaos: string;
};

type CachedConceptEntry = {
  expiresAt: number;
  assets: PreviewAssetPlan[];
};

const fullRarityLadder: Rarity[] = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];
const lowCostRarityLadder: Rarity[] = ["Common", "Epic", "Legendary"];
const constrainedRarityPriority: Rarity[] = ["Common", "Epic", "Legendary", "Rare", "Mythic", "Uncommon"];

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
  private readonly logger = new Logger(AiConceptPipelineService.name);
  private readonly cache = new Map<string, CachedConceptEntry>();

  constructor(@Inject(OpenAIImageProvider) private readonly openai: OpenAIImageProvider) {}

  enabled() {
    const provider = this.provider();
    if (provider === "premium-fallback") return true;
    if (provider === "cached-only") return false;
    return this.paidAiAllowed() && (process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true" && Boolean(process.env.OPENAI_API_KEY);
  }

  availability() {
    const provider = this.provider();
    if (provider === "premium-fallback") {
      return {
        ready: true,
        code: "PREMIUM_FALLBACK_READY",
        message: "Premium cinematic fallback poster provider is ready."
      };
    }
    if (provider === "cached-only") {
      return {
        ready: false,
        code: "AI_CONCEPT_CACHED_ONLY",
        message: "AI_CONCEPT_PROVIDER=cached-only is configured; no paid OpenAI generation will be attempted."
      };
    }
    if ((process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") !== "true") {
      return {
        ready: false,
        code: "OPENAI_DISABLED",
        message: "OpenAI disabled. AI studio preview generation is not enabled on this server."
      };
    }
    if (!this.paidAiAllowed()) {
      return {
        ready: false,
        code: "PAID_AI_DISABLED",
        message: "Paid AI generation is disabled by PAID_AI_GENERATION_ENABLED/DEV_DISABLE_PAID_AI."
      };
    }
    if (!process.env.OPENAI_API_KEY) {
      return {
        ready: false,
        code: "OPENAI_KEY_MISSING",
        message: "OpenAI key missing. Configure image generation before creating an AI studio preview."
      };
    }
    return { ready: true, code: "OPENAI_READY", message: "OpenAI image generation is ready." };
  }

  async generate(style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string, logoData?: string, logoUri?: string): Promise<PreviewAssetPlan[]> {
    if (!this.enabled()) return [];
    return this.generateRequired(style, pack, seedKey, logoData, logoUri);
  }

  async generateHeroConcept(style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string, logoData?: string, logoUri?: string): Promise<PreviewAssetPlan[]> {
    if (this.provider() === "premium-fallback") return this.generatePremiumFallback(style, pack, seedKey, logoData, logoUri, "explicit-premium-cinematic").slice(0, 1).map((asset) => this.asHeroConcept(asset));
    const availability = this.availability();
    if (!availability.ready) throw new AiConceptGenerationError(availability.code, availability.message, { stage: "premium_cinematic_configuration" });
    const reference = this.parseReference(logoData, logoUri);
    const request = this.requests(style, pack, seedKey).find((item) => item.kind === "collection-hero");
    if (!request) throw new AiConceptGenerationError("PREMIUM_HERO_REQUEST_MISSING", "Premium Cinematic Render could not build a hero concept request.", { stage: "premium_cinematic_request" });
    const quality = resolveOpenAIImageQuality() as ImageGenerationInput["quality"];
    const dnaHash = this.dnaHash(style);
    const output = await this.openai.generate({
      prompt: request.prompt,
      size: request.size,
      quality,
      referenceImageBase64: reference?.base64,
      referenceImageMimeType: reference?.mimeType,
      referenceImageUrl: reference?.url
    });
    const uri = output.dataUri ?? `data:${output.mimeType};base64,${output.bytes?.toString("base64") ?? ""}`;
    const promptHash = this.hash(request.prompt);
    return [{
      type: "HERO_CONCEPT",
      label: `${style.collection} Premium Cinematic Render`,
      uri,
      productionAssetStatus: "AI_CONCEPT",
      previewClassification: "AI_CONCEPT_PREVIEW",
      provider: "openai",
      promptHash,
      generationMetadata: {
        kind: "premium-cinematic-hero",
        provider: "openai",
        model: resolveOpenAIImageModel(),
        quality,
        size: request.size,
        generationType: "hero_concept",
        estimatedCostUsd: this.estimatedOpenAICostUsd(),
        explicitPremiumAction: true,
        seedKey,
        dnaHash,
        promptHash,
        prompt: request.prompt
      },
      metadata: {
        dnaHash,
        generationType: "hero_concept",
        estimatedCostUsd: this.estimatedOpenAICostUsd(),
        artProductionStatus: "AI_CONCEPT",
        productionAssetStatus: "AI_CONCEPT",
        previewClassification: "AI_CONCEPT_PREVIEW",
        conceptOnly: true,
        notMintable: true,
        promptHash,
        visualSystem: style.creativeUniverse.creativeDna.visualSystem
      }
    }];
  }

  async generateRequired(style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string, logoData?: string, logoUri?: string): Promise<PreviewAssetPlan[]> {
    if (this.provider() === "premium-fallback") return this.generatePremiumFallback(style, pack, seedKey, logoData, logoUri, "local-preview-provider");
    const availability = this.availability();
    if (!availability.ready) throw new AiConceptGenerationError(availability.code, availability.message, { stage: "ai_concept_configuration" });
    const reference = this.parseReference(logoData, logoUri);
    const requests = this.requests(style, pack, seedKey);
    const quality = resolveOpenAIImageQuality() as ImageGenerationInput["quality"];
    const dnaHash = this.dnaHash(style);
    const promptHashes = requests.map((request) => this.hash(request.prompt));
    this.logger.log(
      JSON.stringify({
        event: "ai_concept_request_plan",
        providerSelected: "openai",
        model: resolveOpenAIImageModel(),
        quality,
        imageCount: requests.length,
        promptHashes,
        referenceImageBase64Present: Boolean(reference?.base64),
        referenceImageUrlPresent: Boolean(reference?.url),
        lowCostMode: this.lowCostMode(),
        cacheKey: this.cacheKey(style, seedKey),
        dnaHash
      })
    );
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
          provider: "openai",
          model: resolveOpenAIImageModel(),
          quality,
          size: request.size,
          lowCostMode: this.lowCostMode(),
          dnaHash,
          seedKey,
          prompt: request.prompt
        },
        metadata: {
          rarity: request.rarity,
          dnaHash,
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
      throw new AiConceptGenerationError("OPENAI_REQUEST_FAILED", "OpenAI request failed: the studio preview did not include the required hero and rarity ladder images.", {
        stage: "ai_concept_validation",
        outputTypes: outputs.map((asset) => `${asset.type}:${asset.metadata.rarity ?? asset.type}`)
      });
    }
    this.rememberConcepts(this.cacheKey(style, seedKey), outputs);
    this.logger.log(
      JSON.stringify({
        event: "ai_concept_preview_assets_ready",
        providerSelected: "openai",
        model: resolveOpenAIImageModel(),
        previewAssetCount: outputs.length,
        promptHashes,
        cacheKey: this.cacheKey(style, seedKey),
        dnaHash
      })
    );
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
      provider: this.provider(),
      lowCostMode: this.lowCostMode(),
      model: resolveOpenAIImageModel(),
      quality,
      requestCount: requests.length,
      estimatedOpenAIRequestCount: this.provider() === "openai" ? requests.length : 0,
      usesPaidOpenAIImageGeneration: this.provider() === "openai",
      maxImagesPerRun: this.maxImagesPerRun(),
      cacheTtlSeconds: this.cacheTtlSeconds(),
      cacheKey: this.cacheKey(style, seedKey),
      cachedResultAvailable: Boolean(this.cachedConcepts(this.cacheKey(style, seedKey)).length),
      confirmationRequired: requests.length > this.confirmationThreshold(),
      confirmationThreshold: this.confirmationThreshold(),
      referenceImageBase64Present: Boolean(reference?.base64),
      referenceImageUrlPresent: Boolean(reference?.url),
      requests,
      issues
    };
  }

  conceptRunSummary(style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string, logoData?: string, logoUri?: string) {
    const validation = this.validateRequestPlan(style, pack, seedKey, logoData, logoUri);
    return {
      provider: validation.provider,
      imageCount: validation.requestCount,
      estimatedOpenAIRequestCount: validation.estimatedOpenAIRequestCount,
      usesPaidOpenAIImageGeneration: validation.usesPaidOpenAIImageGeneration,
      lowCostMode: validation.lowCostMode,
      maxImagesPerRun: validation.maxImagesPerRun,
      cacheTtlSeconds: validation.cacheTtlSeconds,
      cacheKey: validation.cacheKey,
      cachedResultAvailable: validation.cachedResultAvailable,
      confirmationRequired: validation.confirmationRequired,
      confirmationThreshold: validation.confirmationThreshold,
      model: validation.model,
      quality: validation.quality
    };
  }

  cachedConcepts(cacheKey: string) {
    const entry = this.cache.get(cacheKey);
    if (!entry) return [];
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(cacheKey);
      return [];
    }
    return entry.assets.map((asset) => this.cloneAsset(asset, undefined, true));
  }

  rememberConcepts(cacheKey: string, assets: PreviewAssetPlan[]) {
    if (!assets.length) return;
    this.cache.set(cacheKey, {
      expiresAt: Date.now() + this.cacheTtlSeconds() * 1000,
      assets: assets.map((asset) => this.cloneAsset(asset))
    });
  }

  usableConceptSet(assets: PreviewAssetPlan[]) {
    return this.hasRequiredConceptSet(assets) && assets.every((asset) => !this.isFallbackPoster(asset) && asset.provider !== "local-placeholder");
  }

  cacheKey(style: GeneratedStyleProfile, seedKey: string) {
    return createHash("sha256").update(`${style.brandDna?.mintAddress ?? style.collection}:${this.dnaHash(style)}`).digest("hex").slice(0, 32);
  }

  dnaHash(style: GeneratedStyleProfile) {
    return createHash("sha256")
      .update(
        JSON.stringify({
          collection: style.collection,
          mintAddress: style.brandDna?.mintAddress,
          creativeDna: style.creativeUniverse.creativeDna,
          palette: style.colors,
          traitLanguage: style.traitLanguage
        })
      )
      .digest("hex")
      .slice(0, 32);
  }

  generatePremiumFallback(style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string, logoData?: string, logoUri?: string, reason = "openai-unavailable"): PreviewAssetPlan[] {
    const requests = this.requests(style, pack, seedKey);
    const identity = this.authoredIdentityBrief(style);
    const dnaHash = this.dnaHash(style);
    const cacheKey = this.cacheKey(style, seedKey);
    const assets = requests.map((request, index): PreviewAssetPlan => {
      const promptHash = this.hash(request.prompt);
      const rarity = request.rarity;
      return {
        type: request.type,
        label: request.label.replace("AI concept", "premium studio poster"),
        uri: svgUri(this.premiumPosterSvg(style, identity, request, index, logoData, logoUri)),
        productionAssetStatus: "AI_CONCEPT",
        previewClassification: "AI_CONCEPT_PREVIEW",
        provider: "premium-fallback",
        promptHash,
        generationMetadata: {
          kind: request.kind,
          provider: "premium-fallback",
          premiumFallbackPoster: true,
          reason,
          model: "local-premium-poster-renderer",
          size: request.size,
          lowCostMode: this.lowCostMode(),
          seedKey,
          dnaHash,
          promptHash,
          prompt: request.prompt
        },
        metadata: {
          rarity,
          dnaHash,
          premiumFallbackPoster: true,
          artProductionStatus: "AI_CONCEPT",
          productionAssetStatus: "AI_CONCEPT",
          previewClassification: "AI_CONCEPT_PREVIEW",
          conceptOnly: true,
          notMintable: true,
          promptHash,
          mood: rarity ? this.moodFor(style, rarity, index).name : identity.moodSignature,
          expression: rarity ? this.moodFor(style, rarity, index).expression : identity.memePersonality,
          cameraBrief: request.prompt.match(/Camera angle: (.*)/)?.[1]?.slice(0, 160),
          visualSystem: style.creativeUniverse.creativeDna.visualSystem
        }
      };
    });
    this.logger.log(
      JSON.stringify({
        event: "ai_concept_premium_fallback_ready",
        providerSelected: "premium-fallback",
        reason,
        imageCount: assets.length,
        promptHashes: assets.map((asset) => asset.promptHash),
        cacheKey,
        dnaHash
      })
    );
    return assets;
  }

  private asHeroConcept(asset: PreviewAssetPlan): PreviewAssetPlan {
    return {
      ...asset,
      type: "HERO_CONCEPT",
      label: asset.label.replace(/premium studio poster|AI studio hero preview/i, "Premium Cinematic Render"),
      generationMetadata: {
        ...(asset.generationMetadata ?? {}),
        generationType: "hero_concept",
        explicitPremiumAction: true
      },
      metadata: {
        ...asset.metadata,
        generationType: "hero_concept",
        conceptOnly: true,
        notMintable: true
      }
    };
  }

  private estimatedOpenAICostUsd() {
    const configured = Number(process.env.OPENAI_IMAGE_ESTIMATED_COST_USD);
    return Number.isFinite(configured) && configured >= 0 ? configured : 0.08;
  }

  private paidAiAllowed() {
    const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
    const paidEnabled = (process.env.PAID_AI_GENERATION_ENABLED ?? "false") === "true";
    const devDisabled = (process.env.DEV_DISABLE_PAID_AI ?? "true") === "true" && appEnv !== "production";
    return paidEnabled && !devDisabled;
  }

  private requests(style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string): ConceptRequest[] {
    const identity = this.authoredIdentityBrief(style);
    const base = this.baseBrief(style, identity, seedKey);
    const heroCinema = this.cinematicDirection(style, "Legendary", 13);
    const heroEmotion = this.emotionalDirection(style, "Legendary", 29);
    const lowCost = this.lowCostMode();
    const hero = {
      type: "BANNER" as const,
      label: `${style.collection} AI studio hero preview`,
      kind: "collection-hero",
      size: lowCost ? "1024x1024" as const : "1536x1024" as const,
      prompt: `${base}
Create collection hero key art for a real civilization with near-final emotional identity.
Hero story: ${identity.civilization} gathered at the edge of ${identity.world}, caught in the exact moment their faction myth becomes visible.
Camera angle: ${heroCinema.cameraAngle}
Lens style: ${heroCinema.lensStyle}
Framing: ${heroCinema.framing}
Lighting mood: ${heroCinema.lightingMood}
Environmental storytelling: ${heroCinema.environmentalStorytelling}
Composition focus: ${heroCinema.compositionFocus}
Silhouette emphasis: ${heroCinema.silhouetteEmphasis}
Emotional read: ${heroEmotion.thesis}
Face and body acting: eyes ${heroEmotion.eyes}; mouth ${heroEmotion.mouth}; posture ${heroEmotion.posture}; gesture ${heroEmotion.gesture}.
Scene controls: clothing ${heroEmotion.clothingCondition}; FX ${heroEmotion.fxIntensity}; color grade ${heroEmotion.colorGrade}; camera shake ${heroEmotion.cameraShake}; scene chaos ${heroEmotion.sceneChaos}.
No text, no logos, no watermark.`
    };
    const requiredRarities = this.requiredRarities();
    const samples = requiredRarities.map((rarity, index) => {
      const rule = style.brandDna.rarityVisualRules[rarity];
      const frame = style.creativeUniverse.creativeDna.visualSystem.rarityFrames?.[rarity];
      const cinema = this.cinematicDirection(style, rarity, index);
      const emotion = this.emotionalDirection(style, rarity, index);
      return {
        type: "SAMPLE_NFT" as const,
        label: `${style.collection} ${rarity} AI studio preview`,
        kind: "rarity-exemplar",
        rarity,
        size: lowCost ? "1024x1024" as const : "1024x1536" as const,
        prompt: `${base}
Create a ${rarity} rarity character preview as premium cinematic character art that is close enough for creator art-direction approval.
Emotional narrative: ${emotion.thesis}
Rarity escalation: ${this.rarityNarrative(rarity)}
Camera angle: ${cinema.cameraAngle}
Lens style: ${cinema.lensStyle}
Framing: ${cinema.framing}
Lighting mood: ${frame?.lighting ? this.cleanPhrase(frame.lighting) : cinema.lightingMood}
Environmental storytelling: ${frame?.environment ? this.cleanPhrase(frame.environment) : cinema.environmentalStorytelling}
Composition focus: ${frame?.composition ? this.cleanPhrase(frame.composition) : cinema.compositionFocus}
Silhouette emphasis: ${frame?.silhouetteMutation ? this.cleanPhrase(frame.silhouetteMutation) : cinema.silhouetteEmphasis}
Face direction: eyes ${emotion.eyes}; mouth ${emotion.mouth}; expression must be readable at thumbnail size.
Body direction: posture ${rule?.pose ? this.cleanPhrase(rule.pose) : emotion.posture}; gesture ${emotion.gesture}; body language ${frame?.bodyLanguage ? this.cleanPhrase(frame.bodyLanguage) : emotion.posture}.
Wardrobe and wear: ${emotion.clothingCondition}; never clean generic armor unless the civilization demands it.
FX and atmosphere: ${emotion.fxIntensity}; environment ${rule?.background ? this.cleanPhrase(rule.background) : emotion.environment}; color grade ${emotion.colorGrade}; camera shake ${emotion.cameraShake}; scene chaos ${emotion.sceneChaos}.
Story frame: ${frame?.event ? this.cleanPhrase(frame.event) : this.cleanPhrase(style.creativeUniverse.creativeDna.legendaryMythology)}
Use ${rule?.minTraits ?? 2} to ${rule?.maxTraits ?? 12} visible design details, but make them feel worn, earned, and culturally specific instead of listed as accessories.
This ${rarity} sample must have a visibly different pose, camera, expression, environment, silhouette, and emotional signature from every other rarity.
No text, no logos, no watermark.`
      };
    });
    return [hero, ...samples];
  }

  private baseBrief(style: GeneratedStyleProfile, identity: AuthoredIdentityBrief, seedKey: string) {
    const dna = style.creativeUniverse.creativeDna;
    const visual = dna.visualSystem;
    return `Premium AI-powered NFT art studio preview.
Collection: ${style.collection}
Seed key: ${seedKey}
Civilization: ${identity.civilization}
Core subject: ${identity.subject}
Faction culture: ${identity.culture}
World stage: ${identity.world}
Ritual objects and habits: ${identity.ritualObjects}
Mood signature: ${identity.moodSignature}
Meme-native personality: ${identity.memePersonality}
Silhouette language: ${identity.silhouette}
Material and clothing language: ${identity.materialLanguage}
Palette and color grading: ${identity.palette}
Rarity myth: ${this.cleanPhrase(dna.rarityPhilosophy)}
Legendary mythology: ${this.cleanPhrase(dna.legendaryMythology)}
Camera system: ${this.cleanPhrase(visual.cameraSystem || visual.cameraFraming)}
Lighting philosophy: ${this.cleanPhrase(visual.lightingModel)}
Composition rules: ${style.brandDna.compositionRules.map((rule) => this.cleanPhrase(rule)).join("; ")}
Animation feeling: ${this.cleanPhrase(dna.animationLanguage)}
Visual identity authoring rules:
- Treat the renderer as a craft medium only; the civilization, silhouette, culture, camera system, environment, mood, and emotional signature must be collection-specific.
- Build a recognizable faction culture with rituals, clothing wear, body language, and environmental history.
- Make the character emotionally iconic before adding surface detail.
- Prioritize silhouette clarity, face readability, cinematic hierarchy, and mood-first identity at thumbnail size.
- Make the preview feel close to final collection identity, final emotional quality, and final rarity storytelling.
- Design as if the creator will lock art direction, approve trait families, refine rarity tiers, and selectively curate final production assets from this direction.
- Avoid generic mascot poses, flat trading-card composition, sterile game-ad polish, low-effort AI gloss, random neon clutter, and disconnected accessories.
Production note: this is an AI_CONCEPT studio preview for creator refinement. It is not automatically mintable public art; final NFTs require locked creator approval, layered or curated exports, permanent storage, and artist cleanup or manual curation when needed.
Quality bar: mint-worthy direction, polished character design, strong silhouette, clean face/expression, visible emotion and body language, intentional detail placement, consistent collection style, premium collectible framing, no messy artifacts, no random text, no fake logos, no malformed anatomy.
Do not output placeholder cards, abstract boxes, UI mockups, SVG-like blocks, wireframe diagrams, fake badges, fake interface labels, mobile game ad layouts, or production-looking final mints.
Every image must read as a scene from a real civilization with emotional identity, not as keywords turned into props.
IP safety: do not copy or imitate famous NFT collections, apes, monkeys, skeleton traits, known collection poses, recognizable backgrounds, or trademarked designs.
Do not mention or reference any famous NFT collection names in the image.`;
  }

  private authoredIdentityBrief(style: GeneratedStyleProfile): AuthoredIdentityBrief {
    const dna = style.creativeUniverse.creativeDna;
    const signals = style.creativeUniverse.signalProfile;
    const moods = style.creativeUniverse.moodCulture;
    const subject = this.cleanPhrase(dna.mascotOrSubject || style.mascot || style.collection);
    const objects = this.cleanList([...signals.objects, ...signals.worldReferences, ...style.traitLanguage], 8);
    const cultureWords = this.cleanList([...signals.culturalWords, ...signals.memeLanguage, ...style.roleNames], 8);
    const emotions = this.cleanList([...signals.emotions, ...signals.dangerSafetyCues, ...moods.map((mood) => mood.expression)], 8);
    return {
      civilization: `${this.cleanPhrase(style.collection)} as ${this.cleanPhrase(style.theme || dna.worldConcept)} people with shared rituals, status codes, inside jokes, and visible history`,
      subject,
      culture: cultureWords.length ? cultureWords.join(", ") : this.cleanPhrase(style.lore || "holder-born faction culture"),
      world: this.cleanPhrase(style.backgroundWorld || dna.worldConcept),
      ritualObjects: objects.length ? objects.join(", ") : "worn faction relics, handheld proof objects, and scene-specific tools",
      moodSignature: emotions.length ? emotions.join(", ") : "watchful humor, pressure, loyalty, and controlled chaos",
      palette: this.cleanList([...dna.palette, ...style.colors], 8).join(", ") || "limited cinematic palette with one memorable accent color",
      materialLanguage: this.cleanPhrase(`${dna.textureLanguage}; clothing should show use, repairs, dust, glow spill, badges, and culture-specific wear`),
      memePersonality: this.cleanPhrase(`${signals.humorType || "deadpan"} humor, ${signals.communityVibe || "holder"} presence, ${signals.energyLevel || "charged"} pacing`),
      silhouette: this.cleanList([subject, ...dna.baseSilhouetteRules, dna.cameraFraming], 6).join("; ") || "instantly readable body shape and head silhouette"
    };
  }

  private cinematicDirection(style: GeneratedStyleProfile, rarity: Rarity, index: number): CinematicDirection {
    const visual = style.creativeUniverse.creativeDna.visualSystem;
    const intensity = this.rarityIntensity(rarity);
    const cameraAngles = [
      "eye-level portrait with quiet authority",
      "slight low angle that makes the faction symbol feel earned",
      "over-shoulder view into the lived-in world",
      "three-quarter hero angle with asymmetrical body acting",
      "low, cinematic event angle with deep background story",
      "impossible poster angle that turns the character into a mythic landmark"
    ];
    const lenses = [
      "natural 50mm character lens, no distortion",
      "65mm portrait lens with compressed background emotion",
      "35mm environmental portrait lens with room for culture clues",
      "anamorphic close-medium lens with controlled flare",
      "wide cinematic lens with foreground silhouettes and atmospheric depth",
      "large-format poster lens with monumental scale and precise negative space"
    ];
    const frames = [
      "clean bust-to-waist read with strong head shape",
      "waist-up collectible frame with one clear gesture",
      "full-body stance with foreground object and readable face",
      "dynamic diagonal composition with clear face, hands, and cultural props",
      "scene-level composition with subject, witnesses, and a visible turning point",
      "unforgettable poster composition with a single dominant silhouette and world-scale backdrop"
    ];
    const chaos = intensity >= 5 ? "layered atmosphere, dust, sparks, crowd traces, and background consequence" : intensity >= 4 ? "controlled atmospheric motion and readable depth" : "minimal atmosphere that keeps the face and silhouette dominant";
    return {
      cameraAngle: this.cleanPhrase(visual.rarityFrames?.[rarity]?.camera || cameraAngles[Math.min(cameraAngles.length - 1, intensity - 1 + (index % 2))] || visual.cameraSystem),
      lensStyle: lenses[Math.min(lenses.length - 1, intensity - 1)] ?? lenses[0],
      framing: this.cleanPhrase(visual.rarityFrames?.[rarity]?.composition || frames[Math.min(frames.length - 1, intensity - 1)] || visual.compositionStyle),
      lightingMood: this.cleanPhrase(visual.rarityFrames?.[rarity]?.lighting || `${visual.lightingModel}; light should reveal mood, not just decorate edges`),
      compositionFocus: this.cleanPhrase(`${visual.compositionStyle}; hierarchy must read face first, silhouette second, world story third`),
      silhouetteEmphasis: this.cleanPhrase(visual.rarityFrames?.[rarity]?.silhouetteMutation || `${visual.bodySystem}; ${visual.headShape}; keep the outline recognizable in one second`),
      environmentalStorytelling: this.cleanPhrase(visual.rarityFrames?.[rarity]?.environment || `${visual.environmentSystem}; ${chaos}`)
    };
  }

  private emotionalDirection(style: GeneratedStyleProfile, rarity: Rarity, index: number): EmotionalDirection {
    const mood = this.moodFor(style, rarity, index);
    const intensity = this.rarityIntensity(rarity);
    const cueDial = style.creativeUniverse.signalProfile.cueDial;
    const emotionalThesis: Record<Rarity, string> = {
      Common: "subtle, grounded, ambient personality; the character feels like a believable citizen of the faction, not a hero pose",
      Uncommon: "a small private reaction breaks through the calm; the expression is memorable but still restrained",
      Rare: "recognizable expression and stronger pose language; the holder can read attitude and social status instantly",
      Epic: "emotionally charged identity; pressure, pride, fear, comedy, or defiance is visible in the eyes and hands",
      Legendary: "cinematic story frame; the character is caught at a decisive faction moment with clear emotional stakes",
      Mythic: "unforgettable poster moment; the character feels like a once-only myth without copying any known collection language"
    };
    const chaosScore = Math.max(cueDial.chaos ?? 0, cueDial.aggressive ?? 0, intensity * 14);
    const cozyScore = cueDial.cozy ?? 0;
    const luxuryScore = cueDial.luxury ?? 0;
    return {
      thesis: `${emotionalThesis[rarity]} Mood engine: ${this.cleanPhrase(mood.name)} expressed as ${this.cleanPhrase(mood.expression)}.`,
      eyes: this.cleanPhrase(mood.eyeLanguage || "clear eye shape with readable inner emotion"),
      mouth: this.cleanPhrase(mood.mouthLanguage || "mouth shape supports the emotion without becoming a generic grin"),
      posture: this.cleanPhrase(mood.stance || "stance carries social role and internal tension"),
      gesture: this.cleanPhrase(mood.gesture || "hands or props reveal personality and faction habit"),
      clothingCondition: luxuryScore > 55 ? "premium materials with scratches, repairs, and owned-in status marks" : cozyScore > 55 ? "soft worn layers, creases, comfort objects, and personal repairs" : "weathered faction clothing with use marks, asymmetry, stains, badges, and object history",
      fxIntensity: intensity >= 5 ? "signature FX tied to the story event, powerful but never obscuring the face" : intensity >= 4 ? "charged FX around hands, eyes, or environment, controlled enough to preserve silhouette" : intensity >= 3 ? "moderate environmental FX that frames the pose" : "low ambient FX, mostly light spill and atmosphere",
      environment: intensity >= 5 ? "world-scale background consequence with witnesses, relics, damage, or ceremony" : intensity >= 4 ? "specific room or street with faction evidence and emotional pressure" : "simple lived-in environment with one strong culture clue",
      colorGrade: luxuryScore > 55 ? "controlled premium contrast with metallic warmth and one sharp accent" : chaosScore > 60 ? "high-contrast storm grade with hot accents and smoky shadows" : cozyScore > 55 ? "warm low-contrast grade with soft ambient spill" : "cinematic contrast with a memorable accent color and readable skin/face values",
      cameraShake: intensity >= 5 || chaosScore > 70 ? "subtle cinematic shake implied by debris and motion streaks" : intensity >= 4 ? "slight handheld tension" : "locked-off calm camera",
      sceneChaos: intensity >= 5 ? "mythic chaos organized into a clear poster hierarchy" : intensity >= 4 ? "contained chaos around the subject, never random clutter" : "quiet scene with controlled detail and strong negative space"
    };
  }

  private rarityNarrative(rarity: Rarity) {
    const narratives: Record<Rarity, string> = {
      Common: "subtle, grounded, ambient personality; simple scene, strong silhouette, one culture clue",
      Uncommon: "first visible twist in expression, posture, or clothing wear",
      Rare: "recognizable expression, stronger pose language, clearer holder status",
      Epic: "emotionally charged identity with richer lighting, gesture, and environment",
      Legendary: "cinematic story frame with a decisive event and scene-level hierarchy",
      Mythic: "unforgettable poster moment with near-one-of-one composition and mythic emotional clarity"
    };
    return narratives[rarity];
  }

  private moodFor(style: GeneratedStyleProfile, rarity: Rarity, index: number) {
    const moods = style.creativeUniverse.moodCulture ?? [];
    const fallback = {
      name: "watchful faction pressure",
      expression: "focused and emotionally readable",
      eyeLanguage: "steady eyes with visible intent",
      mouthLanguage: "restrained mouth shape",
      stance: "grounded stance",
      gesture: "one hand holding a culture object",
      auraBehavior: "low atmosphere",
      animationState: "still"
    };
    if (!moods.length) return fallback;
    if (rarity === "Mythic") return moods[moods.length - 1] ?? fallback;
    if (rarity === "Legendary") return moods[Math.max(0, moods.length - 2)] ?? fallback;
    if (rarity === "Epic") return moods[Math.max(0, Math.floor(moods.length / 2))] ?? fallback;
    return moods[index % moods.length] ?? fallback;
  }

  private rarityIntensity(rarity: Rarity | string) {
    if (rarity === "Mythic") return 6;
    if (rarity === "Legendary") return 5;
    if (rarity === "Epic") return 4;
    if (rarity === "Rare") return 3;
    if (rarity === "Uncommon") return 2;
    return 1;
  }

  private provider(): AiConceptProviderConfig {
    const explicit = (process.env.AI_CONCEPT_PROVIDER ?? "").trim().toLowerCase();
    if (explicit === "openai" || explicit === "premium-fallback" || explicit === "cached-only") return explicit;
    if (explicit === "local-placeholder") return "premium-fallback";
    const localPreviewProvider = (process.env.LOCAL_PREVIEW_PROVIDER ?? "").trim().toLowerCase();
    if (localPreviewProvider === "branded-placeholder" || localPreviewProvider === "premium-fallback") return "premium-fallback";
    return "openai";
  }

  private lowCostMode() {
    if (this.visualQualityMode()) return false;
    return (process.env.AI_CONCEPT_LOW_COST_MODE ?? process.env.LOW_COST_CONCEPT_MODE ?? "false").toLowerCase() === "true";
  }

  private visualQualityMode() {
    return (process.env.AI_CONCEPT_VISUAL_QUALITY_MODE ?? "true").toLowerCase() !== "false";
  }

  private maxImagesPerRun() {
    const configured = Number(process.env.AI_CONCEPT_MAX_IMAGES_PER_RUN);
    const fallback = this.lowCostMode() ? 4 : 7;
    return Math.max(4, Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : fallback);
  }

  private cacheTtlSeconds() {
    const configured = Number(process.env.AI_CONCEPT_CACHE_TTL);
    return Math.max(60, Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 7 * 24 * 60 * 60);
  }

  private confirmationThreshold() {
    const configured = Number(process.env.AI_CONCEPT_REQUIRE_CONFIRMATION_ABOVE_IMAGE_COUNT);
    return Math.max(1, Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 4);
  }

  private requiredRarities(): Rarity[] {
    const base = this.lowCostMode() ? lowCostRarityLadder : fullRarityLadder;
    const maxSamples = Math.max(1, this.maxImagesPerRun() - 1);
    if (maxSamples >= base.length) return base;
    return constrainedRarityPriority.filter((rarity) => base.includes(rarity)).slice(0, maxSamples);
  }

  private cloneAsset(asset: PreviewAssetPlan, providerOverride?: PreviewAssetPlan["provider"], servedFromCache = false): PreviewAssetPlan {
    return {
      ...asset,
      provider: providerOverride ?? asset.provider,
      generationMetadata: { ...(asset.generationMetadata ?? {}), servedFromCache },
      metadata: { ...(asset.metadata ?? {}), servedFromCache }
    };
  }

  private isFallbackPoster(asset: PreviewAssetPlan) {
    return asset.provider === "premium-fallback" || asset.generationMetadata?.premiumFallbackPoster === true || asset.metadata?.premiumFallbackPoster === true;
  }

  private premiumPosterSvg(style: GeneratedStyleProfile, identity: AuthoredIdentityBrief, request: ConceptRequest, index: number, logoData?: string, logoUri?: string) {
    const isHero = request.type === "BANNER";
    const width = isHero ? 1600 : 1024;
    const height = isHero ? 900 : 1360;
    const rarity = request.rarity ?? "Legendary";
    const intensity = this.rarityIntensity(rarity);
    const palette = this.posterPalette(style);
    const mood = request.rarity ? this.moodFor(style, request.rarity, index) : this.moodFor(style, "Legendary", index);
    const logo = this.safeImageReference(logoData) ?? this.safeImageReference(logoUri);
    const title = escapeXml(style.collection.replace(/^\$/, "").slice(0, 38));
    const subtitle = escapeXml((request.rarity ? `${request.rarity} faction splash` : "Cinematic faction launch").slice(0, 44));
    const culture = escapeXml(identity.culture.slice(0, 76));
    const moodLabel = escapeXml(`${mood.name}: ${mood.expression}`.slice(0, 86));
    const posterLabelY = isHero ? 748 : 1188;
    const scene = this.posterScene(rarity, isHero, width, height, intensity, palette, index);
    const grainSeed = Number.parseInt(this.hash(`${style.collection}:${rarity}:${index}`).slice(0, 6), 16) % 997;
    const rarityBars = Array.from({ length: Math.min(6, intensity + 1) }, (_, bar) => {
      const barHeight = 26 + bar * (isHero ? 15 : 20);
      const x = isHero ? 90 + bar * 30 : 70 + bar * 31;
      return `<rect x="${x}" y="${posterLabelY + 76 - barHeight}" width="15" height="${barHeight}" rx="2" fill="${bar % 2 ? palette.secondary : palette.primary}" opacity="${0.46 + bar * 0.07}"/>`;
    }).join("");
    const logoLayer = logo
      ? `<clipPath id="logoClip"><circle cx="${isHero ? 132 : 120}" cy="${isHero ? 120 : 116}" r="${isHero ? 58 : 54}"/></clipPath>
  <image href="${escapeXml(logo)}" x="${isHero ? 74 : 66}" y="${isHero ? 62 : 62}" width="${isHero ? 116 : 108}" height="${isHero ? 116 : 108}" preserveAspectRatio="xMidYMid slice" clip-path="url(#logoClip)"/>
  <circle cx="${isHero ? 132 : 120}" cy="${isHero ? 120 : 116}" r="${isHero ? 62 : 58}" fill="none" stroke="url(#rim)" stroke-width="4" opacity=".92"/>`
      : `<circle cx="${isHero ? 132 : 120}" cy="${isHero ? 120 : 116}" r="${isHero ? 62 : 58}" fill="${palette.primary}" opacity=".11" stroke="url(#rim)" stroke-width="4"/>
  <text x="${isHero ? 132 : 120}" y="${isHero ? 136 : 130}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${isHero ? 36 : 31}" font-weight="950" fill="${palette.primary}">${escapeXml(style.brandDna.tokenSymbol.replace(/^\$/, "").slice(0, 4))}</text>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title} ${subtitle}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#010403"/><stop offset=".36" stop-color="${palette.ink}"/><stop offset="1" stop-color="#05090f"/></linearGradient>
    <radialGradient id="eventGlow" cx="${isHero ? "67%" : "50%"}" cy="${intensity >= 5 ? "29%" : "38%"}" r="62%"><stop stop-color="${palette.primary}" stop-opacity="${0.22 + intensity * 0.055}"/><stop offset=".48" stop-color="${palette.secondary}" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette.primary}"/><stop offset=".46" stop-color="${palette.secondary}"/><stop offset="1" stop-color="${palette.accent}"/></linearGradient>
    <linearGradient id="monolith" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${palette.accent}" stop-opacity=".92"/><stop offset=".38" stop-color="${palette.primary}" stop-opacity=".26"/><stop offset="1" stop-color="#020806" stop-opacity=".94"/></linearGradient>
    <filter id="softGlow"><feGaussianBlur stdDeviation="${12 + intensity * 5}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="3" seed="${grainSeed}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .13"/></feComponentTransfer></filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#eventGlow)"/>
  ${scene}
  <g>${logoLayer}</g>
  <g font-family="Inter, Arial, sans-serif">
    <text x="${isHero ? 218 : 66}" y="${isHero ? 94 : 1008}" font-size="${isHero ? 18 : 18}" font-weight="900" fill="${palette.primary}" opacity=".86" letter-spacing="0">PREMIUM STUDIO</text>
    <text x="${isHero ? 218 : 66}" y="${isHero ? 124 : 1040}" font-size="${isHero ? 15 : 15}" font-weight="800" fill="#e2e8f0" opacity=".66" letter-spacing="0">CONCEPT POSTER</text>
    <text x="${isHero ? 88 : 66}" y="${posterLabelY}" font-size="${isHero ? 58 : 48}" font-weight="950" fill="#ffffff" letter-spacing="0">${title}</text>
    <text x="${isHero ? 90 : 68}" y="${posterLabelY + 40}" font-size="${isHero ? 24 : 24}" font-weight="900" fill="${palette.primary}" letter-spacing="0">${subtitle}</text>
    <text x="${isHero ? 90 : 68}" y="${posterLabelY + 94}" font-size="${isHero ? 18 : 18}" font-weight="800" fill="#cbd5e1" opacity=".9" letter-spacing="0">${moodLabel}</text>
    <text x="${isHero ? 90 : 68}" y="${posterLabelY + 124}" font-size="${isHero ? 15 : 15}" font-weight="700" fill="#94a3b8" opacity=".82" letter-spacing="0">${culture}</text>
    ${rarityBars}
  </g>
  <rect x="28" y="28" width="${width - 56}" height="${height - 56}" rx="18" fill="none" stroke="url(#rim)" stroke-width="${intensity >= 5 ? 5 : 3}" opacity=".72"/>
  <rect x="46" y="46" width="${width - 92}" height="${height - 92}" rx="10" fill="none" stroke="#ffffff" stroke-width="1" opacity=".08"/>
  <rect width="${width}" height="${height}" filter="url(#grain)" opacity=".55"/>
</svg>`;
  }

  private posterScene(rarity: string, isHero: boolean, width: number, height: number, intensity: number, palette: { primary: string; secondary: string; ink: string; accent: string }, index: number) {
    const cx = isHero ? Math.round(width * 0.68) : Math.round(width * 0.5);
    const horizon = isHero ? Math.round(height * 0.63) : Math.round(height * 0.68);
    const monolithTop = isHero ? 186 - intensity * 10 : 230 - intensity * 15;
    const monolithBottom = isHero ? 720 : 1090;
    const monolithWidth = isHero ? 290 + intensity * 35 : 320 + intensity * 44;
    const ringCount = intensity + 2;
    const beamCount = intensity + 3;
    const terrain = `<path d="M0 ${horizon} C ${width * 0.18} ${horizon - 55}, ${width * 0.32} ${horizon + 80}, ${width * 0.48} ${horizon + 10} S ${width * 0.82} ${horizon - 74}, ${width} ${horizon + 12} L ${width} ${height} L 0 ${height}Z" fill="#000" opacity=".46"/>`;
    const rings = Array.from({ length: ringCount }, (_, ring) => {
      const radiusX = (isHero ? 190 : 170) + ring * (isHero ? 58 : 46);
      const radiusY = (isHero ? 68 : 86) + ring * (isHero ? 18 : 26);
      return `<ellipse cx="${cx}" cy="${horizon - intensity * 20}" rx="${radiusX}" ry="${radiusY}" fill="none" stroke="${ring % 2 ? palette.secondary : palette.primary}" stroke-width="${ring % 3 === 0 ? 4 : 2}" opacity="${Math.max(0.08, 0.34 - ring * 0.035)}"/>`;
    }).join("");
    const beams = Array.from({ length: beamCount }, (_, beam) => {
      const angle = (beam - Math.floor(beamCount / 2)) * (isHero ? 42 : 30);
      const x1 = cx + angle;
      const x2 = cx + angle * (intensity >= 5 ? 3.8 : 2.7);
      return `<path d="M${x1} ${horizon - 40} L${x2} ${Math.max(40, monolithTop - 90)}" stroke="${beam % 2 ? palette.secondary : palette.accent}" stroke-width="${2 + (beam % 3)}" stroke-linecap="round" opacity="${0.17 + intensity * 0.025}"/>`;
    }).join("");
    const monolith = `<g filter="url(#softGlow)">
    <path d="M${cx - monolithWidth / 2} ${monolithBottom} L${cx - monolithWidth * 0.32} ${monolithTop + 110} L${cx - monolithWidth * 0.09} ${monolithTop} L${cx + monolithWidth * 0.18} ${monolithTop + 48} L${cx + monolithWidth / 2} ${monolithBottom} Z" fill="url(#monolith)" stroke="url(#rim)" stroke-width="${5 + intensity}" opacity=".95"/>
    <path d="M${cx - monolithWidth * 0.18} ${monolithBottom - 78} L${cx - monolithWidth * 0.05} ${monolithTop + 130} L${cx + monolithWidth * 0.18} ${monolithBottom - 40}" fill="none" stroke="${palette.primary}" stroke-width="${5 + intensity}" opacity=".38"/>
    <path d="M${cx + monolithWidth * 0.04} ${monolithTop + 94} L${cx + monolithWidth * 0.3} ${monolithBottom - 140}" fill="none" stroke="${palette.secondary}" stroke-width="${3 + intensity}" opacity=".32"/>
  </g>`;
    const foreground = Array.from({ length: Math.min(9, intensity + 4) }, (_, shard) => {
      const x = Math.round((width / (intensity + 5)) * (shard + 1));
      const h = 80 + shard * 18 + intensity * 12;
      const lean = shard % 2 ? 22 : -18;
      return `<path d="M${x} ${height} L${x + lean} ${height - h} L${x + lean + 28} ${height}" fill="${shard % 2 ? palette.secondary : palette.primary}" opacity="${0.08 + intensity * 0.012}"/>`;
    }).join("");
    const eventScale = rarity === "Mythic" || rarity === "Legendary"
      ? `<path d="M${cx - monolithWidth} ${monolithTop + 40} C${cx - monolithWidth * 0.42} ${monolithTop - 90}, ${cx + monolithWidth * 0.5} ${monolithTop - 80}, ${cx + monolithWidth} ${monolithTop + 62}" fill="none" stroke="${palette.accent}" stroke-width="${rarity === "Mythic" ? 12 : 8}" opacity="${rarity === "Mythic" ? ".42" : ".3"}"/>`
      : "";
    const moodPulse = `<path d="M${cx - monolithWidth * 0.58} ${horizon + 36} C${cx - monolithWidth * 0.2} ${horizon + 4}, ${cx + monolithWidth * 0.2} ${horizon + 4}, ${cx + monolithWidth * 0.58} ${horizon + 36}" fill="none" stroke="${palette.primary}" stroke-width="${3 + intensity}" opacity=".32"/>`;
    return `${terrain}${rings}${beams}${eventScale}${monolith}${moodPulse}${foreground}`;
  }

  private posterPalette(style: GeneratedStyleProfile) {
    const colors = [...style.colors, ...style.brandDna.logoPalette, "#baff00", "#16d7d2", "#f4c542"].filter(Boolean);
    const normalized = colors.map((color) => this.validHex(color)).filter(Boolean) as string[];
    return {
      primary: normalized[0] ?? "#baff00",
      secondary: normalized[1] ?? "#16d7d2",
      ink: normalized[2] ?? "#071017",
      accent: normalized[3] ?? "#f4c542"
    };
  }

  private validHex(value?: string) {
    const trimmed = String(value ?? "").trim();
    if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
    if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
      const [, r, g, b] = trimmed;
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return undefined;
  }

  private safeImageReference(value?: string) {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;
    if (/^data:image\/(?:png|jpeg|webp|svg\+xml);/i.test(trimmed)) return trimmed;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return undefined;
  }

  private cleanList(values: Array<string | undefined>, limit: number) {
    return [...new Set(values.map((value) => this.cleanPhrase(value)).filter(Boolean))].slice(0, limit);
  }

  private cleanPhrase(value?: string) {
    return String(value ?? "")
      .replace(/\b(metadata|taxonomy|semantic weights?|internal|fallback provider|source metadata|inferred identity|confidence|token native sparse)\b/gi, "")
      .replace(/\bmarket energy\b/gi, "late-night trading-room tension")
      .replace(/\bliquidity pressure\b/gi, "floor-room suspense")
      .replace(/\bsignal glow\b/gi, "broadcast aura")
      .replace(/\bchart energy\b/gi, "candlestick-shadow drama")
      .replace(/\btrait stack\b/gi, "visible design details")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private hasRequiredConceptSet(outputs: PreviewAssetPlan[]) {
    const hasHero = outputs.some((asset) => asset.type === "BANNER" && asset.uri);
    const rarities = new Set(outputs.filter((asset) => asset.type === "SAMPLE_NFT" && asset.uri).map((asset) => asset.metadata.rarity));
    return hasHero && this.requiredRarities().every((rarity) => rarities.has(rarity));
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
