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
    issues.push(...this.rarityVisualIssues(previews));

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
      const values = ["headgear", "outfit", "accessory", "neckChestAccessory", "aura", "frame", "legendaryOverlay"].map((key) => preview.metadata[key]);
      const visibleTraitCount = values.filter((value) => typeof value === "string" && value !== "None" && value !== "Standard frame" && value !== "Base pose").length;
      if (rarity === "Common" && visibleTraitCount > 2) issues.push(`${preview.label} is Common but has too many premium visible traits.`);
      if ((rarity === "Legendary" || rarity === "Mythic") && (preview.metadata.pose === "base pose" || preview.metadata.legendaryOverlay === "None")) {
        issues.push(`${preview.label} is ${rarity} but lacks a unique pose/scene/overlay.`);
      }
    }
    return issues;
  }
}
