export type GeneratorMood = "funny" | "aggressive" | "luxury" | "dark" | "cute" | "chaotic" | "cyber" | "fantasy";

export type CreateGenerationRunInput = {
  tokenName?: string;
  tokenSymbol?: string;
  tokenMint: string;
  logoUri?: string;
  logoData?: string;
  description?: string;
  selectedPreset?: string;
  hints?: CommunityHints;
};

export type ApproveGenerationRunInput = {
  walletAddress?: string;
  explicitConfirmation?: boolean;
  acceptedVersion?: number;
};

export type LaunchCollectionInput = {
  walletAddress: string;
  slug?: string;
  collectionAssetAddress?: string;
  metadataUri?: string;
};

export type SubmitCollectionLaunchInput = {
  walletAddress: string;
  signedTransactionBase64?: string;
  signedTransaction?: string;
  txSignature?: string;
};

export type CommunityHints = {
  memes?: string[];
  slogans?: string[];
  phrases?: string[];
  lore?: string;
  mascotPreference?: string;
  themePreference?: string;
  colorPreference?: string;
  mood?: GeneratorMood;
  sourceMetadata?: TokenSourceMetadata;
  overrides?: {
    tokenName?: string;
    tokenSymbol?: string;
    description?: string;
    logoUri?: string;
  };
};

export type TokenSourceMetadata = {
  mint: string;
  name?: string;
  symbol?: string;
  description?: string;
  metadataUri?: string;
  imageUri?: string;
  logoUri?: string;
  externalUrl?: string;
  socialLinks?: Record<string, string>;
  extensions?: Record<string, unknown>;
  decimals?: number;
  supply?: string;
  riskNotes?: string[];
};

export type LogoAnalysisOutput = {
  palette: string[];
  mascot: string;
  style: string;
  mood: string;
  shapeLanguage: string;
  visualKeywords: string[];
};

export type CommunityContextOutput = {
  memes: string[];
  slogans: string[];
  phrases: string[];
  lore?: string;
  extractedVocabulary: string[];
  traitSeeds: string[];
  roleNames: string[];
  raidNames: string[];
  backgroundNames: string[];
};

export type TraitCategoryRole =
  | "base"
  | "background"
  | "head"
  | "eyes"
  | "mouth"
  | "body"
  | "prop"
  | "neck"
  | "aura"
  | "frame"
  | "legendary"
  | "animation";

export type TraitCategoryPlan = {
  id: string;
  label: string;
  role: TraitCategoryRole;
  description: string;
  targetCount: number;
  nouns: string[];
  forbiddenConcepts: string[];
};

export type BaseSilhouettePlan = {
  name: string;
  bodyShape: string;
  poseLanguage: string;
  proportions: string;
  cameraFraming: string;
  rarityUpgradePath: string;
};

export type MoodExpressionPlan = {
  name: string;
  expression: string;
  eyeLanguage: string;
  mouthLanguage: string;
  stance: string;
  gesture: string;
  auraBehavior: string;
  animationState: string;
};

export type AnimationReadinessPlan = {
  blinkLayers: string[];
  mouthLayers: string[];
  eyeVariants: string[];
  auraLoops: string[];
  fxLoops: string[];
  emotionalTransitions: string[];
  idleStates: string[];
  reactionStates: Record<"mint" | "redeem" | "stake" | "unstake" | "receiveNft" | "levelUp" | "raidSuccess" | "rewards", string>;
};

export type ProductionAssetPolicy = {
  launchClassification: "CONCEPT_PREVIEW" | "AI_ASSISTED_DRAFT" | "CURATED_PRODUCTION_READY" | "ARTIST_APPROVED_FINAL";
  commonToRareSource: "approved_layer_pack_required";
  epicLegendaryMythicSource: "curated_composition_required";
  aiFinalImageAllowed: false;
  artistReviewRequiredFor: string[];
  productionReadyRequires: string[];
};

export type CreativeSignalProfile = {
  entities: string[];
  objects: string[];
  animals: string[];
  emotions: string[];
  colors: string[];
  visualShapes: string[];
  culturalWords: string[];
  memeLanguage: string[];
  humorType: string;
  energyLevel: string;
  communityVibe: string;
  worldReferences: string[];
  styleReferences: string[];
  dangerSafetyCues: string[];
  cueDial: Record<"luxury" | "chaos" | "cozy" | "aggressive" | "surreal", number>;
  semanticWeights: Record<string, number>;
};

export type CreativeDNA = {
  artStyle: string;
  worldConcept: string;
  mascotOrSubject: string;
  baseSilhouetteRules: string[];
  cameraFraming: string;
  palette: string[];
  textureLanguage: string;
  visualSystem: VisualDesignSystem;
  moodCulture: string[];
  expressionLanguage: string[];
  traitCategories: string[];
  rarityPhilosophy: string;
  legendaryMythology: string;
  animationLanguage: string;
  forbiddenSimilarities: string[];
};

export type VisualDesignSystem = {
  rendererFamily: "pixel-topdown" | "anime-portrait" | "clay-toy" | "biohazard-horror" | "terminal-brutalist" | "surreal-collage";
  bodySystem: string;
  headShape: string;
  eyeSystem: string;
  mouthSystem: string;
  proportionSystem: string;
  compositionStyle: string;
  cameraFraming: string;
  lightingModel: string;
  environmentSystem: string;
  emotionalRendering: string;
  rarityProgression: string;
  legendaryPhilosophy: string;
  cardStructure: string;
};

export type CommunityCreativeUniverse = {
  archetype: string;
  signalProfile: CreativeSignalProfile;
  creativeDna: CreativeDNA;
  inferredCommunityLanguage: string[];
  artStyle: string;
  artStyleReason: string;
  taxonomy: TraitCategoryPlan[];
  baseSilhouettes: BaseSilhouettePlan[];
  moodCulture: MoodExpressionPlan[];
  animationReadiness: AnimationReadinessPlan;
  productionAssetPolicy: ProductionAssetPolicy;
  antiGenericRules: string[];
};

export type GeneratedStyleProfile = {
  collection: string;
  theme: string;
  mascot: string;
  artStyle: string;
  colors: string[];
  backgroundWorld: string;
  traitLanguage: string[];
  rarityStructure: Record<string, number>;
  legendaryTheme: string;
  animationStyle: string;
  raidTheme: string;
  lore: string;
  roleNames: string[];
  brandDna: BrandDNA;
  visualFingerprint: Record<string, unknown>;
  assetPackId: string;
  artSource: "PROCEDURAL_FALLBACK" | "CURATED_PACK" | "AI_ASSISTED" | "HANDMADE_PACK";
  tenKReadiness: TenKReadinessReport;
  creativeUniverse: CommunityCreativeUniverse;
  productionAssetPolicy: ProductionAssetPolicy;
};

export type BrandDNA = {
  tokenSymbol: string;
  tokenName: string;
  mintAddress: string;
  logoPalette: string[];
  logoDerivedColors: string[];
  colorSystem: CollectionColorSystem;
  mascotArchetype: string;
  memeLanguage: string[];
  lore: string;
  visualWorld: string;
  shapeLanguage: string;
  compositionRules: string[];
  traitNamingRules: string[];
  typographyDirection: string;
  raidLanguage: string[];
  roleLanguage: string[];
  legendaryDirection: string;
  mascotSilhouette: string;
  backgroundWorld: string;
  baseArchetypes: string[];
  baseSilhouettes: BaseSilhouettePlan[];
  moodCulture: MoodExpressionPlan[];
  animationReadiness: AnimationReadinessPlan;
  productionAssetPolicy: ProductionAssetPolicy;
  traitTaxonomy: TraitCategoryPlan[];
  rarityVisualRules: Record<string, RarityComplexityRule>;
  forbiddenSimilarities: string[];
  sourceMetadataSummary: Record<string, unknown>;
};

export type RarityComplexityRule = {
  minTraits: number;
  maxTraits: number;
  pose: string;
  background: string;
  aura: "none" | "mild" | "strong" | "signature";
  frame: "none" | "standard" | "special" | "mythic";
  composition: string;
};

export type CollectionColorSystem = {
  primaryColors: string[];
  secondaryColors: string[];
  accentColors: string[];
  neutralSupportColors: string[];
  glowLightColors: string[];
  backgroundColors: string[];
  forbiddenColorCombinations: string[];
};

export type TenKReadinessReport = {
  possibleUniqueCombinations: string;
  expectedDuplicateRisk: "LOW" | "MEDIUM" | "HIGH";
  weakestTraitCategory: string;
  overusedBaseVariantRisk: boolean;
  rarityDistributionValid: boolean;
  silhouetteDominanceRisk: boolean;
  shallowCategories: string[];
  pass: boolean;
};

export type TraitDefinitionPlan = {
  category: string;
  name: string;
  rarity: string;
  weightBps: number;
  unlockLevel: number;
  compatibilityTags: string[];
  visualDescription: string;
};

export type TraitPackPlan = {
  collectionSize: number;
  categories: Record<string, string[]>;
  categoryRoles: Record<TraitCategoryRole, string>;
  categoryLabels: Record<string, string>;
  rarityWeights: Record<string, number>;
  unlockSchedule: Record<string, string[]>;
  uniquenessRules: {
    noDuplicateFullCombinations: boolean;
    maxBaseUsagePct: number;
    legendaryCapPct: number;
    minBackgroundSpreadPct: number;
    rarityMustBeVisuallyObvious: boolean;
  };
  traits: TraitDefinitionPlan[];
};

export type CompatibilityRulePlan = {
  trait: string;
  incompatibleWith: string[];
  reason: string;
};

export type PreviewAssetPlan = {
  type: "AVATAR" | "BANNER" | "SAMPLE_NFT";
  label: string;
  uri: string;
  metadata: Record<string, unknown>;
};

export type DistinctivenessReportPlan = {
  silhouetteUniqueness: number;
  paletteUniqueness: number;
  mascotUniqueness: number;
  backgroundWorldUniqueness: number;
  traitLanguageUniqueness: number;
  score: number;
  passed: boolean;
  nearestCollection?: Record<string, unknown>;
};

export type QualityReportPlan = {
  previewQualityScore: number;
  uniquenessScore: number;
  colorHarmonyScore: number;
  rarityDistributionScore: number;
  duplicateRiskScore: number;
  compatibilityScore: number;
  tier: "BASIC" | "PREMIUM" | "LEGENDARY_READY";
  passed: boolean;
  issues: string[];
};
