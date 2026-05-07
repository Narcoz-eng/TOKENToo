"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
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
import { EmptyState, ErrorState, FounderStatusPanel, LoadingState, SetupWarning, WalletDisconnectedState } from "./ApiState";
import { MarketplaceGrid } from "./MarketplaceGrid";
import { RaidCard } from "./RaidCard";
import { SectionCard } from "./SectionCard";
import { StatCard } from "./StatCard";
import { apiWarnings, unwrapApiData } from "@/lib/api";
import { ProgressBar } from "./ProgressBar";
import { StatusPill } from "./StatusPill";
import { ChestOpenAnimation, LegendaryRevealAnimation, RewardBurstAnimation, StakeAnimation } from "./animations";
import { brandAssets } from "@/lib/brand-assets";
import { ActionCard } from "./ActionCard";
import { CollectionGrid } from "./CollectionGrid";
import { MetricGrid, PageLayout } from "./PageLayout";
import { StakeFlow, UnstakeFlow, ClaimRewardsFlow } from "./StakingFlows";

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
      const matchesFilter =
        filter === "all" ||
        (filter === "live" && collection.vaults > 0) ||
        (filter === "upcoming" && collection.vaults === 0) ||
        (filter === "partnered" && collection.qualityTier !== "Basic") ||
        collection.qualityTier.toLowerCase().includes(filter) ||
        collection.riskTier.toLowerCase().includes(filter);
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
            <p className="text-sm font-black uppercase text-vault-green">PHEW.DEVNET / Faction OS</p>
            <h1 className="mt-2 text-4xl font-black">{title}</h1>
            <p className="mt-2 max-w-3xl text-slate-400">{data?.subtitle ?? "Launch faction vaults, coordinate raids, and reward holders on Solana."}</p>
          </div>
          <Link href="/create-collection" className="phew-button phew-button-primary inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black">
            <UserPlus className="size-4" /> Create Community
          </Link>
        </div>

        {blockedByWallet ? <WalletDisconnectedState /> : null}
        <SetupWarning warnings={warnings} />
        {state.loading ? <LoadingState /> : null}
        {!state.loading && state.error ? <ErrorState error={state.error} retry={state.reload} /> : null}
        {!state.loading && !state.error && !blockedByWallet && data
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
    <PageLayout>
      {data.stats ? (
        <MetricGrid className="md:grid-cols-3">
          <StatCard icon={Shield} label="Collections" value={String(data.stats.collections ?? collections.length)} />
          <StatCard icon={LockKeyhole} label="Vault NFTs" value={String(data.stats.nfts ?? nfts.length)} accent="green" />
          <StatCard icon={Swords} label="Raids" value={String(data.stats.raids ?? raids.length)} accent="purple" />
        </MetricGrid>
      ) : null}

      {collections.length ? (
        <SectionCard title="Collections">
          <CollectionGrid collections={collections} />
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
    </PageLayout>
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
      <section className="phew-panel phew-scanline relative overflow-hidden rounded-lg p-6">
        <img src={brandAssets.vaultHero} alt="" className="absolute inset-y-0 right-0 h-full w-full object-cover opacity-45 mix-blend-screen xl:w-3/5" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020806] via-[#020806]/92 to-[#020806]/28" />
        <div className="absolute inset-0 grid-mask opacity-40" />
        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <StatusPill accent="green">Live on Devnet</StatusPill>
            <h2 className="mt-4 max-w-3xl text-5xl font-black leading-tight">Command center for token-backed gaming communities.</h2>
            <p className="mt-4 max-w-2xl text-slate-300">Launch faction vaults, coordinate raids, and reward holders with Solana-native NFT identity.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <ActionCard href="/mint" icon={LockKeyhole} title="Mint Vault" body="Lock tokens. Mint vault identity." />
              <ActionCard href="/raids" icon={Swords} title="Join Raids" body="Activate faction campaigns." />
              <ActionCard href="/staking" icon={Sparkles} title="Stake NFTs" body="Unlock reward hooks." />
            </div>
          </div>
          <LegendaryRevealAnimation rarity="Legendary" label="Legendary reveal" />
        </div>
      </section>

      <MetricGrid>
        <StatCard icon={Boxes} label="Communities" value={formatMetric(stats.collections)} />
        <StatCard icon={LockKeyhole} label="Vault NFTs" value={formatMetric(stats.nfts)} accent="green" />
        <StatCard icon={Swords} label="Raids" value={formatMetric(stats.raids)} accent="cyan" />
        <StatCard icon={BadgeDollarSign} label="TVL" value={formatCurrency(stats.tvlUsd)} accent="gold" />
      </MetricGrid>

      {collections.length ? (
        <SectionCard title="Top Communities" action={<Link href="/collections" className="text-sm font-bold text-vault-green">View all</Link>}>
          <CollectionGrid collections={collections.slice(0, 4)} />
        </SectionCard>
      ) : (
        <EmptyState title="No launched communities yet" body="Launch the first faction vault to populate this command center with real communities, vaults, raids, and staking activity." action={<Link href="/create-collection" className="phew-button phew-button-primary inline-flex h-11 items-center justify-center rounded-md px-5 text-sm font-black text-black">Create Community</Link>} />
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
      <SectionCard title="Faction Directory">
        <div className="mb-4 flex flex-wrap gap-2">
          {[["all", "All"], ["live", "Live"], ["upcoming", "Upcoming"], ["partnered", "Partnered"]].map(([value, label]) => (
            <button key={value} onClick={() => controls.setFilter(value)} className={`rounded-md border px-4 py-2 text-sm font-black transition ${controls.filter === value ? "border-vault-green bg-vault-green/15 text-vault-green" : "border-vault-line bg-black/25 text-slate-400 hover:border-vault-cyan/50 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input value={controls.query} onChange={(event) => controls.setQuery(event.target.value)} className="phew-input h-12 w-full rounded-md pl-11 pr-4 text-sm" placeholder="Search communities" />
          </label>
          <select value={controls.sort} onChange={(event) => controls.setSort(event.target.value)} className="phew-input h-12 rounded-md px-4 text-sm">
            <option value="level">Sort: Level</option>
            <option value="vaults">Sort: Vaults</option>
            <option value="risk">Sort: Risk</option>
          </select>
        </div>
      </SectionCard>

      {controls.visibleCollections.length ? (
        <CollectionGrid collections={controls.visibleCollections} />
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
      <section className="phew-panel relative overflow-hidden rounded-lg">
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
      <SectionCard title="Vault Exchange">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-vault-green" />
            <input className="phew-input h-12 w-full rounded-md pl-11 pr-4 text-sm" placeholder="Search vault NFTs" />
          </label>
          <select className="phew-input h-12 rounded-md px-4 text-sm" defaultValue="all">
            <option value="all">All factions</option>
            {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
          </select>
          <select className="phew-input h-12 rounded-md px-4 text-sm" defaultValue="recent">
            <option value="recent">Recently listed</option>
            <option value="price">Price low to high</option>
            <option value="rarity">Rarity</option>
          </select>
        </div>
      </SectionCard>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={WalletCards} label="Active listings" value={formatMetric((data.listings ?? []).length || nfts.length)} />
        <StatCard icon={Shield} label="Backed inventory" value={formatMetric(nfts.length)} accent="green" />
        <StatCard icon={AlertTriangle} label="Price source" value={(data.listings ?? []).length ? "Live listings" : "No listings"} accent="gold" />
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
          <p className="mt-4 text-sm text-slate-300">Rewards and contributor rows appear from real raid mission and claim data. Join actions stay pending or error until a supported backend route confirms them.</p>
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
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon={LockKeyhole} label="Staked vaults" value={formatMetric(positions.length)} />
          <StatCard icon={Sparkles} label="Pending rewards" value="API required" accent="green" />
          <StatCard icon={Shield} label="APR" value="Collection-set" accent="gold" />
          <StatCard icon={Boxes} label="Total staked" value="API required" accent="cyan" />
        </div>
        <SectionCard title="My Staked Vaults">
          {positions.length ? <pre className="max-h-96 overflow-auto rounded-lg border border-vault-line bg-black/35 p-4 text-xs text-slate-300">{JSON.stringify(positions, null, 2)}</pre> : <EmptyBlock title="No staked vaults" body="Stake a confirmed vault NFT before reward rows appear. This page will not invent staking positions or rewards." />}
        </SectionCard>
      </div>
      <SectionCard title="Transaction Flows">
        <div className="space-y-5">
          <StakeFlow />
          <UnstakeFlow />
          <ClaimRewardsFlow />
        </div>
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
