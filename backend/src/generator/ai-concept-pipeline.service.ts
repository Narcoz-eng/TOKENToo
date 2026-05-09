import { Inject, Injectable, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { GeneratedStyleProfile, PreviewAssetPlan, TraitPackPlan } from "./generator.types";
import { OpenAIImageProvider, type ImageGenerationInput } from "./image-providers";
import { buildOpenAIImageRequest, resolveOpenAIImageModel, resolveOpenAIImageQuality, summarizeOpenAIImageRequest, validateOpenAIImageRequest } from "./openai-image-request";
import { escapeXml, svgUri } from "./renderers/svg";
import type { Rarity } from "./renderers/render-types";

type AiConceptProviderConfig = "openai" | "local-placeholder" | "cached-only";

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
    if (provider === "local-placeholder") return true;
    if (provider === "cached-only") return false;
    return (process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true" && Boolean(process.env.OPENAI_API_KEY);
  }

  availability() {
    const provider = this.provider();
    if (provider === "local-placeholder") {
      return {
        ready: true,
        code: "LOCAL_PLACEHOLDER_READY",
        message: "Local branded planning visual provider is ready."
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
    if (this.provider() === "local-placeholder") return this.generateLocalPlaceholder(style, pack, seedKey, logoData, logoUri, "local-preview-provider");
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
      throw new AiConceptGenerationError("OPENAI_REQUEST_FAILED", "OpenAI request failed: the concept preview did not include the required hero and rarity ladder images.", {
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
    return this.hasRequiredConceptSet(assets);
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

  generateLocalPlaceholder(style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string, logoData?: string, logoUri?: string, reason = "openai-unavailable"): PreviewAssetPlan[] {
    const requests = this.requests(style, pack, seedKey);
    const identity = this.authoredIdentityBrief(style);
    const dnaHash = this.dnaHash(style);
    const cacheKey = this.cacheKey(style, seedKey);
    const assets = requests.map((request, index): PreviewAssetPlan => {
      const promptHash = this.hash(request.prompt);
      const rarity = request.rarity;
      return {
        type: request.type,
        label: request.label.replace("AI concept", "planning visual"),
        uri: svgUri(this.placeholderSvg(style, identity, request, index, logoData, logoUri)),
        productionAssetStatus: "AI_CONCEPT",
        previewClassification: "AI_CONCEPT_PREVIEW",
        provider: "local-placeholder",
        promptHash,
        generationMetadata: {
          kind: request.kind,
          provider: "local-placeholder",
          planningVisual: true,
          reason,
          model: "local-branded-placeholder",
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
          planningVisual: true,
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
    this.rememberConcepts(cacheKey, assets);
    this.logger.log(
      JSON.stringify({
        event: "ai_concept_local_placeholder_ready",
        providerSelected: "local-placeholder",
        reason,
        imageCount: assets.length,
        promptHashes: assets.map((asset) => asset.promptHash),
        cacheKey,
        dnaHash
      })
    );
    return assets;
  }

  private requests(style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string): ConceptRequest[] {
    const identity = this.authoredIdentityBrief(style);
    const base = this.baseBrief(style, identity, seedKey);
    const heroCinema = this.cinematicDirection(style, "Legendary", 13);
    const heroEmotion = this.emotionalDirection(style, "Legendary", 29);
    const lowCost = this.lowCostMode();
    const hero = {
      type: "BANNER" as const,
      label: `${style.collection} AI hero concept`,
      kind: "collection-hero",
      size: lowCost ? "1024x1024" as const : "1536x1024" as const,
      prompt: `${base}
Create collection hero key art for a real civilization with emotional identity.
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
        label: `${style.collection} ${rarity} AI concept`,
        kind: "rarity-exemplar",
        rarity,
        size: lowCost ? "1024x1024" as const : "1024x1536" as const,
        prompt: `${base}
Create a ${rarity} rarity character concept as premium cinematic character art.
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
    return `Premium cinematic NFT collection concept art direction.
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
- Avoid generic mascot poses, flat trading-card composition, sterile game-ad polish, low-effort AI gloss, random neon clutter, and disconnected accessories.
Production note: this is AI_CONCEPT art direction only, not mintable final art; final NFTs require curated layer packs and deterministic rendering.
Quality bar: polished character design, strong silhouette, clean face/expression, visible emotion and body language, intentional detail placement, consistent collection style, premium collectible framing, no messy artifacts, no random text, no fake logos, no malformed anatomy.
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
    if (explicit === "openai" || explicit === "local-placeholder" || explicit === "cached-only") return explicit;
    if ((process.env.LOCAL_PREVIEW_PROVIDER ?? "").trim().toLowerCase() === "branded-placeholder") return "local-placeholder";
    return "openai";
  }

  private lowCostMode() {
    return (process.env.AI_CONCEPT_LOW_COST_MODE ?? process.env.LOW_COST_CONCEPT_MODE ?? "false").toLowerCase() === "true";
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

  private placeholderSvg(style: GeneratedStyleProfile, identity: AuthoredIdentityBrief, request: ConceptRequest, index: number, logoData?: string, logoUri?: string) {
    const isHero = request.type === "BANNER";
    const width = isHero ? 1600 : 1024;
    const height = isHero ? 900 : 1360;
    const rarity = request.rarity ?? "Legendary";
    const intensity = this.rarityIntensity(rarity);
    const palette = this.placeholderPalette(style);
    const mood = request.rarity ? this.moodFor(style, request.rarity, index) : this.moodFor(style, "Legendary", index);
    const logo = this.safeImageReference(logoData) ?? this.safeImageReference(logoUri);
    const title = escapeXml(style.collection.replace(/^\$/, "").slice(0, 36));
    const subtitle = escapeXml((request.rarity ? `${request.rarity} planning visual` : "Hero planning visual").slice(0, 40));
    const culture = escapeXml(identity.culture.slice(0, 72));
    const moodLabel = escapeXml(`${mood.name}: ${mood.expression}`.slice(0, 82));
    const shake = intensity >= 5 ? 24 : intensity >= 4 ? 14 : intensity >= 3 ? 8 : 3;
    const fxOpacity = 0.14 + intensity * 0.045;
    const subjectX = isHero ? 1020 : 512;
    const subjectY = isHero ? 520 : 680;
    const headY = subjectY - (isHero ? 165 : 205);
    const bodyHeight = isHero ? 430 : 560;
    const shoulderWidth = isHero ? 500 : 610;
    const capeWidth = shoulderWidth + intensity * 26;
    const eyeTilt = intensity >= 4 ? 9 : 4;
    const mouthPath = intensity >= 5 ? "M -72 82 Q 0 132 74 78" : intensity >= 4 ? "M -68 86 Q 0 116 68 86" : "M -56 82 Q 0 98 58 82";
    const posterLabelY = isHero ? 782 : 1224;
    const gridLines = Array.from({ length: isHero ? 9 : 11 }, (_, line) => {
      const x = Math.round((width / (isHero ? 8 : 10)) * line);
      return `<path d="M${x + (line % 2 ? shake : -shake)} 0 L${x - shake} ${height}" stroke="${palette.secondary}" stroke-opacity=".06" stroke-width="2"/>`;
    }).join("");
    const rarityBars = Array.from({ length: Math.min(6, intensity + 1) }, (_, bar) => {
      const barHeight = 22 + bar * 13;
      const x = isHero ? 90 + bar * 28 : 72 + bar * 28;
      return `<rect x="${x}" y="${posterLabelY + 62 - barHeight}" width="14" height="${barHeight}" rx="7" fill="${bar % 2 ? palette.secondary : palette.primary}" opacity="${0.48 + bar * 0.06}"/>`;
    }).join("");
    const logoLayer = logo
      ? `<clipPath id="logoClip"><circle cx="${isHero ? 142 : 134}" cy="${isHero ? 132 : 126}" r="${isHero ? 70 : 62}"/></clipPath>
  <image href="${escapeXml(logo)}" x="${isHero ? 72 : 72}" y="${isHero ? 62 : 64}" width="${isHero ? 140 : 124}" height="${isHero ? 140 : 124}" preserveAspectRatio="xMidYMid slice" clip-path="url(#logoClip)"/>
  <circle cx="${isHero ? 142 : 134}" cy="${isHero ? 132 : 126}" r="${isHero ? 73 : 65}" fill="none" stroke="${palette.primary}" stroke-width="5" opacity=".9"/>`
      : `<circle cx="${isHero ? 142 : 134}" cy="${isHero ? 132 : 126}" r="${isHero ? 72 : 64}" fill="${palette.primary}" opacity=".16"/>
  <text x="${isHero ? 142 : 134}" y="${isHero ? 146 : 139}" text-anchor="middle" font-size="${isHero ? 42 : 34}" font-weight="950" fill="${palette.primary}">${escapeXml(style.brandDna.tokenSymbol.replace(/^\$/, "").slice(0, 4))}</text>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title} ${subtitle}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#020806"/><stop offset=".42" stop-color="${palette.ink}"/><stop offset="1" stop-color="#07110d"/></linearGradient>
    <radialGradient id="halo" cx="${isHero ? "68%" : "50%"}" cy="36%" r="58%"><stop stop-color="${palette.primary}" stop-opacity="${fxOpacity}"/><stop offset=".5" stop-color="${palette.secondary}" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette.primary}"/><stop offset=".5" stop-color="${palette.secondary}"/><stop offset="1" stop-color="${palette.accent}"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="${10 + intensity * 4}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#halo)"/>
  ${gridLines}
  <path d="M0 ${height * 0.74} C ${width * 0.2} ${height * 0.62}, ${width * 0.36} ${height * 0.88}, ${width * 0.56} ${height * 0.7} S ${width * 0.84} ${height * 0.58}, ${width} ${height * 0.72} L ${width} ${height} L 0 ${height}Z" fill="#000" opacity=".42"/>
  <g opacity=".75">${Array.from({ length: intensity + 2 }, (_, spark) => `<path d="M${120 + spark * (isHero ? 190 : 118)} ${310 + (spark % 3) * 75} l${30 + spark * 5} ${-34 - spark * 6}" stroke="${spark % 2 ? palette.secondary : palette.primary}" stroke-width="${2 + (spark % 3)}" stroke-linecap="round" opacity=".42"/>`).join("")}</g>
  <g transform="translate(${subjectX} ${subjectY})" filter="url(#glow)">
    <path d="M ${-capeWidth / 2} ${bodyHeight * 0.46} Q ${-shoulderWidth / 2} ${-bodyHeight * 0.25} -90 -${bodyHeight * 0.32} Q 0 -${bodyHeight * 0.44} 92 -${bodyHeight * 0.32} Q ${shoulderWidth / 2} -${bodyHeight * 0.18} ${capeWidth / 2} ${bodyHeight * 0.46} Z" fill="#040806" stroke="url(#rim)" stroke-width="${8 + intensity}" opacity=".96"/>
    <path d="M -${shoulderWidth / 2.8} ${bodyHeight * 0.34} Q 0 ${bodyHeight * 0.13} ${shoulderWidth / 2.8} ${bodyHeight * 0.34}" fill="none" stroke="${palette.secondary}" stroke-width="${8 + intensity}" opacity=".62"/>
    <circle cx="0" cy="-${bodyHeight * 0.54}" r="${isHero ? 136 : 164}" fill="#050d0b" stroke="${palette.primary}" stroke-width="${10 + intensity}" />
    <path d="M -${isHero ? 122 : 146} -${bodyHeight * 0.62} Q 0 -${bodyHeight * 0.84} ${isHero ? 122 : 146} -${bodyHeight * 0.62}" fill="none" stroke="${palette.accent}" stroke-width="${7 + intensity}" opacity=".85"/>
    <g transform="translate(0 -${bodyHeight * 0.56})">
      <path d="M -92 ${-eyeTilt} Q -52 -38 -12 -${eyeTilt}" stroke="${palette.primary}" stroke-width="${13 + intensity}" stroke-linecap="round"/>
      <path d="M 12 -${eyeTilt} Q 52 -38 92 ${-eyeTilt}" stroke="${palette.primary}" stroke-width="${13 + intensity}" stroke-linecap="round"/>
      <path d="${mouthPath}" fill="none" stroke="${palette.secondary}" stroke-width="${8 + intensity}" stroke-linecap="round"/>
    </g>
    <path d="M -${65 + intensity * 9} ${bodyHeight * 0.02} L ${65 + intensity * 9} ${bodyHeight * 0.02} L ${45 + intensity * 7} ${bodyHeight * 0.21} L -${45 + intensity * 7} ${bodyHeight * 0.21}Z" fill="${palette.primary}" opacity=".12" stroke="${palette.primary}" stroke-width="4"/>
  </g>
  <g>
    ${logoLayer}
    <text x="${isHero ? 232 : 72}" y="${isHero ? 104 : 1030}" font-family="Inter, Arial, sans-serif" font-size="${isHero ? 22 : 24}" font-weight="950" fill="${palette.primary}" letter-spacing="0">PHEW.RUN</text>
    <text x="${isHero ? 232 : 72}" y="${isHero ? 137 : 1064}" font-family="Inter, Arial, sans-serif" font-size="${isHero ? 18 : 18}" font-weight="850" fill="#d8ffe1" opacity=".82" letter-spacing="0">PLANNING VISUAL</text>
  </g>
  <g font-family="Inter, Arial, sans-serif">
    <text x="${isHero ? 90 : 72}" y="${posterLabelY}" font-size="${isHero ? 58 : 48}" font-weight="950" fill="#ffffff" letter-spacing="0">${title}</text>
    <text x="${isHero ? 92 : 74}" y="${posterLabelY + 40}" font-size="${isHero ? 24 : 24}" font-weight="900" fill="${palette.primary}" letter-spacing="0">${subtitle}</text>
    <text x="${isHero ? 92 : 74}" y="${posterLabelY + 92}" font-size="${isHero ? 18 : 18}" font-weight="800" fill="#cbd5e1" opacity=".9" letter-spacing="0">${moodLabel}</text>
    <text x="${isHero ? 92 : 74}" y="${posterLabelY + 122}" font-size="${isHero ? 15 : 15}" font-weight="700" fill="#94a3b8" opacity=".82" letter-spacing="0">${culture}</text>
    ${rarityBars}
  </g>
  <rect x="28" y="28" width="${width - 56}" height="${height - 56}" rx="22" fill="none" stroke="url(#rim)" stroke-width="4" opacity=".72"/>
  <rect x="44" y="44" width="${width - 88}" height="${height - 88}" rx="14" fill="none" stroke="#ffffff" stroke-width="1" opacity=".08"/>
</svg>`;
  }

  private placeholderPalette(style: GeneratedStyleProfile) {
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
