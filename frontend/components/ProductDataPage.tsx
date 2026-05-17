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
  Users,
  WalletCards,
  Zap
} from "lucide-react";
import { useWalletDisplay } from "@/hooks/useWalletDisplay";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useApiResource } from "@/hooks/useApiResource";
import type { VaultCollection, VaultNft, RaidRoom } from "@/lib/types";
import { AppShell } from "./AppShell";
import { EmptyState, ErrorState, LoadingState, SetupWarning, WalletDisconnectedState } from "./ApiState";
import { MarketplaceGrid } from "./MarketplaceGrid";
import { RaidCard } from "./RaidCard";
import { SectionCard } from "./SectionCard";
import { StatCard } from "./StatCard";
import { apiWarnings, unwrapApiData } from "@/lib/api";
import { ProgressBar } from "./ProgressBar";
import { StatusPill } from "./StatusPill";
import { TransactionFlow, type TransactionFlowState } from "./TransactionFlow";
import { ProtocolTrustInline, ProtocolTrustStrip, collectionTrust, vaultTrust } from "./protocol-trust";
import { brandAssets } from "@/lib/brand-assets";
import { CollectionGrid } from "./CollectionGrid";
import { MetricGrid, PageLayout } from "./PageLayout";
import { StakeFlow, UnstakeFlow, ClaimRewardsFlow } from "./StakingFlows";
import { showPrivateDiagnostics } from "@/lib/diagnostics-access";
import { cn } from "@/lib/utils";
import { assertBackendActionCompleted } from "@/lib/action-contracts";
import { PhewAnimationFrame, type PhewAnimationMoment } from "./phew-ui";

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
  eligibleVaults?: VaultNft[];
  listings?: unknown[];
  quotes?: unknown[];
  snapshots?: unknown[];
  poolConfigured?: boolean;
  founderOnly?: boolean;
  activity?: unknown[];
  recentMints?: Array<Record<string, unknown>>;
  marketSnapshot?: {
    volume24hSol?: number | null;
    sales24h?: number | null;
    avgPriceSol?: number | null;
    uniqueBuyers?: number | null;
    source?: string;
    chart?: unknown[];
  };
  user?: unknown;
};

type ProtocolHealth = {
  ok?: boolean;
  productionReady?: boolean;
  mode?: string;
  stats?: Record<string, number | null>;
  reserveHealth?: {
    status?: string;
    insolvent?: number;
    pausedOrEmergency?: number;
  };
  issues?: string[];
};

type StakingIntentResponse = {
  ok?: boolean;
  status?: string;
  payoutStatus?: string;
  message?: string;
  position?: unknown;
  idempotent?: boolean;
};

export function ProductDataPage({ active, title, endpoint, walletRequired, children }: { active: string; title: string; endpoint: string; walletRequired?: boolean; children?: (data: ProductData) => React.ReactNode }) {
  const wallet = useWalletDisplay();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("level");
  const blockedByWallet = Boolean(walletRequired && !wallet.connected);
  const walletPath = wallet.address ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}wallet=${encodeURIComponent(wallet.address)}` : endpoint;
  const state = useApiResource<ProductData | VaultCollection[] | VaultNft[] | RaidRoom[]>(walletPath, { enabled: !blockedByWallet });
  const capabilityState = useApiResource<{ mode: string; capabilities: Record<string, boolean>; warnings: string[] }>("/system/capabilities");
  const data = normalizeProductData(endpoint, state.data);
  const renderData = data ?? fallbackProductData(active, title, endpoint, walletRequired);
  const showFallbackDuringLoad = Boolean(!data && (walletRequired || endpoint.includes("/collections/")));
  const warnings = apiWarnings(state.data);
  const privateDiagnostics = showPrivateDiagnostics(wallet.address);
  const pageMoment = motionMomentForPage(active, endpoint);
  const pageMotionState = state.loading ? "loading" : state.error ? "error" : "idle";
  const pageMotionImage = data?.collection?.image ?? data?.collections?.[0]?.image ?? data?.nfts?.[0]?.image ?? null;
  const pageMotionSymbol = data?.collection?.symbol ?? data?.collections?.[0]?.symbol ?? data?.nfts?.[0]?.tier ?? "PHEW";
  const showRouteHero = active !== "home" && !["staking"].includes(active);
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
        {showRouteHero ? <section className="phew-panel phew-hero-canvas phew-scanline relative overflow-hidden rounded-lg p-5">
          <img src={brandAssets.motionCore} alt="" className="phew-motion-image absolute inset-y-0 right-0 hidden h-full w-3/5 object-cover opacity-30 mix-blend-screen lg:block" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020806] via-[#020806]/94 to-[#020806]/35" />
          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_520px] lg:items-center">
            <div className="min-w-0 max-w-4xl">
              <p className="text-sm font-black uppercase text-vault-green">PHEW.DEVNET / Faction OS</p>
              <h1 className="mt-2 max-w-[calc(100vw-4rem)] text-3xl font-black leading-tight sm:max-w-4xl sm:text-4xl">{title}</h1>
              <p className="mt-2 max-w-[calc(100vw-4rem)] break-words text-sm text-slate-300 sm:max-w-3xl">{routeSubtitleForPage(active, data?.subtitle)}</p>
              <div className="mt-4">
                <Link href="/create-community" className="phew-button phew-button-primary inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black">
                  <img src={brandAssets.tokenObject} alt="" className="size-5 object-contain" /> Create Community
                </Link>
              </div>
            </div>
            <PhewAnimationFrame
              moment={pageMoment}
              state={pageMotionState}
              collectionImage={pageMotionImage}
              tokenSymbol={pageMotionSymbol}
              title={motionTitleForPage(active, title)}
              subtitle={motionSubtitleForPage(active)}
              className="min-h-[320px]"
            />
          </div>
        </section> : null}

        {blockedByWallet ? <WalletDisconnectedState /> : null}
        {privateDiagnostics ? <SetupWarning warnings={warnings} /> : null}
        {state.loading && active !== "home" && !showFallbackDuringLoad ? <LoadingState /> : null}
        {!state.loading && state.error ? <ErrorState error={state.error} retry={state.reload} /> : null}
        {(!state.loading || active === "home" || showFallbackDuringLoad) && !state.error && renderData
          ? children
            ? children(renderData)
            : renderProductView(endpoint, renderData, { active, query, setQuery, filter, setFilter, sort, setSort, visibleCollections, walletConnected: wallet.connected, walletAddress: wallet.address, reload: state.reload })
          : null}
      </div>
    </AppShell>
  );
}

function homeFallbackData(title: string): ProductData {
  return {
    title,
    subtitle: "The protocol for token-backed NFTs on Solana.",
    collections: [],
    nfts: [],
    raids: [],
    activity: [],
    recentMints: [],
    stats: {},
    marketSnapshot: {
      source: "loading-live-data",
      chart: []
    }
  };
}

function fallbackProductData(active: string, title: string, endpoint: string, walletRequired?: boolean): ProductData | null {
  if (active === "home") return homeFallbackData(title);
  if (walletRequired || endpoint.includes("/collections/")) {
    return {
      title,
      subtitle: "Live backend data is unavailable for this view right now; N/A states stay visible instead of inventing records.",
      collections: [],
      nfts: [],
      raids: [],
      positions: [],
      eligibleVaults: [],
      activity: [],
      recentMints: [],
      stats: {}
    };
  }
  return null;
}

export function DefaultProductView({ data }: { data: ProductData }) {
  const collections = data.collections ?? (data.collection ? [data.collection] : []);
  const nfts = data.nfts ?? [];
  const raids = data.raids ?? [];

  if (!collections.length && !nfts.length && !raids.length && !data.stats) {
    return <EmptyState title="No communities yet" body="Create and approve a community, launch it, then mint a vault NFT to populate this page from the API." action={<Link href="/create-community" className="inline-flex h-11 items-center justify-center rounded-lg bg-vault-purple px-5 text-sm font-bold">Start Create Community</Link>} />;
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
          <Link href="/create-community" className="rounded-lg border border-vault-line bg-black/25 p-4 font-bold">Create community <ArrowRight className="mt-3 size-4 text-vault-purple" /></Link>
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
    active: string;
    query: string;
    setQuery: (value: string) => void;
    filter: string;
    setFilter: (value: string) => void;
    sort: string;
    setSort: (value: string) => void;
    visibleCollections: VaultCollection[];
    walletConnected: boolean;
    walletAddress?: string | null;
    reload: () => void;
  }
) {
  if (endpoint.includes("/instant-sell") || controls.active === "strategy-engine") return <StrategyEngineView data={data} walletConnected={controls.walletConnected} walletAddress={controls.walletAddress} />;
  if (controls.active === "leaderboard") return <LeaderboardView data={data} />;
  if (endpoint.includes("/collections/") && !endpoint.includes("/raids")) return <CollectionDetailView data={data} />;
  if (endpoint.includes("/collections")) return <CollectionsView data={data} controls={controls} />;
  if (endpoint.includes("/marketplace")) return <MarketplaceView data={data} />;
  if (endpoint.includes("/raids")) return <RaidsView data={data} />;
  if (endpoint.includes("/staking")) return <StakingView data={data} reload={controls.reload} />;
  if (endpoint.includes("/profile")) return <ProfileView data={data} walletAddress={controls.walletAddress} />;
  if (endpoint.includes("/admin/risk")) return <RiskAdminView data={data} />;
  if (endpoint.includes("/home")) return <HomeDashboardView data={data} />;
  return <DefaultProductView data={data} />;
}

function HomeDashboardView({ data }: { data: ProductData }) {
  const protocolState = useApiResource<ProtocolHealth>("/protocol/health");
  const collections = data.collections ?? [];
  const protocolStats = protocolState.data?.stats ?? {};
  const stats = { ...(data.stats ?? {}), ...protocolStats };
  const market = data.marketSnapshot ?? {};
  const recentMints = data.recentMints ?? [];
  const trending = collections.slice(0, 6);
  const myVaults = data.nfts ?? [];
  const totalVaults = stats.totalVaults ?? stats.vaults ?? stats.nfts;
  return (
    <div className="space-y-6">
      <section className="phew-panel phew-hero-canvas phew-scanline relative overflow-hidden rounded-lg">
        <img src={brandAssets.vaultHero} alt="" className="absolute inset-y-0 right-0 h-full w-full object-cover opacity-20 mix-blend-screen xl:w-[52%]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020806] via-[#020806]/94 to-[#020806]/34" />
        <div className="absolute inset-0 grid-mask opacity-35" />
        <div className="relative grid gap-5 p-4 lg:p-5 xl:grid-cols-[minmax(0,1fr)_470px]">
          <div className="min-w-0 max-w-4xl">
            <div className="flex flex-wrap gap-2">
              <StatusPill accent="green">Protocol Dashboard</StatusPill>
              <StatusPill accent="cyan">Solana Vault NFTs</StatusPill>
            </div>
            <h1 className="mt-4 max-w-[calc(100vw-4rem)] break-words text-[40px] font-black leading-tight sm:max-w-4xl lg:text-5xl">Real tokens. <span className="text-vault-green">Real backing. Real ownership.</span></h1>
            <p className="mt-3 max-w-[calc(100vw-4rem)] text-base text-slate-300 sm:max-w-2xl">The protocol for token-backed NFT vaults. Lock community tokens, mint verified vault NFTs, trade freely, stake for rewards, and redeem through proof.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/collections" className="phew-button phew-button-primary inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black">
                <img src={brandAssets.nftSlot} alt="" className="size-5 object-contain" /> Explore Collections
              </Link>
              <Link href="/create-community" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-vault-green/45 bg-vault-green/10 px-5 text-sm font-black text-vault-green">
                <img src={brandAssets.tokenObject} alt="" className="size-5 object-contain" /> Create Community
              </Link>
            </div>
          </div>
          <div className="phew-home-hero-actor min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black uppercase text-white">Protocol Overview</p>
              <StatusPill accent={protocolState.data?.ok ? "green" : "gold"}>{protocolState.data?.ok ? "Live" : "N/A"}</StatusPill>
            </div>
            <div className="phew-home-mascot-stage mt-2">
              <span className="phew-home-mascot-glow" />
              <span className="phew-home-mascot-ring" />
              <img src={brandAssets.mascot} alt="Phew mascot" className="phew-home-mascot" />
            </div>
            <div className="phew-home-stat-grid mt-3 grid grid-cols-2 gap-3">
              <MiniStat label="TVL" value={formatCurrency(stats.tvlUsd)} />
              <MiniStat label="Vaults" value={formatMetric(totalVaults)} />
              <MiniStat label="Communities" value={formatMetric(stats.activeCommunities ?? stats.collections)} />
              <MiniStat label="Phews Minted" value={formatMetric(stats.phewsMinted ?? stats.nfts)} />
              <MiniStat label="Trades" value={formatMetric(stats.totalTrades)} />
              <MiniStat label="Unique Wallets" value={formatMetric(stats.uniqueWallets)} />
            </div>
          </div>
        </div>
      </section>

      <MetricGrid>
        <StatCard icon={BadgeDollarSign} label="Protocol TVL" value={formatCurrency(stats.tvlUsd)} accent="gold" />
        <StatCard icon={Boxes} label="Total Vaults" value={formatMetric(totalVaults)} />
        <StatCard icon={Users} label="Active Communities" value={formatMetric(stats.activeCommunities ?? stats.collections)} accent="green" />
        <StatCard icon={LockKeyhole} label="Phews Minted" value={formatMetric(stats.phewsMinted ?? stats.nfts)} accent="cyan" />
        <StatCard icon={WalletCards} label="Total Trades" value={formatMetric(stats.totalTrades)} accent="purple" />
        <StatCard icon={Shield} label="Reserve Health" value={protocolState.data?.reserveHealth?.status ?? "N/A"} accent={protocolState.data?.ok ? "green" : "gold"} />
      </MetricGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <SectionCard title="Trending Collections" action={<Link href="/collections" className="text-sm font-bold text-vault-green">View all</Link>}>
          {trending.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {trending.map((collection) => (
                <Link key={collection.id} href={`/collections/${collection.id}`} className="rounded-lg border border-vault-line bg-black/30 p-4 transition hover:border-vault-green/45">
                  <div className="flex gap-4">
                    <img src={collection.image} alt={collection.name} className="size-16 rounded-md border border-vault-green/20 object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-black">{collection.name}</p>
                        <StatusPill accent={collection.reserveHealth === "HEALTHY" ? "green" : collection.reserveHealth === "AT_RISK" ? "gold" : "red"}>{collection.reserveHealth ?? "HEALTHY"}</StatusPill>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-400">{collection.symbol} / {collection.tokenMint || "token mint pending"}</p>
                      <ProtocolTrustStrip trust={collectionTrust(collection)} compact className="mt-3" />
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <MiniMetric label="TVL" value={formatTokenAmount(collection.availableBacking)} />
                        <MiniMetric label="Floor" value={`${collection.floorSol} SOL`} />
                        <MiniMetric label="Reserve" value={`${Math.round((collection.reserveRatioBps ?? 0) / 100)}%`} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyBlock title="No launched collections yet" body="Community reserve cards appear after real collections launch. No fake floor, owner, or backing values are invented." />
          )}
        </SectionCard>

        <SectionCard title="Market Snapshot">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat label="24h volume" value={formatSol(market.volume24hSol)} />
            <MiniStat label="Sales" value={formatMetric(market.sales24h)} />
            <MiniStat label="Avg price" value={formatSol(market.avgPriceSol)} />
            <MiniStat label="Unique buyers" value={formatMetric(market.uniqueBuyers)} />
          </div>
          {Array.isArray(market.chart) && market.chart.length ? <pre className="mt-4 max-h-36 overflow-auto rounded-lg border border-vault-line bg-black/25 p-4 text-xs text-slate-300">{JSON.stringify(market.chart, null, 2)}</pre> : <EmptyBlock title="No market chart yet" body="The chart stays empty until the backend returns persisted sale history." />}
          <p className="mt-3 text-xs text-slate-500">Source: {market.source ?? "no-sales-yet"}. Empty markets remain empty instead of showing fake liquidity.</p>
        </SectionCard>
      </div>

      <SectionCard title="Protocol Features">
        <div className="grid gap-3 md:grid-cols-5">
          <FeatureTile icon={LockKeyhole} title="Backed by tokens" body="Each Vault NFT maps to locked community-token backing." />
          <FeatureTile icon={WalletCards} title="Trade freely" body="Normal Solana NFT/Core assets remain marketplace compatible." />
          <FeatureTile icon={Sparkles} title="Stake & earn" body="Staking preserves backing and blocks redemption while active." />
          <FeatureTile icon={Swords} title="Raids & rewards" body="Collections can attach utility without weakening reserves." />
          <FeatureTile icon={Shield} title="Protocol security" body="Proof endpoints separate live verification from dev fallback." />
        </div>
      </SectionCard>

      <SectionCard title="How It Works">
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ["1", "Lock tokens", "A community member selects a launched collection and locks that token mint."],
            ["2", "Mint Vault NFT", "The protocol mints a verified collection asset with backing metadata."],
            ["3", "Trade & Stake", "Ownership can move on marketplaces; staking keeps backing intact."],
            ["4", "Redeem Anytime", "After unlock, the live NFT owner burns/invalidates and receives tokens."]
          ].map(([step, heading, body]) => (
            <div key={step} className="rounded-lg border border-vault-line bg-black/25 p-4">
              <span className="flex size-8 items-center justify-center rounded-md border border-vault-green/35 bg-vault-green/10 text-sm font-black text-vault-green">{step}</span>
              <p className="mt-4 font-black">{heading}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <SectionCard title="Recent Mints">
          {recentMints.length ? (
            <div className="grid gap-3">
              {recentMints.slice(0, 6).map((mint) => (
                <Link key={String(mint.id)} href={`/vaults/${encodeURIComponent(String(mint.mint ?? ""))}/proof`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-vault-line bg-black/25 p-4 hover:border-vault-green/40">
                  <div>
                    <p className="font-bold">{String(mint.collectionName ?? "Vault NFT")}</p>
                    <p className="mt-1 text-xs text-slate-500">{String(mint.mint ?? "mint pending")}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-black text-vault-green">{formatTokenAmount(String(mint.lockedAmount ?? "0"))} {String(mint.tokenSymbol ?? "")}</p>
                    <p className="text-slate-500">{String(mint.status ?? "LOCKED")}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyBlock title="No confirmed mints yet" body="Confirmed mint rows appear only after mint transactions verify and write a Vault NFT." />
          )}
        </SectionCard>

        <SectionCard title="My Vaults">
          {myVaults.length ? (
            <MarketplaceGrid items={myVaults} collections={collections} />
          ) : (
            <EmptyBlock title="Connect to view vaults" body="Wallet-owned vaults appear from live API ownership data. Marketplace transfers require owner refresh before sensitive actions." />
          )}
          <Link href="/proof" className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md border border-vault-green/45 bg-vault-green/10 px-4 text-sm font-bold text-vault-green">
            Open Proof Explorer <ArrowRight className="size-4" />
          </Link>
        </SectionCard>
      </div>

      <section className="phew-panel relative overflow-hidden rounded-lg p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-vault-green/10 via-transparent to-vault-cyan/10" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-vault-green">Ready to launch your own Phew?</p>
            <h2 className="mt-2 text-3xl font-black">Create a token-backed NFT vault collection for your community.</h2>
          </div>
          <Link href="/create-community" className="phew-button phew-button-primary inline-flex h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black">
            Create Community <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-vault-line py-6 text-sm text-slate-500">
        Phew Run protocol dashboard. Live proof is marked separately from dev/mock fallback; no fake backing, owner, floor, or paid AI art is shown.
      </footer>
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
        <EmptyState title="No matching communities" body="No launched community matches the current search and filter. Clear filters or create the first real community." action={<Link href="/create-community" className="inline-flex h-11 items-center justify-center rounded-lg bg-vault-green px-5 text-sm font-bold text-black">Create Community</Link>} />
      )}
    </div>
  );
}

function CollectionDetailView({ data }: { data: ProductData }) {
  const collection = data.collection;
  const nfts = data.nfts ?? [];
  const raids = data.raids ?? [];
  if (!collection) return <CollectionUnavailableView />;
  const trust = collectionTrust(collection);
  const activity = data.activity ?? [];
  const recentMints = data.recentMints ?? [];
  const proofHref = nfts.find((nft) => nft.mint)?.mint ? `/proof?mint=${encodeURIComponent(nfts.find((nft) => nft.mint)?.mint ?? "")}` : "/proof";
  return (
    <div className="space-y-6">
      <section className="phew-panel relative overflow-hidden rounded-lg">
        <img src={collection.banner || collection.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-34" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020806] via-[#020806]/94 to-[#020806]/50" />
        <div className="relative grid gap-6 p-6 xl:grid-cols-[160px_minmax(0,1fr)_360px] xl:p-8">
          <div className="flex items-start gap-3 xl:block">
            <img src={collection.image} alt={collection.name} className="size-24 rounded-lg border border-vault-green/30 object-cover xl:size-36" />
            <img src={brandAssets.mascot} alt="Phew mascot" className="size-20 rounded-lg border border-vault-line bg-black/40 object-contain p-2 xl:mt-4" />
          </div>
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusPill accent="green">{collection.symbol}</StatusPill>
              <StatusPill accent={collection.qualityTier === "Basic" ? "gold" : "cyan"}>{collection.qualityTier}</StatusPill>
              <StatusPill accent={collection.mintEligible ? "green" : "gold"}>{collection.mintEligible ? "Mint enabled" : "Mint gated"}</StatusPill>
            </div>
            <h2 className="mt-4 max-w-4xl text-4xl font-black leading-tight xl:text-5xl">{collection.name}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{collection.description || collection.vibe || "N/A"}</p>
            <ProtocolTrustStrip trust={trust} className="mt-5 max-w-4xl" />
            <div className="mt-6 flex flex-wrap gap-3">
              {collection.mintEligible ? (
                <Link href="/mint" className="phew-button phew-button-primary inline-flex h-11 items-center gap-2 rounded-md px-5 text-sm font-black text-black"><LockKeyhole className="size-4" /> Mint Vault</Link>
              ) : (
                <span className="inline-flex h-11 items-center gap-2 rounded-md border border-vault-line bg-black/35 px-5 text-sm font-bold text-slate-500"><LockKeyhole className="size-4" /> Mint N/A</span>
              )}
              <Link href={proofHref} className="inline-flex h-11 items-center gap-2 rounded-md border border-vault-green/45 bg-vault-green/10 px-5 text-sm font-bold text-vault-green"><Shield className="size-4" /> Open Proof</Link>
              <Link href={`/collections/${collection.id}/raids`} className="inline-flex h-11 items-center gap-2 rounded-md border border-vault-line bg-black/35 px-5 text-sm font-bold"><Swords className="size-4 text-vault-green" /> Raids</Link>
            </div>
          </div>
          <div className="grid gap-3">
            <MiniStat label="Token mint" value={collection.tokenMint || "N/A"} />
            <MiniStat label="Supply" value={formatMetric(collection.supply)} />
            <MiniStat label="Risk status" value={`${collection.riskTier} / ${collection.reserveHealth ?? "N/A"}`} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <MiniStat label="TVL / locked" value={`${formatTokenAmount(collection.totalLocked ?? collection.availableBacking)} ${collection.symbol}`} />
        <MiniStat label="Redeemable backing" value={`${formatTokenAmount(collection.availableBacking)} ${collection.symbol}`} />
        <MiniStat label="Vaults minted" value={formatMetric(collection.vaults || collection.minted)} />
        <MiniStat label="Reserve ratio" value={formatBps(collection.reserveRatioBps)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <main className="space-y-6">
          <SectionCard id="overview" title="Token Economy">
            <div className="grid gap-3 md:grid-cols-3">
              <InfoTile icon={Crown} label="Mascot" value={`${collection.mascot} / ${collection.mascotType}`} />
              <InfoTile icon={Gem} label="Token" value={`${collection.symbol} / ${shortAddress(collection.tokenMint)}`} />
              <InfoTile icon={Trophy} label="Launch" value={collection.launchStatus ?? "N/A"} />
            </div>
            <p className="mt-4 rounded-md border border-vault-line bg-black/25 p-4 text-sm leading-6 text-slate-400">
              This collection functions as its own economy: community tokens are locked in the reserve, Vault NFTs represent positions against that reserve, and redeem/stake actions are blocked unless backend proof says the position is eligible.
            </p>
          </SectionCard>

          <SectionCard id="vault-list" title="Vault List">
            {nfts.length ? (
              <div className="grid gap-3">
                {nfts.map((nft) => (
                  <div key={nft.id} className="rounded-lg border border-vault-line bg-black/25 p-4">
                    <div className="grid gap-4 md:grid-cols-[72px_minmax(0,1fr)_auto] md:items-start">
                      <img src={nft.image} alt={nft.name} className="aspect-[4/5] w-16 rounded-md border border-vault-line object-cover" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black">{nft.name}</p>
                          <StatusPill accent={nft.status === "Redeemable" ? "green" : nft.status === "Staked" ? "cyan" : "gold"}>{nft.status}</StatusPill>
                        </div>
                        <p className="mt-1 break-all text-xs text-slate-500">{nft.mint ?? nft.id}</p>
                        <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                          <MiniMetric label="Locked" value={nft.lockedAmount || "N/A"} />
                          <MiniMetric label="Unlock" value={nft.unlockDate || "N/A"} />
                          <MiniMetric label="Rarity" value={nft.rarity || "N/A"} />
                        </div>
                        <ProtocolTrustStrip trust={vaultTrust(nft, collection)} compact className="mt-3" />
                      </div>
                      {nft.mint ? <Link href={`/vaults/${encodeURIComponent(nft.mint)}/proof`} className="inline-flex h-9 items-center justify-center rounded-md border border-vault-green/45 bg-vault-green/10 px-3 text-sm font-bold text-vault-green">Proof</Link> : <span className="text-sm text-slate-500">Proof N/A</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyBlock title="No minted vault NFTs" body="Vault rows appear after confirmed mint transactions are returned by the backend." />
            )}
          </SectionCard>

          <SectionCard id="activity" title="Activity Feed">
            {activity.length || recentMints.length ? (
              <div className="grid gap-3">
                {[...activity, ...recentMints].slice(0, 12).map((item, index) => (
                  <div key={activityKey(item, index)} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-vault-line bg-black/25 p-4">
                    <div>
                      <p className="font-bold">{activityTitle(item)}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">{activityDetail(item)}</p>
                    </div>
                    <span className="text-sm font-black text-vault-green">{activityAmount(item)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyBlock title="No activity yet" body="Mint, stake, redeem, listing, and proof events appear only after the backend returns activity rows." />
            )}
          </SectionCard>

          <SectionCard id="raids" title="Raids">
            {raids.length ? <div className="grid gap-3">{raids.map((raid) => <RaidCard key={raid.id} raid={raid} collection={collection} />)}</div> : <EmptyBlock title="No raid rooms yet" body="Raid rooms will appear after this community schedules them." />}
          </SectionCard>
        </main>

        <aside className="space-y-6">
          <SectionCard title="Reserve & Risk">
            <div className="space-y-3">
              <ProtocolTrustInline trust={trust} />
              <MiniStat label="Reserve PDA" value={collection.reserveVaultPda ?? "N/A"} />
              <MiniStat label="Collection asset" value={collection.collectionAssetAddress ?? "N/A"} />
              <MiniStat label="Total staked" value={`${formatTokenAmount(collection.totalStaked)} ${collection.symbol}`} />
              <MiniStat label="Total redeemed" value={`${formatTokenAmount(collection.totalRedeemed)} ${collection.symbol}`} />
            </div>
          </SectionCard>

          <SectionCard title="Proof Link">
            <p className="text-sm leading-6 text-slate-400">
              Proof is vault-specific. When no minted vault exists, the protocol sends users to the proof explorer instead of showing a fabricated collection proof.
            </p>
            <Link href={proofHref} className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-vault-green/45 bg-vault-green/10 px-4 text-sm font-bold text-vault-green">Open Proof Explorer</Link>
          </SectionCard>

          <SectionCard title="Strategy">
            <div className="space-y-3">
              <MiniStat label="Type" value={collection.strategy?.type ?? "PASSIVE"} />
              <MiniStat label="Status" value={collection.strategy?.status ?? "DRAFT"} />
              <MiniStat label="Approved" value={collection.strategy?.approvedByCreator ? "Yes" : "No"} />
              <p className="rounded-md border border-vault-line bg-black/25 p-3 text-xs font-bold text-slate-400">
                Strategies are optional. Execution is blocked unless approved, within limits, and separated from locked reserves.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="traits" title="Trait Language">
            <div className="space-y-3">
              {Object.entries(collection.traitLayers ?? {}).map(([category, values]) => (
                <div key={category} className="rounded-lg border border-vault-line bg-black/25 p-3">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="capitalize text-slate-400">{category}</span>
                    <span className="font-bold text-vault-green">{values.length}</span>
                  </div>
                  <p className="mt-2 text-sm text-white">{values.slice(0, 2).join(", ") || "N/A"}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Staking Flow">
            <TransactionFlow state="idle" moment="stake" title="Stake Vault NFT" description="Staking uses the wallet-owned eligible vault list and backend stake route." image={nfts[0]?.image ?? collection.image} tokenSymbol={collection.symbol} compact />
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

function CollectionUnavailableView() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <MiniStat label="Token mint" value="N/A" />
        <MiniStat label="Vaults minted" value="N/A" />
        <MiniStat label="Reserve ratio" value="N/A" />
        <MiniStat label="Launch status" value="N/A" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-5">
          <SectionCard title="Collection Overview">
            <div className="grid gap-4 md:grid-cols-[120px_minmax(0,1fr)] md:items-center">
              <div className="grid aspect-square place-items-center rounded-lg border border-dashed border-vault-green/35 bg-vault-green/5">
                <img src={brandAssets.mascot} alt="" className="size-24 object-contain drop-shadow-[0_0_22px_rgba(186,255,0,0.24)]" />
              </div>
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill accent="gold">N/A</StatusPill>
                  <StatusPill accent="cyan">Safe empty state</StatusPill>
                </div>
                <h2 className="mt-3 text-2xl font-black">Collection unavailable</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">Public reads returned no collection for this id. The proof, vault, and activity panels stay mounted with N/A values so the page hierarchy remains stable.</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Vault List">
            <EmptyBlock title="No minted vault NFTs" body="Vault rows appear after a real collection is returned by the backend." />
          </SectionCard>
        </main>

        <aside className="space-y-5">
          <SectionCard title="Collection Actions">
            <div className="grid gap-2">
              <Link href="/mint" className="inline-flex h-10 items-center justify-center rounded-md border border-vault-line bg-black/25 text-sm font-bold text-slate-400">Mint N/A</Link>
              <Link href="/proof" className="inline-flex h-10 items-center justify-center rounded-md border border-vault-green/45 bg-vault-green/10 text-sm font-bold text-vault-green">Open Proof Explorer</Link>
              <Link href="/collections" className="inline-flex h-10 items-center justify-center rounded-md border border-vault-line bg-black/25 text-sm font-bold text-slate-300">Back to Collections</Link>
            </div>
          </SectionCard>
          <SectionCard title="Reserve Proof">
            <div className="space-y-3">
              <MiniMetric label="Reserve PDA" value="N/A" />
              <MiniMetric label="Backing" value="N/A" />
              <MiniMetric label="Last verified" value="N/A" />
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

function formatBps(value: unknown) {
  return typeof value === "number" ? `${(value / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%` : "N/A";
}

function shortAddress(value?: string | null, size = 6) {
  if (!value) return "N/A";
  if (value.length <= size * 2 + 3) return value;
  return `${value.slice(0, size)}...${value.slice(-size)}`;
}

function activityKey(item: unknown, index: number) {
  const record = activityRecord(item);
  return String(record?.id ?? record?.signature ?? record?.mint ?? index);
}

function activityTitle(item: unknown) {
  const record = activityRecord(item);
  return String(record?.action ?? record?.type ?? record?.collectionName ?? record?.status ?? "Protocol activity");
}

function activityDetail(item: unknown) {
  const record = activityRecord(item);
  const actor = record?.actor ?? record?.wallet ?? record?.owner ?? record?.mint ?? record?.id;
  const time = record?.time ?? record?.createdAt ?? record?.updatedAt ?? record?.lastVerifiedAt;
  return [actor, time].filter(Boolean).map(String).join(" / ") || "N/A";
}

function activityAmount(item: unknown) {
  const record = activityRecord(item);
  const amount = record?.amount ?? record?.lockedAmount ?? record?.price ?? record?.status;
  return amount === null || amount === undefined ? "N/A" : String(amount);
}

function activityRecord(item: unknown) {
  return item && typeof item === "object" ? (item as Record<string, unknown>) : null;
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
      {nfts.length ? <MarketplaceGrid items={nfts} collections={collections} listings={data.listings} /> : <EmptyState title="No marketplace listings" body="Listings appear only after real active listings or vault NFTs are returned by the API. No production prices are invented." />}
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
          <TransactionFlow state="idle" moment="reward" title="Reward claim" description="Claim states remain idle until backend reward routes return real claim data." tokenSymbol="RAID" compact />
          <p className="mt-4 text-sm text-slate-300">Rewards and contributor rows appear from real raid mission and claim data. Join actions stay pending or error until a supported backend route confirms them.</p>
        </SectionCard>
      </aside>
    </div>
  );
}

function StakingView({ data, reload }: { data: ProductData; reload: () => void }) {
  const wallet = useWalletAuth();
  const collections = data.collections ?? [];
  const positions = data.positions ?? [];
  const activePositions = positions.filter((position) => (positionText(position, "status") || "ACTIVE") === "ACTIVE");
  const eligibleVaults = data.eligibleVaults ?? [];
  const [selectedVaultId, setSelectedVaultId] = useState("");
  const selectedVault = eligibleVaults.find((vault) => vault.id === selectedVaultId) ?? eligibleVaults[0] ?? null;
  const selectedCollection = selectedVault ? collections.find((collection) => collection.id === selectedVault.collectionId || collection.dbId === selectedVault.collectionId) : null;
  const firstActivePosition = activePositions[0];
  const firstPosition = getPositionId(firstActivePosition);
  const firstPositionMint = positionText(firstActivePosition, "vaultNft.mint");
  const walletDisconnected = !wallet.connected;
  const stakeBlockedReason = walletDisconnected ? "Connect a wallet before staking an owned Vault NFT." : !selectedVault ? "No eligible wallet-owned Vault NFT is available from the backend." : null;
  const unstakeBlockedReason = walletDisconnected ? "Connect a wallet before unstaking." : !firstPosition ? "No active staking position is available from the backend." : null;
  const rewardsBlockedReason = walletDisconnected ? "Connect a wallet before claiming rewards." : !firstPosition ? "No active staking position is available for reward claims." : null;

  async function stakeVault(): Promise<{ message?: string }> {
    if (!wallet.connected) throw new Error("Connect and authenticate your wallet before staking.");
    if (!selectedVault) throw new Error("No real eligible owned Vault NFT is available to stake.");
    if (!selectedVault.mint) throw new Error("Selected Vault NFT is missing a mint address.");
    const response = await wallet.authFetch<StakingIntentResponse>(`/vaults/${encodeURIComponent(selectedVault.mint)}/stake`, {
      method: "POST",
      body: JSON.stringify({ idempotencyKey: `${wallet.address}:stake:${selectedVault.mint}` })
    });
    assertBackendActionCompleted(response, "Backend did not confirm that the vault was staked.");
    reload();
    return response;
  }

  async function unstakeVault() {
    if (!wallet.connected) throw new Error("Connect and authenticate your wallet before unstaking.");
    if (!firstPosition) throw new Error("No staking position is available to unstake.");
    if (!firstPositionMint) throw new Error("Active staking position is missing a Vault NFT mint.");
    const response = await wallet.authFetch<StakingIntentResponse>(`/vaults/${encodeURIComponent(firstPositionMint)}/unstake`, {
      method: "POST",
      body: JSON.stringify({ stakingPositionId: firstPosition, idempotencyKey: `${wallet.address}:unstake:${firstPosition}` })
    });
    assertBackendActionCompleted(response, "Backend did not confirm that the vault was unstaked.");
    reload();
    return response;
  }

  async function claimRewards() {
    if (!wallet.connected) throw new Error("Connect and authenticate your wallet before claiming rewards.");
    if (!firstPosition) throw new Error("No staking position is available for reward claims.");
    return wallet.authFetch<{ message?: string }>("/staking/claim-rewards/intents", {
      method: "POST",
      body: JSON.stringify({ stakingPositionId: firstPosition, idempotencyKey: `${wallet.address}:claim:${firstPosition}` })
    });
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon={LockKeyhole} label="Staked vaults" value={formatMetric(activePositions.length)} />
          <StatCard icon={Sparkles} label="Eligible vaults" value={formatMetric(eligibleVaults.length)} accent="green" />
          <StatCard icon={Shield} label="Pending rewards" value={formatRewardSum(positions)} accent="gold" />
          <StatCard icon={Boxes} label="Total staked" value={formatMetric(activePositions.length)} accent="cyan" />
        </div>
        <SectionCard title="Eligible Vault NFTs">
          {eligibleVaults.length ? (
            <div className="grid gap-3">
              {eligibleVaults.map((vault) => {
                const selected = (selectedVault?.id ?? "") === vault.id;
                const vaultCollection = collections.find((collection) => collection.id === vault.collectionId || collection.dbId === vault.collectionId) ?? null;
                return (
                  <div key={vault.id} className={cn("rounded-lg border p-4 transition", selected ? "border-vault-green bg-vault-green/10 shadow-green" : "border-vault-line bg-black/25 hover:border-vault-cyan/40")}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-black">{vault.name}</p>
                        <p className="mt-1 break-all text-xs text-slate-500">{vault.mint ?? vault.id}</p>
                      </div>
                      <StatusPill accent={selected ? "green" : "cyan"}>{selected ? "Selected" : vault.status}</StatusPill>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                      <MiniMetric label="Locked" value={vault.lockedAmount} />
                      <MiniMetric label="Unlock" value={vault.unlockDate} />
                      <MiniMetric label="Position" value={vault.mint ? "Verified mint" : "N/A"} />
                    </div>
                    <ProtocolTrustStrip trust={vaultTrust(vault, vaultCollection)} compact className="mt-3" />
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button type="button" onClick={() => setSelectedVaultId(vault.id)} className="inline-flex h-9 items-center rounded-md border border-vault-green/45 bg-vault-green/10 px-3 text-sm font-bold text-vault-green">
                        Select for staking
                      </button>
                      {vault.mint ? <Link href={`/vaults/${encodeURIComponent(vault.mint)}/proof`} className="inline-flex h-9 items-center rounded-md border border-vault-line bg-black/25 px-3 text-sm font-bold text-slate-300">Open proof</Link> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyBlock title="No eligible Vault NFTs" body="Only real owned Vault NFTs returned by the backend appear here. Redeemed, already staked, pending, and fake positions are excluded." />
          )}
        </SectionCard>
        <SectionCard title="My Staked Vaults">
          {positions.length ? (
            <div className="grid gap-3">
              {positions.map((position, index) => (
                <div key={getPositionId(position) || index} className="rounded-lg border border-vault-line bg-black/25 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black">{positionText(position, "collection.name") || "Vault staking position"}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">{positionText(position, "vaultNft.mint") || getPositionId(position)}</p>
                    </div>
                    <StatusPill accent="green">{positionText(position, "status") || "ACTIVE"}</StatusPill>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                    <MiniMetric label="Rewards" value={`${positionText(position, "rewardsAccruedSol") || "0"} SOL`} />
                    <MiniMetric label="XP" value={positionText(position, "xpAccrued") || "0"} />
                    <MiniMetric label="Staked at" value={positionText(position, "stakedAt") || "N/A"} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyBlock title="No staked vaults" body="Stake a confirmed Vault NFT before reward rows appear. This page will not invent staking positions or rewards." />
          )}
        </SectionCard>
      </div>
      <SectionCard title="Transaction Flows">
        <div className="space-y-5">
          <StakeFlow onStake={stakeVault} collectionImage={selectedVault?.image} tokenSymbol={selectedCollection?.symbol ?? selectedVault?.tier} disabled={Boolean(stakeBlockedReason)} disabledReason={stakeBlockedReason} walletDisconnected={walletDisconnected} />
          <UnstakeFlow onUnstake={unstakeVault} collectionImage={selectedVault?.image} tokenSymbol={selectedCollection?.symbol ?? selectedVault?.tier} disabled={Boolean(unstakeBlockedReason)} disabledReason={unstakeBlockedReason} walletDisconnected={walletDisconnected} />
          <ClaimRewardsFlow onClaim={claimRewards} collectionImage={selectedVault?.image} tokenSymbol={selectedCollection?.symbol ?? selectedVault?.tier} disabled={Boolean(rewardsBlockedReason)} disabledReason={rewardsBlockedReason} walletDisconnected={walletDisconnected} />
        </div>
      </SectionCard>
    </div>
  );
}

function ProfileView({ data, walletAddress }: { data: ProductData; walletAddress?: string | null }) {
  const nfts = data.nfts ?? [];
  const connected = Boolean(walletAddress);
  return (
    <div className="space-y-5">
      <SectionCard title="Wallet Profile">
        <div className="grid gap-4 md:grid-cols-3">
          <MiniStat label="Connected wallet" value={walletAddress ?? "Disconnected"} />
          <MiniStat label="Owned vaults" value={connected ? formatMetric(nfts.length) : "N/A"} />
          <MiniStat label="Activity rows" value={connected ? formatMetric((data.activity ?? []).length) : "N/A"} />
        </div>
      </SectionCard>
      <SectionCard title="Owned Vaults">
        {nfts.length && data.collections?.length ? <MarketplaceGrid items={nfts} collections={data.collections} /> : <EmptyBlock title={connected ? "No owned vaults" : "Wallet required"} body="Owned vault NFTs appear only after a connected wallet has confirmed vault ownership through the backend." />}
      </SectionCard>
    </div>
  );
}

function LeaderboardView({ data }: { data: ProductData }) {
  const collections = [...(data.collections ?? [])].sort((a, b) => leaderboardScore(b) - leaderboardScore(a));
  const raids = data.raids ?? [];
  const activity = data.activity ?? [];
  const recentMints = data.recentMints ?? [];
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <main className="space-y-5">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon={Trophy} label="Ranked factions" value={formatMetric(collections.length)} accent="gold" />
          <StatCard icon={LockKeyhole} label="Vault-weighted score" value={formatMetric(collections.reduce((sum, collection) => sum + leaderboardScore(collection), 0))} accent="green" />
          <StatCard icon={Swords} label="Raid rooms" value={formatMetric(raids.length)} accent="cyan" />
          <StatCard icon={Shield} label="Recent mints" value={formatMetric(recentMints.length)} />
        </div>

        <SectionCard title="Faction Leaderboard">
          {collections.length ? (
            <div className="grid gap-3">
              {collections.map((collection, index) => (
                <Link key={collection.id} href={`/collections/${collection.id}`} className="rounded-lg border border-vault-line bg-black/25 p-4 transition hover:border-vault-green/45">
                  <div className="grid gap-4 md:grid-cols-[64px_minmax(0,1fr)_160px] md:items-center">
                    <div className="grid size-16 place-items-center rounded-md border border-vault-green/35 bg-vault-green/10 text-xl font-black text-vault-green">#{index + 1}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <img src={collection.image || brandAssets.factionMark} alt="" className="size-10 rounded-md border border-vault-line object-cover" />
                        <div className="min-w-0">
                          <p className="truncate font-black text-white">{collection.name}</p>
                          <p className="truncate text-xs text-slate-500">{collection.symbol} / {collection.tokenMint || "token mint N/A"}</p>
                        </div>
                        <StatusPill accent={collection.reserveHealth === "HEALTHY" ? "green" : "gold"}>{collection.reserveHealth ?? "N/A"}</StatusPill>
                      </div>
                      <ProtocolTrustStrip trust={collectionTrust(collection)} compact className="mt-3" />
                    </div>
                    <div className="grid gap-2 text-sm md:text-right">
                      <MiniMetric label="Score" value={formatMetric(leaderboardScore(collection))} />
                      <MiniMetric label="Vaults" value={formatMetric(collection.vaults)} />
                      <MiniMetric label="XP" value={formatMetric(collection.xp)} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyBlock title="No leaderboard rows" body="Leaderboard ranks appear only after real launched collections, vaults, raid activity, or XP rows are returned by the backend." />
          )}
        </SectionCard>
      </main>

      <aside className="space-y-5">
        <SectionCard title="Reward Rail">
          <TransactionFlow state={collections.length ? "idle" : "preparing"} moment="reward" title="Leaderboard reward route" description="Scores are derived from backend collection XP, vault count, raid activity, and recent mints. No sample ranks are inserted." tokenSymbol="PHEW" compact />
        </SectionCard>
        <SectionCard title="Data Sources">
          <div className="grid gap-3">
            <MiniStat label="Activity rows" value={formatMetric(activity.length)} />
            <MiniStat label="Market source" value={data.marketSnapshot?.source ?? "N/A"} />
            <MiniStat label="Last verified" value="N/A" />
          </div>
        </SectionCard>
      </aside>
    </div>
  );
}

function StrategyEngineView({ data, walletConnected, walletAddress }: { data: ProductData; walletConnected: boolean; walletAddress?: string | null }) {
  const quotes = data.quotes ?? [];
  const poolReady = Boolean(data.poolConfigured);
  const sceneState: TransactionFlowState = !walletConnected ? "wallet-disconnected" : poolReady ? "idle" : "error";
  const strategyTrust = {
    verified: poolReady,
    reserveStatus: poolReady ? "POOL_READY" : "POOL_UNAVAILABLE",
    reserveTone: poolReady ? ("success" as const) : ("warning" as const),
    source: quotes.length ? ("live" as const) : ("cached" as const),
    lastVerifiedAt: null
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <main className="space-y-5">
        <SectionCard title="Strategy Engine Console">
          <div className="grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)]">
            <div className="grid min-h-36 place-items-center rounded-lg border border-vault-green/30 bg-vault-green/5">
              <img src={poolReady ? brandAssets.energyBeam : brandAssets.errorGlitch} alt="" className="size-28 object-contain drop-shadow-[0_0_24px_rgba(186,255,0,0.25)]" />
            </div>
            <div className="min-w-0">
              <ProtocolTrustStrip trust={strategyTrust} />
              <div className="mt-4 rounded-lg border border-vault-gold/40 bg-vault-gold/10 p-4 text-sm text-slate-200">
                {poolReady ? "Instant-sell strategy is configured. Quotes still depend on eligible wallet inventory, backing, unlock date, and live liquidity." : "Instant-sell liquidity is unavailable. Quote writes remain blocked until real pool liquidity is configured."}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input className="phew-input h-12 rounded-md px-4 text-sm" placeholder="Vault NFT mint" disabled={!poolReady || !walletConnected} />
                <button className="h-12 rounded-md border border-vault-line bg-black/25 font-bold text-slate-400 disabled:cursor-not-allowed disabled:opacity-55" disabled>
                  Request quote
                </button>
              </div>
            </div>
          </div>
          {quotes.length ? <pre className="mt-4 max-h-80 overflow-auto rounded-lg border border-vault-line bg-black/35 p-4 text-xs text-slate-300">{JSON.stringify(quotes, null, 2)}</pre> : <EmptyBlock title="No quotes" body="Quotes appear only after real pool-backed quote requests for this wallet." />}
        </SectionCard>
        <SectionCard title="Risk Discount Inputs">
          <div className="grid gap-3 md:grid-cols-4">
            <MiniStat label="Wallet" value={walletAddress ?? "Disconnected"} />
            <MiniStat label="Liquidity pool" value={poolReady ? "Configured" : "Unavailable"} />
            <MiniStat label="Quotes" value={formatMetric(quotes.length)} />
            <MiniStat label="Live source" value={quotes.length ? "Quotes table" : "N/A"} />
          </div>
          <p className="mt-4 text-sm text-slate-300">Discounts must come from liquidity, backing, unlock date, and risk-tier data. This panel will not show invented liquidity.</p>
        </SectionCard>
      </main>
      <aside className="space-y-5">
        <SectionCard title="Transaction Scene">
          <TransactionFlow state={sceneState} moment="redeem" title="Strategy quote route" description="Wallet inventory, reserve backing, risk, and quote state stay locked to backend responses." tokenSymbol="PHEW" detail={poolReady ? "Ready for wallet-owned vault inventory" : "Liquidity pool unavailable"} compact />
        </SectionCard>
        <SectionCard title="Protocol Rules">
          <div className="grid gap-2">
            <CheckRow label="Wallet authenticated" ok={walletConnected} />
            <CheckRow label="Real pool configured" ok={poolReady} />
            <CheckRow label="Quote rows returned" ok={quotes.length > 0} />
          </div>
        </SectionCard>
      </aside>
    </div>
  );
}

function leaderboardScore(collection: VaultCollection) {
  return Math.max(0, Number(collection.xp ?? 0)) + Math.max(0, Number(collection.vaults ?? 0)) * 1000 + Math.max(0, Number(collection.raidSuccessRate ?? 0)) * 10 + Math.max(0, Number(collection.activeUsers24h ?? 0));
}

function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-vault-line bg-black/25 p-3 text-sm">
      <span className="text-slate-300">{label}</span>
      <span className={ok ? "text-vault-green" : "text-vault-gold"}>{ok ? "Verified" : "N/A"}</span>
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
                    <p className="text-sm text-slate-400">{collection.tokenMint || "N/A"}</p>
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

function FeatureTile({ icon: Icon, title, body }: { icon: typeof Crown; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-vault-line bg-black/25 p-4">
      <Icon className="size-5 text-vault-green" />
      <p className="mt-4 font-black">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/5 bg-white/[0.03] p-2">
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className="mt-1 truncate font-bold text-white">{value}</p>
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
  return typeof value === "number" ? value.toLocaleString() : "N/A";
}

function formatCurrency(value: unknown) {
  return typeof value === "number" ? `$${value.toLocaleString()}` : "N/A";
}

function formatSol(value: unknown) {
  return typeof value === "number" ? `${value.toLocaleString(undefined, { maximumFractionDigits: 3 })} SOL` : "N/A";
}

function formatTokenAmount(value: unknown) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return "N/A";
  if (value === "0") return "0";
  const trimmed = value.length > 9 ? `${value.slice(0, -9)}.${value.slice(-9, -6)}` : `0.${value.padStart(9, "0").slice(0, 3)}`;
  return trimmed.replace(/\.?0+$/, "");
}

function getPositionId(position: unknown) {
  return position && typeof position === "object" && "id" in position ? String((position as { id?: unknown }).id ?? "") : "";
}

function positionText(position: unknown, path: string) {
  const value = path.split(".").reduce<unknown>((current, key) => (current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined), position);
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function formatRewardSum(positions: unknown[]) {
  const total = positions.reduce<number>((sum, position) => {
    const raw = positionText(position, "rewardsAccruedSol");
    const value = Number(raw);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
  return `${total.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
}

function motionMomentForPage(active: string, endpoint: string): PhewAnimationMoment {
  if (active === "staking" || endpoint.includes("/staking")) return "stake";
  if (active === "redeem" || active === "strategy-engine" || endpoint.includes("/instant-sell")) return "redeem";
  if (active === "raids" || endpoint.includes("/raids")) return "reward";
  if (active === "leaderboard") return "reward";
  if (active === "marketplace" || endpoint.includes("/marketplace")) return "mint";
  if (active === "risk" || endpoint.includes("/admin/risk")) return "scan";
  if (active === "profile" || active === "my-vaults" || endpoint.includes("/profile")) return "proof";
  if (active === "collections" || endpoint.includes("/collections")) return "community";
  return "scan";
}

function motionTitleForPage(active: string, title: string) {
  if (active === "marketplace") return "Purchase intent";
  if (active === "raids") return "Raid reward route";
  if (active === "leaderboard") return "Reward leaderboard";
  if (active === "staking") return "Stake action";
  if (active === "instant-sell" || active === "strategy-engine") return "Liquidity quote";
  if (active === "profile" || active === "my-vaults") return "Wallet vault proof";
  if (active === "risk") return "Risk scan";
  if (active === "collections") return "Community reserve";
  return title;
}

function motionSubtitleForPage(active: string) {
  if (active === "marketplace") return "Backend purchase state pending";
  if (active === "raids") return "Raid engine state pending";
  if (active === "leaderboard") return "Reward rank state";
  if (active === "staking") return "Stake and reward state pending";
  if (active === "instant-sell" || active === "strategy-engine") return "Liquidity state pending";
  if (active === "profile" || active === "my-vaults") return "Wallet proof state";
  if (active === "risk") return "Risk snapshot state";
  if (active === "collections") return "Reserve state pending";
  return "Backend state pending";
}

function routeSubtitleForPage(active: string, subtitle?: string | null) {
  if (active === "leaderboard") return "Rank factions from live vault count, XP, raid, mint, and activity rows returned by the backend.";
  if (active === "strategy-engine" || active === "instant-sell") return "Review instant-sell liquidity, quote readiness, and risk-discount inputs without inventing pool data.";
  if (active === "my-vaults" || active === "profile") return "Connect a wallet to load owned Vault NFTs, proof shortcuts, staking state, and redeemable positions.";
  if (subtitle) return subtitle;
  return "Launch faction vaults, coordinate raids, and reward holders on Solana.";
}

function normalizeProductData(endpoint: string, data: ProductData | VaultCollection[] | VaultNft[] | RaidRoom[] | null): ProductData | null {
  const unwrapped = unwrapApiData<ProductData | VaultCollection[] | VaultNft[] | RaidRoom[]>(data);
  if (!unwrapped) return null;
  if (!Array.isArray(unwrapped)) return unwrapped;
  if (endpoint.includes("/raids")) return { raids: unwrapped as RaidRoom[] };
  if (endpoint.includes("/nfts")) return { nfts: unwrapped as VaultNft[] };
  return { collections: unwrapped as VaultCollection[] };
}
