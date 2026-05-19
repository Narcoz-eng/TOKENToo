const gameFlowFrame = (flow: "mint" | "stake" | "unstake" | "redeem" | "proof" | "community" | "raid", frame: 1 | 2 | 3 | 4) =>
  `/animations/game-flows/${flow}/frame-${frame}.png`;

export const gameFlowAssets = {
  objects: {
    token: "/animations/game-flows/objects/token.png",
    tokenStack: "/animations/game-flows/objects/token-stack.png",
    nft: "/animations/game-flows/objects/nft-card.png",
    vault: "/animations/game-flows/objects/vault.png",
    lock: "/animations/game-flows/objects/lock.png",
    unlock: "/animations/game-flows/objects/unlock.png",
    proof: "/animations/game-flows/objects/proof-ring.png",
    scan: "/animations/game-flows/objects/proof-ring.png",
    reward: "/animations/game-flows/objects/reward-burst.png",
    community: "/animations/game-flows/objects/reserve-vault.png",
    reserve: "/animations/game-flows/objects/reserve-vault.png",
    layer: "/animations/game-flows/objects/token-stack.png",
    raid: "/animations/game-flows/objects/raid-flag.png",
    raidProof: "/animations/game-flows/objects/raid-proof.png",
    xp: "/animations/game-flows/objects/xp.png",
    error: "/animations/phew-error-glitch.webp"
  },
  flows: {
    mint: {
      label: "Mint Game Flow",
      confirmObject: "reward",
      particleVariant: "reward",
      frames: [
        { image: gameFlowFrame("mint", 1), title: "Token selected", caption: "Token reserve is staged for mint.", primary: "token", target: "vault", effect: "select", actorMood: "mint" },
        { image: gameFlowFrame("mint", 2), title: "Token locks into vault", caption: "Backing moves into the reserve vault.", primary: "token", target: "vault", effect: "lock", actorMood: "mint" },
        { image: gameFlowFrame("mint", 3), title: "NFT card forms", caption: "Vault NFT takes shape from verified backing.", primary: "nft", target: "vault", effect: "form", actorMood: "mint" },
        { image: gameFlowFrame("mint", 4), title: "Verified success burst", caption: "Mint success is shown only after confirmation.", primary: "nft", target: "reward", effect: "burst", actorMood: "success" }
      ]
    },
    stake: {
      label: "Stake Game Flow",
      confirmObject: "reward",
      particleVariant: "reward",
      frames: [
        { image: gameFlowFrame("stake", 1), title: "NFT selected", caption: "Eligible vault NFT is selected.", primary: "nft", target: "vault", effect: "select", actorMood: "stake" },
        { image: gameFlowFrame("stake", 2), title: "NFT moves into vault", caption: "Stake transfer enters the vault lane.", primary: "nft", target: "vault", effect: "lock", actorMood: "stake" },
        { image: gameFlowFrame("stake", 3), title: "Vault locks", caption: "Position is locked after backend confirmation.", primary: "nft", target: "lock", effect: "lock", actorMood: "stake" },
        { image: gameFlowFrame("stake", 4), title: "Rewards activate", caption: "Reward state activates after confirmed stake.", primary: "nft", target: "reward", effect: "burst", actorMood: "success" }
      ]
    },
    unstake: {
      label: "Unstake Game Flow",
      confirmObject: "reward",
      particleVariant: "reward",
      frames: [
        { image: gameFlowFrame("unstake", 1), title: "Vault unlocks", caption: "Position unlock begins from backend state.", primary: "unlock", target: "vault", effect: "unlock", actorMood: "stake" },
        { image: gameFlowFrame("unstake", 2), title: "NFT exits", caption: "Vault NFT leaves the staked lane.", primary: "nft", target: "unlock", effect: "exit", actorMood: "stake" },
        { image: gameFlowFrame("unstake", 3), title: "Ownership restored", caption: "Wallet ownership returns after confirmation.", primary: "nft", target: "tokenStack", effect: "exit", actorMood: "stake" },
        { image: gameFlowFrame("unstake", 4), title: "Success burst", caption: "Unstake success is shown only when confirmed.", primary: "nft", target: "reward", effect: "burst", actorMood: "success" }
      ]
    },
    redeem: {
      label: "Redeem Game Flow",
      confirmObject: "reward",
      particleVariant: "reward",
      frames: [
        { image: gameFlowFrame("redeem", 1), title: "NFT verified", caption: "Vault NFT and reserve proof are checked.", primary: "nft", target: "proof", effect: "scan", actorMood: "redeem" },
        { image: gameFlowFrame("redeem", 2), title: "NFT invalidates", caption: "Redeem path invalidates or burns the NFT.", primary: "nft", target: "lock", effect: "burn", actorMood: "redeem" },
        { image: gameFlowFrame("redeem", 3), title: "Tokens return", caption: "Backing returns to the wallet lane.", primary: "tokenStack", target: "token", effect: "exit", actorMood: "redeem" },
        { image: gameFlowFrame("redeem", 4), title: "Redeem confirmed", caption: "Redeem success appears after real confirmation.", primary: "tokenStack", target: "reward", effect: "burst", actorMood: "success" }
      ]
    },
    proof: {
      label: "Proof Game Flow",
      confirmObject: "reward",
      particleVariant: "reward",
      frames: [
        { image: gameFlowFrame("proof", 1), title: "Scan starts", caption: "Proof lookup loads the vault position.", primary: "nft", target: "scan", effect: "scan", actorMood: "proof" },
        { image: gameFlowFrame("proof", 2), title: "Reserve and owner checks", caption: "Reserve, owner, and position checks run.", primary: "nft", target: "proof", effect: "check", actorMood: "proof" },
        { image: gameFlowFrame("proof", 3), title: "Verification ring completes", caption: "Proof ring closes only after checks pass.", primary: "proof", target: "proof", effect: "check", actorMood: "proof" },
        { image: gameFlowFrame("proof", 4), title: "Proof verified", caption: "Proof success is gated by real verification.", primary: "proof", target: "reward", effect: "burst", actorMood: "success" }
      ]
    },
    community: {
      label: "Community Launch Flow",
      confirmObject: "reward",
      particleVariant: "reward",
      frames: [
        { image: gameFlowFrame("community", 1), title: "Token CA scanned", caption: "Token contract address enters the launch scanner.", primary: "token", target: "scan", effect: "scan", actorMood: "running" },
        { image: gameFlowFrame("community", 2), title: "Reserve vault created", caption: "Reserve vault is built from launch config.", primary: "token", target: "reserve", effect: "lock", actorMood: "running" },
        { image: gameFlowFrame("community", 3), title: "Collection initialized", caption: "Collection account initializes after signing.", primary: "community", target: "reserve", effect: "form", actorMood: "running" },
        { image: gameFlowFrame("community", 4), title: "Community launched", caption: "Launch success appears after confirmation.", primary: "community", target: "reward", effect: "burst", actorMood: "success" }
      ]
    },
    raid: {
      label: "Raid Game Flow",
      confirmObject: "xp",
      particleVariant: "xp",
      frames: [
        { image: gameFlowFrame("raid", 1), title: "Mission joined", caption: "Wallet joins a live mission room.", primary: "raid", target: "community", effect: "select", actorMood: "running" },
        { image: gameFlowFrame("raid", 2), title: "Proof submitted", caption: "Proof enters manual or configured verification.", primary: "raidProof", target: "raid", effect: "submit", actorMood: "proof" },
        { image: gameFlowFrame("raid", 3), title: "XP and reward burst", caption: "Approved participation unlocks XP and rewards.", primary: "xp", target: "raid", effect: "burst", actorMood: "success" },
        { image: gameFlowFrame("raid", 4), title: "Raid success", caption: "Raid success appears only after backend approval.", primary: "raid", target: "xp", effect: "burst", actorMood: "success" }
      ]
    },
    studio: {
      label: "Studio Bible Flow",
      confirmObject: "reward",
      particleVariant: "reward",
      frames: [
        { image: gameFlowFrame("community", 1), title: "Prompt approved", caption: "Studio request enters the build queue.", primary: "layer", target: "scan", effect: "scan", actorMood: "loading" },
        { image: gameFlowFrame("community", 2), title: "Brand bible builds", caption: "Style bible and layer grammar are assembled.", primary: "layer", target: "community", effect: "form", actorMood: "loading" },
        { image: gameFlowFrame("proof", 2), title: "Layer pack checks", caption: "Trait pack consistency is checked.", primary: "nft", target: "proof", effect: "check", actorMood: "proof" },
        { image: gameFlowFrame("community", 4), title: "Studio success", caption: "Studio assets are ready after provider result.", primary: "nft", target: "reward", effect: "burst", actorMood: "success" }
      ]
    },
    reward: {
      label: "Reward Flow",
      confirmObject: "reward",
      particleVariant: "reward",
      frames: [
        { image: gameFlowFrame("raid", 1), title: "Reward ready", caption: "Reward route reports pending value.", primary: "reward", target: "proof", effect: "select", actorMood: "running" },
        { image: gameFlowFrame("proof", 2), title: "Eligibility checked", caption: "Wallet and mission eligibility are checked.", primary: "proof", target: "reward", effect: "check", actorMood: "proof" },
        { image: gameFlowFrame("stake", 2), title: "Reward queued", caption: "Claim waits for payout confirmation.", primary: "reward", target: "vault", effect: "submit", actorMood: "running" },
        { image: gameFlowFrame("raid", 3), title: "Reward confirmed", caption: "Reward success appears after backend approval.", primary: "reward", target: "reward", effect: "burst", actorMood: "success" }
      ]
    },
    scan: {
      label: "Token Scan Flow",
      confirmObject: "reward",
      particleVariant: "reward",
      frames: [
        { image: gameFlowFrame("proof", 1), title: "Scan starts", caption: "Token or vault input enters the scanner.", primary: "token", target: "scan", effect: "scan", actorMood: "proof" },
        { image: gameFlowFrame("proof", 2), title: "Metadata checked", caption: "Metadata and ownership records are inspected.", primary: "token", target: "proof", effect: "check", actorMood: "proof" },
        { image: gameFlowFrame("proof", 3), title: "Risk checked", caption: "Risk and availability gates are reviewed.", primary: "proof", target: "vault", effect: "check", actorMood: "warning" },
        { image: gameFlowFrame("proof", 4), title: "Scan complete", caption: "Scan success appears after real results.", primary: "proof", target: "reward", effect: "burst", actorMood: "success" }
      ]
    },
    layer: {
      label: "Layer Pack Flow",
      confirmObject: "reward",
      particleVariant: "reward",
      frames: [
        { image: gameFlowFrame("community", 1), title: "Layer pack selected", caption: "Curated layer pack enters validation.", primary: "layer", target: "proof", effect: "select", actorMood: "loading" },
        { image: gameFlowFrame("proof", 2), title: "Traits checked", caption: "Trait coverage and rarity spread are checked.", primary: "layer", target: "proof", effect: "check", actorMood: "proof" },
        { image: gameFlowFrame("community", 3), title: "Pack approved", caption: "Layer pack passes configured QA.", primary: "nft", target: "community", effect: "form", actorMood: "loading" },
        { image: gameFlowFrame("community", 4), title: "Ready burst", caption: "Layer pack success appears after approval.", primary: "nft", target: "reward", effect: "burst", actorMood: "success" }
      ]
    }
  }
} as const;

export type GameFlowMode = keyof typeof gameFlowAssets.flows;
export type GameFlowObjectKey = keyof typeof gameFlowAssets.objects;
export type GameFlowFrameDescriptor = (typeof gameFlowAssets.flows)[GameFlowMode]["frames"][number];

export const brandAssets = {
  logo: "/logo.jpeg",
  logoMark: "/logo.jpeg",
  mascot: "/brand/phew-mascot-idle.webp",
  heroMascot: "/hero/phew-hero-mascot.webp",
  legacyMascot: "/brand/phew-mascot.png",
  mascotPoses: {
    idle: "/brand/phew-mascot-idle.webp",
    run: "/brand/phew-mascot-running.webp",
    running: "/brand/phew-mascot-running.webp",
    point: "/brand/phew-mascot-loading.webp",
    guide: "/brand/phew-mascot-loading.webp",
    loading: "/brand/phew-mascot-loading.webp",
    warning: "/brand/phew-mascot-warning.webp",
    success: "/brand/phew-mascot-success.webp",
    error: "/brand/phew-mascot-error.webp",
    mint: "/brand/phew-mascot-mint.webp",
    stake: "/brand/phew-mascot-stake.webp",
    redeem: "/brand/phew-mascot-redeem.webp",
    proof: "/brand/phew-mascot-loading.webp"
  },
  wordmark: "/logo.jpeg",
  gameFlowAssets,
  generatedGameFlowPack: "/art/phew-generated-game-flow-pack.png",
  generatedHeroAtlas: "/art/phew-route-hero-background-atlas.png",
  generatedIconAtlas: "/art/phew-icon-atlas.png",
  pageHeroes: {
    home: "/hero/generated/phew-hero-home.png",
    collections: "/hero/generated/phew-hero-collections.png",
    mint: "/hero/generated/phew-hero-mint.png",
    staking: "/hero/generated/phew-hero-staking.png",
    redeem: "/hero/generated/phew-hero-redeem.png",
    proof: "/hero/generated/phew-hero-proof.png",
    createCommunity: "/hero/generated/phew-hero-create-community.png",
    raids: "/hero/generated/phew-hero-raids.png",
    marketplace: "/hero/generated/phew-hero-marketplace.png",
    leaderboard: "/hero/generated/phew-hero-leaderboard.png",
    adminRisk: "/hero/generated/phew-hero-admin-risk.png",
    studioStrategy: "/hero/generated/phew-hero-studio-strategy.png"
  },
  generated: {
    runMascot: "/art/generated/phew-mascot-run.png",
    logoLockup: "/art/generated/phew-logo-lockup.png",
    commander: "/art/generated/phew-commander-flag.png",
    tokenCoin: "/art/generated/phew-token-coin.png",
    tokenStack: "/art/generated/phew-token-stack.png",
    nftCard: "/art/generated/phew-nft-card.png",
    vaultSafe: "/art/generated/phew-vault-safe.png",
    lock: "/art/generated/phew-lock.png",
    unlock: "/art/generated/phew-unlock.png",
    proofRing: "/art/generated/phew-proof-ring.png",
    reserveVault: "/art/generated/phew-reserve-vault.png",
    xpBadge: "/art/generated/phew-xp-badge.png",
    rewardBurst: "/art/generated/phew-reward-burst.png",
    raidFlag: "/art/generated/phew-raid-flag.png",
    raidProofBadge: "/art/generated/phew-raid-proof-badge.png"
  },
  banner: "/banner.png",
  vaultHero: "/hero/phew-hero-mascot.webp",
  emptyVault: "/animations/phew-nft-card.webp",
  actionIcons: "/art/phew-action-icons.png",
  motionCore: "/hero/phew-motion-core.svg",
  launchHero: "/hero/phew-hero-mascot.webp",
  factionMark: "/art/phew-faction-mark.png",
  mintVault: "/hero/phew-hero-mascot.webp",
  emptyVaultPremium: "/art/phew-empty-vault-premium.png",
  tokenObject: "/animations/phew-token-coin.webp",
  tokenStack: "/animations/phew-token-stack.webp",
  nftSlot: "/animations/phew-nft-card.webp",
  vaultSafe: "/animations/phew-vault-safe.webp",
  proofRing: "/animations/phew-proof-ring.webp",
  lockUnlock: "/animations/phew-lock-unlock.webp",
  redeemParticles: "/animations/phew-token-stack.webp",
  energyBeam: "/icons/phew/native-beam.svg",
  errorGlitch: "/animations/phew-error-glitch.webp",
  rewardBurst: "/animations/phew-reward-burst.webp",
  generatedIcons: {
    home: "/icons/phew/generated/phew-icon-home.png",
    collections: "/icons/phew/generated/phew-icon-collections.png",
    mint: "/icons/phew/generated/phew-icon-mint.png",
    stake: "/icons/phew/generated/phew-icon-stake.png",
    unstake: "/icons/phew/generated/phew-icon-unstake.png",
    redeem: "/icons/phew/generated/phew-icon-redeem.png",
    proof: "/icons/phew/generated/phew-icon-proof.png",
    community: "/icons/phew/generated/phew-icon-community.png",
    raid: "/icons/phew/generated/phew-icon-raid.png",
    raidProof: "/icons/phew/generated/phew-icon-raid-proof.png",
    xpReward: "/icons/phew/generated/phew-icon-xp-reward.png",
    marketplace: "/icons/phew/generated/phew-icon-marketplace.png",
    leaderboard: "/icons/phew/generated/phew-icon-leaderboard.png",
    adminRisk: "/icons/phew/generated/phew-icon-admin-risk.png",
    studio: "/icons/phew/generated/phew-icon-studio.png",
    strategy: "/icons/phew/generated/phew-icon-strategy.png"
  },
  pictograms: {
    lockTokens: "/icons/phew/generated/phew-icon-stake.png",
    mintNft: "/icons/phew/generated/phew-icon-mint.png",
    stake: "/icons/phew/generated/phew-icon-stake.png",
    redeem: "/icons/phew/generated/phew-icon-redeem.png",
    proof: "/icons/phew/generated/phew-icon-proof.png",
    reserve: "/icons/phew/generated/phew-icon-home.png",
    strategy: "/icons/phew/generated/phew-icon-strategy.png",
    community: "/icons/phew/generated/phew-icon-community.png",
    raid: "/icons/phew/generated/phew-icon-raid.png"
  },
  raid: {
    flag: "/icons/phew/generated/phew-icon-raid.png",
    room: "/icons/phew/generated/phew-icon-home.png",
    proof: "/icons/phew/generated/phew-icon-raid-proof.png",
    xp: "/icons/phew/generated/phew-icon-xp-reward.png",
    reward: "/icons/phew/generated/phew-icon-xp-reward.png"
  },
  transactionObjects: {
    mint: "/animations/phew-nft-card.webp",
    stake: "/animations/phew-vault-safe.webp",
    unstake: "/animations/phew-lock-unlock.webp",
    redeem: "/animations/phew-token-stack.webp",
    proof: "/animations/phew-proof-ring.webp",
    community: "/animations/phew-vault-safe.webp",
    studio: "/animations/phew-nft-card.webp",
    reward: "/animations/phew-reward-burst.webp",
    scan: "/animations/phew-proof-ring.webp",
    layer: "/animations/phew-token-stack.webp",
    raid: "/icons/phew/native-raid-flag.svg"
  },
  nftVaults: ["/animations/phew-nft-card.webp", "/animations/phew-vault-safe.webp", "/animations/phew-proof-ring.webp"]
} as const;
