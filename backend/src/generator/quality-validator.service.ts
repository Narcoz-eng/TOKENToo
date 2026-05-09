import { Injectable } from "@nestjs/common";
import type { CompatibilityRulePlan, DistinctivenessReportPlan, GeneratedStyleProfile, PreviewAssetPlan, QualityReportPlan, TraitCategoryRole, TraitPackPlan } from "./generator.types";
import { CreativeDnaService } from "./creative-dna.service";
import { average, clamp } from "./generator.util";

@Injectable()
export class QualityValidatorService {
  constructor(private readonly creativeDna: CreativeDnaService = new CreativeDnaService()) {}

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
    if (distinctiveness.score < 45) issues.push("Collection identity is too similar to an existing style profile.");
    if (distinctiveness.traitLanguageUniqueness < 42) issues.push("Trait names overlap too much with another collection.");
    if (distinctiveness.silhouetteUniqueness < 42) issues.push("Pose/silhouette language overlaps too much with another collection.");
    if (duplicateRiskScore < 85) issues.push("Trait space is too small for reliable 10k uniqueness.");
    if (compatibilityScore < 80) issues.push("Compatibility coverage is too thin.");
    if (!style.brandDna) issues.push("Brand DNA is required before approval.");
    if (!style.tenKReadiness?.pass) issues.push("10k collection readiness validation failed.");
    if (style.artSource === "PROCEDURAL_FALLBACK") {
      issues.push("Wireframe concept preview only; final collection requires locked creator approval plus curated, layered, or artist-approved asset pack.");
      issues.push("Procedural SVG fallback art cannot be approved for production launch.");
    }
    if (this.hasGenericTraitNames(style, pack)) issues.push("Trait names are too generic for premium collection identity.");
    if (this.usesPlatformPalette(style)) issues.push("Collection identity reuses the platform palette instead of a token-derived palette.");
    if (this.hasForbiddenGenericIdentity(style, pack)) issues.push("Collection repeats a forbidden generic AI prompt pattern.");
    if (this.hasGenericMoodCulture(style)) issues.push("Mood culture uses generic global emotions instead of community-native states.");
    if (this.hasGenericTaxonomy(style)) issues.push("Trait taxonomy still reads like a shared headgear/eyes/armor/aura/frame engine.");
    if (!style.creativeUniverse?.creativeDna || !style.creativeUniverse?.signalProfile) issues.push("Generated Creative DNA and signal profile are required.");
    if (this.hasIncompleteVisualSystem(style)) issues.push("Creative DNA must include body, head, eye, mouth, rendering, composition, lighting, rarity, and legendary visual systems.");
    if (this.usesFixedArchetypeTemplate(style)) issues.push("Generator still exposes a fixed archetype template instead of dynamic Creative DNA.");
    if (!style.productionAssetPolicy || style.productionAssetPolicy.launchClassification !== "CONCEPT_PREVIEW") issues.push("Production asset policy must distinguish concept previews from final approved assets.");
    if (style.productionAssetPolicy?.aiFinalImageAllowed !== false) issues.push("Production policy must not allow fully AI-generated final NFT images.");
    issues.push(...this.creativeDna.validate(style, pack));
    if (this.poseReuse(previews) > 0.55) issues.push("Too many sample NFTs reuse the same pose; rarity ladder needs visible composition changes.");
    if (this.sameBaseAcrossRarities(previews)) issues.push("All rarity previews share the same base/face language.");
    if (this.sameVisualCompositionAcrossRarities(previews)) issues.push("Rarity previews reuse the same visual composition system without visible progression.");
    if (this.sameFaceOrCameraAcrossRarities(previews)) issues.push("Rarity previews reuse the same face, camera, or silhouette rendering variants.");
    if (this.legendaryNotSceneLevel(previews)) issues.push("Legendary/mythic previews are not scene-level visual events.");
    if (this.commonUncommonEmpty(previews)) issues.push("Common/uncommon previews must use real visible traits, not empty None placeholders.");
    if (!this.tokenIdentityPresent(style, pack)) issues.push("Token identity is not present in trait names.");
    if (this.sparseMetadataGenericFallback(style, pack)) issues.push("Sparse metadata fell back to generic robot/crown/vault traits.");
    issues.push(...this.rarityVisualIssues(previews));
    issues.push(...this.traitCollisionIssues(previews));

    const tierScore = average([previewQualityScore, uniquenessScore, colorHarmonyScore, rarityDistributionScore, duplicateRiskScore, compatibilityScore, distinctiveness.score]);
    const computedTier = tierScore >= 92 && distinctiveness.score >= 86 ? "LEGENDARY_READY" : tierScore >= 80 && previewQualityScore >= 78 ? "PREMIUM" : "BASIC";
    const tier = style.productionAssetStatus === "WIREFRAME" || style.artSource === "PROCEDURAL_FALLBACK" ? "BASIC" : computedTier;
    const productionStatusAllowsPass = style.productionAssetStatus === "CURATED_LAYER_READY" || style.productionAssetStatus === "ARTIST_APPROVED" || style.productionAssetStatus === "FINAL_PRODUCTION";
    if (style.productionAssetStatus === "AI_CONCEPT") issues.push("AI studio preview art is professional art direction only; it cannot satisfy mintable production quality until creator approval, layered exports, and final storage are configured.");

    return {
      previewQualityScore,
      uniquenessScore,
      colorHarmonyScore,
      rarityDistributionScore,
      duplicateRiskScore,
      compatibilityScore,
      tier,
      passed: issues.length === 0 && tier !== "BASIC" && productionStatusAllowsPass,
      issues
    };
  }

  private categoryScore(pack: TraitPackPlan) {
    const minimums: Record<string, number> = {
      base: 30,
      background: 40,
      head: 24,
      eyes: 30,
      mouth: 20,
      body: 40,
      prop: 40,
      neck: 20,
      aura: 20,
      frame: 10,
      legendary: 5,
      animation: 4
    };
    const scores = Object.entries(minimums).map(([role, minimum]) => (this.roleValues(pack, role as TraitCategoryRole).length >= minimum ? 100 : 0));
    return average(scores);
  }

  private previewQuality(style: GeneratedStyleProfile, previews: PreviewAssetPlan[]) {
    const sampleCount = previews.filter((preview) => preview.type === "SAMPLE_NFT").length;
    const hasBanner = previews.some((preview) => preview.type === "BANNER");
    const hasAvatar = previews.some((preview) => preview.type === "AVATAR");
    const languageScore = style.traitLanguage.filter((trait) => trait.split(" ").length >= 2 && !/green|red|blue|hat|background/i.test(trait)).length >= 10 ? 94 : 70;
    const assetScore = sampleCount >= 5 && hasBanner && hasAvatar ? 94 : 65;
    const styleScore = /premium|cinematic|fantasy|cyber|luxury|poster|cel|portrait|cartoon/i.test(style.artStyle) ? 90 : 72;
    return average([languageScore, assetScore, styleScore]);
  }

  private uniqueness(pack: TraitPackPlan, distinctiveness: DistinctivenessReportPlan) {
    const space =
      this.roleValues(pack, "base").length *
      this.roleValues(pack, "background").length *
      this.roleValues(pack, "head").length *
      this.roleValues(pack, "eyes").length *
      this.roleValues(pack, "prop").length;
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
      this.roleValues(pack, "base").length *
      this.roleValues(pack, "background").length *
      this.roleValues(pack, "head").length *
      this.roleValues(pack, "eyes").length *
      this.roleValues(pack, "mouth").length *
      this.roleValues(pack, "body").length *
      this.roleValues(pack, "prop").length *
      this.roleValues(pack, "neck").length *
      this.roleValues(pack, "aura").length;
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
      if (rarity === "Common" && (/premium|legendary|unique|signature|mythic/i.test(String(preview.metadata.aura)) || /premium|legendary|unique|signature|mythic/i.test(String(preview.metadata.frame)) || /premium|legendary|unique/i.test(String(preview.metadata.scene)))) {
        issues.push(`${preview.label} is Common but includes premium aura/frame/scene language.`);
      }
      if (rarity === "Epic" && (/none|restrained/i.test(String(preview.metadata.aura)) || /simple/i.test(String(preview.metadata.scene)))) {
        issues.push(`${preview.label} is Epic but lacks aura or a premium background.`);
      }
      if ((rarity === "Legendary" || rarity === "Mythic") && (preview.metadata.pose === "base pose" || /none|no signature/i.test(String(preview.metadata.legendaryOverlay)))) {
        issues.push(`${preview.label} is ${rarity} but lacks a unique pose/scene/overlay.`);
      }
      if ((rarity === "Legendary" || rarity === "Mythic") && this.legendaryLooksLikeRecolor(preview.metadata)) {
        issues.push(`${preview.label} is ${rarity} but reads like a recolor instead of a unique identity snapshot.`);
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
      const hasFullHead = !/none/i.test(String(preview.metadata.headgear)) && /Mask|Helm|Kabuto|Hood/i.test(String(preview.metadata.headgear));
      const hasVisor = /Visor|Scanner/i.test(String(preview.metadata.eyes));
      const hasHeavyAura = !/none|restrained/i.test(String(preview.metadata.aura)) && /Mist|Glow|Flame|Pulse|Static/i.test(String(preview.metadata.aura));
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
    return /neon cyber frog/.test(text) || /gold .*(common|base).*legendary/.test(text) || /random unrelated/.test(text) || /generic ai nft|prompt generated|same base/i.test(text);
  }

  private sameBaseAcrossRarities(previews: PreviewAssetPlan[]) {
    const samples = previews.filter((item) => item.type === "SAMPLE_NFT");
    const bases = new Set(samples.map((preview) => String(preview.metadata.base ?? "")));
    const moods = new Set(samples.map((preview) => String(preview.metadata.mood ?? "")));
    return samples.length >= 4 && (bases.size <= 1 || moods.size <= 1);
  }

  private commonUncommonEmpty(previews: PreviewAssetPlan[]) {
    return previews.filter((item) => item.type === "SAMPLE_NFT" && /Common|Uncommon/.test(String(item.metadata.rarity))).some((preview) => {
      const values = [preview.metadata.headgear, preview.metadata.accessory, preview.metadata.aura].map(String);
      return values.some((value) => value === "None") || Number(preview.metadata.traitCount ?? 0) < 3;
    });
  }

  private tokenIdentityPresent(style: GeneratedStyleProfile, pack: TraitPackPlan) {
    const tokens = [style.brandDna.tokenName, style.brandDna.tokenSymbol, ...style.brandDna.memeLanguage]
      .flatMap((value) => String(value).toLowerCase().replace(/^\$/, "").split(/[^a-z0-9]+/))
      .filter((word) => word.length > 3 && !/token|coin|official|website|twitter|discord|telegram/.test(word));
    if (!tokens.length) return true;
    const text = [...style.traitLanguage, ...pack.traits.slice(0, 80).map((trait) => trait.name), style.backgroundWorld, style.artStyle].join(" ").toLowerCase();
    return tokens.some((token) => text.includes(token));
  }

  private sparseMetadataGenericFallback(style: GeneratedStyleProfile, pack: TraitPackPlan) {
    const source = style.brandDna.sourceMetadataSummary ?? {};
    const sparse = !source.description || !source.metadataUri;
    if (!sparse) return false;
    const text = [style.mascot, style.artStyle, style.backgroundWorld, ...style.traitLanguage, ...pack.traits.slice(0, 40).map((trait) => trait.name)].join(" ").toLowerCase();
    const hasSpecificSparseIdentity = /hanta|virus|viral|biohazard|infection|infected|pathogen|outbreak|quarantine|mutation|toxic|lab|fever|microscope/.test(text);
    return /generic|robot|crown|vault/.test(text) && !hasSpecificSparseIdentity;
  }

  private poseReuse(previews: PreviewAssetPlan[]) {
    const poses = previews.filter((item) => item.type === "SAMPLE_NFT").map((preview) => String(preview.metadata.pose ?? ""));
    const counts = new Map<string, number>();
    poses.forEach((pose) => counts.set(pose, (counts.get(pose) ?? 0) + 1));
    return Math.max(0, ...counts.values()) / Math.max(1, poses.length);
  }

  private hasGenericMoodCulture(style: GeneratedStyleProfile) {
    const names = style.creativeUniverse?.moodCulture?.map((mood) => mood.name.toLowerCase()) ?? [];
    if (names.length < 3) return true;
    const generic = new Set(["drunk", "happy", "sad", "angry", "evil grin", "sleepy", "chaotic", "smug", "zen", "rage mode"]);
    return names.filter((name) => generic.has(name)).length > 0;
  }

  private hasGenericTaxonomy(style: GeneratedStyleProfile) {
    const labels = style.creativeUniverse?.taxonomy?.map((category) => category.label.toLowerCase()) ?? [];
    if (labels.length < 10) return true;
    const genericHits = labels.filter((label) => /^(headgear|eyes|mouth|outfit|accessories|aura|frame|backgrounds|base character)$/.test(label)).length;
    return genericHits >= 3;
  }

  private hasIncompleteVisualSystem(style: GeneratedStyleProfile) {
    const visual = style.creativeUniverse?.creativeDna?.visualSystem;
    if (!visual) return true;
    return [
      visual.rendererFamily,
      visual.renderingEngine,
      visual.bodySystem,
      visual.headShape,
      visual.eyeSystem,
      visual.mouthSystem,
      visual.compositionStyle,
      visual.cameraFraming,
      visual.cameraSystem,
      visual.lightingModel,
      visual.environmentSystem,
      visual.anatomyModel,
      visual.faceGrammar,
      visual.sceneGrammar,
      visual.emotionalRendering,
      visual.rarityProgression,
      visual.legendaryPhilosophy,
      visual.cardStructure
    ].some((value) => !String(value ?? "").trim()) || !visual.rarityFrames || ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"].some((rarity) => {
      const frame = visual.rarityFrames[rarity as keyof typeof visual.rarityFrames];
      return !frame || [frame.composition, frame.camera, frame.subjectTreatment, frame.faceTreatment, frame.bodyLanguage, frame.environment, frame.lighting, frame.event, frame.silhouetteMutation, frame.animationCue].some((value) => !String(value ?? "").trim());
    });
  }

  private sameVisualCompositionAcrossRarities(previews: PreviewAssetPlan[]) {
    const samples = previews.filter((item) => item.type === "SAMPLE_NFT");
    const poses = new Set(samples.map((preview) => String(preview.metadata.pose ?? "")));
    const scenes = new Set(samples.map((preview) => String(preview.metadata.scene ?? "")));
    const rendered = new Set(samples.map((preview) => String(preview.metadata.renderFingerprint ?? `${preview.metadata.renderingEngine}:${preview.metadata.cameraVariant}:${preview.metadata.compositionCategory}`)));
    return samples.length >= 4 && (poses.size < 4 || scenes.size < 4 || rendered.size < Math.min(samples.length, 5));
  }

  private sameFaceOrCameraAcrossRarities(previews: PreviewAssetPlan[]) {
    const samples = previews.filter((item) => item.type === "SAMPLE_NFT");
    if (samples.length < 4) return true;
    const faces = new Set(samples.map((preview) => String(preview.metadata.faceVariant ?? "")));
    const eyes = new Set(samples.map((preview) => String(preview.metadata.eyeVariant ?? "")));
    const mouths = new Set(samples.map((preview) => String(preview.metadata.mouthVariant ?? "")));
    const cameras = new Set(samples.map((preview) => String(preview.metadata.cameraVariant ?? "")));
    const silhouettes = new Set(samples.map((preview) => String(preview.metadata.silhouetteVariant ?? "")));
    return faces.size < 5 || eyes.size < 4 || mouths.size < 4 || cameras.size < 5 || silhouettes.size < 5;
  }

  private legendaryNotSceneLevel(previews: PreviewAssetPlan[]) {
    const samples = previews.filter((item) => item.type === "SAMPLE_NFT");
    const commonFingerprint = String(samples.find((preview) => preview.metadata.rarity === "Common")?.metadata.renderFingerprint ?? "");
    const legendary = samples.filter((preview) => preview.metadata.rarity === "Legendary" || preview.metadata.rarity === "Mythic");
    if (legendary.length < 2) return true;
    return legendary.some((preview) => {
      const text = [
        preview.metadata.eventFrame,
        preview.metadata.cameraVariant,
        preview.metadata.silhouetteVariant,
        preview.metadata.environmentVariant,
        preview.metadata.visualRule,
        preview.metadata.renderFingerprint
      ].join(" ");
      return !/event|incident|takeover|mythic|legendary|scene|world|one-off|breach|overload|splash|boss|wide|camera/i.test(text) || String(preview.metadata.renderFingerprint ?? "") === commonFingerprint;
    });
  }

  private usesFixedArchetypeTemplate(style: GeneratedStyleProfile) {
    const key = String(style.creativeUniverse?.archetype ?? "");
    const dna = JSON.stringify(style.creativeUniverse?.creativeDna ?? {}).toLowerCase();
    return /^(biohazard-viral|frog-degen|dog-cozy|dog-pack|cat-hyper-meme|robot-ai|trader-finance)$/.test(key) || /selected because .* maps to .* archetype/.test(dna);
  }

  private legendaryLooksLikeRecolor(metadata: Record<string, unknown>) {
    const scene = String(metadata.scene ?? "");
    const pose = String(metadata.pose ?? "");
    const overlay = String(metadata.legendaryOverlay ?? "");
    return /recolor|palette|colorway/i.test(`${scene} ${pose} ${overlay}`) || pose === "base pose" || /none|no signature/i.test(overlay);
  }

  private roleValues(pack: TraitPackPlan, role: TraitCategoryRole) {
    const categoryId = pack.categoryRoles?.[role];
    return categoryId ? pack.categories[categoryId] ?? [] : [];
  }
}
