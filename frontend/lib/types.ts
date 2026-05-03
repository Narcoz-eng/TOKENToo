export type Accent = "purple" | "green" | "cyan" | "gold" | "red";

export type VaultCollection = {
  id: string;
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
  instantSellEnabled: boolean;
  palette: string[];
  mascotType: "frog" | "dog" | "cat" | "alien" | "samurai";
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
  };
  nextUnlocks: string[];
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
