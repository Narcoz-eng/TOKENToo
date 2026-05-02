import type { ActivityItem, LeaderboardRow, RaidMission, RaidRoom, VaultCollection, VaultNft } from "./types";

export const collections: VaultCollection[] = [
  {
    id: "frog-vaults",
    symbol: "$FROG",
    name: "$FROG Vaults",
    subtitle: "Frog Nation",
    tokenMint: "Frg111111111111111111111111111111111111111",
    description: "A community-first vault collection backing $FROG token. Lock with the swamp, raid with the guild, and grow the collection together.",
    image: "/art/frog-vault.png",
    banner: "/art/hero-frog.png",
    mascot: "Swamp Prophet",
    theme: "Arcane swamp citadel",
    vibe: "Ritual raids, green yield, hooded pixel frogs",
    chain: "Solana",
    category: "Meme",
    floorSol: 12.5,
    volume24hSol: 1253,
    volumeSol: 18542,
    holders: 2341,
    vaults: 4523,
    minted: 4523,
    supply: 5555,
    level: 3,
    xp: 85420,
    nextXp: 150000,
    apy: 38.7,
    online: 1234,
    riskScore: 82,
    instantSellEnabled: true,
    palette: ["#21f26b", "#7a35ff", "#052617"],
    communityTraits: ["Swamp Prophet", "Toxic Mist", "Lily Staff", "Bog Crown", "Neon Warts"],
    legendaryTrait: "Ancient Lily Oracle"
  },
  {
    id: "doge-kingdom",
    symbol: "$DOGE",
    name: "$DOGE Kingdom",
    subtitle: "Doge Kingdom",
    tokenMint: "Doge11111111111111111111111111111111111111",
    description: "Royal vaults for meme lords who lock, stake, and defend the crown.",
    image: "/art/doge-kingdom.png",
    banner: "/art/doge-kingdom.png",
    mascot: "Bone Raider",
    theme: "Gilded kennel citadel",
    vibe: "Gold armor, raid banners, moon bones",
    chain: "Solana",
    category: "Meme",
    floorSol: 13.2,
    volume24hSol: 1840,
    volumeSol: 22176,
    holders: 1843,
    vaults: 3810,
    minted: 3810,
    supply: 5000,
    level: 2,
    xp: 60230,
    nextXp: 100000,
    apy: 31.4,
    online: 987,
    riskScore: 76,
    instantSellEnabled: true,
    palette: ["#f4c542", "#21f26b", "#2b1905"],
    communityTraits: ["Bone Raider", "Golden Bark", "Moon Kennel", "Royal Snout", "Castle Collar"],
    legendaryTrait: "Solar Crown Howl"
  },
  {
    id: "cat-syndicate",
    symbol: "$CAT",
    name: "$CAT Syndicate",
    subtitle: "Cat Syndicate",
    tokenMint: "Cat111111111111111111111111111111111111111",
    description: "Cyber vault identities for stealth holders and market raiders.",
    image: "/art/cat-syndicate.png",
    banner: "/art/cat-syndicate.png",
    mascot: "Cyber Shadow",
    theme: "Neon alley syndicate",
    vibe: "Glasses, plasma auras, black-market XP",
    chain: "Solana",
    category: "Meme",
    floorSol: 14.75,
    volume24hSol: 1240,
    volumeSol: 14980,
    holders: 1256,
    vaults: 2960,
    minted: 2960,
    supply: 4444,
    level: 4,
    xp: 120450,
    nextXp: 180000,
    apy: 42.2,
    online: 1876,
    riskScore: 68,
    instantSellEnabled: true,
    palette: ["#9a36ff", "#28d7ff", "#1b042c"],
    communityTraits: ["Alley Oracle", "Static Whisker", "Midnight Visor", "Neon Claw", "Backdoor Halo"],
    legendaryTrait: "Quantum Nine Lives"
  },
  {
    id: "pepe-empire",
    symbol: "$PEPE",
    name: "$PEPE Empire",
    subtitle: "Pepe Empire",
    tokenMint: "Pepe11111111111111111111111111111111111111",
    description: "Vaults for builders expanding a pixel empire one lock at a time.",
    image: "/art/pepe-empire.png",
    banner: "/art/pepe-empire.png",
    mascot: "Pepe Warlord",
    theme: "Marsh fortress",
    vibe: "Battle frogs, banners, glowing moats",
    chain: "Solana",
    category: "Meme",
    floorSol: 15,
    volume24hSol: 980,
    volumeSol: 9050,
    holders: 987,
    vaults: 2184,
    minted: 2184,
    supply: 3333,
    level: 2,
    xp: 42150,
    nextXp: 100000,
    apy: 29.8,
    online: 654,
    riskScore: 61,
    instantSellEnabled: true,
    palette: ["#21f26b", "#f4c542", "#103315"],
    communityTraits: ["Mire General", "Bog Banner", "Citadel Moss", "War Glasses", "Vault Pike"],
    legendaryTrait: "Emerald Empire Standard"
  },
  {
    id: "shiba-samurai",
    symbol: "$SHIBA",
    name: "$SHIBA Samurai",
    subtitle: "Shiba Samurai",
    tokenMint: "Shib11111111111111111111111111111111111111",
    description: "Disciplined vault clans with isolated rewards and sharp marketplace rails.",
    image: "/art/shiba-samurai.png",
    banner: "/art/shiba-samurai.png",
    mascot: "Shiba Ronin",
    theme: "Neon dojo market",
    vibe: "Ronin masks, purple steel, green lanterns",
    chain: "Solana",
    category: "Meme",
    floorSol: 16.8,
    volume24hSol: 760,
    volumeSol: 11200,
    holders: 754,
    vaults: 1528,
    minted: 1528,
    supply: 2222,
    level: 3,
    xp: 92300,
    nextXp: 150000,
    apy: 35.1,
    online: 1043,
    riskScore: 57,
    instantSellEnabled: false,
    palette: ["#df8740", "#7a35ff", "#25110a"],
    communityTraits: ["Katana Collar", "Moon Kennel", "Ronin Spark", "Lantern Fang", "Chrome Kabuto"],
    legendaryTrait: "Silent Dojo Eclipse"
  }
];

export const vaultNfts: VaultNft[] = [
  { id: "8421", collectionId: "frog-vaults", name: "Swamp Watcher", number: 8421, image: "/art/frog-vault.png", priceSol: 12.5, backingUsd: 2145.25, lockedAmount: "50,000 $FROG", duration: "90 Days", tier: "Emerald", status: "Locked", rarity: "Rare", apy: 42.5, unlockDate: "21.08.2025" },
  { id: "2177", collectionId: "doge-kingdom", name: "Golden Marshal", number: 2177, image: "/art/doge-kingdom.png", priceSol: 13.2, backingUsd: 2267.16, lockedAmount: "100,000 $DOGE", duration: "180 Days", tier: "Royal", status: "Locked", rarity: "Epic", apy: 48.3, unlockDate: "11.09.2025" },
  { id: "3056", collectionId: "cat-syndicate", name: "Cyber Shadow", number: 3056, image: "/art/cat-syndicate.png", priceSol: 14.75, backingUsd: 2531.23, lockedAmount: "75,000 $CAT", duration: "90 Days", tier: "Neon", status: "Staked", rarity: "Rare", apy: 37.2, unlockDate: "90 Days" },
  { id: "9931", collectionId: "pepe-empire", name: "Pepe Warlord", number: 9931, image: "/art/pepe-empire.png", priceSol: 14, backingUsd: 2373.1, lockedAmount: "25,000 $PEPE", duration: "Flexible", tier: "Mire", status: "Flexible", rarity: "Epic", apy: 15.2, unlockDate: "Anytime" },
  { id: "6651", collectionId: "shiba-samurai", name: "Shiba Ronin", number: 6651, image: "/art/shiba-samurai.png", priceSol: 16.8, backingUsd: 2879.45, lockedAmount: "40,000 $SHIBA", duration: "30 Days", tier: "Ronin", status: "Staked", rarity: "Rare", apy: 28.1, unlockDate: "30 Days" },
  { id: "1209", collectionId: "frog-vaults", name: "Toxic Sage", number: 1209, image: "/art/frog-vault.png", priceSol: 9.8, backingUsd: 1680.25, lockedAmount: "30,000 $FROG", duration: "30 Days", tier: "Toxic", status: "Redeemable", rarity: "Epic", apy: 18.7, unlockDate: "Anytime" },
  { id: "7721", collectionId: "cat-syndicate", name: "Neon Hacker", number: 7721, image: "/art/cat-syndicate.png", priceSol: 17.25, backingUsd: 2953.66, lockedAmount: "120,000 $CAT", duration: "180 Days", tier: "Quantum", status: "Locked", rarity: "Epic", apy: 44.1, unlockDate: "180 Days" },
  { id: "4200", collectionId: "pepe-empire", name: "King Pepe", number: 4200, image: "/art/pepe-empire.png", priceSol: 25, backingUsd: 4276.2, lockedAmount: "200,000 $PEPE", duration: "180 Days", tier: "Legend", status: "Locked", rarity: "Legendary", apy: 51.3, unlockDate: "180 Days" }
];

export const raidMissions: RaidMission[] = [
  { id: "raid-3", title: "Complete 3 raids", type: "Daily Mission", progress: 2, target: 3, xp: 200, rewardSol: 150, icon: "purple" },
  { id: "stake-vault", title: "Stake a Vault NFT", type: "Staking Raid", progress: 1, target: 1, xp: 150, rewardSol: 100, icon: "green" },
  { id: "hold-7", title: "Hold a Vault NFT for 7 days", type: "Holder Raid", progress: 5, target: 7, xp: 250, rewardSol: 200, icon: "cyan" },
  { id: "invite-3", title: "Invite 3 friends", type: "Invite Raid", progress: 1, target: 3, xp: 100, rewardSol: 75, icon: "gold" },
  { id: "trade-market", title: "Trade on Marketplace", type: "Volume Raid", progress: 1, target: 1, xp: 100, rewardSol: 75, icon: "green" }
];

export const raidRooms: RaidRoom[] = [
  { id: "swamp-takeover", collectionId: "frog-vaults", name: "Swamp Takeover", boss: "Swamp Overlord", status: "Live", progress: 85.4, participants: 1234, capacity: 2500, rewardSol: 3250, endsIn: "02:14:37:42" },
  { id: "bone-yard", collectionId: "doge-kingdom", name: "Bone Yard Battle", boss: "Kennel Warden", status: "Upcoming", progress: 54, participants: 987, capacity: 1800, rewardSol: 2100, startsIn: "12h 24m", endsIn: "02:14:37:42" },
  { id: "toxic-marsh", collectionId: "frog-vaults", name: "Toxic Marsh Hunt", boss: "Venom Croaker", status: "Upcoming", progress: 62.7, participants: 856, capacity: 1500, rewardSol: 4500, startsIn: "1d 04h", endsIn: "01:08:21:10" },
  { id: "cataclysm", collectionId: "cat-syndicate", name: "Cataclysm Strike", boss: "Rogue Kernel", status: "Upcoming", progress: 40, participants: 642, capacity: 1000, rewardSol: 5000, startsIn: "2d 18h", endsIn: "12:45:33:18" }
];

export const leaderboard: LeaderboardRow[] = [
  { rank: 1, name: "SwampKing", score: "12,450 XP", image: "/art/frog-vault.png" },
  { rank: 2, name: "FrogLord", score: "9,850 XP", image: "/art/frog-vault.png" },
  { rank: 3, name: "LilypadOG", score: "8,150 XP", image: "/art/doge-kingdom.png" },
  { rank: 4, name: "ToxicToad", score: "7,240 XP", image: "/art/pepe-empire.png" },
  { rank: 5, name: "MemeFrog", score: "6,420 XP", image: "/art/frog-vault.png" },
  { rank: 23, name: "FrogMaster", score: "2,850 XP", image: "/art/frog-vault.png", highlight: true }
];

export const activity: ActivityItem[] = [
  { actor: "FrogMaster", action: "staked a vault", amount: "+200 XP", time: "2m ago", image: "/art/frog-vault.png" },
  { actor: "LilypadOG", action: "completed a raid", amount: "+150 XP", time: "5m ago", image: "/art/doge-kingdom.png" },
  { actor: "SwampKing", action: "unlocked Toxic Aura", amount: "+100 XP", time: "12m ago", image: "/art/cat-syndicate.png" },
  { actor: "ToxicToad", action: "minted a vault", amount: "+12.5 SOL", time: "18m ago", image: "/art/pepe-empire.png" }
];

export const feeSplit = [
  { label: "Raid rewards", value: 35, color: "#7a35ff" },
  { label: "Buyback/backing", value: 35, color: "#21f26b" },
  { label: "Protocol treasury", value: 15, color: "#28d7ff" },
  { label: "Creator/community", value: 10, color: "#f4c542" },
  { label: "Safety reserve", value: 5, color: "#ff4f70" }
];

export function getCollection(id = "frog-vaults") {
  return collections.find((collection) => collection.id === id) ?? collections[0];
}

