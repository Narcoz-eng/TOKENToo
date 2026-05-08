import { Injectable } from "@nestjs/common";
import type { GeneratedStyleProfile, PreviewAssetPlan, TraitPackPlan } from "./generator.types";
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
    const headgear = intensity >= 3 ? pick(pack.categories.headgear, seed + 2) : "None";
    const eyePool = headgear !== "None" && /Mask|Helm|Kabuto|Hood/i.test(headgear) ? pack.categories.eyes.filter((eye) => !/Visor|Scanner/i.test(eye)) : pack.categories.eyes;
    const traits = {
      base: pick(pack.categories.baseCharacter, seed),
      background: intensity >= 4 ? pick(pack.categories.backgrounds.slice(20), seed + 1) : intensity >= 3 ? pick(pack.categories.backgrounds.slice(8, 34), seed + 1) : pick(pack.categories.backgrounds.slice(0, 12), seed + 1),
      headgear,
      eyes: intensity >= 1 ? pick(eyePool.length ? eyePool : pack.categories.eyes, seed + 3) : "Base eyes",
      mouthExpression: intensity >= 2 ? pick(pack.categories.mouthExpression, seed + 10) : "Base expression",
      outfit: intensity >= 3 ? pick(pack.categories.outfitBody, seed + 4) : "Base pose",
      accessory: intensity >= 2 ? pick(pack.categories.accessories, seed + 5) : "None",
      neckChestAccessory: intensity >= 4 ? pick(pack.categories.neckChestAccessory ?? ["Vault Sigil"], seed + 6) : "None",
      aura: intensity >= 4 ? pick(pack.categories.auraEffect, seed + 6) : "None",
      frame: intensity >= 5 ? pick(pack.categories.borderFrame, seed + 7) : intensity >= 2 ? "Standard frame" : "None",
      legendaryOverlay: intensity >= 5 ? pick(pack.categories.legendaryOverlay, seed + 9) : "None",
      animationOverlay: intensity >= 5 ? pick(pack.categories.animationOverlay ?? ["Static Still"], seed + 8) : "Static Still",
      pose: rule.pose,
      scene: intensity >= 5 ? style.legendaryTheme : rule.background,
      visualRule: rule.composition,
      rarity,
      compositionCategory,
      specialMetadataFlag: rarity === "Mythic" ? "MYTHIC_CURATED_COMPOSITION" : rarity === "Legendary" ? "LEGENDARY_SIGNATURE_SCENE" : "NONE"
    };
    const renderedTraitKeys = this.renderedTraitKeys(traits);
    const metadata = {
      ...traits,
      traitCount: renderedTraitKeys.length,
      renderedTraitKeys,
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
      subtitle: `${String(traits.pose ?? "base pose")} / ${String(traits.visualRule ?? "simple")}`,
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
    const [primary, secondary, ink] = style.colors;
    const w = options.width;
    const h = options.height;
    const cx = options.mode === "banner" ? Math.round(w * 0.68) : Math.round(w * 0.5);
    const cy = options.mode === "banner" ? Math.round(h * 0.55) : Math.round(h * 0.48);
    const scale = options.mode === "banner" ? 0.82 : options.mode === "nft" ? 1.05 : 1;
    const mascot = this.mascotShape(style.mascot, cx, cy, scale, primary, secondary, ink, options.seed);
    const landmarks = this.landmarks(style, w, h, options.seed);
    const texture = this.texture(w, h, options.seed);
    const rarity = String(options.traits?.rarity ?? "");
    const glow = options.fx === "legendary" ? 0.95 : options.fx === "epic" ? 0.65 : rarity === "Common" ? 0.12 : 0.3;
    const titleX = options.mode === "banner" ? 86 : 56;
    const titleY = options.mode === "banner" ? 116 : h - 135;
    const showLandmarks = options.mode !== "nft" || !["Common", "Uncommon"].includes(rarity);
    const frameWidth = options.fx === "legendary" ? 8 : rarity === "Common" ? 1 : 3;
    const mascotScale = rarity === "Legendary" ? scale * 1.12 : rarity === "Mythic" ? scale * 1.2 : scale;
    const sceneBadge = options.mode === "nft" && (rarity === "Legendary" || rarity === "Mythic")
      ? `<path d="M${w - 190} 70 l50 -34 l88 18 l28 72 l-62 66 l-90 -12 l-38 -68z" fill="url(#frame)" opacity="0.78"/><text x="${w - 167}" y="130" fill="#020806" font-size="20" font-weight="900">${rarity.toUpperCase()}</text>`
      : "";

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="bg" cx="55%" cy="40%" r="75%">
      <stop offset="0%" stop-color="${secondary}" stop-opacity="0.9"/>
      <stop offset="42%" stop-color="${primary}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${ink}" stop-opacity="1"/>
    </radialGradient>
    <filter id="premiumGlow"><feGaussianBlur stdDeviation="${18 + glow * 22}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="${options.seed % 997}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.16"/></feComponentTransfer></filter>
    <linearGradient id="frame" x1="0" x2="1"><stop stop-color="${primary}"/><stop offset="0.55" stop-color="${secondary}"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  ${showLandmarks ? landmarks : ""}
  <g opacity="${rarity === "Common" ? "0.18" : "0.55"}">${texture}</g>
  <circle cx="${cx}" cy="${cy}" r="${Math.round(250 * scale)}" fill="${primary}" opacity="${0.11 + glow * 0.12}" filter="url(#premiumGlow)"/>
  ${this.mascotShape(style.mascot, cx, cy, mascotScale, primary, secondary, ink, options.seed)}
  ${sceneBadge}
  <rect x="18" y="18" width="${w - 36}" height="${h - 36}" rx="${rarity === "Common" ? 12 : 34}" fill="none" stroke="url(#frame)" stroke-width="${frameWidth}" opacity="${rarity === "Common" ? "0.34" : "0.78"}"/>
  <g font-family="Inter, Arial, sans-serif">
    <text x="${titleX}" y="${titleY}" fill="#fff" font-size="${options.mode === "banner" ? 58 : 38}" font-weight="900">${this.escape(options.title).slice(0, 42)}</text>
    <text x="${titleX}" y="${titleY + 42}" fill="${primary}" font-size="${options.mode === "banner" ? 26 : 22}" font-weight="800">${this.escape(options.subtitle).slice(0, 58)}</text>
    ${options.traits ? `<text x="${titleX}" y="${titleY + 78}" fill="#d8dee9" font-size="18">${this.escape(String(options.traits.rarity))} / ${this.escape(String(options.traits.accessory)).slice(0, 28)}</text>` : ""}
  </g>
</svg>`;
  }

  private mascotShape(mascot: string, cx: number, cy: number, scale: number, primary: string, secondary: string, ink: string, seed: number) {
    const s = (value: number) => Math.round(value * scale);
    const lean = (seed % 31) - 15;
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

  private renderedTraitKeys(traits: Record<string, string>) {
    const visibleKeys = ["base", "background", "eyes", "mouthExpression", "headgear", "outfit", "accessory", "neckChestAccessory", "aura", "frame", "legendaryOverlay"];
    return visibleKeys.filter((key) => {
      const value = traits[key];
      return value && value !== "None" && value !== "Base pose" && value !== "Base expression" && value !== "Static Still" && value !== "Standard frame";
    });
  }

  private escape(value: string) {
    return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char] ?? char);
  }
}
