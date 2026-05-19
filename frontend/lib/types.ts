export type Accent = "purple" | "green" | "cyan" | "gold" | "red";

export type VaultCollection = {
  id: string;
  dbId?: string;
  symbol: string;
  name: string;
  subtitle: string;
  tokenMint: string;
  description: string;
  image: string;
  banner: string;
  mascot: string;
  theme: string;
  vibe: string;
  chain: string;
  category: string;
  floorSol: number;
  volume24hSol: number;
  volumeSol: number;
  holders: number;
  vaults: number;
  minted: number;
  supply: number;
  level: number;
  xp: number;
  nextXp: number;
  apy: number;
  online: number;
  riskScore: number;
  riskTier: "SAFE" | "MEDIUM" | "HIGH RISK";
  reserveHealth?: "HEALTHY" | "AT_RISK" | "PAUSED" | "EMERGENCY";
  reserveRatioBps?: number;
  totalLocked?: string;
  availableBacking?: string;
  totalStaked?: string;
  totalRedeemed?: string;
  reserveVaultPda?: string | null;
  collectionAssetAddress?: string | null;
  launchStatus?: string;
  launchGatePassed?: boolean;
  profileGatePassed?: boolean;
  mintEligible?: boolean;
  strategy?: {
    enabled: boolean;
    type: "PASSIVE" | "LIQUIDITY" | "BUYBACK" | "BURN" | "HYBRID";
    status: "DRAFT" | "ACTIVE" | "PAUSED" | "DISABLED";
    approvedByCreator: boolean;
    approvedAt?: string | null;
    automaticExecution: boolean;
  };
  sales?: number;
  qualityTier: "Basic" | "Premium" | "Legendary-ready";
  instantSellEnabled: boolean;
  palette: string[];
  mascotType: string;
  silhouette: string;
  activeUsers24h: number;
  raidSuccessRate: number;
  averageHoldDays: number;
  communityTraits: string[];
  legendaryTrait: string;
  traitLayers: {
    base: string[];
    headgear: string[];
    eyes: string[];
    aura: string[];
    accessory: string[];
    background: string[];
  };
  styleProfile: {
    artStyle: string;
    shapeLanguage: string;
    visualFx: string[];
    baseVariantCount: number;
    microRandomization: string;
    colorSystem?: CollectionColorSystem;
  };
  nextUnlocks: string[];
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

export type VaultNft = {
  id: string;
  collectionId: string;
  name: string;
  number: number;
  image: string;
  priceSol: number;
  backingUsd: number;
  backingSol: number;
  lockedAmount: string;
  duration: string;
  tier: string;
  status: "Flexible" | "Locked" | "Staked" | "Redeemable";
  rarity: "Rare" | "Epic" | "Legendary" | "Mythic";
  apy: number;
  unlockDate: string;
  role: string;
  rank: string;
  aura: string;
  background: string;
  badges: string[];
  mint?: string;
  metadataUri?: string;
};

export type RaidMission = {
  id: string;
  title: string;
  description?: string;
  type: string;
  progress: number;
  target: number;
  xp: number;
  xpReward?: number;
  rewardSol: number;
  icon: Accent;
  startsAt?: string;
  endsAt?: string;
};

export type RaidRoom = {
  id: string;
  collectionId: string;
  collectionName?: string | null;
  collectionSymbol?: string | null;
  collectionImage?: string | null;
  collectionBanner?: string | null;
  name: string;
  boss: string;
  status: "Live" | "Upcoming" | "Scheduled" | "Ended";
  progress: number;
  participants: number;
  capacity: number;
  rewardSol: number;
  xpTarget?: number | null;
  currentXp?: number | null;
  startsIn?: string;
  startsAt?: string;
  endsIn: string;
  endsAt?: string;
  targetPlatform?: string | null;
  targetLink?: string | null;
  proofMode?: string | null;
  verificationMode?: string | null;
  missionCount?: number;
  missions?: RaidMission[];
};

export type ActivityItem = {
  actor: string;
  action: string;
  amount: string;
  time: string;
  image: string;
};

export type LeaderboardRow = {
  rank: number;
  name: string;
  score: string;
  image: string;
  highlight?: boolean;
  role?: string;
  badge?: string;
};

export type CommunityMember = {
  id: string;
  name: string;
  avatar: string;
  role: "OG" | "Raider" | "Whale" | "Founder";
  xp: number;
  vaults: number;
  rank: string;
  followed?: boolean;
};

export type SocialActivity = {
  id: string;
  collectionId: string;
  actor: string;
  avatar: string;
  role: string;
  action: string;
  xp: number;
  nft?: string;
  time: string;
  reaction: "fire" | "rocket" | "skull";
};

export type CollectionCompetition = {
  id: string;
  title: string;
  leftCollectionId: string;
  rightCollectionId: string;
  leftScore: number;
  rightScore: number;
  reward: string;
  penalty: string;
  endsIn: string;
};

export type ProductionAssetStatus = "WIREFRAME" | "AI_CONCEPT" | "CURATED_LAYER_READY" | "ARTIST_APPROVED" | "FINAL_PRODUCTION";

export type GeneratorQualityTier = "Preview required" | "Wireframe concept" | "AI concept" | "AI studio" | "Basic" | "Premium" | "Legendary-ready";

export type StudioWorkflowState = {
  locks: {
    artDirection: boolean;
    style: boolean;
    mood: boolean;
    rarityDirection: boolean;
  };
  approvals: {
    silhouetteSystem: boolean;
    factionCulture: boolean;
    traitFamily: boolean;
    cinematicDirection: boolean;
  };
  rerolls: {
    rarityTiers: Record<string, number>;
    moodSet: number;
    legendaryScene: number;
  };
  lastAction?: {
    action: string;
    target?: string;
    note?: string;
    walletAddress?: string;
    at: string;
  };
};

export type CollectionGeneratorPreview = {
  id: string;
  collection: string;
  preset: string;
  theme: string;
  mascot: string;
  artStyle: string;
  palette: string[];
  backgroundWorld: string;
  lore: string;
  raidTheme: string;
  roleNames: string[];
  traitLanguage: string[];
  traitCounts: Record<string, number>;
  rarityWeights: Record<string, number>;
  unlocks: Record<string, string[]>;
  assetProvider?: string;
  conceptRequest?: ConceptRequestSummary;
  previewClassification?: "WIREFRAME_CONCEPT" | "AI_CONCEPT_PREVIEW" | "PRODUCTION_ASSET_PREVIEW";
  productionAssetStatus?: ProductionAssetStatus;
  finalProductionReady?: boolean;
  studioWorkflow?: StudioWorkflowState;
  styleBible?: StyleBiblePlan;
  studioAssets?: StudioPreviewAsset[];
  styleBibleAsset?: StudioPreviewAsset;
  traitCatalogAsset?: StudioPreviewAsset;
  rarityLadderAsset?: StudioPreviewAsset;
  moodSheetAsset?: StudioPreviewAsset;
  layerBreakdownAsset?: StudioPreviewAsset;
  artTeam?: ArtTeamProfile;
  traitCoverageScore?: number;
  rarityDiversityScore?: number;
  providerStatus?: string;
  exportPlan?: StudioExportPlan;
  curatedLayerPack?: CuratedLayerPackSummary;
  warnings?: string[];
  avatar: string;
  banner: string;
  samples: Array<{
    id: string;
    name: string;
    image: string;
    provider?: string;
    rarity: string;
    role: string;
    traits: string[];
  }>;
  quality: {
    previewQualityScore: number;
    uniquenessScore: number;
    colorHarmonyScore: number;
    duplicateRiskScore: number;
    compatibilityScore: number;
    tier: GeneratorQualityTier;
    passed: boolean;
  };
  distinctiveness: {
    silhouetteUniqueness: number;
    paletteUniqueness: number;
    mascotUniqueness: number;
    backgroundWorldUniqueness: number;
    traitLanguageUniqueness: number;
    score: number;
    passed: boolean;
  };
  tenKReadiness?: {
    estimated10kFeasible: boolean;
    possibleUniqueCombinations: string;
    duplicateRisk: string;
    visualDiversityScore: number;
    blockers: string[];
  };
};

export type CuratedLayerPackSummary = {
  id: string;
  name: string;
  version?: string;
  status: string;
  previewUri?: string | null;
  provenanceHash?: string | null;
  validation?: Record<string, unknown>;
  assets?: Array<{
    category: string;
    traitName: string;
    rarity?: string | null;
    weightBps: number;
    zIndex: number;
    width?: number | null;
    height?: number | null;
    hasAlpha: boolean;
    incompatibleWith?: unknown;
  }>;
};

export type StudioPreviewAssetType = "STYLE_BIBLE" | "TRAIT_CATALOG" | "RARITY_LADDER" | "MOOD_SHEET" | "LAYER_BREAKDOWN" | "HERO_CONCEPT";

export type StudioPreviewAsset = {
  type: StudioPreviewAssetType;
  label: string;
  uri: string;
  provider?: string;
  model?: string;
  generationType?: string;
  promptHash?: string;
  estimatedCostUsd?: number;
  cacheStatus?: string;
  metadata?: Record<string, unknown>;
  generationMetadata?: Record<string, unknown>;
};

export type ArtTeamId = "DEGENLAB" | "SOFTROOM_STUDIO" | "PAPERGHOST" | "MOSSWORKS" | "PIXEL_REBEL" | "VOID_SKETCH";

export type ArtTeamProfile = {
  id: ArtTeamId;
  name: string;
  lineLanguage: string;
  anatomyRules: string;
  shapeLanguage: string;
  palettePhilosophy: string;
  textureDensity: string;
  detailBudget: string;
  moodVocabulary: string[];
  expressionSystem: string;
  traitPhilosophy: string;
  rarityEscalationPhilosophy: string;
  mythicLegendaryRules: string[];
  thumbnailReadabilityRules: string[];
  nativeArchetypes: string[];
};

export type RarityExamplePlan = {
  rarity: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Mythic";
  supplyTarget: string;
  base: string;
  head: string;
  eyes: string;
  mouth: string;
  body: string;
  prop: string;
  background: string;
  aura: string;
  mood: string;
  posture: string;
  roleFantasy: string;
  archetype: string;
};

export type StudioExportPlan = {
  styleBibleJson: string;
  styleBibleImage: string;
  styleBiblePdf: string;
  traitCatalogJson: string;
  rarityTableJson: string;
  metadataTemplate: string;
  metadataFiles: string;
  imageManifest: string;
  layerManifest: string;
  collectionConfig: string;
  provenanceHash: string;
  metaplexCandyMachineConfig: string;
  genericZip: string;
};

export type StyleBiblePlan = {
  collectionName: string;
  ticker: string;
  artTeam: ArtTeamProfile;
  collectionDNA: string[];
  tone: string[];
  visualPrinciples: string[];
  palette: string[];
  lineTextureRules: string[];
  traitCategories: Array<{ id: string; label: string; role: string; count: number; examples: string[] }>;
  traitCounts: Record<string, number>;
  moodVocabulary: string[];
  rarityLadder: RarityExamplePlan[];
  rarityPhilosophy: string;
  archetypes: Array<{
    name: string;
    socialFantasy: string;
    collectibleFantasy: string;
    powerFantasy: string;
    emotionalFantasy: string;
    statusSymbol: string;
    environmentalPrestige: string;
    mythicIdentity: string;
  }>;
  layerBreakdown: Array<{ role: string; category: string; exportName: string; rules: string[]; approvalRequired: boolean }>;
  thumbnailReadabilityRules: string[];
  promptPack: Record<string, string>;
  exportPlan: StudioExportPlan;
  qaReport: {
    traitCoverageScore: number;
    rarityDiversityScore: number;
    artTeamConsistencyScore: number;
    collectionNativeArchetypeScore: number;
    thumbnailReadabilityScore: number;
    aiGenericRiskScore: number;
    passed: boolean;
    issues: string[];
  };
};

export type ConceptRequestSummary = {
  provider?: string;
  imageCount?: number;
  imagesThisRun?: number;
  estimatedOpenAIRequestCount?: number;
  usesPaidOpenAIImageGeneration?: boolean;
  lowCostMode?: boolean;
  maxImagesPerRun?: number;
  cacheTtlSeconds?: number;
  cachedResultAvailable?: boolean;
  confirmationRequired?: boolean;
  confirmationThreshold?: number;
  model?: string;
  quality?: string;
  generationType?: string;
  cacheStatus?: string;
  assets?: StudioPreviewAssetType[];
  estimatedCostUsd?: number;
  activeImageProvider?: string;
  activeModel?: string;
  fallbackModelUsed?: string;
  billableGenerationAttempted?: boolean;
  noBillableGenerationAttempted?: boolean;
  unavailableReason?: string;
  costBreakdown?: Array<{
    provider?: string;
    model?: string;
    generationType?: string;
    promptHash?: string;
    estimatedCostUsd?: number;
    cacheStatus?: string;
  }>;
  providerFailureReason?: string;
  providerFailureCode?: string;
  diagnostics?: {
    envStudioProvider?: string;
    envStudioImageProvider?: string;
    geminiApiKeyPresent?: boolean;
    imagenApiKeyPresent?: boolean;
    studioImageGenerationEnabled?: boolean;
    modelSelected?: string;
    geminiTextModelSelected?: string;
    promptProvider?: "gemini-text" | "local-prompt-pack";
    promptProviderDecisionBranch?: string;
    promptFallbackReason?: string;
    routeCalled?: string;
    providerDecisionBranch?: string;
    activeImageProvider?: string;
    activeImageModel?: string;
    supportedModels?: string[];
    unsupportedModels?: string[];
    disabledModels?: string[];
    attemptedModels?: string[];
    fallbackModelUsed?: string;
    billableGenerationAttempted?: boolean;
    noBillableGenerationAttempted?: boolean;
    quotaStatus?: string;
    lastProbeResult?: string;
    lastErrorCode?: string;
    openaiStudioFallbackEnabled?: boolean;
    canGenerateStudioBible?: boolean;
    cacheStatus?: string;
    fallbackReason?: string;
  };
};
