import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { isDatabaseSetupError } from "../db/database-errors";
import { PrismaService } from "../db/prisma.service";

type HomeStats = {
  collections: number;
  nfts: number | null;
  raids: number;
  totalVaults: number | null;
  tvlUsd: number | null;
};

class ProductReadTimeoutError extends Error {}

@Injectable()
export class ProductDataService {
  private readonly logger = new Logger(ProductDataService.name);

  constructor(private readonly prisma: PrismaService) {}

  async home() {
    const [collections, raids, activity, stats] = await Promise.all([
      this.safeHomeRead("collections", [], () => this.collections()),
      this.safeHomeRead("raids", [], () => this.raids()),
      this.safeHomeRead("activity", [], () => this.activity()),
      this.safeHomeRead("stats", this.emptyStats(), () => this.stats())
    ]);
    return {
      title: "Phew.run Faction Network",
      subtitle: "Real token-backed vault NFTs, communities, raids, and liquidity tools on Solana.",
      collections: collections.filter((collection) => collection.qualityTier !== "Basic"),
      raids,
      activity,
      stats,
      empty: collections.length === 0 && raids.length === 0 && activity.length === 0
    };
  }

  async collections() {
    return this.safeRead("collections", [], async () => {
      const records = await this.prisma.collection.findMany({
        orderBy: [{ communityLevel: "desc" }, { createdAt: "desc" }],
        include: {
          token: true,
          vaultNfts: { take: 1, orderBy: { createdAt: "desc" } }
        }
      });
      return records.map((collection) => this.collectionDto(collection));
    });
  }

  async collection(idOrSlug: string) {
    return this.safeRead<any>(
      "collection",
      { collection: null, nfts: [], raids: [], listings: [], members: [], activity: [] },
      async () => {
        const collection = await this.prisma.collection.findFirst({
          where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
          include: {
            token: true,
            vaultNfts: { orderBy: { createdAt: "desc" }, take: 12 },
            raidRooms: { orderBy: { createdAt: "desc" }, take: 8, include: { missions: true, participations: true } },
            listings: { where: { status: "ACTIVE" }, take: 12, include: { vaultNft: true } }
          }
        });
        if (!collection) throw new NotFoundException("Collection not found");
        return {
          collection: this.collectionDto(collection),
          nfts: collection.vaultNfts.map((nft) => this.nftDto(nft, collection.id)),
          raids: collection.raidRooms.map((raid) => this.raidDto(raid)),
          listings: collection.listings.map((listing) => this.listingDto(listing)),
          members: await this.members(collection.id),
          activity: await this.activity(collection.id)
        };
      }
    );
  }

  async community(idOrSlug: string) {
    const data = await this.collection(idOrSlug);
    return {
      ...data,
      joinBenefits: ["role assignment", "raid access", "XP progression", "status leaderboard", "vault and staking boosts"],
      identity: {
        theme: data.collection.theme,
        mascot: data.collection.mascot,
        lore: data.collection.description,
        roleNames: data.collection.communityTraits
      }
    };
  }

  async raids(collectionId?: string) {
    return this.safeRead("raids", [], async () => {
      const records = await this.prisma.raidRoom.findMany({
        where: collectionId ? { collectionId } : undefined,
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { missions: true, participations: true, collection: true }
      });
      return records.map((raid) => this.raidDto(raid));
    });
  }

  async raidRoom(collectionId: string, raidId: string) {
    const collection = await this.prisma.collection.findFirst({ where: { OR: [{ id: collectionId }, { slug: collectionId }] } });
    if (!collection) throw new NotFoundException("Collection not found");
    const raid = await this.prisma.raidRoom.findFirst({
      where: { id: raidId, collectionId: collection.id },
      include: { missions: true, participations: { include: { user: true } }, claims: true }
    });
    if (!raid) throw new NotFoundException("Raid room not found");
    return {
      collection: this.collectionDto({ ...collection, token: undefined }),
      raid: this.raidDto(raid),
      missions: raid.missions.map((mission) => ({
        id: mission.id,
        title: mission.title,
        type: mission.type,
        progress: 0,
        target: mission.targetValue,
        xp: mission.xpReward,
        rewardSol: Number(mission.solReward),
        icon: "purple"
      })),
      participants: raid.participations.map((participation) => ({
        id: participation.userId,
        name: participation.user.username ?? participation.user.walletAddress.slice(0, 6),
        avatar: participation.user.avatarUrl ?? "/art/frog-vault.png",
        role: "Raider",
        xp: participation.xpEarned,
        vaults: 0,
        rank: `#${participation.contribution}`
      })),
      claims: raid.claims
    };
  }

  async marketplace() {
    return this.safeRead("marketplace", { collections: [], nfts: [], listings: [], sales: [], stats: this.emptyStats() }, async () => {
      const [collections, nfts, listings, sales] = await Promise.all([
        this.collections(),
        this.vaultNfts(),
        this.prisma.listing.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 40, include: { vaultNft: true, collection: true } }),
        this.prisma.sale.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { vaultNft: true } })
      ]);
      return {
        collections,
        nfts,
        listings: listings.map((listing) => this.listingDto(listing)),
        sales,
        stats: await this.stats()
      };
    });
  }

  async staking(walletAddress?: string) {
    return this.safeRead("staking", { walletRequired: true, walletAddress, positions: [] }, async () => {
      const user = walletAddress ? await this.prisma.user.findUnique({ where: { walletAddress } }) : null;
      const positions = user
        ? await this.prisma.stakingPosition.findMany({ where: { userId: user.id }, include: { vaultNft: true, collection: true }, orderBy: { stakedAt: "desc" } })
        : [];
      return { walletRequired: true, walletAddress, positions };
    });
  }

  async profile(walletAddress?: string) {
    if (!walletAddress) return { walletRequired: true, user: null, nfts: [], raids: [], activity: [] };
    return this.safeRead("profile", { walletRequired: true, user: null, nfts: [], raids: [], activity: [] }, async () => {
      const user = await this.prisma.user.findUnique({
        where: { walletAddress },
        include: { vaultNfts: true, raidParticipations: true, xpLogs: { orderBy: { createdAt: "desc" }, take: 20 } }
      });
      if (!user) return { walletRequired: true, user: null, nfts: [], raids: [], activity: [] };
      return {
        walletRequired: true,
        user,
        nfts: user.vaultNfts.map((nft) => this.nftDto(nft, nft.collectionId)),
        raids: user.raidParticipations,
        activity: user.xpLogs
      };
    });
  }

  async vaultNfts() {
    return this.safeRead("vault NFTs", [], async () => {
      const records = await this.prisma.vaultNFT.findMany({ orderBy: { createdAt: "desc" }, take: 80, include: { collection: true } });
      return records.map((nft) => this.nftDto(nft, nft.collectionId));
    });
  }

  async nft(idOrMint: string) {
    return this.safeRead<any>("vault NFT", { nft: null, collection: null, listings: [], mintTransaction: null, redeemTransactions: [] }, async () => {
      const nft = await this.prisma.vaultNFT.findFirst({
        where: { OR: [{ id: idOrMint }, { mint: idOrMint }] },
        include: { collection: { include: { token: true } }, listings: { where: { status: "ACTIVE" } }, mintTransaction: true, redeemTransactions: true }
      });
      if (!nft) throw new NotFoundException("Vault NFT not found");
      return {
        nft: this.nftDto(nft, nft.collectionId),
        collection: this.collectionDto(nft.collection),
        listings: nft.listings,
        mintTransaction: nft.mintTransaction,
        redeemTransactions: nft.redeemTransactions
      };
    });
  }

  async adminRisk() {
    return this.safeRead("risk dashboard", { collections: [], snapshots: [] }, async () => {
      const collections = await this.collections();
      const snapshots = await this.prisma.riskScoreSnapshot.findMany({ orderBy: { createdAt: "desc" }, take: 25, include: { token: true } });
      return { collections, snapshots };
    });
  }

  async instantSell(walletAddress?: string) {
    return this.safeRead("instant sell", { walletRequired: true, walletAddress, quotes: [] }, async () => ({
      walletRequired: true,
      walletAddress,
      quotes: walletAddress ? await this.prisma.instantSellQuote.findMany({ where: { walletAddress }, orderBy: { createdAt: "desc" }, take: 20 }) : []
    }));
  }

  private async stats(): Promise<HomeStats> {
    const [collections, nfts, raids] = await Promise.all([this.prisma.collection.count(), this.prisma.vaultNFT.count(), this.prisma.raidRoom.count()]);
    return { collections, nfts, raids, totalVaults: nfts, tvlUsd: null };
  }

  private emptyStats(): HomeStats {
    return { collections: 0, nfts: null, raids: 0, totalVaults: null, tvlUsd: null };
  }

  private async safeHomeRead<T>(label: string, fallback: T, read: () => Promise<T>) {
    try {
      return await this.withReadTimeout(read());
    } catch (error) {
      this.logger.warn(`Home ${label} read failed; returning empty ${label} state. ${this.safeErrorMessage(error)}`);
      return fallback;
    }
  }

  private async safeRead<T>(label: string, fallback: T, read: () => Promise<T>) {
    try {
      return await this.withReadTimeout(read());
    } catch (error) {
      if (!isDatabaseSetupError(error) && !(error instanceof ProductReadTimeoutError)) throw error;
      this.logger.warn(`Product ${label} read skipped. ${this.safeErrorMessage(error)}`);
      return fallback;
    }
  }

  private withReadTimeout<T>(read: Promise<T>) {
    return Promise.race([
      read,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new ProductReadTimeoutError("Database read timed out; returning empty public state.")), 2500);
      })
    ]);
  }

  private async members(collectionId: string) {
    const owners = await this.prisma.vaultNFT.findMany({
      where: { collectionId, ownerUserId: { not: null } },
      distinct: ["ownerUserId"],
      take: 10,
      include: { owner: true }
    });
    return owners.map((nft, index) => ({
      id: nft.ownerUserId,
      name: nft.owner?.username ?? nft.owner?.walletAddress.slice(0, 6) ?? "Vault Raider",
      avatar: nft.owner?.avatarUrl ?? nft.imageUri,
      role: index === 0 ? "Whale" : "Raider",
      xp: nft.owner?.xp ?? 0,
      vaults: 1,
      rank: `#${index + 1}`
    }));
  }

  private async activity(collectionId?: string) {
    const logs = await this.prisma.xPLog.findMany({
      where: collectionId ? { collectionId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: true }
    });
    return logs.map((log) => ({
      id: log.id,
      collectionId: log.collectionId,
      actor: log.user?.username ?? log.user?.walletAddress.slice(0, 6) ?? "Phew.run",
      avatar: log.user?.avatarUrl ?? "/art/frog-vault.png",
      role: log.source,
      action: log.reason,
      xp: log.amount,
      time: log.createdAt.toISOString(),
      reaction: "fire"
    }));
  }

  private collectionDto(collection: any) {
    const token = collection.token ?? {};
    const palette = this.array(collection.colorPalette, ["#7cff00", "#16d7d2", "#031017"]);
    const riskScore = Number(token.riskScore ?? 0);
    const level = collection.communityLevel ?? 1;
    const xp = collection.communityXp ?? 0;
    return {
      id: collection.slug ?? collection.id,
      dbId: collection.id,
      symbol: token.symbol ?? collection.name?.split(" ")[0] ?? "PHEW",
      name: collection.name,
      subtitle: collection.theme,
      tokenMint: token.mint ?? "",
      description: collection.lore ?? collection.vibe ?? collection.theme,
      image: collection.logoUri ?? "/art/frog-vault.png",
      banner: collection.bannerUri ?? "/art/hero-frog.png",
      mascot: collection.mascot,
      theme: collection.theme,
      vibe: collection.vibe,
      chain: "Solana",
      category: "Community Vault",
      floorSol: Number(collection.floorPriceSol ?? 0),
      volume24hSol: Number(collection.volume24hSol ?? 0),
      volumeSol: Number(collection.volume24hSol ?? 0),
      holders: Number(token.holders ?? 0),
      vaults: collection.vaultNfts?.length ?? 0,
      minted: collection.vaultNfts?.length ?? 0,
      supply: 10000,
      level,
      xp,
      nextXp: Math.max(150000, (level + 1) * 50000),
      apy: 0,
      online: 0,
      riskScore,
      riskTier: riskScore >= 75 ? "SAFE" : riskScore >= 60 ? "MEDIUM" : "HIGH RISK",
      qualityTier: collection.identityLockedAt ? "Premium" : "Basic",
      instantSellEnabled: !collection.instantSellDisabled && !collection.emergencyFlag && riskScore >= 60,
      palette,
      mascotType: this.mascotType(collection.mascot),
      silhouette: collection.theme ?? "collection identity",
      activeUsers24h: 0,
      raidSuccessRate: 0,
      averageHoldDays: 0,
      communityTraits: this.array(collection.roleNames, ["Raider", "OG", "Whale"]),
      legendaryTrait: "Legendary Vault Relic",
      traitLayers: {
        base: ["Approved Base Variant"],
        headgear: ["Locked Headgear Pack"],
        eyes: ["Identity Eyes"],
        aura: ["Vault Aura"],
        accessory: ["Community Relic"],
        background: ["Collection World"]
      },
      styleProfile: {
        artStyle: collection.vibe,
        shapeLanguage: "approved identity",
        visualFx: [],
        baseVariantCount: 0,
        microRandomization: "enabled",
        colorSystem: this.collectionColorSystem(palette)
      },
      nextUnlocks: this.array(collection.unlockedTraits, ["Level trait pack"])
    };
  }

  private nftDto(nft: any, collectionId: string) {
    const traits = this.record(nft.traits);
    const backingSol = Number(nft.amount ?? 0) / 1_000_000_000;
    return {
      id: nft.id,
      collectionId,
      name: traits.name ?? nft.tier ?? "Vault NFT",
      number: Number(nft.id?.replace(/\D/g, "").slice(0, 4) || 0),
      image: nft.imageUri,
      priceSol: backingSol,
      backingUsd: backingSol * 150,
      backingSol,
      lockedAmount: nft.amount?.toString() ?? "0",
      duration: `${nft.lockDurationDays} Days`,
      tier: nft.tier,
      status: nft.status === "REDEEMABLE" ? "Redeemable" : nft.status === "STAKED" ? "Staked" : "Locked",
      rarity: traits.rarity ?? "Rare",
      apy: 0,
      unlockDate: nft.unlocksAt?.toISOString?.() ?? "",
      role: traits.role ?? nft.tier,
      rank: traits.rank ?? "Vault Raider",
      aura: traits.aura ?? "Vault Aura",
      background: traits.background ?? "Vault World",
      badges: ["Backed", "Vault"],
      metadataUri: nft.metadataUri,
      mint: nft.mint
    };
  }

  private raidDto(raid: any) {
    const target = raid.xpTarget || 1;
    return {
      id: raid.id,
      collectionId: raid.collectionId,
      name: raid.name,
      boss: raid.bossName ?? "Raid Boss",
      status: raid.status === "LIVE" ? "Live" : "Upcoming",
      progress: Math.min(100, Math.round((raid.currentXp / target) * 100)),
      participants: raid.participations?.length ?? 0,
      capacity: raid.capacity,
      rewardSol: Number(raid.rewardPoolSol ?? 0),
      endsIn: raid.endsAt?.toISOString?.() ?? "",
      startsIn: raid.startsAt?.toISOString?.() ?? "",
      missionCount: raid.missions?.length ?? 0
    };
  }

  private listingDto(listing: any) {
    return {
      id: listing.id,
      vaultNftId: listing.vaultNftId,
      collectionId: listing.collectionId,
      priceSol: Number(listing.priceSol),
      backingValueSol: Number(listing.backingValueSol),
      premiumBps: listing.premiumBps,
      riskTier: listing.riskTier,
      status: listing.status,
      unlocksAt: listing.unlocksAtSnapshot?.toISOString?.() ?? listing.vaultNft?.unlocksAt?.toISOString?.()
    };
  }

  private array(value: unknown, fallback: string[]) {
    return Array.isArray(value) ? value.map(String) : fallback;
  }

  private record(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private mascotType(value: string) {
    if (/dog/i.test(value)) return "dog";
    if (/cat/i.test(value)) return "cat";
    if (/alien/i.test(value)) return "alien";
    if (/samurai/i.test(value)) return "samurai";
    return "frog";
  }

  private collectionColorSystem(palette: string[]) {
    const [primary = "#7cff00", secondary = "#16d7d2", accent = "#f4c542"] = palette;
    return {
      primaryColors: [primary],
      secondaryColors: [secondary],
      accentColors: [accent],
      neutralSupportColors: ["#031017", "#0f172a", "#e5f7f5"],
      glowLightColors: [primary, secondary],
      backgroundColors: ["#031017", "#07131b"],
      forbiddenColorCombinations: ["Do not flatten this collection into the global Phew.run platform palette."]
    };
  }

  private safeErrorMessage(error: unknown) {
    if (!(error instanceof Error)) return "Unknown error";
    return error.message.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? error.name;
  }
}
