import type { ActivityItem, CollectionCompetition, CommunityMember, LeaderboardRow, RaidMission, RaidRoom, SocialActivity, VaultCollection, VaultNft } from "./types";

export const collections: VaultCollection[] = [
  {
    id: "frog-vaults",
    symbol: "$FROG",
    name: "$FROG Vaults",
    subtitle: "Frog Nation",
    tokenMint: "Frg111111111111111111111111111111111111111",
    description: "A community-first vault collection backing $FROG token. Lock with the swamp, raid with the guild, and grow the collection together.",
    image: "/art/frog-vault-v2.png",
    banner: "/art/hero-frog-v2.png",
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
    riskTier: "SAFE",
    instantSellEnabled: true,
    palette: ["#21f26b", "#7a35ff", "#052617"],
    mascotType: "frog",
    silhouette: "short hooded amphibian with oversized eyes and a ritual staff",
    activeUsers24h: 1420,
    raidSuccessRate: 86,
    averageHoldDays: 74,
    communityTraits: ["Swamp Prophet", "Toxic Mist", "Lily Staff", "Bog Crown", "Neon Warts"],
    legendaryTrait: "Ancient Lily Oracle",
    traitLayers: {
      base: ["Hooded Frog", "Bog Mystic", "Lily Guardian"],
      headgear: ["Bog Crown", "Ritual Hood", "Moss Halo"],
      eyes: ["Glow Eyes", "Oracle Lenses", "Toxic Pupils"],
      aura: ["Toxic Mist", "Emerald Pulse", "Swamp Sparks"],
      accessory: ["Lily Staff", "Vault Lantern", "Rune Satchel"],
      background: ["Moonlit Marsh", "Vault Grove", "Sunken Citadel"]
    },
    styleProfile: {
      artStyle: "pixel mystic",
      shapeLanguage: "organic rounded",
      visualFx: ["toxic particles", "emerald glow", "mist noise"],
      baseVariantCount: 32,
      microRandomization: "offset, scale, hue shift, and soft noise"
    },
    nextUnlocks: ["Moss Halo headgear", "Animated Toxic Mist", "OG Raider cNFT badge", "+5% raid XP boost"]
  },
  {
    id: "doge-kingdom",
    symbol: "$DOGE",
    name: "$DOGE Kingdom",
    subtitle: "Doge Kingdom",
    tokenMint: "Doge11111111111111111111111111111111111111",
    description: "Royal vaults for meme lords who lock, stake, and defend the crown.",
    image: "/art/doge-kingdom-v2.png",
    banner: "/art/doge-kingdom-v2.png",
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
    riskTier: "SAFE",
    instantSellEnabled: true,
    palette: ["#f4c542", "#21f26b", "#2b1905"],
    mascotType: "dog",
    silhouette: "upright royal hound with crown armor and broad shoulders",
    activeUsers24h: 880,
    raidSuccessRate: 78,
    averageHoldDays: 61,
    communityTraits: ["Bone Raider", "Golden Bark", "Moon Kennel", "Royal Snout", "Castle Collar"],
    legendaryTrait: "Solar Crown Howl",
    traitLayers: {
      base: ["Royal Hound", "Moon Guard", "Bone Knight"],
      headgear: ["Solar Crown", "Kennel Helm", "Gold Visor"],
      eyes: ["Moon Eyes", "Emerald Glare", "Battle Focus"],
      aura: ["Golden Bark", "Castle Glow", "Lunar Flare"],
      accessory: ["Bone Scepter", "War Banner", "Royal Collar"],
      background: ["Moon Kennel", "Crown Hall", "Bone Yard"]
    },
    styleProfile: {
      artStyle: "royal cartoon",
      shapeLanguage: "bold armored",
      visualFx: ["gold sparks", "banner shimmer", "moon glow"],
      baseVariantCount: 28,
      microRandomization: "pose lean, crown tilt, saturation shifts, grain"
    },
    nextUnlocks: ["Gold Visor", "Bone Yard raid room", "Royal Guard badge", "+3% marketplace XP"]
  },
  {
    id: "cat-syndicate",
    symbol: "$CAT",
    name: "$CAT Syndicate",
    subtitle: "Cat Syndicate",
    tokenMint: "Cat111111111111111111111111111111111111111",
    description: "Cyber vault identities for stealth holders and market raiders.",
    image: "/art/cat-syndicate-v2.png",
    banner: "/art/cat-syndicate-v2.png",
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
    riskTier: "MEDIUM",
    instantSellEnabled: true,
    palette: ["#9a36ff", "#28d7ff", "#1b042c"],
    mascotType: "cat",
    silhouette: "sleek cyber cat with angular ears and a visor-heavy profile",
    activeUsers24h: 1580,
    raidSuccessRate: 72,
    averageHoldDays: 49,
    communityTraits: ["Alley Oracle", "Static Whisker", "Midnight Visor", "Neon Claw", "Backdoor Halo"],
    legendaryTrait: "Quantum Nine Lives",
    traitLayers: {
      base: ["Cyber Cat", "Shadow Broker", "Alley Striker"],
      headgear: ["Midnight Visor", "Backdoor Halo", "Signal Hood"],
      eyes: ["Neon Scan", "Static Pupils", "Blue Firewall"],
      aura: ["Static Whisker", "Purple Plasma", "Data Ghost"],
      accessory: ["Neon Claw", "Signal Blade", "Code Charm"],
      background: ["Neon Alley", "Server Shrine", "Black Market"]
    },
    styleProfile: {
      artStyle: "cyberpunk glitch",
      shapeLanguage: "sharp glitch",
      visualFx: ["scanlines", "neon rim light", "data trails"],
      baseVariantCount: 40,
      microRandomization: "glitch offsets, visor angle, noise overlays"
    },
    nextUnlocks: ["Animated Data Ghost", "Signal Blade", "Syndicate cNFT badge", "+8% volume raid XP"]
  },
  {
    id: "pepe-empire",
    symbol: "$PEPE",
    name: "$PEPE Empire",
    subtitle: "Pepe Empire",
    tokenMint: "Pepe11111111111111111111111111111111111111",
    description: "Vaults for builders expanding a pixel empire one lock at a time.",
    image: "/art/pepe-empire-v2.png",
    banner: "/art/pepe-empire-v2.png",
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
    riskTier: "MEDIUM",
    instantSellEnabled: true,
    palette: ["#21f26b", "#f4c542", "#103315"],
    mascotType: "alien",
    silhouette: "wide-eyed alien warlord with banner armor and sharp shoulders",
    activeUsers24h: 620,
    raidSuccessRate: 68,
    averageHoldDays: 42,
    communityTraits: ["Mire General", "Bog Banner", "Citadel Moss", "War Glasses", "Vault Pike"],
    legendaryTrait: "Emerald Empire Standard",
    traitLayers: {
      base: ["Mire Alien", "Empire Scout", "Pepe Warlord"],
      headgear: ["War Glasses", "Empire Crown", "Reed Helm"],
      eyes: ["Moss Scan", "Citadel Focus", "Gold Pupils"],
      aura: ["Citadel Moss", "Emerald Static", "Warlord Heat"],
      accessory: ["Vault Pike", "Bog Banner", "Empire Key"],
      background: ["Marsh Fortress", "Empire Gate", "Glowing Moat"]
    },
    styleProfile: {
      artStyle: "meme war poster",
      shapeLanguage: "wide alien",
      visualFx: ["moss haze", "banner embers", "vault shine"],
      baseVariantCount: 34,
      microRandomization: "banner sway, scale jitter, palette drift"
    },
    nextUnlocks: ["Empire Key", "Animated Bog Banner", "Mire General badge", "+4% staking boost"]
  },
  {
    id: "shiba-samurai",
    symbol: "$SHIBA",
    name: "$SHIBA Samurai",
    subtitle: "Shiba Samurai",
    tokenMint: "Shib11111111111111111111111111111111111111",
    description: "Disciplined vault clans with isolated rewards and sharp marketplace rails.",
    image: "/art/shiba-samurai-v2.png",
    banner: "/art/shiba-samurai-v2.png",
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
    riskTier: "HIGH RISK",
    instantSellEnabled: false,
    palette: ["#df8740", "#7a35ff", "#25110a"],
    mascotType: "samurai",
    silhouette: "compact shiba ronin with kabuto helmet and angled blade stance",
    activeUsers24h: 410,
    raidSuccessRate: 54,
    averageHoldDays: 34,
    communityTraits: ["Katana Collar", "Moon Kennel", "Ronin Spark", "Lantern Fang", "Chrome Kabuto"],
    legendaryTrait: "Silent Dojo Eclipse",
    traitLayers: {
      base: ["Shiba Ronin", "Dojo Scout", "Lantern Guard"],
      headgear: ["Chrome Kabuto", "Ronin Hood", "Moon Hat"],
      eyes: ["Lantern Eyes", "Violet Focus", "Dojo Glare"],
      aura: ["Ronin Spark", "Steel Pulse", "Eclipse Glow"],
      accessory: ["Katana Collar", "Lantern Fang", "Vault Tanto"],
      background: ["Neon Dojo", "Lantern Market", "Eclipse Bridge"]
    },
    styleProfile: {
      artStyle: "anime samurai",
      shapeLanguage: "angular blade",
      visualFx: ["eclipse glow", "steel pulse", "violet sparks"],
      baseVariantCount: 30,
      microRandomization: "blade rotation, helmet tilt, contrast noise"
    },
    nextUnlocks: ["Vault Tanto", "Eclipse Glow", "Ronin cNFT badge", "Instant sell review"]
  }
];

export const vaultNfts: VaultNft[] = [
  { id: "8421", collectionId: "frog-vaults", name: "Swamp Watcher", number: 8421, image: "/art/frog-vault-v2.png", priceSol: 12.5, backingUsd: 2145.25, backingSol: 10.4, lockedAmount: "50,000 $FROG", duration: "90 Days", tier: "Emerald", status: "Locked", rarity: "Rare", apy: 42.5, unlockDate: "21.08.2025", role: "Swamp Prophet", rank: "Bronze Raider", aura: "Toxic Mist", background: "Moonlit Marsh", badges: ["OG", "Raider"] },
  { id: "2177", collectionId: "doge-kingdom", name: "Golden Marshal", number: 2177, image: "/art/doge-kingdom-v2.png", priceSol: 13.2, backingUsd: 2267.16, backingSol: 11.8, lockedAmount: "100,000 $DOGE", duration: "180 Days", tier: "Royal", status: "Locked", rarity: "Epic", apy: 48.3, unlockDate: "11.09.2025", role: "Bone Raider", rank: "Gold Raider", aura: "Golden Bark", background: "Crown Hall", badges: ["Whale", "Royal"] },
  { id: "3056", collectionId: "cat-syndicate", name: "Cyber Shadow", number: 3056, image: "/art/cat-syndicate-v2.png", priceSol: 14.75, backingUsd: 2531.23, backingSol: 12.9, lockedAmount: "75,000 $CAT", duration: "90 Days", tier: "Neon", status: "Staked", rarity: "Rare", apy: 37.2, unlockDate: "90 Days", role: "Alley Oracle", rank: "Silver Raider", aura: "Static Whisker", background: "Neon Alley", badges: ["Raider"] },
  { id: "9931", collectionId: "pepe-empire", name: "Pepe Warlord", number: 9931, image: "/art/pepe-empire-v2.png", priceSol: 14, backingUsd: 2373.1, backingSol: 13.2, lockedAmount: "25,000 $PEPE", duration: "Flexible", tier: "Mire", status: "Flexible", rarity: "Epic", apy: 15.2, unlockDate: "Anytime", role: "Mire General", rank: "Bronze Raider", aura: "Citadel Moss", background: "Marsh Fortress", badges: ["Founder"] },
  { id: "6651", collectionId: "shiba-samurai", name: "Shiba Ronin", number: 6651, image: "/art/shiba-samurai-v2.png", priceSol: 16.8, backingUsd: 2879.45, backingSol: 12.1, lockedAmount: "40,000 $SHIBA", duration: "30 Days", tier: "Ronin", status: "Staked", rarity: "Rare", apy: 28.1, unlockDate: "30 Days", role: "Lantern Guard", rank: "Bronze Raider", aura: "Ronin Spark", background: "Neon Dojo", badges: ["Risk Watch"] },
  { id: "1209", collectionId: "frog-vaults", name: "Toxic Sage", number: 1209, image: "/art/frog-vault-v2.png", priceSol: 9.8, backingUsd: 1680.25, backingSol: 9.1, lockedAmount: "30,000 $FROG", duration: "30 Days", tier: "Toxic", status: "Redeemable", rarity: "Epic", apy: 18.7, unlockDate: "Anytime", role: "Lily Staff Keeper", rank: "Silver Raider", aura: "Emerald Pulse", background: "Vault Grove", badges: ["OG"] },
  { id: "7721", collectionId: "cat-syndicate", name: "Neon Hacker", number: 7721, image: "/art/cat-syndicate-v2.png", priceSol: 17.25, backingUsd: 2953.66, backingSol: 13.8, lockedAmount: "120,000 $CAT", duration: "180 Days", tier: "Quantum", status: "Locked", rarity: "Epic", apy: 44.1, unlockDate: "180 Days", role: "Backdoor Halo", rank: "Gold Raider", aura: "Purple Plasma", background: "Server Shrine", badges: ["Whale"] },
  { id: "4200", collectionId: "pepe-empire", name: "King Pepe", number: 4200, image: "/art/pepe-empire-v2.png", priceSol: 25, backingUsd: 4276.2, backingSol: 18.5, lockedAmount: "200,000 $PEPE", duration: "180 Days", tier: "Legend", status: "Locked", rarity: "Legendary", apy: 51.3, unlockDate: "180 Days", role: "Emerald Standard", rank: "Diamond Raider", aura: "Warlord Heat", background: "Empire Gate", badges: ["Legendary", "Whale"] }
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
  { rank: 1, name: "SwampKing", score: "12,450 XP", image: "/art/frog-vault-v2.png", role: "Whale", badge: "Crown" },
  { rank: 2, name: "FrogLord", score: "9,850 XP", image: "/art/frog-vault-v2.png", role: "OG", badge: "Founder" },
  { rank: 3, name: "LilypadOG", score: "8,150 XP", image: "/art/doge-kingdom-v2.png", role: "Raider", badge: "Gold" },
  { rank: 4, name: "ToxicToad", score: "7,240 XP", image: "/art/pepe-empire-v2.png", role: "Raider", badge: "Mire" },
  { rank: 5, name: "MemeFrog", score: "6,420 XP", image: "/art/frog-vault-v2.png", role: "OG", badge: "Swamp" },
  { rank: 23, name: "FrogMaster", score: "2,850 XP", image: "/art/frog-vault-v2.png", highlight: true, role: "OG Raider", badge: "You" }
];

export const activity: ActivityItem[] = [
  { actor: "FrogMaster", action: "staked a vault", amount: "+200 XP", time: "2m ago", image: "/art/frog-vault-v2.png" },
  { actor: "LilypadOG", action: "completed a raid", amount: "+150 XP", time: "5m ago", image: "/art/doge-kingdom-v2.png" },
  { actor: "SwampKing", action: "unlocked Toxic Aura", amount: "+100 XP", time: "12m ago", image: "/art/cat-syndicate-v2.png" },
  { actor: "ToxicToad", action: "minted a vault", amount: "+12.5 SOL", time: "18m ago", image: "/art/pepe-empire-v2.png" }
];

export const communityMembers: CommunityMember[] = [
  { id: "swampking", name: "SwampKing", avatar: "/art/frog-vault-v2.png", role: "Whale", xp: 12450, vaults: 18, rank: "Diamond Raider", followed: true },
  { id: "froglord", name: "FrogLord", avatar: "/art/frog-vault-v2.png", role: "OG", xp: 9850, vaults: 12, rank: "Gold Raider" },
  { id: "lilypadog", name: "LilypadOG", avatar: "/art/doge-kingdom-v2.png", role: "Raider", xp: 8150, vaults: 9, rank: "Silver Raider" },
  { id: "toxictoad", name: "ToxicToad", avatar: "/art/pepe-empire-v2.png", role: "Raider", xp: 7240, vaults: 7, rank: "Silver Raider" },
  { id: "frogmaster", name: "FrogMaster", avatar: "/art/frog-vault-v2.png", role: "Founder", xp: 2850, vaults: 12, rank: "Bronze Raider", followed: true }
];

export const socialActivity: SocialActivity[] = [
  { id: "a1", collectionId: "frog-vaults", actor: "SwampKing", avatar: "/art/frog-vault-v2.png", role: "Whale", action: "joined Swamp Takeover and pushed boss HP down", xp: 450, nft: "Swamp Watcher #8421", time: "now", reaction: "fire" },
  { id: "a2", collectionId: "frog-vaults", actor: "FrogMaster", avatar: "/art/frog-vault-v2.png", role: "OG Raider", action: "minted a new Vault NFT and unlocked Toxic Mist", xp: 220, nft: "Toxic Sage #1209", time: "2m", reaction: "rocket" },
  { id: "a3", collectionId: "doge-kingdom", actor: "LilypadOG", avatar: "/art/doge-kingdom-v2.png", role: "Raider", action: "staked a 180 day royal vault", xp: 180, nft: "Golden Marshal #2177", time: "5m", reaction: "fire" },
  { id: "a4", collectionId: "cat-syndicate", actor: "NeonMancer", avatar: "/art/cat-syndicate-v2.png", role: "Raider", action: "reacted to Cataclysm Strike and completed mission 2", xp: 160, nft: "Neon Hacker #7721", time: "9m", reaction: "skull" },
  { id: "a5", collectionId: "frog-vaults", actor: "ToxicToad", avatar: "/art/pepe-empire-v2.png", role: "Raider", action: "followed the collection and unlocked starter missions", xp: 75, time: "12m", reaction: "rocket" }
];

export const competitions: CollectionCompetition[] = [
  {
    id: "frog-vs-doge",
    title: "Frog vs Dog: Vault War",
    leftCollectionId: "frog-vaults",
    rightCollectionId: "doge-kingdom",
    leftScore: 85420,
    rightScore: 60230,
    reward: "Winner gets +10% raid XP and unlocks one trait pack early",
    penalty: "Loser receives -5% raid rewards for the next 24h",
    endsIn: "02:14:37"
  },
  {
    id: "cat-vs-pepe",
    title: "Syndicate vs Empire",
    leftCollectionId: "cat-syndicate",
    rightCollectionId: "pepe-empire",
    leftScore: 120450,
    rightScore: 42150,
    reward: "Winner gets a featured marketplace lane and badge drop",
    penalty: "Loser must complete a recovery raid to restore boosts",
    endsIn: "12:45:33"
  }
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

export function getRaid(collectionId: string, raidId: string) {
  return raidRooms.find((raid) => raid.collectionId === collectionId && raid.id === raidId) ?? raidRooms.find((raid) => raid.collectionId === collectionId) ?? raidRooms[0];
}

export function riskAccent(riskTier: VaultCollection["riskTier"]) {
  if (riskTier === "SAFE") return "green";
  if (riskTier === "MEDIUM") return "gold";
  return "red";
}
