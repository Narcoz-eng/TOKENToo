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
  instantSellEnabled: boolean;
  palette: string[];
  communityTraits: string[];
  legendaryTrait: string;
};

export type VaultNft = {
  id: string;
  collectionId: string;
  name: string;
  number: number;
  image: string;
  priceSol: number;
  backingUsd: number;
  lockedAmount: string;
  duration: string;
  tier: string;
  status: "Flexible" | "Locked" | "Staked" | "Redeemable";
  rarity: "Rare" | "Epic" | "Legendary" | "Mythic";
  apy: number;
  unlockDate: string;
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
};

