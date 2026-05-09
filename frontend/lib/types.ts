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
};

export type RaidMission = {
  id: string;
  title: string;
  type: string;
  progress: number;
  target: number;
  xp: number;
  rewardSol: number;
  icon: Accent;
};

export type RaidRoom = {
  id: string;
  collectionId: string;
  name: string;
  boss: string;
  status: "Live" | "Upcoming";
  progress: number;
  participants: number;
  capacity: number;
  rewardSol: number;
  startsIn?: string;
  endsIn: string;
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

export type GeneratorQualityTier = "Wireframe concept" | "AI concept" | "Basic" | "Premium" | "Legendary-ready";

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

export type ConceptRequestSummary = {
  provider?: string;
  imageCount?: number;
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
  providerFailureReason?: string;
};
