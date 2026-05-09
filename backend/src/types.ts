export type TokenScan = {
  mint: string;
  symbol: string;
  name: string;
  description?: string;
  metadataUri?: string;
  imageUri?: string;
  logoUri?: string;
  externalUrl?: string;
  decimals: number;
  supply?: string;
  socialLinks?: Record<string, string>;
  extensions?: Record<string, unknown>;
  provider: "helius";
  indexed: boolean;
  metadataConfidence?: number;
  fallbackConfidence?: number;
  inferredIdentityConfidence?: number;
  confidenceBreakdown?: Record<string, number | string | boolean>;
  riskNotes: string[];
  persistenceWarning?: string;
  ageHours: number;
  liquidityUsd: number;
  marketCapUsd: number;
  holders: number;
  volume24hUsd: number;
  riskScore: number;
  activeVolume: boolean;
  reasons: string[];
};

export type CommunityProfile = {
  name: string;
  symbol: string;
  theme: string;
  mascot: string;
  vibe: string;
  palette: string[];
  communityTraits: {
    background: string[];
    role: string[];
    aura: string[];
    accessory: string[];
    rank: string[];
    legendaryTrait: string;
  };
  rarityTable: Record<string, number>;
  traitLayers: {
    base: string[];
    headgear: string[];
    eyes: string[];
    aura: string[];
    accessory: string[];
    background: string[];
  };
  styleProfile: StyleProfile;
};

export type GeneratedArt = {
  imageUri: string;
  metadataUri: string;
  layers: string[];
  baseVariant: BaseCharacterVariant;
  microRandomization: MicroRandomization;
  uniquenessHash: string;
  animated: boolean;
};

export type StyleProfile = {
  artStyle: string;
  colorPalette: string[];
  shapeLanguage: "rounded" | "sharp" | "glitch" | "organic" | "geometric";
  mascotType: string;
  visualFx: string[];
  texture: "clean" | "grain" | "scanlines" | "painted" | "posterized";
  silhouetteRules: string[];
};

export type BaseCharacterVariant = {
  id: string;
  name: string;
  silhouette: string;
  pose: string;
  rarityBias: "common" | "uncommon" | "rare" | "epic" | "legendary";
};

export type MicroRandomization = {
  offsetX: number;
  offsetY: number;
  rotationDeg: number;
  scale: number;
  hueShiftDeg: number;
  noiseOpacity: number;
};

export type RaidScoreInput = {
  walletAgeHours: number;
  holdingHours: number;
  notionalValueUsd: number;
  possibleWashTrade: boolean;
  actionsToday: number;
};

export type FeeQuote = {
  grossSol: number;
  totalFeeSol: number;
  blendedFeeBps: number;
  allocations: Array<{
    destination: "raidRewards" | "buybackBacking" | "protocolTreasury" | "creatorCommunity" | "safetyReserve" | "liquidityReserve";
    bps: number;
    sol: number;
  }>;
};

export type InstantSellQuote = {
  enabled: boolean;
  backingValueSol: number;
  discountBps: number;
  quoteSol: number;
  reason?: string;
};
