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

export type ArtPreset = {
  id: string;
  name: string;
  artStyle: string;
  mood: string;
  shapeLanguage: string;
  visualFx: string[];
  mascotBias: string[];
  backgroundWorlds: string[];
  traitNouns: string[];
  legendaryDirection: string;
  animationDirection: string;
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
