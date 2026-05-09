import { Injectable } from "@nestjs/common";
import type {
  GeneratedStyleProfile,
  PreviewAssetPlan,
  RenderingEngineName,
  TraitCategoryRole,
  TraitPackPlan,
  VisualDesignSystem,
  VisualRarityFrame
} from "./generator.types";
import { pick, seedFrom } from "./generator.util";
import { PreviewRendererRegistry } from "./renderers/renderer-registry";
import { paletteFrom, svgUri } from "./renderers/svg";
import type { PreviewMode, Rarity, RenderContext, RenderMood, RenderSignature } from "./renderers/render-types";
import { rarityLadder } from "./renderers/render-types";

@Injectable()
export class ArtPreviewGeneratorService {
  private readonly renderers = new PreviewRendererRegistry();

  generate(style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string, reroll = 0): PreviewAssetPlan[] {
    const seed = seedFrom(`${style.collection}:${seedKey}:${reroll}`);
    const avatar = this.render(style, {
      title: style.collection,
      subtitle: style.mascot,
      width: 900,
      height: 900,
      seed,
      mode: "avatar",
      rarity: "Rare"
    });
    const banner = this.render(style, {
      title: style.raidTheme,
      subtitle: style.backgroundWorld,
      width: 1600,
      height: 640,
      seed: seed + 19,
      mode: "banner",
      rarity: "Epic"
    });

    return [
      {
        type: "AVATAR",
        label: `${style.collection} wireframe avatar`,
        uri: svgUri(avatar.svg),
        productionAssetStatus: "WIREFRAME",
        previewClassification: "WIREFRAME_CONCEPT",
        provider: "wireframe",
        generationMetadata: { warning: "Wireframe preview only.", mode: "avatar" },
        metadata: { mascot: style.mascot, artStyle: style.artStyle, visualSystem: this.visual(style), ...avatar.signature }
      },
      {
        type: "BANNER",
        label: `${style.collection} wireframe banner`,
        uri: svgUri(banner.svg),
        productionAssetStatus: "WIREFRAME",
        previewClassification: "WIREFRAME_CONCEPT",
        provider: "wireframe",
        generationMetadata: { warning: "Wireframe preview only.", mode: "banner" },
        metadata: { raidTheme: style.raidTheme, world: style.backgroundWorld, visualSystem: this.visual(style), ...banner.signature }
      },
      ...rarityLadder.map((rarity, index) => this.sample(style, pack, seed + index * 101, index + 1, rarity))
    ];
  }

  private sample(style: GeneratedStyleProfile, pack: TraitPackPlan, seed: number, index: number, rarity: Rarity): PreviewAssetPlan {
    const visual = this.visual(style);
    const intensity = this.rarityIntensity(rarity);
    const fallbackRule = this.rarityVisualRulePlan(rarity);
    const rule = style.brandDna?.rarityVisualRules?.[rarity] ?? style.brandDna?.rarityVisualRules?.Common ?? fallbackRule;
    const categories = {
      base: this.categoryFor(pack, "base"),
      background: this.categoryFor(pack, "background"),
      head: this.categoryFor(pack, "head"),
      eyes: this.categoryFor(pack, "eyes"),
      mouth: this.categoryFor(pack, "mouth"),
      body: this.categoryFor(pack, "body"),
      prop: this.categoryFor(pack, "prop"),
      neck: this.categoryFor(pack, "neck"),
      aura: this.categoryFor(pack, "aura"),
      frame: this.categoryFor(pack, "frame"),
      legendary: this.categoryFor(pack, "legendary"),
      animation: this.categoryFor(pack, "animation")
    };
    const mood = this.moodFor(style, rarity, seed);
    const headgear = intensity >= 3 ? pick(categories.head.values, seed + 2) : `${this.identityPrefix(style)} ${this.shortFrame(visual.headShape)}`;
    const eyePool = /Mask|Helm|Kabuto|Hood|Shell|Shield/i.test(headgear) ? categories.eyes.values.filter((eye) => !/Visor|Scanner|Screen/i.test(eye)) : categories.eyes.values;
    const traits = {
      base: intensity >= 5 ? pick(categories.base.values.slice(18), seed) : intensity >= 4 ? pick(categories.base.values.slice(8, 24), seed) : pick(categories.base.values.slice(0, 10), seed),
      background: intensity >= 4 ? pick(categories.background.values.slice(20), seed + 1) : intensity >= 3 ? pick(categories.background.values.slice(8, 34), seed + 1) : pick(categories.background.values.slice(0, 12), seed + 1),
      headgear,
      eyes: intensity >= 1 ? pick(eyePool.length ? eyePool : categories.eyes.values, seed + 3) : mood.eyeLanguage,
      mouthExpression: intensity >= 2 ? pick(categories.mouth.values, seed + 10) : mood.mouthLanguage,
      outfit: intensity >= 3 ? pick(categories.body.values, seed + 4) : `${this.identityPrefix(style)} ${this.shortFrame(visual.anatomyModel)}`,
      accessory: pick(categories.prop.values, seed + 5),
      neckChestAccessory: intensity >= 4 ? pick(categories.neck.values, seed + 6) : `${this.identityPrefix(style)} ${this.shortFrame(visual.proportionSystem)}`,
      aura: intensity >= 4 ? pick(categories.aura.values, seed + 6) : `${this.identityPrefix(style)} ${this.shortFrame(visual.lightingModel)}`,
      frame: intensity >= 5 ? pick(categories.frame.values, seed + 7) : `${this.shortFrame(visual.cardStructure)} edge`,
      legendaryOverlay: intensity >= 5 ? pick(categories.legendary.values, seed + 9) : `${this.identityPrefix(style)} no signature scene`,
      animationOverlay: intensity >= 5 ? pick(categories.animation.values, seed + 8) : visual.emotionalRendering,
      mood: mood.name,
      expression: mood.expression,
      gesture: mood.gesture,
      rarity,
      specialMetadataFlag: rarity === "Mythic" ? "MYTHIC_CURATED_COMPOSITION" : rarity === "Legendary" ? "LEGENDARY_SIGNATURE_SCENE" : "NONE",
      categoryLabels: {
        base: categories.base.label,
        background: categories.background.label,
        headgear: categories.head.label,
        eyes: categories.eyes.label,
        mouthExpression: categories.mouth.label,
        outfit: categories.body.label,
        accessory: categories.prop.label,
        neckChestAccessory: categories.neck.label,
        aura: categories.aura.label,
        frame: categories.frame.label,
        legendaryOverlay: categories.legendary.label,
        animationOverlay: categories.animation.label
      }
    };
    const rendered = this.render(style, {
      title: String(traits.base ?? style.collection),
      subtitle: `${rarity} / ${mood.name}`,
      width: 900,
      height: 1100,
      seed,
      mode: "nft",
      rarity,
      traits
    });
    const renderedTraitKeys = this.renderedTraitKeys(traits);
    const renderedTraits = this.renderedTraits(traits, pack);
    const metadata = {
      ...traits,
      ...rendered.signature,
      pose: rendered.signature.postureVariant,
      scene: rarity === "Legendary" || rarity === "Mythic" ? rendered.signature.eventFrame : rendered.signature.environmentVariant,
      visualRule: rendered.signature.compositionCode,
      renderingEngine: rendered.signature.rendererPipeline,
      rendererFamily: this.visual(style).rendererFamily,
      compositionCategory: rarity === "Mythic" ? "near-1-of-1" : rarity === "Legendary" ? "signature-scene" : rarity === "Epic" ? "premium-composition" : "standard-composition",
      traitCount: renderedTraitKeys.length,
      renderedTraitKeys,
      renderedTraits,
      animationReadiness: style.creativeUniverse.animationReadiness,
      visualSystem: visual,
      bodySystem: visual.bodySystem,
      headShape: visual.headShape,
      eyeSystem: visual.eyeSystem,
      mouthSystem: visual.mouthSystem,
      compositionStyle: visual.compositionStyle,
      lightingModel: visual.lightingModel,
      artProductionStatus: "WIREFRAME",
      productionAssetStatus: "WIREFRAME",
      previewClassification: "WIREFRAME_CONCEPT",
      warning: "Wireframe preview only.",
      complexityRule: {
        minTraits: rule.minTraits,
        maxTraits: rule.maxTraits,
        aura: rule.aura,
        frame: rule.frame
      }
    };

    return {
      type: "SAMPLE_NFT",
      label: `${style.collection} ${rarity} wireframe #${index}`,
      uri: svgUri(rendered.svg),
      productionAssetStatus: "WIREFRAME",
      previewClassification: "WIREFRAME_CONCEPT",
      provider: "wireframe",
      generationMetadata: { warning: "Wireframe preview only.", mode: "nft", rarity },
      metadata
    };
  }

  private render(style: GeneratedStyleProfile, options: { title: string; subtitle: string; width: number; height: number; seed: number; mode: PreviewMode; rarity: Rarity; traits?: Record<string, unknown> }) {
    const visual = this.visual(style);
    const frame = visual.rarityFrames?.[options.rarity] ?? this.fallbackRarityFrame(visual, options.rarity);
    const ctx: RenderContext = {
      style,
      title: options.title,
      subtitle: options.subtitle,
      width: options.width,
      height: options.height,
      seed: options.seed,
      mode: options.mode,
      rarity: options.rarity,
      intensity: this.rarityIntensity(options.rarity),
      family: visual.rendererFamily,
      engine: visual.renderingEngine ?? this.engineForFamily(visual.rendererFamily),
      visual,
      frame,
      mood: this.moodFor(style, options.rarity, options.seed),
      palette: paletteFrom(style.colors),
      traits: options.traits
    };
    return this.renderers.render(ctx);
  }

  private visual(style: GeneratedStyleProfile) {
    return style.creativeUniverse.creativeDna.visualSystem;
  }

  private fallbackRarityFrame(visual: VisualDesignSystem, rarity: Rarity): VisualRarityFrame {
    return {
      rarity,
      composition: `${visual.renderingEngine}: ${visual.compositionStyle}`,
      camera: visual.cameraSystem,
      subjectTreatment: visual.anatomyModel,
      faceTreatment: visual.faceGrammar,
      bodyLanguage: visual.emotionalRendering,
      environment: visual.environmentSystem,
      lighting: visual.lightingModel,
      event: visual.legendaryPhilosophy,
      silhouetteMutation: visual.rarityProgression,
      animationCue: visual.emotionalRendering
    };
  }

  private engineForFamily(family: VisualDesignSystem["rendererFamily"]): RenderingEngineName {
    if (family === "pixel-topdown") return "pixel-engine";
    if (family === "retro-arcade") return "arcade-engine";
    if (family === "clay-toy") return "clay-render-engine";
    if (family === "biohazard-horror") return "horror-engine";
    if (family === "terminal-brutalist") return "terminal-engine";
    if (family === "comic-panel") return "comic-panel-engine";
    if (family === "cinematic-scene") return "cinematic-engine";
    if (family === "propaganda-poster") return "poster-engine";
    if (family === "sticker-pack" || family === "children-cartoon") return "sticker-engine";
    if (family === "low-poly") return "low-poly-engine";
    if (family === "anime-portrait" || family === "painterly-portrait") return "portrait-engine";
    return "surreal-engine";
  }

  private rarityIntensity(rarity: Rarity | string) {
    if (rarity === "Mythic") return 6;
    if (rarity === "Legendary") return 5;
    if (rarity === "Epic") return 4;
    if (rarity === "Rare") return 3;
    if (rarity === "Uncommon") return 2;
    return 1;
  }

  private rarityVisualRulePlan(rarity: Rarity) {
    const rules: Record<Rarity, { minTraits: number; maxTraits: number; pose: string; background: string; aura: "none" | "mild" | "strong" | "signature"; frame: "none" | "standard" | "special" | "mythic"; composition: string }> = {
      Common: { minTraits: 2, maxTraits: 4, pose: "base identity pose", background: "simple renderer scene", aura: "none", frame: "none", composition: "identity read with renderer-specific base composition" },
      Uncommon: { minTraits: 3, maxTraits: 5, pose: "tilted expression variation", background: "first environment shift", aura: "none", frame: "standard", composition: "visible expression, posture, or camera change" },
      Rare: { minTraits: 5, maxTraits: 7, pose: "asymmetric acting pose", background: "richer environment depth", aura: "mild", frame: "standard", composition: "stronger face/body/environment read" },
      Epic: { minTraits: 7, maxTraits: 9, pose: "action or emotional event pose", background: "premium scene", aura: "strong", frame: "special", composition: "lighting, anatomy, and camera escalation" },
      Legendary: { minTraits: 9, maxTraits: 11, pose: "scene-specific event pose", background: "legendary event environment", aura: "signature", frame: "special", composition: "new camera, scene, face, silhouette, and event" },
      Mythic: { minTraits: 10, maxTraits: 12, pose: "near 1/1 transformed scene pose", background: "mythic world takeover", aura: "signature", frame: "mythic", composition: "near 1/1 scene-level composition" }
    };
    return rules[rarity];
  }

  private renderedTraitKeys(traits: Record<string, unknown>) {
    const visibleKeys = ["base", "background", "eyes", "mouthExpression", "headgear", "outfit", "accessory", "neckChestAccessory", "aura", "frame", "legendaryOverlay"];
    const rarity = String(traits.rarity ?? "");
    const caps: Record<string, number> = { Common: 4, Uncommon: 5, Rare: 7, Epic: 9, Legendary: 11, Mythic: 12 };
    return visibleKeys.filter((key) => {
      const value = String(traits[key] ?? "");
      return value && !/None|Base pose|Base expression|Static Still|Standard frame|simple head mark|restrained FX|clean edge|no signature scene|idle still|base outfit|small badge/i.test(value);
    }).slice(0, caps[rarity] ?? 12);
  }

  private renderedTraits(traits: Record<string, unknown>, pack: TraitPackPlan) {
    const mapping: Array<[TraitCategoryRole, string, string]> = [
      ["base", "base", "Base Character"],
      ["background", "background", "Background"],
      ["head", "headgear", "Head"],
      ["eyes", "eyes", "Eyes"],
      ["mouth", "mouthExpression", "Mouth/Expression"],
      ["body", "outfit", "Body/Outfit"],
      ["prop", "accessory", "Prop"],
      ["neck", "neckChestAccessory", "Neck/Badge"],
      ["aura", "aura", "FX/Event"],
      ["frame", "frame", "Composition Edge"],
      ["legendary", "legendaryOverlay", "Signature Scene"],
      ["animation", "animationOverlay", "Animation Layer"]
    ];
    return mapping
      .map(([role, key, fallback]) => {
        const value = traits[key];
        const categoryId = pack.categoryRoles?.[role];
        return {
          role,
          key,
          trait_type: categoryId ? pack.categoryLabels?.[categoryId] ?? fallback : fallback,
          value
        };
      })
      .filter((trait) => typeof trait.value === "string" && !/None|Base pose|Base expression|Static Still|Standard frame/i.test(trait.value));
  }

  private categoryFor(pack: TraitPackPlan, role: TraitCategoryRole) {
    const categoryId = pack.categoryRoles?.[role];
    const values = categoryId ? pack.categories[categoryId] ?? [] : [];
    const fallback = Object.values(pack.categories)[0] ?? ["Missing Trait"];
    return {
      id: categoryId ?? role,
      label: categoryId ? pack.categoryLabels?.[categoryId] ?? categoryId : role,
      values: values.length ? values : fallback
    };
  }

  private moodFor(style: GeneratedStyleProfile, rarity: Rarity, seed: number): RenderMood {
    const moods = style.creativeUniverse?.moodCulture ?? [];
    const index = rarity === "Mythic" ? moods.length - 1 : rarity === "Legendary" ? Math.max(0, moods.length - 2) : seed % Math.max(1, moods.length);
    return moods[Math.max(0, index)] ?? {
      name: `${this.identityPrefix(style)} focused`,
      expression: "focused",
      eyeLanguage: "community eyes",
      mouthLanguage: "community expression",
      stance: "readable stance",
      gesture: "identity prop hold",
      auraBehavior: "low FX",
      animationState: "idle"
    };
  }

  private identityPrefix(style: GeneratedStyleProfile) {
    return String(style.brandDna?.tokenName ?? style.collection).split(/\s+/).filter(Boolean).slice(0, 2).join(" ") || "Token";
  }

  private shortFrame(value: string) {
    return value.split(/[.;]/)[0]?.trim().slice(0, 72) || "visual state";
  }
}
