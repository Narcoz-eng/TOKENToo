import { HttpException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { isDatabaseSetupError } from "../db/database-errors";
import { publicEndpointFallback } from "../db/db-safety";
import { PrismaService } from "../db/prisma.service";

type HomeStats = {
  collections: number;
  activeCommunities: number;
  nfts: number | null;
  raids: number;
  totalVaults: number | null;
  tvlUsd: number | null;
  phewsMinted: number | null;
  totalTrades: number;
  volume24hSol: number | null;
  uniqueBuyers: number | null;
};

class ProductReadTimeoutError extends Error {}

@Injectable()
export class ProductDataService {
  private readonly logger = new Logger(ProductDataService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async publicHome() {
    return this.publicRead(() => this.home(), this.emptyHome());
  }

  async publicCollections() {
    return this.publicRead(() => this.collections(), []);
  }

  async publicCollection(idOrSlug: string) {
    return this.publicRead<any>(() => this.collection(idOrSlug), { collection: null, nfts: [], raids: [], listings: [], members: [], activity: [] });
  }

  async publicCommunity(idOrSlug: string) {
    return this.publicRead<any>(() => this.community(idOrSlug), { collection: null, nfts: [], raids: [], listings: [], members: [], activity: [], identity: null, joinBenefits: [] });
  }

  async publicCollectionRaids(idOrSlug: string) {
    const collection = await this.publicRead(() => this.collection(idOrSlug), { collection: null, raids: [] });
    const data = this.unwrapPublic(collection) as { raids?: unknown[] };
    return publicEndpointFallback(data.raids ?? [], collection.warnings ?? []);
  }

  async publicRaidRoom(collectionId: string, raidId: string) {
    return this.publicRead<any>(() => this.raidRoom(collectionId, raidId), { collection: null, raid: null, missions: [], participants: [], claims: [] });
  }

  async publicRaids() {
    return this.publicRead(() => this.raids(), []);
  }

  async publicMarketplace() {
    return this.publicRead(() => this.marketplace(), { collections: [], nfts: [], listings: [], sales: [], stats: this.emptyStats() });
  }

  async publicStaking(walletAddress?: string) {
    return this.publicRead(() => this.staking(walletAddress), { walletRequired: true, walletAddress, positions: [] });
  }

  async publicProfile(walletAddress?: string) {
    return this.publicRead<any>(() => this.profile(walletAddress), { walletRequired: true, walletAddress, user: null, nfts: [], raids: [], activity: [] });
  }

  async publicVaultNfts() {
    return this.publicRead(() => this.vaultNfts(), []);
  }

  async publicNft(idOrMint: string) {
    return this.publicRead(() => this.nft(idOrMint), { nft: null, collection: null, listings: [], mintTransaction: null, redeemTransactions: [] });
  }

  async publicInstantSell(walletAddress?: string) {
    return this.publicRead<any>(() => this.instantSell(walletAddress), { walletRequired: true, walletAddress, quotes: [], poolConfigured: false });
  }

  async publicInstantSellStatus() {
    return this.publicRead(async () => ({ poolConfigured: false, available: false, reason: "Instant sell liquidity pool is not configured." }), { poolConfigured: false, available: false, reason: "Instant sell liquidity pool is not configured." });
  }

  async publicAdminRisk() {
    return this.publicRead<any>(() => this.adminRisk(), { founderOnly: true, collections: [], snapshots: [] });
  }

  async home() {
    const [collections, raids, activity, stats] = await Promise.all([
      this.safeHomeRead("collections", [], () => this.collections()),
      this.safeHomeRead("raids", [], () => this.raids()),
      this.safeHomeRead("activity", [], () => this.activity()),
      this.safeHomeRead("stats", this.emptyStats(), () => this.stats())
    ]);
    return {
      title: "Phew Run Protocol",
      subtitle: "The protocol for token-backed NFTs on Solana.",
      collections: collections.filter((collection) => collection.qualityTier !== "Basic"),
      raids,
      activity,
      recentMints: await this.safeHomeRead("recent mints", [], () => this.recentMints()),
      marketSnapshot: await this.safeHomeRead("market snapshot", this.emptyMarketSnapshot(), () => this.marketSnapshot()),
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
          reserveVault: true,
          vaultNfts: { take: 4, orderBy: { createdAt: "desc" } },
          _count: { select: { vaultNfts: true, sales: true } }
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
            reserveVault: true,
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
        avatar: participation.user.avatarUrl ?? "/art/phew-faction-mark.png",
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
      const records = await this.prisma.vaultNFT.findMany({ orderBy: { createdAt: "desc" }, take: 80, include: { collection: { include: { token: true, reserveVault: true } } } });
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

  private async recentMints() {
    const records = await this.prisma.vaultNFT.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { owner: true, collection: { include: { token: true } } }
    });
    return records.map((nft) => ({
      id: nft.id,
      mint: nft.mint,
      collectionId: nft.collectionId,
      collectionName: nft.collection.name,
      tokenSymbol: nft.collection.token.symbol,
      lockedAmount: nft.amount.toString(),
      owner: nft.owner?.walletAddress ?? null,
      status: nft.status,
      createdAt: nft.createdAt.toISOString()
    }));
  }

  private async marketSnapshot() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [sales, volume, avg, uniqueBuyers] = await Promise.all([
      this.prisma.sale.count({ where: { createdAt: { gte: since } } }),
      this.prisma.sale.aggregate({ _sum: { priceSol: true }, where: { createdAt: { gte: since } } }),
      this.prisma.sale.aggregate({ _avg: { priceSol: true }, where: { createdAt: { gte: since } } }),
      this.prisma.sale.findMany({ distinct: ["buyerUserId"], where: { buyerUserId: { not: null }, createdAt: { gte: since } }, select: { buyerUserId: true } })
    ]);
    return {
      volume24hSol: this.numberOrNull(volume._sum.priceSol),
      sales24h: sales,
      avgPriceSol: this.numberOrNull(avg._avg.priceSol),
      uniqueBuyers: uniqueBuyers.length,
      source: sales > 0 ? "persisted-sales" : "no-sales-yet",
      chart: []
    };
  }

  private async stats(): Promise<HomeStats> {
    const [collections, activeCommunities, nfts, raids, trades, uniqueBuyerRows, volume] = await Promise.all([
      this.prisma.collection.count(),
      this.prisma.collection.count({ where: { status: "ACTIVE", launchStatus: "CONFIRMED" } }),
      this.prisma.vaultNFT.count(),
      this.prisma.raidRoom.count(),
      this.prisma.sale.count(),
      this.prisma.sale.findMany({ distinct: ["buyerUserId"], where: { buyerUserId: { not: null } }, select: { buyerUserId: true } }),
      this.prisma.sale.aggregate({ _sum: { priceSol: true }, where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
    ]);
    return {
      collections,
      activeCommunities,
      nfts,
      raids,
      totalVaults: nfts,
      tvlUsd: null,
      phewsMinted: nfts,
      totalTrades: trades,
      volume24hSol: this.numberOrNull(volume._sum.priceSol),
      uniqueBuyers: uniqueBuyerRows.length
    };
  }

  private emptyStats(): HomeStats {
    return { collections: 0, activeCommunities: 0, nfts: null, raids: 0, totalVaults: null, tvlUsd: null, phewsMinted: null, totalTrades: 0, volume24hSol: null, uniqueBuyers: null };
  }

  private emptyMarketSnapshot() {
    return {
      volume24hSol: null,
      sales24h: 0,
      avgPriceSol: null,
      uniqueBuyers: 0,
      source: "no-sales-yet",
      chart: []
    };
  }

  private emptyHome() {
    return {
      title: "Phew Run Protocol",
      subtitle: "The protocol for token-backed NFTs on Solana.",
      collections: [],
      raids: [],
      activity: [],
      recentMints: [],
      marketSnapshot: this.emptyMarketSnapshot(),
      stats: this.emptyStats(),
      empty: true
    };
  }

  private async publicRead<T>(read: () => Promise<T>, fallback: T) {
    const warnings: string[] = [];
    let data = fallback;
    let databaseAvailable = await this.fastDatabaseCheck();
    try {
      data = await read();
    } catch (error) {
      if (isDatabaseSetupError(error) || error instanceof ProductReadTimeoutError) {
        databaseAvailable = false;
        warnings.push("Database is unavailable; returning a safe empty state.");
      } else if (error instanceof NotFoundException || (error instanceof HttpException && error.getStatus() === 404)) {
        warnings.push(error.message);
      } else {
        this.logger.warn(`Public product read returned fallback. ${this.safeErrorMessage(error)}`);
        warnings.push("The requested public data is unavailable; returning a safe empty state.");
      }
    }
    return {
      ...publicEndpointFallback(data, warnings),
      capabilities: this.publicCapabilities(databaseAvailable)
    };
  }

  private unwrapPublic(value: unknown) {
    if (value && typeof value === "object" && "data" in value) return (value as { data: unknown }).data;
    return value;
  }

  private publicCapabilities(databaseAvailable: boolean) {
    const finalStorageProvider = process.env.FINAL_ASSET_STORAGE_PROVIDER ?? process.env.ASSET_STORAGE_PROVIDER;
    const permanentStorage = finalStorageProvider === "pinata" ? Boolean(process.env.PINATA_JWT) : finalStorageProvider === "supabase" ? Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) : false;
    return {
      databaseAvailable,
      heliusConfigured: Boolean(process.env.HELIUS_API_KEY),
      heliusReachable: Boolean(process.env.HELIUS_API_KEY),
      heliusAvailable: Boolean(process.env.HELIUS_API_KEY),
      openaiImagesAvailable: Boolean(process.env.OPENAI_API_KEY),
      pinataAvailable: Boolean(process.env.PINATA_JWT),
      solanaAvailable: Boolean(process.env.SOLANA_RPC_URL || process.env.ANCHOR_PROVIDER_URL || process.env.PROGRAM_ID),
      walletConfigured: Boolean(process.env.DEVNET_TEST_WALLET_PUBLIC_KEY || process.env.ANCHOR_WALLET),
      devnetProgramConfigured: Boolean(process.env.PROGRAM_ID && process.env.PROGRAM_ID !== "11111111111111111111111111111111"),
      aiGenerationEnabled: (process.env.PAID_AI_GENERATION_ENABLED ?? "false") === "true" && (process.env.DEV_DISABLE_PAID_AI ?? "true") !== "true" && (process.env.ENABLE_AI_IMAGE_GENERATION ?? "false") === "true",
      paidAiGenerationEnabled: (process.env.PAID_AI_GENERATION_ENABLED ?? "false") === "true",
      productionStorageAvailable: permanentStorage,
      tokenMetadataAvailable: permanentStorage && Boolean(process.env.PROGRAM_ID)
    };
  }

  private async fastDatabaseCheck() {
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise<never>((_, reject) => setTimeout(() => reject(new ProductReadTimeoutError("Database capability check timed out.")), 1200))
      ]);
      return true;
    } catch {
      return false;
    }
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
      avatar: log.user?.avatarUrl ?? "/art/phew-faction-mark.png",
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
    const reserve = collection.reserveVault;
    const vaultCount = Number(collection._count?.vaultNfts ?? collection.vaultNfts?.length ?? 0);
    const reserveRatioBps = Number(reserve?.reserveRatioBps ?? (collection.emergencyFlag ? 0 : 10000));
    const reserveHealth = collection.emergencyFlag || reserve?.status === "EMERGENCY" ? "EMERGENCY" : reserve?.status === "INSOLVENT" || reserveRatioBps < 10000 ? "AT_RISK" : reserve?.status === "PAUSED" ? "PAUSED" : "HEALTHY";
    return {
      id: collection.slug ?? collection.id,
      dbId: collection.id,
      symbol: token.symbol ?? collection.name?.split(" ")[0] ?? "PHEW",
      name: collection.name,
      subtitle: collection.theme,
      tokenMint: token.mint ?? "",
      description: collection.lore ?? collection.vibe ?? collection.theme,
      image: collection.logoUri ?? "/art/phew-faction-mark.png",
      banner: collection.bannerUri ?? "/art/phew-launch-hero.png",
      mascot: collection.mascot,
      theme: collection.theme,
      vibe: collection.vibe,
      chain: "Solana",
      category: "Community Vault",
      floorSol: Number(collection.floorPriceSol ?? 0),
      volume24hSol: Number(collection.volume24hSol ?? 0),
      volumeSol: Number(collection.volume24hSol ?? 0),
      holders: Number(token.holders ?? 0),
      vaults: vaultCount,
      minted: vaultCount,
      supply: 10000,
      level,
      xp,
      nextXp: Math.max(150000, (level + 1) * 50000),
      apy: 0,
      online: 0,
      riskScore,
      riskTier: riskScore >= 75 ? "SAFE" : riskScore >= 60 ? "MEDIUM" : "HIGH RISK",
      reserveHealth,
      reserveRatioBps,
      totalLocked: reserve?.totalLocked?.toString?.() ?? "0",
      availableBacking: reserve?.availableBacking?.toString?.() ?? "0",
      totalStaked: reserve?.totalStaked?.toString?.() ?? "0",
      totalRedeemed: reserve?.totalRedeemed?.toString?.() ?? "0",
      reserveVaultPda: reserve?.reserveVaultPda ?? collection.tokenVaultPda ?? null,
      collectionAssetAddress: collection.collectionAssetAddress ?? null,
      launchStatus: collection.launchStatus ?? "DRAFT",
      sales: Number(collection._count?.sales ?? 0),
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

  private numberOrNull(value: unknown) {
    if (value === null || value === undefined) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private record(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private mascotType(value: string) {
    if (/patient|carrier|subject|avatar|mascot|character/i.test(value)) return "symbolic character";
    if (/relic|artifact|object|mask|badge/i.test(value)) return "relic carrier";
    if (/scene|civilization|world|city|district/i.test(value)) return "world actor";
    return "dynamic subject";
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
