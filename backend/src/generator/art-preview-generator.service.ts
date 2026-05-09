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

type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Mythic";
type PreviewMode = "avatar" | "banner" | "nft";

type SceneRenderPlan = {
  rarity: Rarity;
  mode: PreviewMode;
  family: VisualDesignSystem["rendererFamily"];
  engine: RenderingEngineName;
  frame: VisualRarityFrame;
  intensity: number;
  x: number;
  y: number;
  scale: number;
  tilt: number;
  cameraVariant: string;
  faceVariant: string;
  eyeVariant: string;
  mouthVariant: string;
  postureVariant: string;
  silhouetteVariant: string;
  lightingVariant: string;
  environmentVariant: string;
  eventFrame: string;
  animationCue: string;
};

const rarityLadder: Rarity[] = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];

@Injectable()
export class ArtPreviewGeneratorService {
  generate(style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string, reroll = 0): PreviewAssetPlan[] {
    const seed = seedFrom(`${style.collection}:${seedKey}:${reroll}`);
    return [
      {
        type: "AVATAR",
        label: `${style.collection} avatar`,
        uri: this.svgUri(this.avatarSvg(style, seed)),
        metadata: { mascot: style.mascot, artStyle: style.artStyle, visualSystem: style.creativeUniverse.creativeDna.visualSystem }
      },
      {
        type: "BANNER",
        label: `${style.collection} banner`,
        uri: this.svgUri(this.bannerSvg(style, seed + 19)),
        metadata: { raidTheme: style.raidTheme, world: style.backgroundWorld, visualSystem: style.creativeUniverse.creativeDna.visualSystem }
      },
      ...rarityLadder.map((rarity, index) => this.sample(style, pack, seed + index * 101, index + 1, rarity))
    ];
  }

  private sample(style: GeneratedStyleProfile, pack: TraitPackPlan, seed: number, index: number, rarity: Rarity): PreviewAssetPlan {
    const visual = this.visual(style);
    const intensity = this.rarityIntensity(rarity);
    const fallbackRule = this.rarityVisualRulePlan(rarity);
    const rule = style.brandDna?.rarityVisualRules?.[rarity] ?? style.brandDna?.rarityVisualRules?.Common ?? fallbackRule;
    const scenePlan = this.scenePlan(style, rarity, "nft", seed);
    const baseCategory = this.categoryFor(pack, "base");
    const backgroundCategory = this.categoryFor(pack, "background");
    const headCategory = this.categoryFor(pack, "head");
    const eyesCategory = this.categoryFor(pack, "eyes");
    const mouthCategory = this.categoryFor(pack, "mouth");
    const bodyCategory = this.categoryFor(pack, "body");
    const propCategory = this.categoryFor(pack, "prop");
    const neckCategory = this.categoryFor(pack, "neck");
    const auraCategory = this.categoryFor(pack, "aura");
    const frameCategory = this.categoryFor(pack, "frame");
    const legendaryCategory = this.categoryFor(pack, "legendary");
    const animationCategory = this.categoryFor(pack, "animation");
    const mood = this.moodFor(style, rarity, seed);
    const headgear = intensity >= 3 ? pick(headCategory.values, seed + 2) : `${this.identityPrefix(style)} head state ${scenePlan.eyeVariant}`;
    const eyePool = /Mask|Helm|Kabuto|Hood|Shell|Shield/i.test(headgear) ? eyesCategory.values.filter((eye) => !/Visor|Scanner|Screen/i.test(eye)) : eyesCategory.values;
    const traits = {
      base: intensity >= 5 ? pick(baseCategory.values.slice(18), seed) : intensity >= 4 ? pick(baseCategory.values.slice(8, 24), seed) : pick(baseCategory.values.slice(0, 10), seed),
      background: intensity >= 4 ? pick(backgroundCategory.values.slice(20), seed + 1) : intensity >= 3 ? pick(backgroundCategory.values.slice(8, 34), seed + 1) : pick(backgroundCategory.values.slice(0, 12), seed + 1),
      headgear,
      eyes: intensity >= 1 ? pick(eyePool.length ? eyePool : eyesCategory.values, seed + 3) : scenePlan.eyeVariant,
      mouthExpression: intensity >= 2 ? pick(mouthCategory.values, seed + 10) : mood.mouthLanguage,
      outfit: intensity >= 3 ? pick(bodyCategory.values, seed + 4) : `${this.identityPrefix(style)} ${scenePlan.postureVariant}`,
      accessory: pick(propCategory.values, seed + 5),
      neckChestAccessory: intensity >= 4 ? pick(neckCategory.values, seed + 6) : `${this.identityPrefix(style)} small ${scenePlan.silhouetteVariant}`,
      aura: intensity >= 4 ? pick(auraCategory.values, seed + 6) : `${this.identityPrefix(style)} ${scenePlan.lightingVariant}`,
      frame: intensity >= 5 ? pick(frameCategory.values, seed + 7) : `${scenePlan.cameraVariant} edge`,
      legendaryOverlay: intensity >= 5 ? pick(legendaryCategory.values, seed + 9) : `${this.identityPrefix(style)} no signature scene`,
      animationOverlay: intensity >= 5 ? pick(animationCategory.values, seed + 8) : scenePlan.animationCue,
      pose: scenePlan.postureVariant,
      scene: intensity >= 5 ? scenePlan.eventFrame : scenePlan.environmentVariant,
      visualRule: scenePlan.frame.composition,
      mood: mood.name,
      expression: mood.expression,
      eyeLanguage: `${mood.eyeLanguage}; rendered as ${scenePlan.eyeVariant}`,
      mouthLanguage: `${mood.mouthLanguage}; rendered as ${scenePlan.mouthVariant}`,
      stance: `${mood.stance}; rendered as ${scenePlan.postureVariant}`,
      gesture: mood.gesture,
      rarity,
      compositionCategory: rarity === "Mythic" ? "near-1-of-1" : rarity === "Legendary" ? "signature-scene" : rarity === "Epic" ? "premium-composition" : "standard-composition",
      specialMetadataFlag: rarity === "Mythic" ? "MYTHIC_CURATED_COMPOSITION" : rarity === "Legendary" ? "LEGENDARY_SIGNATURE_SCENE" : "NONE",
      renderingEngine: scenePlan.engine,
      rendererFamily: scenePlan.family,
      cameraVariant: scenePlan.cameraVariant,
      faceVariant: scenePlan.faceVariant,
      eyeVariant: scenePlan.eyeVariant,
      mouthVariant: scenePlan.mouthVariant,
      silhouetteVariant: scenePlan.silhouetteVariant,
      lightingVariant: scenePlan.lightingVariant,
      environmentVariant: scenePlan.environmentVariant,
      eventFrame: scenePlan.eventFrame,
      animationCue: scenePlan.animationCue,
      visualScenePlan: scenePlan.frame,
      renderFingerprint: `${scenePlan.engine}:${scenePlan.cameraVariant}:${scenePlan.faceVariant}:${scenePlan.silhouetteVariant}:${scenePlan.eventFrame}`,
      categoryLabels: {
        base: baseCategory.label,
        background: backgroundCategory.label,
        headgear: headCategory.label,
        eyes: eyesCategory.label,
        mouthExpression: mouthCategory.label,
        outfit: bodyCategory.label,
        accessory: propCategory.label,
        neckChestAccessory: neckCategory.label,
        aura: auraCategory.label,
        frame: frameCategory.label,
        legendaryOverlay: legendaryCategory.label,
        animationOverlay: animationCategory.label
      }
    };
    const renderedTraitKeys = this.renderedTraitKeys(traits);
    const renderedTraits = this.renderedTraits(traits, pack);
    const metadata = {
      ...traits,
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
      artProductionStatus: style.productionAssetPolicy.launchClassification,
      complexityRule: {
        minTraits: rule.minTraits,
        maxTraits: rule.maxTraits,
        aura: rule.aura,
        frame: rule.frame
      }
    };

    return {
      type: "SAMPLE_NFT",
      label: `${style.collection} ${rarity} concept #${index}`,
      uri: this.svgUri(this.nftSvg(style, metadata, seed)),
      metadata
    };
  }

  private avatarSvg(style: GeneratedStyleProfile, seed: number) {
    return this.scene(style, {
      width: 900,
      height: 900,
      title: style.collection,
      seed,
      mode: "avatar"
    });
  }

  private bannerSvg(style: GeneratedStyleProfile, seed: number) {
    return this.scene(style, {
      width: 1600,
      height: 640,
      title: style.raidTheme,
      seed,
      mode: "banner"
    });
  }

  private nftSvg(style: GeneratedStyleProfile, traits: Record<string, unknown>, seed: number) {
    return this.scene(style, {
      width: 900,
      height: 1100,
      title: String(traits.base ?? style.collection),
      seed,
      mode: "nft",
      traits
    });
  }

  private scene(style: GeneratedStyleProfile, options: { width: number; height: number; title: string; seed: number; mode: PreviewMode; traits?: Record<string, unknown> }) {
    const w = options.width;
    const h = options.height;
    const rarity = this.rarity(String(options.traits?.rarity ?? "Rare"));
    const plan = this.scenePlan(style, rarity, options.mode, options.seed);
    const [primary = "#79f2ff", secondary = "#111827", ink = "#050712", accent = "#f4f7fb"] = style.colors;
    const background = this.engineBackground(plan, style, w, h, primary, secondary, ink, accent, options.seed);
    const stage = this.engineStage(plan, w, h, primary, secondary, ink, accent, options.seed);
    const subject = this.engineSubject(plan, style, w, h, primary, secondary, ink, accent, options.seed);
    const event = this.engineEvent(plan, style, w, h, primary, secondary, ink, accent, options.seed);
    const text = this.engineText(plan, options.title, String(options.traits?.mood ?? style.backgroundWorld), w, h, primary, secondary, ink, accent);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" data-engine="${plan.engine}" data-rarity="${plan.rarity}">
  <defs>
    <filter id="shadow"><feDropShadow dx="0" dy="${plan.engine === "clay-render-engine" ? 18 : 8}" stdDeviation="${plan.engine === "clay-render-engine" ? 14 : 6}" flood-color="#000" flood-opacity="0.38"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="${plan.engine === "poster-engine" ? 0.28 : 0.78}" numOctaves="4" seed="${options.seed % 997}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.15"/></feComponentTransfer></filter>
    <linearGradient id="sceneLight" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${primary}"/><stop offset="0.5" stop-color="${secondary}"/><stop offset="1" stop-color="${accent}"/></linearGradient>
  </defs>
  ${background}
  ${stage}
  ${subject}
  ${event}
  ${text}
</svg>`;
  }

  private scenePlan(style: GeneratedStyleProfile, rarity: Rarity, mode: PreviewMode, seed: number): SceneRenderPlan {
    const visual = this.visual(style);
    const frame = visual.rarityFrames?.[rarity] ?? this.fallbackRarityFrame(visual, rarity);
    const intensity = this.rarityIntensity(rarity);
    const engine = visual.renderingEngine ?? this.engineForFamily(visual.rendererFamily);
    const cameraVariants: Record<Rarity, string> = {
      Common: "identity-read",
      Uncommon: "tilted-variant",
      Rare: "foreground-depth",
      Epic: "action-diagonal",
      Legendary: "event-wide-or-closeup",
      Mythic: "one-off-world-camera"
    };
    const faceVariants: Record<Rarity, string> = {
      Common: "neutral-read",
      Uncommon: "blink-or-side-eye",
      Rare: "asymmetric-expression",
      Epic: "high-emotion-face",
      Legendary: "scene-specific-reaction",
      Mythic: "transformed-one-off-face"
    };
    const silhouettes: Record<Rarity, string> = {
      Common: "base-outline",
      Uncommon: "prop-break-outline",
      Rare: "secondary-shape-outline",
      Epic: "action-silhouette",
      Legendary: "event-silhouette",
      Mythic: "near-one-of-one-silhouette"
    };
    const offset = {
      Common: [-0.02, 0.02, 0.96, -3],
      Uncommon: [-0.14, 0.04, 0.9, 8],
      Rare: [0.13, -0.03, 1.0, -10],
      Epic: [-0.19, -0.08, 1.03, 14],
      Legendary: [0.24, -0.13, 0.66, -18],
      Mythic: [-0.28, -0.16, 0.56, 24]
    }[rarity];
    const familyShift = this.familyCameraShift(visual.rendererFamily, rarity);
    return {
      rarity,
      mode,
      family: visual.rendererFamily,
      engine,
      frame,
      intensity,
      x: 0.5 + offset[0] + familyShift.x,
      y: mode === "banner" ? 0.54 + familyShift.y * 0.35 : 0.46 + offset[1] + familyShift.y,
      scale: mode === "banner" ? offset[2] * 0.75 : offset[2] * familyShift.scale,
      tilt: offset[3] + familyShift.tilt,
      cameraVariant: `${cameraVariants[rarity]} / ${frame.camera}`,
      faceVariant: `${faceVariants[rarity]} / ${frame.faceTreatment}`,
      eyeVariant: this.eyeVariant(frame.faceTreatment, rarity),
      mouthVariant: this.mouthVariant(frame.faceTreatment, rarity),
      postureVariant: frame.bodyLanguage,
      silhouetteVariant: `${silhouettes[rarity]} / ${frame.silhouetteMutation}`,
      lightingVariant: frame.lighting,
      environmentVariant: frame.environment,
      eventFrame: frame.event,
      animationCue: frame.animationCue
    };
  }

  private familyCameraShift(family: VisualDesignSystem["rendererFamily"], rarity: Rarity) {
    const high = rarity === "Legendary" || rarity === "Mythic";
    const shifts: Partial<Record<VisualDesignSystem["rendererFamily"], { x: number; y: number; scale: number; tilt: number }>> = {
      "pixel-topdown": { x: high ? -0.04 : 0.02, y: high ? 0.1 : 0.02, scale: high ? 0.82 : 0.94, tilt: 0 },
      "anime-portrait": { x: high ? 0.1 : -0.03, y: high ? 0.03 : 0, scale: high ? 0.94 : 1.03, tilt: high ? -5 : 1 },
      "clay-toy": { x: high ? -0.08 : 0.01, y: high ? 0.08 : 0.03, scale: high ? 0.84 : 0.98, tilt: high ? 4 : 0 },
      "biohazard-horror": { x: high ? 0.13 : -0.02, y: high ? 0.04 : 0, scale: high ? 0.92 : 1, tilt: high ? -9 : 0 },
      "terminal-brutalist": { x: high ? -0.16 : 0.04, y: high ? 0.08 : 0, scale: high ? 0.72 : 0.9, tilt: high ? 2 : 0 },
      "surreal-collage": { x: high ? 0.02 : -0.04, y: high ? -0.02 : 0.02, scale: high ? 0.8 : 1, tilt: high ? 12 : -3 },
      "sticker-pack": { x: high ? -0.12 : 0.03, y: high ? 0.08 : 0.01, scale: high ? 0.78 : 0.98, tilt: high ? 10 : 0 },
      "comic-panel": { x: high ? 0.18 : -0.02, y: high ? -0.03 : 0.01, scale: high ? 0.88 : 1, tilt: high ? -12 : 0 },
      "cinematic-scene": { x: high ? 0.2 : 0.04, y: high ? 0.14 : 0.04, scale: high ? 0.7 : 0.96, tilt: high ? -4 : 0 },
      "propaganda-poster": { x: high ? 0.03 : 0, y: high ? 0.06 : 0, scale: high ? 0.9 : 1, tilt: 0 },
      "retro-arcade": { x: high ? -0.08 : 0.02, y: high ? 0.06 : 0, scale: high ? 0.82 : 0.98, tilt: 0 },
      "low-poly": { x: high ? 0.12 : -0.01, y: high ? 0.04 : 0, scale: high ? 0.76 : 1, tilt: high ? 7 : 0 },
      "painterly-portrait": { x: high ? -0.09 : 0.02, y: high ? 0.02 : 0, scale: high ? 0.92 : 1, tilt: high ? 5 : 0 },
      "children-cartoon": { x: high ? -0.1 : 0.04, y: high ? 0.05 : 0, scale: high ? 0.76 : 0.96, tilt: high ? 11 : 0 }
    };
    return shifts[family] ?? { x: 0, y: 0, scale: 1, tilt: 0 };
  }

  private engineBackground(plan: SceneRenderPlan, style: GeneratedStyleProfile, w: number, h: number, primary: string, secondary: string, ink: string, accent: string, seed: number) {
    if (plan.engine === "pixel-engine" || plan.engine === "arcade-engine") return this.pixelBackground(plan, w, h, primary, secondary, ink, accent, seed);
    if (plan.engine === "terminal-engine") return this.terminalBackground(plan, w, h, primary, secondary, ink, accent, seed);
    if (plan.engine === "clay-render-engine") return this.clayBackground(plan, w, h, primary, secondary, ink, accent);
    if (plan.engine === "horror-engine") return this.horrorBackground(plan, w, h, primary, secondary, ink, accent, seed);
    if (plan.engine === "comic-panel-engine") return this.comicBackground(plan, w, h, primary, secondary, ink, accent, seed);
    if (plan.engine === "cinematic-engine") return this.cinematicBackground(plan, w, h, primary, secondary, ink, accent, seed);
    if (plan.engine === "poster-engine") return this.posterBackground(plan, w, h, primary, secondary, ink, accent, seed);
    if (plan.engine === "low-poly-engine") return this.lowPolyBackground(plan, w, h, primary, secondary, ink, accent, seed);
    if (plan.engine === "sticker-engine") return this.stickerBackground(plan, w, h, primary, secondary, ink, accent, seed);
    return this.surrealBackground(plan, w, h, primary, secondary, ink, accent, seed);
  }

  private engineSubject(plan: SceneRenderPlan, style: GeneratedStyleProfile, w: number, h: number, primary: string, secondary: string, ink: string, accent: string, seed: number) {
    if (plan.engine === "pixel-engine" || plan.engine === "arcade-engine") return this.pixelSubject(plan, w, h, primary, secondary, ink, accent, seed);
    if (plan.engine === "terminal-engine") return this.terminalSubject(plan, w, h, primary, secondary, ink, accent);
    if (plan.engine === "clay-render-engine") return this.claySubject(plan, w, h, primary, secondary, ink, accent);
    if (plan.engine === "horror-engine") return this.horrorSubject(plan, w, h, primary, secondary, ink, accent);
    if (plan.engine === "comic-panel-engine") return this.comicSubject(plan, w, h, primary, secondary, ink, accent);
    if (plan.engine === "cinematic-engine") return this.cinematicSubject(plan, w, h, primary, secondary, ink, accent);
    if (plan.engine === "poster-engine") return this.posterSubject(plan, w, h, primary, secondary, ink, accent);
    if (plan.engine === "low-poly-engine") return this.lowPolySubject(plan, w, h, primary, secondary, ink, accent);
    if (plan.engine === "sticker-engine") return this.stickerSubject(plan, w, h, primary, secondary, ink, accent);
    if (plan.family === "anime-portrait" || plan.family === "painterly-portrait") return this.portraitSubject(plan, w, h, primary, secondary, ink, accent);
    return this.surrealSubject(plan, w, h, primary, secondary, ink, accent, seed);
  }

  private engineStage(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string, seed: number) {
    if (plan.mode !== "nft" && plan.intensity < 5) return "";
    const density = plan.rarity === "Mythic" ? 9 : plan.rarity === "Legendary" ? 6 : plan.rarity === "Epic" ? 4 : 2;
    if (plan.engine === "cinematic-engine") {
      return `<g opacity="0.82"><path d="M0 ${h * 0.74} C${w * 0.24} ${h * 0.56} ${w * 0.68} ${h * 0.84} ${w} ${h * 0.58} V${h} H0Z" fill="${ink}" opacity="0.55"/><rect x="${w * 0.08}" y="${h * 0.18}" width="${w * 0.18}" height="${h * 0.52}" fill="${secondary}" opacity="0.5"/><path d="M${w * 0.04} ${h * 0.35} L${w * 0.86} ${h * 0.08}" stroke="${accent}" stroke-width="${plan.intensity >= 5 ? 10 : 4}" opacity="0.35"/></g>`;
    }
    if (plan.engine === "terminal-engine") {
      return `<g font-family="ui-monospace, Consolas, monospace" opacity="0.86">${Array.from({ length: density }, (_, i) => `<rect x="${40 + ((seed + i * 97) % Math.max(80, w - 260))}" y="${140 + ((seed + i * 71) % Math.max(90, h - 360))}" width="${120 + (i % 3) * 68}" height="${70 + (i % 4) * 42}" fill="${i % 2 ? ink : secondary}" stroke="${primary}" stroke-width="2"/><text x="${50 + ((seed + i * 97) % Math.max(80, w - 260))}" y="${166 + ((seed + i * 71) % Math.max(90, h - 360))}" fill="${accent}" font-size="12">event_${i + 1}</text>`).join("")}</g>`;
    }
    if (plan.engine === "pixel-engine" || plan.engine === "arcade-engine") {
      return `<g shape-rendering="crispEdges" opacity="0.88">${Array.from({ length: density * 3 }, (_, i) => `<rect x="${(seed + i * 53) % w}" y="${180 + ((seed + i * 41) % Math.max(80, h - 360))}" width="${24 + (i % 3) * 16}" height="${24 + (i % 2) * 20}" fill="${i % 3 ? secondary : accent}" stroke="${ink}" stroke-width="4"/>`).join("")}</g>`;
    }
    if (plan.engine === "comic-panel-engine") {
      return `<g opacity="0.9"><path d="M32 120 H${w * 0.47} V${h * 0.45} H32Z M${w * 0.5} 90 H${w - 40} V${h * 0.64} H${w * 0.5}Z M70 ${h * 0.68} H${w - 70} V${h - 96} H70Z" fill="none" stroke="${ink}" stroke-width="${plan.intensity >= 5 ? 12 : 7}"/><path d="M${w * 0.12} ${h * 0.22} C${w * 0.34} ${h * 0.18} ${w * 0.62} ${h * 0.58} ${w * 0.84} ${h * 0.2}" stroke="${primary}" stroke-width="12" fill="none"/></g>`;
    }
    if (plan.engine === "horror-engine") {
      return `<g opacity="0.82"><path d="M${w * 0.12} ${h * 0.2} H${w * 0.88} V${h * 0.78} H${w * 0.12}Z" fill="none" stroke="${accent}" stroke-width="8" stroke-dasharray="26 18"/><path d="M${w * 0.18} ${h * 0.78} C${w * 0.24} ${h * 0.5} ${w * 0.58} ${h * 0.56} ${w * 0.72} ${h * 0.22}" stroke="${primary}" stroke-width="16" fill="none" opacity="0.46"/></g>`;
    }
    if (plan.engine === "poster-engine") {
      return `<g opacity="0.88"><path d="M0 ${h * 0.74} L${w} ${h * 0.58} V${h} H0Z" fill="${secondary}"/><circle cx="${w * 0.18}" cy="${h * 0.25}" r="${plan.intensity >= 5 ? 118 : 72}" fill="${primary}" opacity="0.5"/><path d="M${w * 0.66} 0 V${h}" stroke="${ink}" stroke-width="28" opacity="0.55"/></g>`;
    }
    return `<g opacity="0.72">${Array.from({ length: density }, (_, i) => {
      const x = (seed + i * 101) % w;
      const y = 150 + ((seed + i * 73) % Math.max(120, h - 340));
      return `<path d="M${x} ${y} q${80 + i * 8} ${-40 + i * 5} ${150 + i * 9} ${30 + i * 7} t${130 - i * 4} ${20 + i * 9}" stroke="${i % 2 ? secondary : primary}" stroke-width="${8 + (i % 4) * 4}" fill="none"/><circle cx="${(x + 80) % w}" cy="${(y + 40) % h}" r="${24 + i * 4}" fill="${i % 2 ? accent : secondary}" opacity="0.58"/>`;
    }).join("")}</g>`;
  }

  private engineEvent(plan: SceneRenderPlan, style: GeneratedStyleProfile, w: number, h: number, primary: string, secondary: string, ink: string, accent: string, seed: number) {
    if (plan.intensity < 4 && plan.mode !== "banner") return "";
    if (plan.engine === "terminal-engine") return `<g font-family="ui-monospace, Consolas, monospace"><text x="42" y="${h - 76}" fill="${accent}" font-size="${plan.intensity >= 5 ? 24 : 17}" font-weight="800">${this.escape(plan.eventFrame).slice(0, 54)}</text><path d="M38 ${h - 52} H${w - 38}" stroke="${primary}" stroke-width="${plan.intensity >= 5 ? 8 : 3}"/></g>`;
    if (plan.engine === "comic-panel-engine") return `<g><text x="${w * 0.08}" y="${h * 0.18}" fill="${accent}" stroke="${ink}" stroke-width="4" paint-order="stroke" font-size="${plan.intensity >= 5 ? 52 : 32}" font-weight="900">${plan.intensity >= 5 ? "BANG" : "FX"}</text><path d="M${w * 0.78} ${h * 0.12} l60 38 l-48 34 l18 62 l-58 -28 l-56 34 l14 -62 l-54 -32 l64 -12z" fill="${primary}" opacity="0.78"/></g>`;
    if (plan.engine === "horror-engine") return `<g opacity="0.88"><path d="M62 82 H${w - 62} M62 ${h - 82} H${w - 62}" stroke="${accent}" stroke-width="${plan.intensity >= 5 ? 18 : 8}" stroke-dasharray="36 20"/><text x="82" y="132" fill="${accent}" font-size="24" font-weight="900">${plan.rarity === "Mythic" ? "PATIENT ZERO EVENT" : "BREACH EVENT"}</text></g>`;
    if (plan.engine === "pixel-engine" || plan.engine === "arcade-engine") return `<g shape-rendering="crispEdges">${Array.from({ length: plan.intensity >= 5 ? 26 : 12 }, (_, i) => `<rect x="${(seed + i * 83) % w}" y="${(seed + i * 47) % h}" width="${18 + (i % 4) * 8}" height="${18 + (i % 3) * 8}" fill="${i % 2 ? accent : primary}" opacity="0.75"/>`).join("")}</g>`;
    if (plan.engine === "cinematic-engine") return `<g opacity="0.85"><rect y="0" width="${w}" height="${h * 0.08}" fill="${ink}"/><rect y="${h * 0.92}" width="${w}" height="${h * 0.08}" fill="${ink}"/><circle cx="${w * 0.18}" cy="${h * 0.22}" r="${plan.intensity >= 5 ? 120 : 70}" fill="${accent}" opacity="0.28"/></g>`;
    return `<g opacity="0.76"><path d="M${w * 0.1} ${h * 0.78} C${w * 0.35} ${h * 0.58} ${w * 0.6} ${h * 0.96} ${w * 0.88} ${h * 0.68}" stroke="${primary}" stroke-width="${plan.intensity >= 5 ? 20 : 9}" fill="none"/><circle cx="${w * 0.18}" cy="${h * 0.28}" r="${plan.intensity >= 5 ? 86 : 44}" fill="${accent}"/></g>`;
  }

  private engineText(plan: SceneRenderPlan, title: string, subtitle: string, w: number, h: number, primary: string, secondary: string, ink: string, accent: string) {
    const titleText = this.escape(title).slice(0, 42);
    const subText = this.escape(plan.mode === "nft" ? `${plan.rarity} / ${plan.faceVariant}` : subtitle).slice(0, 64);
    if (plan.engine === "terminal-engine") return `<g font-family="ui-monospace, Consolas, monospace"><text x="42" y="62" fill="${primary}" font-size="24" font-weight="800">${titleText}</text><text x="42" y="92" fill="${accent}" font-size="13">${subText}</text></g>`;
    if (plan.engine === "poster-engine") return `<g font-family="Impact, Arial Black, Arial, sans-serif"><text x="${w * 0.08}" y="${h * 0.12}" fill="${ink}" font-size="${plan.mode === "banner" ? 56 : 42}" font-weight="900">${titleText}</text><text x="${w * 0.08}" y="${h * 0.16}" fill="${secondary}" font-size="17" font-weight="800">${subText}</text></g>`;
    if (plan.engine === "pixel-engine" || plan.engine === "arcade-engine") return `<g font-family="monospace" shape-rendering="crispEdges"><rect x="28" y="26" width="${Math.min(w - 56, 620)}" height="58" fill="${ink}" stroke="${primary}" stroke-width="4"/><text x="44" y="64" fill="${accent}" font-size="24" font-weight="900">${titleText}</text></g>`;
    const textY = plan.mode === "banner" ? 88 : h - 118;
    return `<g font-family="Inter, Arial, sans-serif"><text x="48" y="${textY}" fill="${plan.engine === "clay-render-engine" || plan.engine === "sticker-engine" ? ink : "#fff"}" font-size="${plan.mode === "banner" ? 46 : 31}" font-weight="900">${titleText}</text><text x="48" y="${textY + 30}" fill="${plan.engine === "clay-render-engine" || plan.engine === "sticker-engine" ? secondary : primary}" font-size="16" font-weight="800">${subText}</text></g>`;
  }

  private pixelBackground(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string, seed: number) {
    const tile = plan.engine === "arcade-engine" ? 48 : 58;
    const cells = Array.from({ length: Math.ceil(w / tile) * Math.ceil(h / tile) }, (_, i) => {
      const x = (i % Math.ceil(w / tile)) * tile;
      const y = Math.floor(i / Math.ceil(w / tile)) * tile;
      const hit = (seed + i * 17) % Math.max(2, 9 - plan.intensity) === 0;
      return `<rect x="${x}" y="${y}" width="${tile - 2}" height="${tile - 2}" fill="${hit ? (i % 2 ? primary : accent) : (i + seed) % 2 ? secondary : ink}" opacity="${hit ? 0.62 : 0.95}"/>`;
    }).join("");
    return `<rect width="${w}" height="${h}" fill="${ink}"/><g>${cells}</g><g font-family="monospace"><text x="${w - 210}" y="54" fill="${accent}" font-size="20">STAGE ${plan.intensity}</text></g>`;
  }

  private terminalBackground(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string, seed: number) {
    const panels = Array.from({ length: 8 + plan.intensity * 3 }, (_, i) => {
      const x = 28 + ((seed + i * 151) % Math.max(1, w - 240));
      const y = 110 + ((seed + i * 83) % Math.max(1, h - 310));
      const ww = 120 + ((seed + i * 29) % 260);
      const hh = 48 + ((seed + i * 31) % 150);
      return `<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="${i % 2 ? ink : "#0b0f14"}" stroke="${primary}" stroke-width="2" opacity="${0.3 + plan.intensity * 0.06}"/><path d="M${x + 10} ${y + 20} h${ww - 20} M${x + 10} ${y + 39} h${Math.round((ww - 20) * ((i % 5) + 1) / 5)}" stroke="${i % 3 ? secondary : accent}" stroke-width="4" opacity="0.7"/>`;
    }).join("");
    return `<rect width="${w}" height="${h}" fill="#050608"/><g>${panels}</g>`;
  }

  private clayBackground(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string) {
    return `<rect width="${w}" height="${h}" fill="${accent}"/><rect y="${h * 0.58}" width="${w}" height="${h * 0.42}" fill="${primary}" opacity="0.16"/><ellipse cx="${w * 0.5}" cy="${h * 0.75}" rx="${w * (0.32 + plan.intensity * 0.03)}" ry="${h * 0.12}" fill="${secondary}" opacity="0.22"/><g opacity="0.16" filter="url(#grain)"><rect width="${w}" height="${h}" fill="#000"/></g>`;
  }

  private horrorBackground(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string, seed: number) {
    return `<rect width="${w}" height="${h}" fill="${ink}"/><path d="M0 ${h * 0.18} C${w * 0.22} ${h * 0.06} ${w * 0.4} ${h * 0.34} ${w} ${h * 0.12} V${h} H0Z" fill="${secondary}" opacity="0.42"/><g stroke="${primary}" stroke-width="${5 + plan.intensity}" opacity="${0.2 + plan.intensity * 0.05}">${Array.from({ length: 7 + plan.intensity }, (_, i) => `<path d="M${(seed + i * 91) % w} 0 L${(seed + i * 157) % w} ${h}"/>`).join("")}</g>`;
  }

  private comicBackground(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string, seed: number) {
    return `<rect width="${w}" height="${h}" fill="${accent}"/><g stroke="${ink}" stroke-width="10"><rect x="34" y="42" width="${w * 0.42}" height="${h * 0.38}" fill="${primary}" opacity="0.7"/><rect x="${w * 0.52}" y="86" width="${w * 0.4}" height="${h * 0.32}" fill="${secondary}" opacity="0.78"/><rect x="70" y="${h * 0.5}" width="${w * 0.78}" height="${h * 0.36}" fill="#fff" opacity="0.84"/></g><g opacity="0.35">${Array.from({ length: 20 }, (_, i) => `<circle cx="${(seed + i * 47) % w}" cy="${(seed + i * 83) % h}" r="${6 + (i % 5) * 3}" fill="${ink}"/>`).join("")}</g>`;
  }

  private cinematicBackground(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string, seed: number) {
    return `<rect width="${w}" height="${h}" fill="${ink}"/><path d="M0 ${h * 0.12} H${w} V${h * 0.92} H0Z" fill="url(#sceneLight)" opacity="${0.28 + plan.intensity * 0.04}"/><path d="M0 ${h * 0.7} C${w * 0.25} ${h * 0.48} ${w * 0.55} ${h * 0.8} ${w} ${h * 0.56} V${h} H0Z" fill="${secondary}" opacity="0.62"/><circle cx="${w * (0.22 + (seed % 20) / 100)}" cy="${h * 0.22}" r="${90 + plan.intensity * 30}" fill="${accent}" opacity="0.2"/>`;
  }

  private posterBackground(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string, seed: number) {
    return `<rect width="${w}" height="${h}" fill="${accent}"/><path d="M0 0 H${w} L${w * 0.68} ${h} H0Z" fill="${primary}" opacity="0.82"/><path d="M${w * 0.22} 0 H${w} V${h} H${w * 0.45}Z" fill="${secondary}" opacity="0.72"/><g opacity="0.15" filter="url(#grain)"><rect width="${w}" height="${h}" fill="#000"/></g>`;
  }

  private lowPolyBackground(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string, seed: number) {
    return `<rect width="${w}" height="${h}" fill="${ink}"/><g>${Array.from({ length: 14 + plan.intensity * 2 }, (_, i) => {
      const x = (seed + i * 73) % w;
      const y = (seed + i * 41) % h;
      return `<path d="M${x} ${y} l${80 + i * 3} ${20 + (i % 4) * 24} l-${40 + i * 2} ${70 + (i % 3) * 20} z" fill="${i % 3 === 0 ? primary : i % 3 === 1 ? secondary : accent}" opacity="${0.28 + (i % 4) * 0.08}"/>`;
    }).join("")}</g>`;
  }

  private stickerBackground(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string, seed: number) {
    return `<rect width="${w}" height="${h}" fill="${accent}"/><g opacity="0.32">${Array.from({ length: 9 + plan.intensity }, (_, i) => `<rect x="${(seed + i * 97) % w}" y="${(seed + i * 53) % h}" width="${70 + (i % 3) * 40}" height="${48 + (i % 4) * 28}" rx="18" fill="${i % 2 ? primary : secondary}" transform="rotate(${((seed + i * 11) % 38) - 19} ${(seed + i * 97) % w} ${(seed + i * 53) % h})"/>`).join("")}</g>`;
  }

  private surrealBackground(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string, seed: number) {
    return `<rect width="${w}" height="${h}" fill="${ink}"/><path d="M${w * 0.05} ${h * 0.22} C${w * 0.38} ${h * 0.02} ${w * 0.42} ${h * 0.52} ${w * 0.92} ${h * 0.2} L${w} ${h} H0Z" fill="${secondary}" opacity="0.58"/><circle cx="${w * 0.72}" cy="${h * 0.28}" r="${120 + plan.intensity * 24}" fill="${primary}" opacity="0.22"/><rect x="${w * 0.12}" y="${h * 0.18}" width="${w * 0.28}" height="${h * 0.36}" fill="${accent}" opacity="0.18" transform="rotate(${(seed % 34) - 17} ${w * 0.26} ${h * 0.36})"/>`;
  }

  private pixelSubject(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string, seed: number) {
    const size = Math.round((34 + plan.intensity * 9) * plan.scale);
    const count = plan.intensity >= 5 ? 7 : plan.intensity >= 3 ? 3 : 1;
    return `<g shape-rendering="crispEdges">${Array.from({ length: count }, (_, i) => {
      const x = Math.round(w * (plan.x + (i - count / 2) * 0.09 + ((seed + i) % 3) * 0.02));
      const y = Math.round(h * (plan.y + ((seed + i * 7) % 20) / 100));
      const eyeH = /panic|transformed|high-emotion/i.test(plan.faceVariant) ? 16 : 8;
      const mouthH = /open|shout|high-emotion|transformed/i.test(plan.mouthVariant) ? 18 : 6;
      return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${primary}" stroke="${ink}" stroke-width="6"/><rect x="${x - size * 0.25}" y="${y + size * 0.82}" width="${size * 1.5}" height="${size * 0.85}" fill="${secondary}" stroke="${ink}" stroke-width="5"/><rect x="${x + size * 0.2}" y="${y + size * 0.3}" width="8" height="${eyeH}" fill="${ink}"/><rect x="${x + size * 0.62}" y="${y + size * 0.3 + plan.tilt / 5}" width="8" height="${eyeH}" fill="${ink}"/><rect x="${x + size * 0.28}" y="${y + size * 0.66}" width="${/flat|deadpan/i.test(plan.mouthVariant) ? 30 : 20}" height="${mouthH}" fill="${accent}"/>`;
    }).join("")}</g>`;
  }

  private terminalSubject(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string) {
    const x = Math.round(w * (plan.rarity === "Legendary" || plan.rarity === "Mythic" ? 0.18 : plan.x));
    const y = Math.round(h * (plan.rarity === "Legendary" || plan.rarity === "Mythic" ? 0.22 : 0.25));
    const ww = Math.round(w * (plan.intensity >= 5 ? 0.58 : 0.3 + plan.intensity * 0.025));
    const hh = Math.round(h * (plan.intensity >= 5 ? 0.42 : 0.26 + plan.intensity * 0.02));
    return `<g transform="rotate(${plan.tilt / 3} ${x + ww / 2} ${y + hh / 2})"><rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="#090b0f" stroke="${primary}" stroke-width="${2 + plan.intensity}"/><rect x="${x + 24}" y="${y + 32}" width="${ww - 48}" height="38" fill="${secondary}" opacity="0.7"/><path d="M${x + 50} ${y + 100 + plan.tilt / 3} h70 M${x + ww - 122} ${y + 100 - plan.tilt / 3} h70" stroke="${accent}" stroke-width="10"/><path d="${/open|panic|transformed/i.test(plan.mouthVariant) ? `M${x + ww * 0.43} ${y + 160} h${ww * 0.15} v28 h-${ww * 0.15}Z` : `M${x + ww * 0.38} ${y + 168} h${ww * 0.26}`}" stroke="${primary}" stroke-width="8" fill="${/open|panic|transformed/i.test(plan.mouthVariant) ? primary : "none"}"/><path d="M${x - 70} ${y + hh + 28} C${x + 40} ${y + hh - 36} ${x + ww - 30} ${y + hh - 32} ${x + ww + 94} ${y + hh + 30}" stroke="${secondary}" stroke-width="34" fill="none"/></g>`;
  }

  private claySubject(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string) {
    const cx = Math.round(w * plan.x);
    const cy = Math.round(h * plan.y);
    const headRx = (86 + plan.intensity * 13) * plan.scale;
    const headRy = (76 + plan.intensity * 10) * plan.scale;
    const mouth = /open|high-emotion|transformed/i.test(plan.mouthVariant) ? `M${cx - 28} ${cy + 70} q34 48 76 0` : /asymmetric|side/i.test(plan.faceVariant) ? `M${cx - 40} ${cy + 72} q52 28 98 -10` : `M${cx - 34} ${cy + 76} h80`;
    return `<g transform="rotate(${plan.tilt / 3} ${cx} ${cy})" filter="url(#shadow)"><ellipse cx="${cx}" cy="${cy + 170 * plan.scale}" rx="${130 * plan.scale}" ry="${110 * plan.scale}" fill="${secondary}"/><ellipse cx="${cx}" cy="${cy}" rx="${headRx}" ry="${headRy}" fill="${primary}"/><ellipse cx="${cx - 46 * plan.scale}" cy="${cy - 16}" rx="${16 + plan.intensity}" ry="${/blink/i.test(plan.faceVariant) ? 7 : 16 + plan.intensity}" fill="${ink}"/><ellipse cx="${cx + 52 * plan.scale}" cy="${cy - 18 + plan.tilt / 5}" rx="${16 + plan.intensity}" ry="${/blink/i.test(plan.faceVariant) ? 7 : 16 + plan.intensity}" fill="${ink}"/><path d="${mouth}" stroke="${ink}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M${cx - 128 * plan.scale} ${cy + 132 * plan.scale} q-${70 + plan.intensity * 6} ${plan.tilt} -${112 + plan.intensity * 7} ${90 - plan.intensity * 8}" stroke="${secondary}" stroke-width="22" fill="none"/><path d="M${cx + 128 * plan.scale} ${cy + 132 * plan.scale} q${70 + plan.intensity * 6} ${-plan.tilt} ${112 + plan.intensity * 7} ${88 - plan.intensity * 7}" stroke="${secondary}" stroke-width="22" fill="none"/></g>`;
  }

  private horrorSubject(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string) {
    const cx = Math.round(w * plan.x);
    const cy = Math.round(h * plan.y);
    const rx = (120 + plan.intensity * 18) * plan.scale;
    const ry = (170 + plan.intensity * 22) * plan.scale;
    return `<g transform="rotate(${plan.tilt} ${cx} ${cy})" filter="url(#shadow)"><path d="M${cx - rx} ${cy - ry} C${cx - rx * 1.2} ${cy - 20} ${cx - rx * 0.55} ${cy + ry} ${cx + 20} ${cy + ry * 0.9} C${cx + rx * 1.4} ${cy + ry * 0.62} ${cx + rx * 0.85} ${cy - ry * 0.8} ${cx - rx} ${cy - ry}Z" fill="${primary}" stroke="${secondary}" stroke-width="9"/><circle cx="${cx - 46 * plan.scale}" cy="${cy - 38}" r="${32 + plan.intensity * 3}" fill="${accent}" stroke="${ink}" stroke-width="7"/><ellipse cx="${cx + 62 * plan.scale}" cy="${cy - 24 + plan.tilt / 4}" rx="${/transformed|scene-specific/i.test(plan.faceVariant) ? 54 : 30}" ry="${/blink/i.test(plan.faceVariant) ? 8 : 36}" fill="${accent}" stroke="${ink}" stroke-width="7"/><circle cx="${cx - 46 * plan.scale}" cy="${cy - 38}" r="11" fill="${ink}"/><path d="${/open|transformed|high-emotion/i.test(plan.mouthVariant) ? `M${cx - 28} ${cy + 68} q58 44 112 -20` : `M${cx - 46} ${cy + 72} q50 18 120 -18`}" stroke="${ink}" stroke-width="11" fill="none" stroke-linecap="round"/><g fill="${secondary}" opacity="0.9">${Array.from({ length: plan.intensity }, (_, i) => `<circle cx="${cx + ((i * 47) % 190) - 90}" cy="${cy - 160 + ((i * 67) % 320)}" r="${14 + i * 2}"/>`).join("")}</g></g>`;
  }

  private comicSubject(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string) {
    const cx = Math.round(w * plan.x);
    const cy = Math.round(h * (plan.y + 0.07));
    const s = 1.05 * plan.scale;
    return `<g transform="rotate(${plan.tilt} ${cx} ${cy})" filter="url(#shadow)"><path d="M${cx - 90 * s} ${cy - 180 * s} Q${cx + 20 * s} ${cy - 250 * s} ${cx + 120 * s} ${cy - 130 * s} Q${cx + 150 * s} ${cy + 30 * s} ${cx + 40 * s} ${cy + 95 * s} Q${cx - 120 * s} ${cy + 90 * s} ${cx - 90 * s} ${cy - 180 * s}Z" fill="${primary}" stroke="${ink}" stroke-width="10"/><path d="M${cx - 150 * s} ${cy + 90 * s} L${cx + 150 * s} ${cy + 92 * s} L${cx + 104 * s} ${cy + 275 * s} H${cx - 90 * s}Z" fill="${secondary}" stroke="${ink}" stroke-width="10"/><ellipse cx="${cx - 44 * s}" cy="${cy - 55 * s}" rx="${/blink/i.test(plan.faceVariant) ? 34 : 28}" ry="${/blink/i.test(plan.faceVariant) ? 8 : 38}" fill="${accent}" stroke="${ink}" stroke-width="7"/><ellipse cx="${cx + 64 * s}" cy="${cy - 70 * s + plan.tilt / 5}" rx="${/scene-specific|transformed/i.test(plan.faceVariant) ? 42 : 28}" ry="30" fill="${accent}" stroke="${ink}" stroke-width="7"/><path d="${/open|high-emotion|transformed/i.test(plan.mouthVariant) ? `M${cx - 42 * s} ${cy + 44 * s} q58 62 126 -12` : `M${cx - 42 * s} ${cy + 45 * s} q56 24 126 -12`}" stroke="${ink}" stroke-width="10" fill="none"/><path d="M${cx + 100 * s} ${cy + 64 * s} l${130 * s} -${80 * s}" stroke="${ink}" stroke-width="20" stroke-linecap="round"/></g>`;
  }

  private cinematicSubject(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string) {
    const cx = Math.round(w * plan.x);
    const cy = Math.round(h * (plan.rarity === "Legendary" || plan.rarity === "Mythic" ? 0.62 : 0.5));
    const s = plan.scale;
    return `<g transform="rotate(${plan.tilt / 4} ${cx} ${cy})"><path d="M${cx - 80 * s} ${cy - 170 * s} Q${cx + 10 * s} ${cy - 250 * s} ${cx + 92 * s} ${cy - 150 * s} Q${cx + 82 * s} ${cy - 42 * s} ${cx + 42 * s} ${cy + 20 * s} L${cx + 104 * s} ${cy + 260 * s} H${cx - 120 * s} L${cx - 38 * s} ${cy + 20 * s} Q${cx - 92 * s} ${cy - 54 * s} ${cx - 80 * s} ${cy - 170 * s}Z" fill="${primary}" opacity="0.9" filter="url(#shadow)"/><path d="M${cx - 42 * s} ${cy - 82 * s} h${36 * s} M${cx + 34 * s} ${cy - 96 * s} h${42 * s}" stroke="${accent}" stroke-width="8"/><path d="M${cx - 32 * s} ${cy - 20 * s} q${48 * s} ${/open|high-emotion/i.test(plan.mouthVariant) ? 42 : 16} ${96 * s} 0" stroke="${ink}" stroke-width="8" fill="none"/><path d="M${cx - 170 * s} ${cy + 78 * s} q-${110 * s} ${40 * s} -${150 * s} ${-80 * s}" stroke="${accent}" stroke-width="18" fill="none"/></g>`;
  }

  private posterSubject(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string) {
    const cx = Math.round(w * plan.x);
    const cy = Math.round(h * 0.52);
    const s = 1.2 * plan.scale;
    return `<g transform="rotate(${plan.tilt / 5} ${cx} ${cy})"><path d="M${cx} ${cy - 260 * s} L${cx + 150 * s} ${cy - 80 * s} L${cx + 92 * s} ${cy + 250 * s} H${cx - 118 * s} L${cx - 152 * s} ${cy - 80 * s}Z" fill="${ink}" opacity="0.92"/><path d="M${cx - 92 * s} ${cy - 140 * s} H${cx + 92 * s} V${cy + 22 * s} H${cx - 92 * s}Z" fill="${primary}"/><path d="M${cx - 44 * s} ${cy - 78 * s} h${30 * s} M${cx + 24 * s} ${cy - 78 * s} h${30 * s} M${cx - 42 * s} ${cy - 20 * s} h${94 * s}" stroke="${ink}" stroke-width="10"/><path d="M${cx + 110 * s} ${cy + 30 * s} l${150 * s} -${130 * s}" stroke="${secondary}" stroke-width="28"/></g>`;
  }

  private lowPolySubject(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string) {
    const cx = Math.round(w * plan.x);
    const cy = Math.round(h * plan.y);
    const s = plan.scale;
    return `<g transform="rotate(${plan.tilt / 2} ${cx} ${cy})" stroke="${ink}" stroke-width="5"><path d="M${cx} ${cy - 190 * s} L${cx + 110 * s} ${cy - 80 * s} L${cx + 70 * s} ${cy + 50 * s} L${cx - 88 * s} ${cy + 42 * s} L${cx - 120 * s} ${cy - 90 * s}Z" fill="${primary}"/><path d="M${cx - 70 * s} ${cy + 42 * s} L${cx + 80 * s} ${cy + 50 * s} L${cx + 130 * s} ${cy + 260 * s} L${cx - 140 * s} ${cy + 250 * s}Z" fill="${secondary}"/><path d="M${cx - 54 * s} ${cy - 78 * s} L${cx - 12 * s} ${cy - 60 * s} L${cx - 44 * s} ${cy - 44 * s}Z" fill="${accent}"/><path d="M${cx + 34 * s} ${cy - 82 * s} L${cx + 82 * s} ${cy - 64 * s} L${cx + 40 * s} ${cy - 38 * s}Z" fill="${accent}"/><path d="M${cx - 30 * s} ${cy + 2 * s} L${cx + 62 * s} ${cy - 8 * s}" stroke="${ink}" stroke-width="9"/></g>`;
  }

  private stickerSubject(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string) {
    const cx = Math.round(w * plan.x);
    const cy = Math.round(h * plan.y);
    const s = plan.scale;
    const mouth = /open|high-emotion|transformed/i.test(plan.mouthVariant) ? `M${cx - 30 * s} ${cy + 54 * s} q42 ${58 * s} 104 0` : `M${cx - 42 * s} ${cy + 58 * s} q58 20 112 -12`;
    return `<g transform="rotate(${plan.tilt} ${cx} ${cy})" filter="url(#shadow)"><path d="M${cx - 122 * s} ${cy - 142 * s} C${cx - 205 * s} ${cy - 40 * s} ${cx - 135 * s} ${cy + 120 * s} ${cx + 10 * s} ${cy + 135 * s} C${cx + 170 * s} ${cy + 98 * s} ${cx + 160 * s} ${cy - 105 * s} ${cx + 42 * s} ${cy - 158 * s} C${cx - 24 * s} ${cy - 198 * s} ${cx - 78 * s} ${cy - 185 * s} ${cx - 122 * s} ${cy - 142 * s}Z" fill="#fff" stroke="#fff" stroke-width="28"/><path d="M${cx - 122 * s} ${cy - 142 * s} C${cx - 205 * s} ${cy - 40 * s} ${cx - 135 * s} ${cy + 120 * s} ${cx + 10 * s} ${cy + 135 * s} C${cx + 170 * s} ${cy + 98 * s} ${cx + 160 * s} ${cy - 105 * s} ${cx + 42 * s} ${cy - 158 * s} C${cx - 24 * s} ${cy - 198 * s} ${cx - 78 * s} ${cy - 185 * s} ${cx - 122 * s} ${cy - 142 * s}Z" fill="${primary}" stroke="${ink}" stroke-width="8"/><circle cx="${cx - 48 * s}" cy="${cy - 38 * s}" r="${/blink/i.test(plan.faceVariant) ? 9 : 24}" fill="${ink}"/><circle cx="${cx + 58 * s}" cy="${cy - 50 * s + plan.tilt / 5}" r="${/scene-specific|transformed/i.test(plan.faceVariant) ? 32 : 22}" fill="${ink}"/><path d="${mouth}" stroke="${ink}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M${cx + 110 * s} ${cy + 42 * s} q${90 * s} ${plan.tilt * 2} ${128 * s} -${70 * s}" stroke="${secondary}" stroke-width="24" fill="none"/></g>`;
  }

  private portraitSubject(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string) {
    const cx = Math.round(w * plan.x);
    const cy = Math.round(h * (plan.y + 0.04));
    const s = plan.scale;
    return `<g transform="rotate(${plan.tilt / 3} ${cx} ${cy})" filter="url(#shadow)"><path d="M${cx - 150 * s} ${cy + 120 * s} C${cx - 80 * s} ${cy - 10 * s} ${cx + 100 * s} ${cy - 20 * s} ${cx + 190 * s} ${cy + 124 * s} L${cx + 214 * s} ${cy + 360 * s} H${cx - 210 * s}Z" fill="${secondary}"/><path d="M${cx - 132 * s} ${cy - 172 * s} Q${cx + 4 * s} ${cy - 252 * s} ${cx + 142 * s} ${cy - 156 * s} Q${cx + 180 * s} ${cy + 12 * s} ${cx + 66 * s} ${cy + 142 * s} Q${cx - 40 * s} ${cy + 208 * s} ${cx - 126 * s} ${cy + 102 * s} Q${cx - 204 * s} ${cy - 12 * s} ${cx - 132 * s} ${cy - 172 * s}Z" fill="${primary}" stroke="${ink}" stroke-width="8"/><path d="M${cx - 194 * s} ${cy - 150 * s} C${cx - 78 * s} ${cy - 280 * s} ${cx + 122 * s} ${cy - 245 * s} ${cx + 204 * s} ${cy - 95 * s} C${cx + 60 * s} ${cy - 140 * s} ${cx - 24 * s} ${cy - 152 * s} ${cx - 194 * s} ${cy - 150 * s}Z" fill="${secondary}" opacity="0.85"/><ellipse cx="${cx - 60 * s}" cy="${cy - 20 * s + plan.tilt / 5}" rx="${/scene-specific|transformed/i.test(plan.faceVariant) ? 54 : 42}" ry="${/blink/i.test(plan.faceVariant) ? 8 : 28 + plan.intensity * 3}" fill="${accent}" stroke="${ink}" stroke-width="7"/><ellipse cx="${cx + 76 * s}" cy="${cy - 18 * s - plan.tilt / 5}" rx="44" ry="${/blink/i.test(plan.faceVariant) ? 8 : 28 + plan.intensity * 3}" fill="${accent}" stroke="${ink}" stroke-width="7"/><circle cx="${cx - 48 * s}" cy="${cy - 20 * s}" r="12" fill="${ink}"/><circle cx="${cx + 62 * s}" cy="${cy - 18 * s}" r="12" fill="${ink}"/><path d="${/open|high-emotion|transformed/i.test(plan.mouthVariant) ? `M${cx - 28 * s} ${cy + 78 * s} q34 42 76 0` : /asymmetric|side/i.test(plan.faceVariant) ? `M${cx - 38 * s} ${cy + 78 * s} q52 28 98 -10` : `M${cx - 34 * s} ${cy + 82 * s} h80`}" stroke="${ink}" stroke-width="9" fill="none" stroke-linecap="round"/></g>`;
  }

  private surrealSubject(plan: SceneRenderPlan, w: number, h: number, primary: string, secondary: string, ink: string, accent: string, seed: number) {
    const cx = Math.round(w * plan.x);
    const cy = Math.round(h * plan.y);
    const pieces = Array.from({ length: 5 + plan.intensity }, (_, i) => {
      const x = cx + ((seed + i * 67) % 320) - 160;
      const y = cy + ((seed + i * 43) % 380) - 190;
      return `<rect x="${x}" y="${y}" width="${70 + i * 9}" height="${90 + (i % 3) * 34}" fill="${i % 2 ? primary : secondary}" opacity="0.72" transform="rotate(${((seed + i * 13) % 60) - 30} ${x} ${y})"/>`;
    }).join("");
    return `<g filter="url(#shadow)">${pieces}<path d="M${cx - 110} ${cy - 140} C${cx + 40} ${cy - 230} ${cx + 170} ${cy - 60} ${cx + 88} ${cy + 108} C${cx - 34} ${cy + 190} ${cx - 190} ${cy + 70} ${cx - 110} ${cy - 140}Z" fill="${accent}" opacity="0.72"/><circle cx="${cx - 62}" cy="${cy - 26 + plan.tilt / 4}" r="${/scene-specific|transformed/i.test(plan.faceVariant) ? 42 : 34}" fill="${ink}"/><circle cx="${cx + 70}" cy="${cy - 56 - plan.tilt / 4}" r="${/blink/i.test(plan.faceVariant) ? 10 : 24}" fill="${ink}"/><path d="${/open|transformed/i.test(plan.mouthVariant) ? `M${cx - 18} ${cy + 74} l68 24 l-56 48z` : `M${cx - 42} ${cy + 92} l112 -18`}" stroke="${ink}" stroke-width="11" fill="${/open|transformed/i.test(plan.mouthVariant) ? primary : "none"}"/></g>`;
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

  private eyeVariant(face: string, rarity: Rarity) {
    if (rarity === "Mythic") return "transformed eyes";
    if (rarity === "Legendary") return "scene-specific eyes";
    if (rarity === "Epic") return "high-emotion eyes";
    if (rarity === "Rare") return "asymmetric eyes";
    if (rarity === "Uncommon") return "blink/side-eye";
    return face.includes("pixel") ? "base pixel eyes" : "neutral eyes";
  }

  private mouthVariant(face: string, rarity: Rarity) {
    if (rarity === "Mythic") return "transformed mouth";
    if (rarity === "Legendary") return "event reaction mouth";
    if (rarity === "Epic") return "open high-emotion mouth";
    if (rarity === "Rare") return "asymmetric mouth";
    if (rarity === "Uncommon") return "shifted mouth";
    return face.includes("deadpan") ? "flat mouth" : "neutral mouth";
  }

  private rarity(value: string): Rarity {
    return rarityLadder.includes(value as Rarity) ? (value as Rarity) : "Rare";
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
      Common: { minTraits: 2, maxTraits: 4, pose: "base identity pose", background: "simple engine background", aura: "none", frame: "none", composition: "identity read with engine-specific base composition" },
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

  private escape(value: string) {
    return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char] ?? char);
  }

  private moodFor(style: GeneratedStyleProfile, rarity: Rarity, seed: number) {
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

  private svgUri(svg: string) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}
