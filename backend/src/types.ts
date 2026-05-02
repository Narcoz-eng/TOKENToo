export type TokenScan = {
  mint: string;
  symbol: string;
  name: string;
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
};

export type GeneratedArt = {
  imageUri: string;
  metadataUri: string;
  layers: string[];
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
    destination: "raidRewards" | "buybackBacking" | "protocolTreasury" | "creatorCommunity" | "safetyReserve";
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

