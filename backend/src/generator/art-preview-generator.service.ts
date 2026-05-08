import { Injectable } from "@nestjs/common";
import type { GeneratedStyleProfile, PreviewAssetPlan, TraitCategoryRole, TraitPackPlan } from "./generator.types";
import { pick, seedFrom } from "./generator.util";

@Injectable()
export class ArtPreviewGeneratorService {
  generate(style: GeneratedStyleProfile, pack: TraitPackPlan, seedKey: string, reroll = 0): PreviewAssetPlan[] {
    const seed = seedFrom(`${style.collection}:${seedKey}:${reroll}`);
    const rarityLadder = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];
    return [
      {
        type: "AVATAR",
        label: `${style.collection} avatar`,
        uri: this.svgUri(this.avatarSvg(style, seed)),
        metadata: { mascot: style.mascot, artStyle: style.artStyle }
      },
      {
        type: "BANNER",
        label: `${style.collection} banner`,
        uri: this.svgUri(this.bannerSvg(style, seed + 19)),
        metadata: { raidTheme: style.raidTheme, world: style.backgroundWorld }
      },
      ...rarityLadder.map((rarity, index) => this.sample(style, pack, seed + index * 101, index + 1, rarity))
    ];
  }

  private sample(style: GeneratedStyleProfile, pack: TraitPackPlan, seed: number, index: number, rarity: string): PreviewAssetPlan {
    const intensity = this.rarityIntensity(rarity);
    const fallbackRule = this.rarityVisualRulePlan(rarity);
    const rule = style.brandDna?.rarityVisualRules?.[rarity] ?? style.brandDna?.rarityVisualRules?.Common ?? fallbackRule;
    const compositionCategory = rarity === "Mythic" ? "near-1-of-1" : rarity === "Legendary" ? "signature-scene" : rarity === "Epic" ? "premium-composition" : "standard-composition";
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
    const headgear = intensity >= 3 ? pick(headCategory.values, seed + 2) : `${this.identityPrefix(style)} simple head mark`;
    const eyePool = /Mask|Helm|Kabuto|Hood|Shell|Shield/i.test(headgear) ? eyesCategory.values.filter((eye) => !/Visor|Scanner|Screen/i.test(eye)) : eyesCategory.values;
    const restrainedAura = `${this.identityPrefix(style)} restrained FX`;
    const cleanFrame = `${this.identityPrefix(style)} clean edge`;
    const traits = {
      base: intensity >= 5 ? pick(baseCategory.values.slice(18), seed) : intensity >= 4 ? pick(baseCategory.values.slice(8, 24), seed) : pick(baseCategory.values.slice(0, 10), seed),
      background: intensity >= 4 ? pick(backgroundCategory.values.slice(20), seed + 1) : intensity >= 3 ? pick(backgroundCategory.values.slice(8, 34), seed + 1) : pick(backgroundCategory.values.slice(0, 12), seed + 1),
      headgear,
      eyes: intensity >= 1 ? pick(eyePool.length ? eyePool : eyesCategory.values, seed + 3) : "Base eyes",
      mouthExpression: intensity >= 2 ? pick(mouthCategory.values, seed + 10) : mood.mouthLanguage,
      outfit: intensity >= 3 ? pick(bodyCategory.values, seed + 4) : `${this.identityPrefix(style)} base outfit`,
      accessory: pick(propCategory.values, seed + 5),
      neckChestAccessory: intensity >= 4 ? pick(neckCategory.values, seed + 6) : `${this.identityPrefix(style)} small badge`,
      aura: intensity >= 4 ? pick(auraCategory.values, seed + 6) : restrainedAura,
      frame: intensity >= 5 ? pick(frameCategory.values, seed + 7) : intensity >= 2 ? pick(frameCategory.values.slice(0, 4), seed + 7) : cleanFrame,
      legendaryOverlay: intensity >= 5 ? pick(legendaryCategory.values, seed + 9) : `${this.identityPrefix(style)} no signature scene`,
      animationOverlay: intensity >= 5 ? pick(animationCategory.values, seed + 8) : `${this.identityPrefix(style)} idle still`,
      pose: rule.pose,
      scene: intensity >= 5 ? style.legendaryTheme : rule.background,
      visualRule: rule.composition,
      mood: mood.name,
      expression: mood.expression,
      eyeLanguage: mood.eyeLanguage,
      mouthLanguage: mood.mouthLanguage,
      stance: mood.stance,
      gesture: mood.gesture,
      rarity,
      compositionCategory,
      specialMetadataFlag: rarity === "Mythic" ? "MYTHIC_CURATED_COMPOSITION" : rarity === "Legendary" ? "LEGENDARY_SIGNATURE_SCENE" : "NONE",
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
      visualSystem: style.creativeUniverse.creativeDna.visualSystem,
      rendererFamily: style.creativeUniverse.creativeDna.visualSystem.rendererFamily,
      bodySystem: style.creativeUniverse.creativeDna.visualSystem.bodySystem,
      headShape: style.creativeUniverse.creativeDna.visualSystem.headShape,
      eyeSystem: style.creativeUniverse.creativeDna.visualSystem.eyeSystem,
      mouthSystem: style.creativeUniverse.creativeDna.visualSystem.mouthSystem,
      compositionStyle: style.creativeUniverse.creativeDna.visualSystem.compositionStyle,
      lightingModel: style.creativeUniverse.creativeDna.visualSystem.lightingModel,
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
      subtitle: style.mascot,
      seed,
      mode: "avatar"
    });
  }

  private bannerSvg(style: GeneratedStyleProfile, seed: number) {
    return this.scene(style, {
      width: 1600,
      height: 640,
      title: style.raidTheme,
      subtitle: style.backgroundWorld,
      seed,
      mode: "banner"
    });
  }

  private nftSvg(style: GeneratedStyleProfile, traits: Record<string, unknown>, seed: number) {
    const rarity = String(traits.rarity ?? "Common");
    const fx = rarity === "Mythic" || rarity === "Legendary" ? "legendary" : rarity === "Epic" ? "epic" : "standard";
    return this.scene(style, {
      width: 900,
      height: 1100,
      title: String(traits.base ?? style.collection),
      subtitle: `${String(traits.mood ?? traits.pose ?? "base pose")} / ${String(traits.visualRule ?? "simple")}`,
      seed,
      mode: "nft",
      fx,
      traits
    });
  }

  private scene(
    style: GeneratedStyleProfile,
    options: {
      width: number;
      height: number;
      title: string;
      subtitle: string;
      seed: number;
      mode: "avatar" | "banner" | "nft";
      fx?: "standard" | "epic" | "legendary";
      traits?: Record<string, unknown>;
    }
  ) {
    const visual = style.creativeUniverse?.creativeDna?.visualSystem;
    const [primary = "#79f2ff", secondary = "#111827", ink = "#050712", accent = "#f4f7fb"] = style.colors;
    const w = options.width;
    const h = options.height;
    const rarity = String(options.traits?.rarity ?? "");
    const intensity = this.rarityIntensity(rarity || "Rare");
    const mood = String(options.traits?.mood ?? "");
    const family = visual?.rendererFamily ?? "surreal-collage";
    const titleX = family === "terminal-brutalist" ? 42 : options.mode === "banner" ? 80 : 48;
    const titleY = options.mode === "banner" ? 106 : family === "pixel-topdown" ? 62 : h - 132;
    const background = this.visualBackground(family, style, w, h, options.seed, intensity, options.mode);
    const subject = this.visualSubject(family, style, w, h, options.seed, intensity, options.traits);
    const story = this.visualStoryOverlay(family, style, w, h, options.seed, intensity, options.traits);
    const surface = this.cardSurface(family, w, h, intensity, primary, secondary, ink, options.mode);
    const texture = this.visualTexture(family, w, h, options.seed, intensity);
    const titleColor = family === "terminal-brutalist" ? primary : family === "clay-toy" ? ink : "#ffffff";
    const subtitleColor = family === "terminal-brutalist" ? accent : primary;
    const caption = options.traits
      ? `${this.escape(rarity)} / ${this.escape(mood).slice(0, 30)}`
      : this.escape(visual?.compositionStyle ?? style.backgroundWorld).slice(0, 58);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="premiumGlow"><feGaussianBlur stdDeviation="${family === "clay-toy" ? 8 : family === "terminal-brutalist" ? 2 : 16}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="softShadow"><feDropShadow dx="0" dy="${family === "clay-toy" ? 18 : 8}" stdDeviation="${family === "clay-toy" ? 16 : 6}" flood-color="#000" flood-opacity="${family === "clay-toy" ? 0.28 : 0.45}"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="${options.seed % 997}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.16"/></feComponentTransfer></filter>
    <linearGradient id="light" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${primary}"/><stop offset="0.55" stop-color="${secondary}"/><stop offset="1" stop-color="${accent}"/></linearGradient>
  </defs>
  ${background}
  ${texture}
  ${surface}
  ${subject}
  ${story}
  <g font-family="Inter, Arial, sans-serif">
    <text x="${titleX}" y="${titleY}" fill="${titleColor}" font-size="${options.mode === "banner" ? 54 : family === "terminal-brutalist" ? 28 : 34}" font-weight="${family === "terminal-brutalist" ? 700 : 900}" letter-spacing="0">${this.escape(options.title).slice(0, 42)}</text>
    <text x="${titleX}" y="${titleY + (options.mode === "banner" ? 42 : 34)}" fill="${subtitleColor}" font-size="${options.mode === "banner" ? 24 : 18}" font-weight="800">${caption}</text>
    ${options.traits && family !== "pixel-topdown" ? `<text x="${titleX}" y="${titleY + 68}" fill="${family === "terminal-brutalist" ? primary : "#d8dee9"}" font-size="15">${this.escape(String(options.traits.expression ?? options.traits.accessory)).slice(0, 52)}</text>` : ""}
  </g>
</svg>`;
  }

  private visualBackground(family: string, style: GeneratedStyleProfile, w: number, h: number, seed: number, intensity: number, mode: string) {
    const [primary = "#79f2ff", secondary = "#111827", ink = "#050712", accent = "#f4f7fb"] = style.colors;
    if (family === "pixel-topdown") {
      const tile = mode === "banner" ? 64 : 56;
      const cols = Math.ceil(w / tile);
      const rows = Math.ceil(h / tile);
      const cells = Array.from({ length: cols * rows }, (_, index) => {
        const x = (index % cols) * tile;
        const y = Math.floor(index / cols) * tile;
        const hit = (seed + index * 17) % Math.max(2, 8 - intensity) === 0;
        const fill = hit ? (index % 3 ? primary : accent) : (index + seed) % 2 ? secondary : ink;
        return `<rect x="${x}" y="${y}" width="${tile - 2}" height="${tile - 2}" fill="${fill}" opacity="${hit ? 0.55 : 0.95}"/>`;
      }).join("");
      return `<rect width="${w}" height="${h}" fill="${ink}"/><g>${cells}</g>`;
    }
    if (family === "terminal-brutalist") {
      const panels = Array.from({ length: 8 + intensity * 3 }, (_, index) => {
        const x = 32 + ((seed + index * 151) % Math.max(1, w - 220));
        const y = 42 + ((seed + index * 83) % Math.max(1, h - 260));
        const ww = 140 + ((seed + index * 29) % 220);
        const hh = 58 + ((seed + index * 31) % 140);
        return `<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="${index % 2 ? ink : "#0b0f14"}" stroke="${primary}" stroke-width="2" opacity="${0.35 + intensity * 0.06}"/><path d="M${x + 12} ${y + 22} h${ww - 24} M${x + 12} ${y + 42} h${Math.round((ww - 24) * ((index % 5) + 1) / 5)}" stroke="${index % 3 ? secondary : accent}" stroke-width="4" opacity="0.7"/>`;
      }).join("");
      return `<rect width="${w}" height="${h}" fill="#050608"/><g>${panels}</g>`;
    }
    if (family === "clay-toy") {
      return `<rect width="${w}" height="${h}" fill="${accent}"/><ellipse cx="${w * 0.5}" cy="${h * 0.75}" rx="${w * 0.44}" ry="${h * 0.14}" fill="${secondary}" opacity="0.22"/><rect x="0" y="${h * 0.62}" width="${w}" height="${h * 0.38}" fill="${primary}" opacity="0.18"/>`;
    }
    if (family === "biohazard-horror") {
      return `<rect width="${w}" height="${h}" fill="${ink}"/><path d="M0 ${h * 0.18} C${w * 0.22} ${h * 0.06} ${w * 0.4} ${h * 0.34} ${w} ${h * 0.12} V${h} H0Z" fill="${secondary}" opacity="0.4"/><g stroke="${primary}" stroke-width="7" opacity="${0.22 + intensity * 0.05}">${Array.from({ length: 8 + intensity }, (_, i) => `<path d="M${(seed + i * 91) % w} 0 L${(seed + i * 157) % w} ${h}"/>`).join("")}</g>`;
    }
    if (family === "anime-portrait") {
      return `<rect width="${w}" height="${h}" fill="${ink}"/><path d="M0 0 H${w} V${h} H0Z" fill="url(#light)" opacity="0.26"/><path d="M${w * 0.64} 0 L${w} 0 L${w * 0.55} ${h}" fill="${primary}" opacity="${0.18 + intensity * 0.04}"/><circle cx="${w * 0.28}" cy="${h * 0.2}" r="${180 + intensity * 28}" fill="${secondary}" opacity="0.2"/>`;
    }
    return `<rect width="${w}" height="${h}" fill="${ink}"/><path d="M${w * 0.05} ${h * 0.22} C${w * 0.38} ${h * 0.02} ${w * 0.42} ${h * 0.52} ${w * 0.92} ${h * 0.2} L${w} ${h} H0Z" fill="${secondary}" opacity="0.55"/><circle cx="${w * 0.72}" cy="${h * 0.28}" r="${130 + intensity * 22}" fill="${primary}" opacity="0.22"/><rect x="${w * 0.12}" y="${h * 0.18}" width="${w * 0.28}" height="${h * 0.36}" fill="${accent}" opacity="0.18" transform="rotate(${(seed % 20) - 10} ${w * 0.26} ${h * 0.36})"/>`;
  }

  private visualSubject(family: string, style: GeneratedStyleProfile, w: number, h: number, seed: number, intensity: number, traits?: Record<string, unknown>) {
    const [primary = "#79f2ff", secondary = "#111827", ink = "#050712", accent = "#f4f7fb"] = style.colors;
    const mood = `${traits?.mood ?? ""} ${traits?.expression ?? ""} ${traits?.stance ?? ""}`.toLowerCase();
    const lean = (seed % 29) - 14;
    const eyeTilt = /panic|paranoid|rage|containment|liquidation|dead|exhausted/.test(mood) ? 16 : /smug|wealthy|locked/.test(mood) ? -8 : 0;
    const mouthCurve = /panic|gasp|rage|snarl|cough/.test(mood) ? "open" : /dead|flat|calm|empty/.test(mood) ? "flat" : /smug|grin|amused/.test(mood) ? "smirk" : "soft";
    if (family === "pixel-topdown") return this.pixelSubject(w, h, seed, intensity, primary, secondary, ink, accent, eyeTilt, mouthCurve);
    if (family === "terminal-brutalist") return this.terminalSubject(w, h, seed, intensity, primary, secondary, ink, accent, eyeTilt, mouthCurve);
    if (family === "clay-toy") return this.claySubject(w, h, seed, intensity, primary, secondary, ink, accent, lean, eyeTilt, mouthCurve);
    if (family === "biohazard-horror") return this.biohazardSubject(w, h, seed, intensity, primary, secondary, ink, accent, lean, eyeTilt, mouthCurve);
    if (family === "anime-portrait") return this.animeSubject(w, h, seed, intensity, primary, secondary, ink, accent, lean, eyeTilt, mouthCurve);
    return this.collageSubject(w, h, seed, intensity, primary, secondary, ink, accent, lean, eyeTilt, mouthCurve);
  }

  private pixelSubject(w: number, h: number, seed: number, intensity: number, primary: string, secondary: string, ink: string, accent: string, eyeTilt: number, mouth: string) {
    const size = 42 + intensity * 8;
    const count = intensity >= 5 ? 5 : intensity >= 3 ? 3 : 1;
    return `<g shape-rendering="crispEdges">${Array.from({ length: count }, (_, index) => {
      const x = Math.round(w * (0.28 + index * 0.12 + ((seed + index) % 3) * 0.02));
      const y = Math.round(h * (0.38 + ((seed + index * 7) % 24) / 100));
      return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${primary}" stroke="${ink}" stroke-width="6"/><rect x="${x - size * 0.25}" y="${y + size * 0.85}" width="${size * 1.5}" height="${size * 0.8}" fill="${secondary}" stroke="${ink}" stroke-width="5"/><rect x="${x + size * 0.2}" y="${y + size * 0.3}" width="8" height="${eyeTilt > 0 ? 16 : 8}" fill="${ink}"/><rect x="${x + size * 0.62}" y="${y + size * 0.3 + eyeTilt / 4}" width="8" height="${eyeTilt > 0 ? 16 : 8}" fill="${ink}"/><rect x="${x + size * 0.28}" y="${y + size * 0.66}" width="${mouth === "open" ? 22 : 30}" height="${mouth === "flat" ? 5 : 10}" fill="${accent}"/>`;
    }).join("")}</g>`;
  }

  private terminalSubject(w: number, h: number, seed: number, intensity: number, primary: string, secondary: string, ink: string, accent: string, eyeTilt: number, mouth: string) {
    const x = Math.round(w * 0.52);
    const y = Math.round(h * 0.25);
    const ww = Math.round(w * (0.32 + intensity * 0.025));
    const hh = Math.round(h * (0.28 + intensity * 0.02));
    return `<g><rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="#090b0f" stroke="${primary}" stroke-width="${2 + intensity}"/><rect x="${x + 24}" y="${y + 32}" width="${ww - 48}" height="38" fill="${secondary}" opacity="0.7"/><path d="M${x + 50} ${y + 100 + eyeTilt / 3} h70 M${x + ww - 122} ${y + 100 - eyeTilt / 3} h70" stroke="${accent}" stroke-width="10"/><path d="${mouth === "open" ? `M${x + ww * 0.43} ${y + 160} h${ww * 0.15} v28 h-${ww * 0.15}Z` : `M${x + ww * 0.38} ${y + 168} h${ww * 0.26}`}" stroke="${primary}" stroke-width="8" fill="${mouth === "open" ? primary : "none"}"/><path d="M${x - 70} ${y + hh + 28} C${x + 40} ${y + hh - 36} ${x + ww - 30} ${y + hh - 32} ${x + ww + 94} ${y + hh + 30}" stroke="${secondary}" stroke-width="34" fill="none"/></g>`;
  }

  private claySubject(w: number, h: number, seed: number, intensity: number, primary: string, secondary: string, ink: string, accent: string, lean: number, eyeTilt: number, mouth: string) {
    const cx = Math.round(w * 0.5);
    const cy = Math.round(h * 0.46);
    const headRx = 105 + intensity * 11;
    const headRy = 92 + intensity * 8;
    return `<g transform="rotate(${lean / 3} ${cx} ${cy})" filter="url(#softShadow)"><ellipse cx="${cx}" cy="${cy + 170}" rx="${130 + intensity * 16}" ry="${118 + intensity * 10}" fill="${secondary}"/><ellipse cx="${cx}" cy="${cy}" rx="${headRx}" ry="${headRy}" fill="${primary}"/><ellipse cx="${cx - 46}" cy="${cy - 16}" rx="${18 + intensity}" ry="${mouth === "open" ? 25 : 14}" fill="${ink}"/><ellipse cx="${cx + 50}" cy="${cy - 14 + eyeTilt / 4}" rx="${18 + intensity}" ry="${mouth === "open" ? 25 : 14}" fill="${ink}"/><path d="${mouth === "smirk" ? `M${cx - 35} ${cy + 44} Q${cx + 20} ${cy + 70} ${cx + 66} ${cy + 34}` : mouth === "open" ? `M${cx - 30} ${cy + 42} Q${cx} ${cy + 84} ${cx + 34} ${cy + 42} Q${cx} ${cy + 60} ${cx - 30} ${cy + 42}` : `M${cx - 40} ${cy + 48} Q${cx} ${cy + 54} ${cx + 42} ${cy + 48}`}" stroke="${ink}" stroke-width="10" fill="${mouth === "open" ? accent : "none"}" stroke-linecap="round"/><path d="M${cx - 122} ${cy + 160} q-76 42 -94 122 M${cx + 122} ${cy + 160} q86 42 102 122" stroke="${primary}" stroke-width="34" fill="none" stroke-linecap="round"/></g>`;
  }

  private biohazardSubject(w: number, h: number, seed: number, intensity: number, primary: string, secondary: string, ink: string, accent: string, lean: number, eyeTilt: number, mouth: string) {
    const cx = Math.round(w * 0.5 + lean * 3);
    const cy = Math.round(h * 0.47);
    const growths = Array.from({ length: 4 + intensity }, (_, i) => `<circle cx="${cx + ((seed + i * 47) % 260) - 130}" cy="${cy + ((seed + i * 61) % 360) - 210}" r="${14 + ((seed + i) % 28)}" fill="${i % 2 ? accent : primary}" opacity="0.72" stroke="${ink}" stroke-width="5"/>`).join("");
    return `<g transform="rotate(${lean / 2} ${cx} ${cy})" filter="url(#premiumGlow)">${growths}<path d="M${cx - 140} ${cy - 210} C${cx - 250} ${cy - 70} ${cx - 160} ${cy + 190} ${cx - 20} ${cy + 230} C${cx + 190} ${cy + 290} ${cx + 250} ${cy + 35} ${cx + 130} ${cy - 140} C${cx + 70} ${cy - 250} ${cx - 60} ${cy - 270} ${cx - 140} ${cy - 210}Z" fill="${secondary}" stroke="${primary}" stroke-width="${10 + intensity}"/><ellipse cx="${cx - 62}" cy="${cy - 45}" rx="${46 + intensity * 4}" ry="${28 + Math.max(0, eyeTilt)}" fill="${accent}" stroke="${ink}" stroke-width="9"/><ellipse cx="${cx + 74}" cy="${cy - 34}" rx="${26 + intensity * 2}" ry="${46}" fill="${accent}" stroke="${ink}" stroke-width="8"/><path d="${mouth === "open" ? `M${cx - 78} ${cy + 92} C${cx - 10} ${cy + 150} ${cx + 82} ${cy + 120} ${cx + 98} ${cy + 74}` : `M${cx - 86} ${cy + 92} Q${cx - 6} ${cy + 132} ${cx + 92} ${cy + 72}`}" stroke="${ink}" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M${cx + 132} ${cy - 210} l50 -80 l38 96 M${cx - 184} ${cy + 92} l-70 86 l88 -16" stroke="${primary}" stroke-width="18" fill="none" stroke-linecap="round"/></g>`;
  }

  private animeSubject(w: number, h: number, seed: number, intensity: number, primary: string, secondary: string, ink: string, accent: string, lean: number, eyeTilt: number, mouth: string) {
    const cx = Math.round(w * 0.48);
    const cy = Math.round(h * 0.42);
    return `<g transform="rotate(${lean / 5} ${cx} ${cy})"><path d="M${cx - 190} ${cy + 360} C${cx - 120} ${cy + 120} ${cx + 130} ${cy + 110} ${cx + 210} ${cy + 360}Z" fill="${secondary}" filter="url(#softShadow)"/><path d="M${cx - 132} ${cy - 172} Q${cx + 4} ${cy - 252} ${cx + 142} ${cy - 156} Q${cx + 180} ${cy + 12} ${cx + 66} ${cy + 142} Q${cx - 40} ${cy + 208} ${cx - 126} ${cy + 102} Q${cx - 204} ${cy - 12} ${cx - 132} ${cy - 172}Z" fill="${primary}" stroke="${ink}" stroke-width="8"/><path d="M${cx - 194} ${cy - 150} C${cx - 78} ${cy - 280} ${cx + 122} ${cy - 245} ${cx + 204} ${cy - 95} C${cx + 60} ${cy - 140} ${cx - 24} ${cy - 152} ${cx - 194} ${cy - 150}Z" fill="${secondary}" opacity="0.85"/><ellipse cx="${cx - 60}" cy="${cy - 20 + eyeTilt / 5}" rx="44" ry="${28 + intensity * 3}" fill="${accent}" stroke="${ink}" stroke-width="7"/><ellipse cx="${cx + 76}" cy="${cy - 18 - eyeTilt / 5}" rx="44" ry="${28 + intensity * 3}" fill="${accent}" stroke="${ink}" stroke-width="7"/><circle cx="${cx - 48}" cy="${cy - 20}" r="12" fill="${ink}"/><circle cx="${cx + 62}" cy="${cy - 18}" r="12" fill="${ink}"/><path d="${mouth === "open" ? `M${cx - 28} ${cy + 78} q34 42 76 0` : mouth === "smirk" ? `M${cx - 38} ${cy + 78} q52 28 98 -10` : `M${cx - 34} ${cy + 82} h80`}" stroke="${ink}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M${cx + 184} ${cy + 54} q90 ${intensity * 12} 118 -86" stroke="${accent}" stroke-width="20" fill="none" opacity="0.8"/></g>`;
  }

  private collageSubject(w: number, h: number, seed: number, intensity: number, primary: string, secondary: string, ink: string, accent: string, lean: number, eyeTilt: number, mouth: string) {
    const cx = Math.round(w * 0.52);
    const cy = Math.round(h * 0.46);
    const pieces = Array.from({ length: 5 + intensity }, (_, i) => {
      const x = cx + ((seed + i * 67) % 300) - 150;
      const y = cy + ((seed + i * 43) % 360) - 180;
      return `<rect x="${x}" y="${y}" width="${70 + i * 9}" height="${90 + (i % 3) * 34}" fill="${i % 2 ? primary : secondary}" opacity="0.72" transform="rotate(${((seed + i * 13) % 54) - 27} ${x} ${y})"/>`;
    }).join("");
    return `<g filter="url(#softShadow)">${pieces}<path d="M${cx - 110} ${cy - 140} C${cx + 40} ${cy - 230} ${cx + 170} ${cy - 60} ${cx + 88} ${cy + 108} C${cx - 34} ${cy + 190} ${cx - 190} ${cy + 70} ${cx - 110} ${cy - 140}Z" fill="${accent}" opacity="0.72"/><circle cx="${cx - 62}" cy="${cy - 26 + eyeTilt / 4}" r="34" fill="${ink}"/><circle cx="${cx + 70}" cy="${cy - 56 - eyeTilt / 4}" r="24" fill="${ink}"/><path d="${mouth === "open" ? `M${cx - 18} ${cy + 74} l68 24 l-56 48z` : `M${cx - 42} ${cy + 92} l112 -18`}" stroke="${ink}" stroke-width="11" fill="${mouth === "open" ? primary : "none"}"/></g>`;
  }

  private visualStoryOverlay(family: string, style: GeneratedStyleProfile, w: number, h: number, seed: number, intensity: number, traits?: Record<string, unknown>) {
    if (!traits || intensity < 4) return "";
    const [primary = "#79f2ff", secondary = "#111827", ink = "#050712", accent = "#f4f7fb"] = style.colors;
    const legendary = intensity >= 5;
    if (family === "terminal-brutalist") return `<g font-family="ui-monospace, Consolas, monospace" opacity="0.92"><text x="44" y="${h - 74}" fill="${legendary ? accent : primary}" font-size="22">${this.escape(String(traits.legendaryOverlay ?? traits.visualRule)).slice(0, 48)}</text><path d="M40 ${h - 52} H${w - 40}" stroke="${legendary ? accent : primary}" stroke-width="${legendary ? 8 : 3}"/></g>`;
    if (family === "pixel-topdown") return `<g shape-rendering="crispEdges">${Array.from({ length: legendary ? 18 : 9 }, (_, i) => `<rect x="${(seed + i * 89) % w}" y="${(seed + i * 53) % h}" width="28" height="28" fill="${i % 2 ? accent : primary}" opacity="0.8"/>`).join("")}</g>`;
    if (family === "biohazard-horror") return `<g opacity="${legendary ? 0.9 : 0.55}"><path d="M70 86 H${w - 70} M70 ${h - 86} H${w - 70}" stroke="${legendary ? accent : primary}" stroke-width="${legendary ? 18 : 8}" stroke-dasharray="40 24"/><text x="86" y="132" fill="${accent}" font-size="24" font-weight="900">CONTAINMENT ${legendary ? "BREACH" : "WARNING"}</text></g>`;
    if (family === "clay-toy") return `<g opacity="0.86"><ellipse cx="${w - 150}" cy="${h - 190}" rx="${legendary ? 92 : 54}" ry="${legendary ? 72 : 42}" fill="${accent}" filter="url(#softShadow)"/><circle cx="${w - 180}" cy="${h - 208}" r="8" fill="${ink}"/><circle cx="${w - 124}" cy="${h - 208}" r="8" fill="${ink}"/></g>`;
    if (family === "anime-portrait") return `<g opacity="0.9"><path d="M${w * 0.1} ${h * 0.18} C${w * 0.42} ${h * 0.05} ${w * 0.64} ${h * 0.13} ${w * 0.92} ${h * 0.08}" stroke="${legendary ? accent : primary}" stroke-width="${legendary ? 18 : 8}" fill="none"/><text x="${w * 0.58}" y="${h * 0.16}" fill="${accent}" font-size="20" font-weight="900">${legendary ? "EVENT FRAME" : "DRAMA"}</text></g>`;
    return `<g opacity="0.78"><circle cx="${w * 0.18}" cy="${h * 0.28}" r="${legendary ? 88 : 48}" fill="${accent}"/><path d="M${w * 0.12} ${h * 0.78} C${w * 0.44} ${h * 0.58} ${w * 0.6} ${h * 0.96} ${w * 0.88} ${h * 0.68}" stroke="${primary}" stroke-width="${legendary ? 20 : 9}" fill="none"/></g>`;
  }

  private cardSurface(family: string, w: number, h: number, intensity: number, primary: string, secondary: string, ink: string, mode: string) {
    if (mode === "banner") return "";
    if (family === "terminal-brutalist") return `<rect x="24" y="24" width="${w - 48}" height="${h - 48}" fill="none" stroke="${primary}" stroke-width="2" opacity="0.7"/>`;
    if (family === "pixel-topdown") return "";
    if (family === "clay-toy") return `<rect x="0" y="0" width="${w}" height="${h}" fill="none"/>`;
    if (family === "biohazard-horror") return `<rect x="34" y="34" width="${w - 68}" height="${h - 68}" fill="none" stroke="${primary}" stroke-width="${intensity >= 5 ? 10 : 4}" stroke-dasharray="${intensity >= 5 ? "34 18" : "14 14"}" opacity="0.65"/>`;
    if (family === "anime-portrait") return `<path d="M36 ${h - 48} H${w - 40}" stroke="${primary}" stroke-width="${intensity >= 5 ? 12 : 4}" opacity="0.75"/>`;
    return "";
  }

  private visualTexture(family: string, w: number, h: number, seed: number, intensity: number) {
    if (family === "terminal-brutalist") return `<g opacity="0.22">${Array.from({ length: 28 }, (_, i) => `<text x="${(seed + i * 97) % w}" y="${(seed + i * 61) % h}" fill="#fff" font-size="11" font-family="monospace">${(seed + i * 13).toString(16).slice(0, 4)}</text>`).join("")}</g>`;
    if (family === "pixel-topdown") return "";
    if (family === "clay-toy") return `<g opacity="0.16" filter="url(#grain)"><rect width="${w}" height="${h}" fill="#000"/></g>`;
    return `<g opacity="${0.08 + intensity * 0.025}">${this.texture(w, h, seed)}</g>`;
  }

  private mascotShape(mascot: string, cx: number, cy: number, scale: number, primary: string, secondary: string, ink: string, seed: number, traits?: Record<string, unknown>) {
    const s = (value: number) => Math.round(value * scale);
    const lean = (seed % 31) - 15;
    const rarity = String(traits?.rarity ?? "");
    const eyeShift = rarity === "Legendary" ? s(18) : rarity === "Mythic" ? -s(20) : 0;
    if (/infected|lab|virus|biohazard|pathogen/.test(mascot)) {
      return `<g transform="rotate(${lean / 4} ${cx} ${cy})" filter="url(#premiumGlow)">
        <path d="M${cx - s(160)} ${cy - s(230)} Q${cx - s(250)} ${cy - s(80)} ${cx - s(178)} ${cy + s(100)} Q${cx - s(92)} ${cy + s(280)} ${cx + s(42)} ${cy + s(224)} Q${cx + s(225)} ${cy + s(150)} ${cx + s(172)} ${cy - s(82)} Q${cx + s(126)} ${cy - s(275)} ${cx - s(160)} ${cy - s(230)}Z" fill="${primary}" stroke="${secondary}" stroke-width="${s(11)}"/>
        <path d="M${cx - s(95)} ${cy - s(175)} l${s(48)} -${s(76)} l${s(64)} ${s(70)} l${s(72)} -${s(88)} l${s(38)} ${s(114)}" fill="none" stroke="#f2d34f" stroke-width="${s(9)}" stroke-linecap="round" opacity="0.9"/>
        <circle cx="${cx - s(72) + eyeShift}" cy="${cy - s(45)}" r="${s(44)}" fill="#d8fff0" stroke="${ink}" stroke-width="${s(9)}"/><circle cx="${cx + s(70) - eyeShift}" cy="${cy - s(35)}" r="${s(32)}" fill="#d8fff0" stroke="${ink}" stroke-width="${s(8)}"/>
        <circle cx="${cx - s(72) + eyeShift}" cy="${cy - s(45)}" r="${s(17)}" fill="${ink}"/><circle cx="${cx + s(70) - eyeShift}" cy="${cy - s(35)}" r="${s(13)}" fill="${ink}"/>
        <path d="M${cx - s(84)} ${cy + s(92)} Q${cx - s(4)} ${cy + s(142)} ${cx + s(94)} ${cy + s(74)}" stroke="${ink}" stroke-width="${s(13)}" fill="none" stroke-linecap="round"/>
        <path d="M${cx + s(170)} ${cy - s(210)} l${s(36)} ${s(64)} l-${s(72)} 0z M${cx - s(230)} ${cy + s(150)} l${s(38)} ${s(66)} l-${s(78)} -${s(4)}z" fill="#f2d34f" opacity="0.86"/>
      </g>`;
    }
    if (/cat/.test(mascot)) {
      return `<g transform="translate(${lean} 0)" filter="url(#premiumGlow)">
        <path d="M${cx - s(185)} ${cy - s(130)} L${cx - s(105)} ${cy - s(270)} L${cx - s(42)} ${cy - s(145)} Q${cx} ${cy - s(178)} ${cx + s(42)} ${cy - s(145)} L${cx + s(110)} ${cy - s(270)} L${cx + s(185)} ${cy - s(130)} Q${cx + s(230)} ${cy + s(28)} ${cx + s(130)} ${cy + s(184)} Q${cx} ${cy + s(260)} ${cx - s(130)} ${cy + s(184)} Q${cx - s(230)} ${cy + s(28)} ${cx - s(185)} ${cy - s(130)}Z" fill="${ink}" stroke="${secondary}" stroke-width="${s(9)}"/>
        <circle cx="${cx - s(75)}" cy="${cy - s(28)}" r="${s(34)}" fill="${primary}"/><circle cx="${cx + s(75)}" cy="${cy - s(28)}" r="${s(34)}" fill="${primary}"/>
        <path d="M${cx - s(118)} ${cy + s(78)} Q${cx} ${cy + s(132)} ${cx + s(118)} ${cy + s(78)}" fill="none" stroke="${secondary}" stroke-width="${s(12)}" stroke-linecap="round"/>
      </g>`;
    }
    if (/dog|samurai/.test(mascot)) {
      return `<g transform="rotate(${lean / 6} ${cx} ${cy})" filter="url(#premiumGlow)">
        <path d="M${cx - s(205)} ${cy - s(105)} Q${cx - s(250)} ${cy - s(240)} ${cx - s(110)} ${cy - s(196)} Q${cx} ${cy - s(265)} ${cx + s(110)} ${cy - s(196)} Q${cx + s(250)} ${cy - s(240)} ${cx + s(205)} ${cy - s(105)} Q${cx + s(240)} ${cy + s(120)} ${cx} ${cy + s(250)} Q${cx - s(240)} ${cy + s(120)} ${cx - s(205)} ${cy - s(105)}Z" fill="${primary}" stroke="${secondary}" stroke-width="${s(10)}"/>
        <path d="M${cx - s(132)} ${cy - s(230)} H${cx + s(132)} L${cx + s(86)} ${cy - s(295)} H${cx - s(86)}Z" fill="${secondary}"/>
        <circle cx="${cx - s(70)}" cy="${cy - s(30)}" r="${s(28)}" fill="${ink}"/><circle cx="${cx + s(70)}" cy="${cy - s(30)}" r="${s(28)}" fill="${ink}"/>
        <path d="M${cx - s(65)} ${cy + s(83)} Q${cx} ${cy + s(120)} ${cx + s(65)} ${cy + s(83)}" fill="none" stroke="${ink}" stroke-width="${s(12)}" stroke-linecap="round"/>
      </g>`;
    }
    if (/robot|coin/.test(mascot)) {
      return `<g transform="translate(${lean} 0)" filter="url(#premiumGlow)">
        <rect x="${cx - s(185)}" y="${cy - s(210)}" width="${s(370)}" height="${s(420)}" rx="${/coin/.test(mascot) ? s(160) : s(54)}" fill="${ink}" stroke="${primary}" stroke-width="${s(12)}"/>
        <rect x="${cx - s(118)}" y="${cy - s(70)}" width="${s(236)}" height="${s(82)}" rx="${s(24)}" fill="${secondary}" opacity="0.85"/>
        <circle cx="${cx - s(62)}" cy="${cy - s(28)}" r="${s(20)}" fill="#fff"/><circle cx="${cx + s(62)}" cy="${cy - s(28)}" r="${s(20)}" fill="#fff"/>
        <path d="M${cx - s(105)} ${cy + s(92)} H${cx + s(105)}" stroke="${primary}" stroke-width="${s(14)}" stroke-linecap="round"/>
      </g>`;
    }
    if (/alien|skull/.test(mascot)) {
      return `<g transform="rotate(${lean / 5} ${cx} ${cy})" filter="url(#premiumGlow)">
        <path d="M${cx} ${cy - s(275)} Q${cx + s(230)} ${cy - s(205)} ${cx + s(184)} ${cy + s(60)} Q${cx + s(130)} ${cy + s(260)} ${cx} ${cy + s(255)} Q${cx - s(130)} ${cy + s(260)} ${cx - s(184)} ${cy + s(60)} Q${cx - s(230)} ${cy - s(205)} ${cx} ${cy - s(275)}Z" fill="${primary}" stroke="${secondary}" stroke-width="${s(10)}"/>
        <ellipse cx="${cx - s(75)}" cy="${cy - s(45)}" rx="${s(58)}" ry="${s(86)}" fill="${ink}"/><ellipse cx="${cx + s(75)}" cy="${cy - s(45)}" rx="${s(58)}" ry="${s(86)}" fill="${ink}"/>
        <path d="M${cx - s(68)} ${cy + s(102)} Q${cx} ${cy + s(142)} ${cx + s(68)} ${cy + s(102)}" stroke="${ink}" stroke-width="${s(12)}" fill="none" stroke-linecap="round"/>
      </g>`;
    }
    return `<g transform="translate(${lean} 0)" filter="url(#premiumGlow)">
      <path d="M${cx - s(205)} ${cy - s(108)} Q${cx - s(175)} ${cy - s(265)} ${cx} ${cy - s(245)} Q${cx + s(175)} ${cy - s(265)} ${cx + s(205)} ${cy - s(108)} Q${cx + s(238)} ${cy + s(104)} ${cx} ${cy + s(252)} Q${cx - s(238)} ${cy + s(104)} ${cx - s(205)} ${cy - s(108)}Z" fill="${primary}" stroke="${secondary}" stroke-width="${s(10)}"/>
      <circle cx="${cx - s(76)}" cy="${cy - s(58)}" r="${s(58)}" fill="#d8ffd8" stroke="${ink}" stroke-width="${s(8)}"/><circle cx="${cx + s(76)}" cy="${cy - s(58)}" r="${s(58)}" fill="#d8ffd8" stroke="${ink}" stroke-width="${s(8)}"/>
      <circle cx="${cx - s(76)}" cy="${cy - s(58)}" r="${s(22)}" fill="${ink}"/><circle cx="${cx + s(76)}" cy="${cy - s(58)}" r="${s(22)}" fill="${ink}"/>
      <path d="M${cx - s(95)} ${cy + s(86)} Q${cx} ${cy + s(130)} ${cx + s(95)} ${cy + s(86)}" stroke="${ink}" stroke-width="${s(13)}" fill="none" stroke-linecap="round"/>
    </g>`;
  }

  private landmarks(style: GeneratedStyleProfile, w: number, h: number, seed: number) {
    const [primary, secondary] = style.colors;
    return Array.from({ length: 9 }, (_, index) => {
      const x = Math.round(((seed + index * 137) % w) * 0.98);
      const y = Math.round(h * (0.28 + ((index * 17) % 50) / 100));
      const height = 80 + ((seed + index * 41) % 180);
      return `<path d="M${x} ${y} l${26 + index * 2} ${height} h-${60 + index * 5}z" fill="${index % 2 ? primary : secondary}" opacity="${0.1 + (index % 3) * 0.05}"/>`;
    }).join("");
  }

  private texture(w: number, h: number, seed: number) {
    return Array.from({ length: 70 }, (_, index) => {
      const x = (seed + index * 79) % w;
      const y = (seed + index * 47) % h;
      const r = 1 + ((seed + index) % 4);
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.08 + (index % 5) * 0.02}"/>`;
    }).join("");
  }

  private svgUri(svg: string) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  private rarityIntensity(rarity: string) {
    if (rarity === "Mythic") return 6;
    if (rarity === "Legendary") return 5;
    if (rarity === "Epic") return 4;
    if (rarity === "Rare") return 3;
    if (rarity === "Uncommon") return 2;
    return 1;
  }

  private rarityVisualRule(rarity: string) {
    if (rarity === "Mythic") return "near 1/1 curated scene";
    if (rarity === "Legendary") return "unique pose scene frame and FX";
    if (rarity === "Epic") return "aura outfit premium background";
    if (rarity === "Rare") return "strong accessory expression background";
    if (rarity === "Uncommon") return "one modest accessory variation";
    return "simple background base pose minimal traits";
  }

  private rarityVisualRulePlan(rarity: string) {
    const rules: Record<string, { minTraits: number; maxTraits: number; pose: string; background: string; aura: "none" | "mild" | "strong" | "signature"; frame: "none" | "standard" | "special" | "mythic"; composition: string }> = {
      Common: { minTraits: 2, maxTraits: 4, pose: "base pose", background: "simple background", aura: "none", frame: "none", composition: "simple background base pose minimal traits" },
      Uncommon: { minTraits: 3, maxTraits: 5, pose: "base pose with expression shift", background: "slight background variation", aura: "none", frame: "standard", composition: "one modest accessory variation" },
      Rare: { minTraits: 5, maxTraits: 7, pose: "stronger expression", background: "richer background", aura: "mild", frame: "standard", composition: "strong accessory expression background" },
      Epic: { minTraits: 7, maxTraits: 9, pose: "premium action pose", background: "premium background scene", aura: "strong", frame: "special", composition: "aura outfit premium background" },
      Legendary: { minTraits: 9, maxTraits: 11, pose: "unique cinematic pose", background: "unique background", aura: "signature", frame: "special", composition: "unique pose scene frame and FX" },
      Mythic: { minTraits: 10, maxTraits: 12, pose: "near 1/1 curated pose", background: "hand-directed one-off scene", aura: "signature", frame: "mythic", composition: "near 1/1 curated scene" }
    };
    return rules[rarity] ?? rules.Common;
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

  private moodFor(style: GeneratedStyleProfile, rarity: string, seed: number) {
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
}
