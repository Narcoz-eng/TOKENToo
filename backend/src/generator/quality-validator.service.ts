import { Injectable } from "@nestjs/common";
import type { CompatibilityRulePlan, DistinctivenessReportPlan, GeneratedStyleProfile, PreviewAssetPlan, QualityReportPlan, TraitPackPlan } from "./generator.types";
import { average, clamp } from "./generator.util";

@Injectable()
export class QualityValidatorService {
  validate(style: GeneratedStyleProfile, pack: TraitPackPlan, compatibilityRules: CompatibilityRulePlan[], previews: PreviewAssetPlan[], distinctiveness: DistinctivenessReportPlan): QualityReportPlan {
    const issues: string[] = [];
    const categoryScore = this.categoryScore(pack);
    const previewQualityScore = this.previewQuality(style, previews);
    const uniquenessScore = this.uniqueness(pack, distinctiveness);
    const colorHarmonyScore = this.colorHarmony(style.colors);
    const rarityDistributionScore = this.rarityDistribution(pack);
    const duplicateRiskScore = this.duplicateRisk(pack);
    const compatibilityScore = compatibilityRules.length >= 4 ? 92 : 68;

    if (categoryScore < 100) issues.push("Trait pack does not meet all 10k category minimums.");
    if (previewQualityScore < 78) issues.push("Previews do not meet premium quality target.");
    if (distinctiveness.score < 72) issues.push("Collection identity is too similar to an existing style profile.");
    if (duplicateRiskScore < 85) issues.push("Trait space is too small for reliable 10k uniqueness.");
    if (compatibilityScore < 80) issues.push("Compatibility coverage is too thin.");
    if (!style.brandDna) issues.push("Brand DNA is required before approval.");
    if (!style.tenKReadiness?.pass) issues.push("10k collection readiness validation failed.");
    if (style.artSource === "PROCEDURAL_FALLBACK") issues.push("Procedural SVG fallback art cannot be approved for production launch.");
    if (this.hasGenericTraitNames(style, pack)) issues.push("Trait names are too generic for premium collection identity.");
    if (this.usesPlatformPalette(style)) issues.push("Collection identity reuses the platform palette instead of a token-derived palette.");
    if (this.hasForbiddenGenericIdentity(style, pack)) issues.push("Collection repeats a forbidden generic AI prompt pattern.");
    if (this.poseReuse(previews) > 0.55) issues.push("Too many sample NFTs reuse the same pose; rarity ladder needs visible composition changes.");
    issues.push(...this.rarityVisualIssues(previews));
    issues.push(...this.traitCollisionIssues(previews));

    const tierScore = average([previewQualityScore, uniquenessScore, colorHarmonyScore, rarityDistributionScore, duplicateRiskScore, compatibilityScore, distinctiveness.score]);
    const tier = tierScore >= 92 && distinctiveness.score >= 86 ? "LEGENDARY_READY" : tierScore >= 80 && previewQualityScore >= 78 ? "PREMIUM" : "BASIC";

    return {
      previewQualityScore,
      uniquenessScore,
      colorHarmonyScore,
      rarityDistributionScore,
      duplicateRiskScore,
      compatibilityScore,
      tier,
      passed: issues.length === 0 && tier !== "BASIC",
      issues
    };
  }

  private categoryScore(pack: TraitPackPlan) {
    const minimums: Record<string, number> = {
      baseCharacter: 30,
      backgrounds: 40,
      headgear: 40,
      eyes: 30,
      mouthExpression: 20,
      outfitBody: 40,
      accessories: 40,
      neckChestAccessory: 20,
      auraEffect: 20,
      borderFrame: 10,
      legendaryOverlay: 5,
      animationOverlay: 4
    };
    const scores = Object.entries(minimums).map(([category, minimum]) => ((pack.categories[category]?.length ?? 0) >= minimum ? 100 : 0));
    return average(scores);
  }

  private previewQuality(style: GeneratedStyleProfile, previews: PreviewAssetPlan[]) {
    const sampleCount = previews.filter((preview) => preview.type === "SAMPLE_NFT").length;
    const hasBanner = previews.some((preview) => preview.type === "BANNER");
    const hasAvatar = previews.some((preview) => preview.type === "AVATAR");
    const languageScore = style.traitLanguage.filter((trait) => trait.split(" ").length >= 2 && !/green|red|blue|hat|background/i.test(trait)).length >= 10 ? 94 : 70;
    const assetScore = sampleCount >= 5 && hasBanner && hasAvatar ? 94 : 65;
    const styleScore = /premium|cinematic|fantasy|cyber|luxury|poster|anime|cartoon/i.test(style.artStyle) ? 90 : 72;
    return average([languageScore, assetScore, styleScore]);
  }

  private uniqueness(pack: TraitPackPlan, distinctiveness: DistinctivenessReportPlan) {
    const space =
      pack.categories.baseCharacter.length *
      pack.categories.backgrounds.length *
      pack.categories.headgear.length *
      pack.categories.eyes.length *
      pack.categories.accessories.length;
    const spaceScore = clamp(Math.log10(space) * 13, 0, 100);
    return average([spaceScore, distinctiveness.score]);
  }

  private colorHarmony(colors: string[]) {
    if (colors.length < 3) return 65;
    const uniqueColors = new Set(colors.map((color) => color.toLowerCase())).size;
    return uniqueColors >= 3 ? 90 : 72;
  }

  private rarityDistribution(pack: TraitPackPlan) {
    const total = Object.values(pack.rarityWeights).reduce((sum, value) => sum + value, 0);
    const legendary = pack.rarityWeights.Legendary ?? 0;
    const mythic = pack.rarityWeights.Mythic ?? 0;
    return total === 10_000 && legendary <= 150 && mythic <= 50 ? 96 : 72;
  }

  private duplicateRisk(pack: TraitPackPlan) {
    const combinationSpace =
      pack.categories.baseCharacter.length *
      pack.categories.backgrounds.length *
      pack.categories.headgear.length *
      pack.categories.eyes.length *
      pack.categories.mouthExpression.length *
      pack.categories.outfitBody.length *
      pack.categories.accessories.length *
      (pack.categories.neckChestAccessory?.length ?? 1) *
      pack.categories.auraEffect.length;
    return combinationSpace > 10_000_000_000 ? 98 : combinationSpace > 1_000_000 ? 86 : 64;
  }

  private hasGenericTraitNames(style: GeneratedStyleProfile, pack: TraitPackPlan) {
    const names = [...style.traitLanguage, ...pack.traits.slice(0, 80).map((trait) => trait.name)];
    const generic = /^(green|red|blue|yellow|purple|black|white)\s+(hat|background|aura|eyes|shirt|crown)$|^(hat|background|aura|eyes|shirt|crown)$/i;
    return names.some((name) => generic.test(name.trim()));
  }

  private rarityVisualIssues(previews: PreviewAssetPlan[]) {
    const issues: string[] = [];
    for (const preview of previews.filter((item) => item.type === "SAMPLE_NFT")) {
      const rarity = String(preview.metadata.rarity ?? "");
      const visibleTraitCount = Number(preview.metadata.traitCount ?? 0);
      const rule = preview.metadata.complexityRule as { minTraits?: number; maxTraits?: number } | undefined;
      if (rule?.minTraits && visibleTraitCount < rule.minTraits) issues.push(`${preview.label} has ${visibleTraitCount} visible traits but ${rarity} requires at least ${rule.minTraits}.`);
      if (rule?.maxTraits && visibleTraitCount > rule.maxTraits) issues.push(`${preview.label} has ${visibleTraitCount} visible traits but ${rarity} allows at most ${rule.maxTraits}.`);
      if (rarity === "Common" && (preview.metadata.aura !== "None" || preview.metadata.frame !== "None" || /premium|legendary|unique/i.test(String(preview.metadata.scene)))) {
        issues.push(`${preview.label} is Common but includes premium aura/frame/scene language.`);
      }
      if (rarity === "Epic" && (preview.metadata.aura === "None" || /simple/i.test(String(preview.metadata.scene)))) {
        issues.push(`${preview.label} is Epic but lacks aura or a premium background.`);
      }
      if ((rarity === "Legendary" || rarity === "Mythic") && (preview.metadata.pose === "base pose" || preview.metadata.legendaryOverlay === "None")) {
        issues.push(`${preview.label} is ${rarity} but lacks a unique pose/scene/overlay.`);
      }
      if ((rarity === "Legendary" || rarity === "Mythic") && preview.metadata.compositionCategory !== "signature-scene" && preview.metadata.compositionCategory !== "near-1-of-1") {
        issues.push(`${preview.label} is ${rarity} but does not declare a unique composition category.`);
      }
    }
    return issues;
  }

  private traitCollisionIssues(previews: PreviewAssetPlan[]) {
    const issues: string[] = [];
    for (const preview of previews.filter((item) => item.type === "SAMPLE_NFT")) {
      const hasFullHead = preview.metadata.headgear !== "None" && /Mask|Helm|Kabuto|Hood/i.test(String(preview.metadata.headgear));
      const hasVisor = /Visor|Scanner/i.test(String(preview.metadata.eyes));
      const hasHeavyAura = preview.metadata.aura !== "None" && /Mist|Glow|Flame|Pulse|Static/i.test(String(preview.metadata.aura));
      const hasBusyBackground = /Mist|Glow|Flame|Pulse|Static/i.test(String(preview.metadata.background));
      if (hasFullHead && hasVisor) issues.push(`${preview.label} stacks full headgear with visor/eye hardware.`);
      if (hasHeavyAura && hasBusyBackground && String(preview.metadata.rarity) !== "Mythic") issues.push(`${preview.label} risks unreadable aura/background collision.`);
    }
    return issues;
  }

  private usesPlatformPalette(style: GeneratedStyleProfile) {
    const platform = new Set(["#baff00", "#16d7d2", "#f4c542"]);
    const palette = [
      ...style.colors,
      ...style.brandDna.colorSystem.primaryColors,
      ...style.brandDna.colorSystem.secondaryColors,
      ...style.brandDna.colorSystem.accentColors
    ].map((color) => color.toLowerCase());
    return palette.filter((color) => platform.has(color)).length >= 3;
  }

  private hasForbiddenGenericIdentity(style: GeneratedStyleProfile, pack: TraitPackPlan) {
    const text = [
      style.collection,
      style.theme,
      style.mascot,
      style.backgroundWorld,
      ...style.traitLanguage,
      ...pack.traits.slice(0, 40).map((trait) => trait.name)
    ].join(" ").toLowerCase();
    return /neon cyber frog/.test(text) || /gold .*(common|base).*legendary/.test(text) || /random unrelated/.test(text);
  }

  private poseReuse(previews: PreviewAssetPlan[]) {
    const poses = previews.filter((item) => item.type === "SAMPLE_NFT").map((preview) => String(preview.metadata.pose ?? ""));
    const counts = new Map<string, number>();
    poses.forEach((pose) => counts.set(pose, (counts.get(pose) ?? 0) + 1));
    return Math.max(0, ...counts.values()) / Math.max(1, poses.length);
  }
}
