"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Boxes,
  Crown,
  Gem,
  LockKeyhole,
  Search,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Trophy,
  UserPlus,
  Users,
  WalletCards,
  Zap
} from "lucide-react";
import { useWalletDisplay } from "@/hooks/useWalletDisplay";
import { useApiResource } from "@/hooks/useApiResource";
import type { VaultCollection, VaultNft, RaidRoom } from "@/lib/types";
import { AppShell } from "./AppShell";
import { CollectionCard } from "./CollectionCard";
import { EmptyState, ErrorState, FounderStatusPanel, LoadingState, SetupWarning, WalletDisconnectedState } from "./ApiState";
import { MarketplaceGrid } from "./MarketplaceGrid";
import { RaidCard } from "./RaidCard";
import { SectionCard } from "./SectionCard";
import { StatCard } from "./StatCard";
import { NFTCard } from "./NFTCard";
import { apiWarnings, unwrapApiData } from "@/lib/api";
import { ProgressBar } from "./ProgressBar";
import { StatusPill } from "./StatusPill";
import { ChestOpenAnimation, LegendaryRevealAnimation, RewardBurstAnimation, StakeAnimation, VaultLockAnimation } from "./animations";

type ProductData = {
  title?: string;
  subtitle?: string;
  collections?: VaultCollection[];
  collection?: VaultCollection;
  nfts?: VaultNft[];
  raids?: RaidRoom[];
  stats?: Record<string, number | null>;
  walletRequired?: boolean;
  walletAddress?: string;
  positions?: unknown[];
  listings?: unknown[];
  quotes?: unknown[];
  snapshots?: unknown[];
  poolConfigured?: boolean;
  founderOnly?: boolean;
  activity?: unknown[];
  user?: unknown;
};

export function ProductDataPage({ active, title, endpoint, walletRequired, children }: { active: string; title: string; endpoint: string; walletRequired?: boolean; children?: (data: ProductData) => React.ReactNode }) {
  const wallet = useWalletDisplay();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("level");
  const blockedByWallet = Boolean(walletRequired && !wallet.connected);
  const walletPath = wallet.address ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}wallet=${encodeURIComponent(wallet.address)}` : endpoint;
  const state = useApiResource<ProductData | VaultCollection[] | VaultNft[] | RaidRoom[]>(walletPath);
  const capabilityState = useApiResource<{ mode: string; capabilities: Record<string, boolean>; warnings: string[] }>("/system/capabilities");
  const data = normalizeProductData(endpoint, state.data);
  const warnings = apiWarnings(state.data);
  const visibleCollections = useMemo(() => {
    const collections = data?.collections ?? (data?.collection ? [data.collection] : []);
    const filtered = collections.filter((collection) => {
      const text = `${collection.name} ${collection.symbol} ${collection.theme} ${collection.mascot}`.toLowerCase();
      const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase());
      const matchesFilter = filter === "all" || collection.qualityTier.toLowerCase().includes(filter) || collection.riskTier.toLowerCase().includes(filter);
      return matchesQuery && matchesFilter;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "vaults") return b.vaults - a.vaults;
      if (sort === "risk") return b.riskScore - a.riskScore;
      return b.level - a.level;
    });
  }, [data, filter, query, sort]);

  return (
    <AppShell active={active} stats={data?.stats}>
      <div className="space-y-5">
        {active === "home" ? <FounderStatusPanel status={capabilityState.data} /> : null}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-vault-purple">API-backed</p>
            <h1 className="mt-2 text-4xl font-black">{title}</h1>
            <p className="mt-2 max-w-3xl text-slate-400">{data?.subtitle ?? "Real token-backed vault NFTs, communities, raids, and liquidity tools on Solana."}</p>
          </div>
          <Link href="/create-collection" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-vault-purple px-5 text-sm font-bold shadow-glow">
            <UserPlus className="size-4" /> Create Community
          </Link>
        </div>

        {blockedByWallet ? <WalletDisconnectedState /> : null}
        <SetupWarning warnings={warnings} />
        {!blockedByWallet && state.loading ? <LoadingState /> : null}
        {!blockedByWallet && state.error ? <ErrorState error={state.error} retry={state.reload} /> : null}
        {!blockedByWallet && !state.loading && !state.error && data
          ? children
            ? children(data)
            : renderProductView(endpoint, data, { query, setQuery, filter, setFilter, sort, setSort, visibleCollections, walletConnected: wallet.connected, walletAddress: wallet.address })
          : null}
      </div>
    </AppShell>
  );
}

export function DefaultProductView({ data }: { data: ProductData }) {
  const collections = data.collections ?? (data.collection ? [data.collection] : []);
  const nfts = data.nfts ?? [];
  const raids = data.raids ?? [];

  if (!collections.length && !nfts.length && !raids.length && !data.stats) {
    return <EmptyState title="No communities yet" body="Create and approve a community, launch it, then mint a vault NFT to populate this page from the API." action={<Link href="/create-collection" className="inline-flex h-11 items-center justify-center rounded-lg bg-vault-purple px-5 text-sm font-bold">Start Create Community</Link>} />;
  }

  return (
    <div className="space-y-5">
      {data.stats ? (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard icon={Shield} label="Collections" value={String(data.stats.collections ?? collections.length)} />
          <StatCard icon={LockKeyhole} label="Vault NFTs" value={String(data.stats.nfts ?? nfts.length)} accent="green" />
          <StatCard icon={Swords} label="Raids" value={String(data.stats.raids ?? raids.length)} accent="purple" />
        </div>
      ) : null}

      {collections.length ? (
        <SectionCard title="Collections">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {collections.map((collection) => <CollectionCard key={collection.id} collection={collection} />)}
          </div>
        </SectionCard>
      ) : null}

      {nfts.length ? (
        <SectionCard title="Vault NFTs">
          <MarketplaceGrid items={nfts} collections={collections} />
        </SectionCard>
      ) : null}

      {raids.length ? (
        <SectionCard title="Raid Rooms">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {raids.map((raid) => <RaidCard key={raid.id} raid={raid} collection={collections.find((collection) => collection.id === raid.collectionId || collection.dbId === raid.collectionId) ?? collections[0]} />)}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Next Action">
        <div className="grid gap-3 md:grid-cols-3">
          <Link href="/create-collection" className="rounded-lg border border-vault-line bg-black/25 p-4 font-bold">Create community <ArrowRight className="mt-3 size-4 text-vault-purple" /></Link>
          <Link href="/mint" className="rounded-lg border border-vault-line bg-black/25 p-4 font-bold">Mint Vault NFT <ArrowRight className="mt-3 size-4 text-vault-green" /></Link>
          <Link href="/raids" className="rounded-lg border border-vault-line bg-black/25 p-4 font-bold">Open raids <ArrowRight className="mt-3 size-4 text-vault-gold" /></Link>
        </div>
      </SectionCard>
    </div>
  );
}

function renderProductView(
  endpoint: string,
  data: ProductData,
  controls: {
    query: string;
    setQuery: (value: string) => void;
    filter: string;
    setFilter: (value: string) => void;
    sort: string;
    setSort: (value: string) => void;
    visibleCollections: VaultCollection[];
    walletConnected: boolean;
    walletAddress?: string | null;
  }
) {
  if (endpoint.includes("/collections/") && !endpoint.includes("/raids")) return <CollectionDetailView data={data} />;
  if (endpoint.includes("/collections")) return <CollectionsView data={data} controls={controls} />;
  if (endpoint.includes("/marketplace")) return <MarketplaceView data={data} />;
  if (endpoint.includes("/raids")) return <RaidsView data={data} />;
  if (endpoint.includes("/staking")) return <StakingView data={data} />;
  if (endpoint.includes("/profile")) return <ProfileView data={data} walletAddress={controls.walletAddress} />;
  if (endpoint.includes("/instant-sell")) return <InstantSellView data={data} />;
  if (endpoint.includes("/admin/risk")) return <RiskAdminView data={data} />;
  if (endpoint.includes("/home")) return <HomeDashboardView data={data} />;
  return <DefaultProductView data={data} />;
}

function HomeDashboardView({ data }: { data: ProductData }) {
  const collections = data.collections ?? [];
  const raids = data.raids ?? [];
  const stats = data.stats ?? {};
  return (
    <div className="space-y-5">
      <section className="glass relative overflow-hidden rounded-lg p-6">
        <div className="absolute inset-0 grid-mask opacity-40" />
        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <StatusPill accent="green">Founder mode</StatusPill>
            <h2 className="mt-4 max-w-3xl text-5xl font-black leading-tight">Command center for token-backed gaming communities.</h2>
            <p className="mt-4 max-w-2xl text-slate-300">Monitor launched communities, vault supply, raids, and setup readiness without showing invented production numbers.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <HeroAction href="/mint" icon={LockKeyhole} title="Mint Vault" body="Lock a token position into a vault NFT." />
              <HeroAction href="/raids" icon={Swords} title="Join Raids" body="Coordinate faction activity and rewards." />
              <HeroAction href="/staking" icon={Sparkles} title="Stake NFTs" body="Activate reward hooks when configured." />
            </div>
          </div>
          <LegendaryRevealAnimation rarity="Legendary" label="Legendary reveal" />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Boxes} label="Communities" value={formatMetric(stats.collections)} />
        <StatCard icon={LockKeyhole} label="Vault NFTs" value={formatMetric(stats.nfts)} accent="green" />
        <StatCard icon={Swords} label="Raids" value={formatMetric(stats.raids)} accent="cyan" />
        <StatCard icon={BadgeDollarSign} label="TVL" value={formatCurrency(stats.tvlUsd)} accent="gold" />
      </div>

      {collections.length ? (
        <SectionCard title="Top Communities" action={<Link href="/collections" className="text-sm font-bold text-vault-green">View all</Link>}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {collections.slice(0, 4).map((collection) => <CollectionCard key={collection.id} collection={collection} />)}
          </div>
        </SectionCard>
      ) : (
        <EmptyState title="No launched communities yet" body="Create a community preview, connect the required providers, then launch a real collection before this dashboard shows community cards." action={<Link href="/create-collection" className="inline-flex h-11 items-center justify-center rounded-lg bg-vault-green px-5 text-sm font-bold text-black">Create Community</Link>} />
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <SectionCard title="Raid Feed">
          {raids.length ? (
            <div className="grid gap-3">
              {raids.slice(0, 3).map((raid) => <RaidCard key={raid.id} raid={raid} collection={collections.find((collection) => collection.id === raid.collectionId || collection.dbId === raid.collectionId) ?? collections[0]} />)}
            </div>
          ) : (
            <EmptyBlock title="No raid rooms active" body="Raid cards appear after a launched collection creates live or scheduled raids." />
          )}
        </SectionCard>
        <SectionCard title="Action Animation Hooks">
          <div className="grid gap-3">
            <ChestOpenAnimation rarity="Epic" label="Chest open" />
            <RewardBurstAnimation rarity="Rare" label="Reward claim" />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function CollectionsView({ controls }: { data: ProductData; controls: { query: string; setQuery: (value: string) => void; filter: string; setFilter: (value: string) => void; sort: string; setSort: (value: string) => void; visibleCollections: VaultCollection[] } }) {
  return (
    <div className="space-y-5">
      <SectionCard>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input value={controls.query} onChange={(event) => controls.setQuery(event.target.value)} className="h-12 w-full rounded-lg border border-vault-line bg-black/25 pl-11 pr-4 text-sm outline-none focus:border-vault-purple" placeholder="Search communities" />
          </label>
          <label className="relative block">
            <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <select value={controls.filter} onChange={(event) => controls.setFilter(event.target.value)} className="h-12 w-full rounded-lg border border-vault-line bg-black/25 pl-11 pr-4 text-sm outline-none focus:border-vault-purple">
              <option value="all">All tiers</option>
              <option value="premium">Premium</option>
              <option value="legendary">Legendary-ready</option>
              <option value="safe">Safe risk</option>
            </select>
          </label>
          <select value={controls.sort} onChange={(event) => controls.setSort(event.target.value)} className="h-12 rounded-lg border border-vault-line bg-black/25 px-4 text-sm outline-none focus:border-vault-purple">
            <option value="level">Sort: Level</option>
            <option value="vaults">Sort: Vaults</option>
            <option value="risk">Sort: Risk</option>
          </select>
        </div>
      </SectionCard>

      {controls.visibleCollections.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          {controls.visibleCollections.map((collection) => <CollectionCard key={collection.id} collection={collection} />)}
        </div>
      ) : (
        <EmptyState title="No matching communities" body="No launched community matches the current search and filter. Clear filters or create the first real community." action={<Link href="/create-collection" className="inline-flex h-11 items-center justify-center rounded-lg bg-vault-green px-5 text-sm font-bold text-black">Create Community</Link>} />
      )}
    </div>
  );
}

function CollectionDetailView({ data }: { data: ProductData }) {
  const collection = data.collection;
  const nfts = data.nfts ?? [];
  const raids = data.raids ?? [];
  if (!collection) return <EmptyState title="Collection unavailable" body="This collection was not found, or the database is not available. Public reads return a safe empty state." />;
  return (
    <div className="space-y-5">
      <section className="glass relative overflow-hidden rounded-lg">
        <img src={collection.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-vault-ink via-vault-ink/90 to-vault-ink/20" />
        <div className="relative grid gap-5 p-6 xl:grid-cols-[180px_minmax(0,1fr)_360px]">
          <img src={collection.image} alt={collection.name} className="aspect-square rounded-lg border border-vault-green/40 object-cover shadow-green" />
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusPill accent="green">{collection.symbol}</StatusPill>
              <StatusPill accent={collection.qualityTier === "Basic" ? "gold" : "cyan"}>{collection.qualityTier}</StatusPill>
              <StatusPill accent={collection.instantSellEnabled ? "green" : "red"}>{collection.instantSellEnabled ? "Instant sell eligible" : "Instant sell gated"}</StatusPill>
            </div>
            <h2 className="mt-4 text-5xl font-black">{collection.name}</h2>
            <p className="mt-3 max-w-3xl text-slate-300">{collection.description}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/mint" className="inline-flex h-11 items-center gap-2 rounded-lg bg-vault-green px-5 text-sm font-bold text-black"><LockKeyhole className="size-4" /> Mint Vault</Link>
              <Link href="/staking" className="inline-flex h-11 items-center gap-2 rounded-lg border border-vault-cyan/50 bg-vault-cyan/10 px-5 text-sm font-bold text-vault-cyan"><Sparkles className="size-4" /> Stake Vault</Link>
              <Link href={`/collections/${collection.id}/raids`} className="inline-flex h-11 items-center gap-2 rounded-lg border border-vault-line bg-black/35 px-5 text-sm font-bold"><Swords className="size-4 text-vault-green" /> Join Raid</Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <MiniStat label="Vaults" value={formatMetric(collection.vaults)} />
            <MiniStat label="Holders" value={formatMetric(collection.holders)} />
            <MiniStat label="Risk score" value={formatMetric(collection.riskScore)} />
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto border-b border-vault-line">
        {["Overview", "Vault NFTs", "Staking", "Raids", "Activity", "Traits"].map((tab, index) => (
          <a key={tab} href={`#${tab.toLowerCase().replace(/\s+/g, "-")}`} className={`px-4 py-3 text-sm font-bold ${index === 0 ? "border-b-2 border-vault-green text-vault-green" : "text-slate-400"}`}>{tab}</a>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <SectionCard id="overview" title="Overview">
            <p className="text-slate-300">{collection.vibe}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <InfoTile icon={Crown} label="Mascot" value={`${collection.mascot} / ${collection.mascotType}`} />
              <InfoTile icon={Gem} label="Legendary Trait" value={collection.legendaryTrait} />
              <InfoTile icon={Trophy} label="Level" value={`Level ${collection.level}`} />
            </div>
          </SectionCard>
          <SectionCard id="vault-nfts" title="Vault NFT Preview">
            {nfts.length ? <MarketplaceGrid items={nfts} collections={[collection]} /> : <EmptyBlock title="No minted vault NFTs" body="Vault NFT cards appear here after confirmed mint transactions." />}
          </SectionCard>
          <SectionCard id="raids" title="Raids">
            {raids.length ? <div className="grid gap-3">{raids.map((raid) => <RaidCard key={raid.id} raid={raid} collection={collection} />)}</div> : <EmptyBlock title="No raid rooms yet" body="Raid rooms will appear after this community schedules them." />}
          </SectionCard>
        </div>
        <aside className="space-y-5">
          <SectionCard id="traits" title="Trait Language">
            <div className="space-y-3">
              {Object.entries(collection.traitLayers).map(([category, values]) => (
                <div key={category} className="rounded-lg border border-vault-line bg-black/25 p-3">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="capitalize text-slate-400">{category}</span>
                    <span className="font-bold text-vault-green">{values.length}</span>
                  </div>
                  <p className="mt-2 text-sm text-white">{values.slice(0, 2).join(", ")}</p>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Staking Chamber">
            <StakeAnimation rarity="Epic" label="Stake preview" />
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

function MarketplaceView({ data }: { data: ProductData }) {
  const collections = data.collections ?? [];
  const nfts = data.nfts ?? [];
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={WalletCards} label="Active listings" value={formatMetric((data.listings ?? []).length || nfts.length)} />
        <StatCard icon={Shield} label="Backed inventory" value={formatMetric(nfts.length)} accent="green" />
        <StatCard icon={AlertTriangle} label="Displayed prices" value="Live data only" accent="gold" />
      </div>
      {nfts.length ? <MarketplaceGrid items={nfts} collections={collections} /> : <EmptyState title="No marketplace listings" body="Listings appear only after real active listings or vault NFTs are returned by the API. No production prices are invented." />}
    </div>
  );
}

function RaidsView({ data }: { data: ProductData }) {
  const collections = data.collections ?? [];
  const raids = data.raids ?? [];
  const live = raids.filter((raid) => raid.status === "Live");
  const upcoming = raids.filter((raid) => raid.status !== "Live");
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <div className="flex gap-2 border-b border-vault-line">
          {["Active", "Upcoming", "Finished"].map((tab, index) => <span key={tab} className={`px-4 py-3 text-sm font-bold ${index === 0 ? "border-b-2 border-vault-green text-vault-green" : "text-slate-400"}`}>{tab}</span>)}
        </div>
        <SectionCard title="Active Raids">
          {live.length ? <div className="grid gap-3">{live.map((raid) => <RaidCard key={raid.id} raid={raid} collection={collections.find((collection) => collection.id === raid.collectionId || collection.dbId === raid.collectionId) ?? collections[0]} />)}</div> : <EmptyBlock title="No active raids" body="Live raid cards appear after a collection opens a raid room." />}
        </SectionCard>
        <SectionCard title="Upcoming Raids">
          {upcoming.length ? <div className="grid gap-3">{upcoming.map((raid) => <RaidCard key={raid.id} raid={raid} collection={collections.find((collection) => collection.id === raid.collectionId || collection.dbId === raid.collectionId) ?? collections[0]} />)}</div> : <EmptyBlock title="No scheduled raids" body="Upcoming raid cards appear from the raid engine API." />}
        </SectionCard>
      </div>
      <aside className="space-y-5">
        <SectionCard title="Reward Panel">
          <RewardBurstAnimation rarity="Legendary" label="Raid rewards" />
          <p className="mt-4 text-sm text-slate-300">Reward values are shown only when configured by a real raid room.</p>
        </SectionCard>
      </aside>
    </div>
  );
}

function StakingView({ data }: { data: ProductData }) {
  const positions = data.positions ?? [];
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard icon={LockKeyhole} label="Staked vaults" value={formatMetric(positions.length)} />
          <StatCard icon={Sparkles} label="Pending rewards" value="From API only" accent="green" />
          <StatCard icon={Shield} label="APY" value="Not configured" accent="gold" />
        </div>
        <SectionCard title="My Staked Vaults">
          {positions.length ? <pre className="max-h-96 overflow-auto rounded-lg border border-vault-line bg-black/35 p-4 text-xs text-slate-300">{JSON.stringify(positions, null, 2)}</pre> : <EmptyBlock title="No staked vaults" body="Stake a confirmed vault NFT before reward rows appear. APY is hidden until configured by real staking data." />}
        </SectionCard>
      </div>
      <SectionCard title="Stake Animation">
        <VaultLockAnimation rarity="Epic" label="Vault seals" />
      </SectionCard>
    </div>
  );
}

function ProfileView({ data, walletAddress }: { data: ProductData; walletAddress?: string | null }) {
  const nfts = data.nfts ?? [];
  return (
    <div className="space-y-5">
      <SectionCard title="Wallet Profile">
        <div className="grid gap-4 md:grid-cols-3">
          <MiniStat label="Connected wallet" value={walletAddress ?? "Disconnected"} />
          <MiniStat label="Owned vaults" value={formatMetric(nfts.length)} />
          <MiniStat label="Activity rows" value={formatMetric((data.activity ?? []).length)} />
        </div>
      </SectionCard>
      <SectionCard title="Owned Vaults">
        {nfts.length && data.collections?.length ? <MarketplaceGrid items={nfts} collections={data.collections} /> : <EmptyBlock title="No owned vaults" body="Owned vault NFTs appear only after a connected wallet has confirmed vault ownership." />}
      </SectionCard>
    </div>
  );
}

function InstantSellView({ data }: { data: ProductData }) {
  const quotes = data.quotes ?? [];
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <SectionCard title="Quote Console">
        <div className="rounded-lg border border-vault-gold/40 bg-vault-gold/10 p-4 text-sm text-slate-200">
          <div className="flex gap-3">
            <AlertTriangle className="size-5 shrink-0 text-vault-gold" />
            <p>{data.poolConfigured ? "Instant sell pool is configured. Quotes still depend on eligible vault inventory and live liquidity." : "Instant sell liquidity pool is unavailable. Quote writes are blocked until real liquidity is configured."}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input className="h-12 rounded-lg border border-vault-line bg-black/25 px-4 text-sm outline-none focus:border-vault-purple" placeholder="Vault NFT mint" />
          <button className="h-12 rounded-lg border border-vault-line bg-black/25 font-bold text-slate-400" disabled>Request quote</button>
        </div>
        {quotes.length ? <pre className="mt-4 max-h-80 overflow-auto rounded-lg border border-vault-line bg-black/35 p-4 text-xs text-slate-300">{JSON.stringify(quotes, null, 2)}</pre> : <EmptyBlock title="No quotes" body="Quotes appear only after real pool-backed quote requests." />}
      </SectionCard>
      <SectionCard title="Risk Discount">
        <Zap className="mb-4 size-8 text-vault-green" />
        <p className="text-sm text-slate-300">Discounts must come from liquidity, backing, unlock date, and risk-tier data. This panel will not show invented liquidity.</p>
      </SectionCard>
    </div>
  );
}

function RiskAdminView({ data }: { data: ProductData }) {
  const collections = data.collections ?? [];
  return (
    <div className="space-y-5">
      <SectionCard title="Founder/Admin Gate">
        <div className="flex items-start gap-3 rounded-lg border border-vault-gold/40 bg-vault-gold/10 p-4 text-sm text-slate-200">
          <ShieldAlert className="size-5 text-vault-gold" />
          <p>This view is founder/admin oriented. Public mode only shows safe read data and setup blockers.</p>
        </div>
      </SectionCard>
      <SectionCard title="Collection Eligibility">
        {collections.length ? (
          <div className="grid gap-3">
            {collections.map((collection) => (
              <div key={collection.id} className="rounded-lg border border-vault-line bg-black/25 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">{collection.name}</p>
                    <p className="text-sm text-slate-400">{collection.tokenMint || "Mint unavailable"}</p>
                  </div>
                  <StatusPill accent={collection.instantSellEnabled ? "green" : "gold"}>{collection.instantSellEnabled ? "Eligible" : "Gated"}</StatusPill>
                </div>
                <div className="mt-3">
                  <ProgressBar value={collection.riskScore} color={collection.riskScore >= 75 ? "green" : "purple"} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyBlock title="No risk rows" body="Risk tiers appear after collections and risk snapshots are available from the database." />
        )}
      </SectionCard>
    </div>
  );
}

function HeroAction({ href, icon: Icon, title, body }: { href: string; icon: typeof LockKeyhole; title: string; body: string }) {
  return (
    <Link href={href} className="group rounded-lg border border-vault-line bg-black/30 p-4 transition hover:-translate-y-0.5 hover:border-vault-green/60 hover:bg-vault-green/10">
      <Icon className="size-6 text-vault-green transition group-hover:scale-110" />
      <p className="mt-3 font-black">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{body}</p>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-vault-line bg-black/35 p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-2 break-words text-lg font-black text-white">{value}</p>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof Crown; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-vault-line bg-black/25 p-4">
      <Icon className="mb-3 size-6 text-vault-green" />
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

function EmptyBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-vault-line bg-black/25 p-6 text-center">
      <p className="font-black">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">{body}</p>
    </div>
  );
}

function formatMetric(value: unknown) {
  return typeof value === "number" ? value.toLocaleString() : "Not available";
}

function formatCurrency(value: unknown) {
  return typeof value === "number" ? `$${value.toLocaleString()}` : "Not available";
}

function normalizeProductData(endpoint: string, data: ProductData | VaultCollection[] | VaultNft[] | RaidRoom[] | null): ProductData | null {
  const unwrapped = unwrapApiData<ProductData | VaultCollection[] | VaultNft[] | RaidRoom[]>(data);
  if (!unwrapped) return null;
  if (!Array.isArray(unwrapped)) return unwrapped;
  if (endpoint.includes("/raids")) return { raids: unwrapped as RaidRoom[] };
  if (endpoint.includes("/nfts")) return { nfts: unwrapped as VaultNft[] };
  return { collections: unwrapped as VaultCollection[] };
}
