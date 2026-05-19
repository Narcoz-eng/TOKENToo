"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Database,
  Filter,
  Layers3,
  LockKeyhole,
  PauseCircle,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  WalletCards,
  Zap
} from "lucide-react";
import { BackendUnavailableBanner, CheckRow, LockedButton, ReferenceBadge, ReferenceButton, ReferenceEmpty, ReferenceHeader, ReferenceInput, ReferenceMetric, ReferencePanel, ReferenceRows, ReferenceShell, ReferenceStepper, ReferenceTable, SearchControl, WalletRequiredBanner, na, shortAddress } from "@/components/reference-ui";
import { PhewMascot } from "@/components/PhewMascot";
import { PhewProtocolIcon, phewProtocolIconAssets, type PhewProtocolIconName } from "@/components/PhewProtocolIcon";
import { useApiResource } from "@/hooks/useApiResource";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { brandAssets } from "@/lib/brand-assets";
import type { VaultCollection, VaultNft } from "@/lib/types";
import { cn } from "@/lib/utils";

type ProductData = {
  title?: string;
  subtitle?: string;
  collections?: VaultCollection[];
  collection?: VaultCollection;
  nfts?: VaultNft[];
  stats?: Record<string, number | null>;
  positions?: unknown[];
  eligibleVaults?: VaultNft[];
  listings?: unknown[];
  quotes?: unknown[];
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
  poolConfigured?: boolean;
};

type WalletTokenRow = {
  mint: string;
  amount?: string;
  decimals?: number;
  uiAmountString?: string;
  symbol?: string | null;
  name?: string | null;
  valueUsd?: number | null;
  valueSol?: number | null;
  communityStatus?: "COMMUNITY_EXISTS" | "NO_COMMUNITY";
  action?: "MINT_TO_COMMUNITY" | "COMMUNITY_NOT_MINT_READY" | "CREATE_COMMUNITY";
  collectionId?: string | null;
  collectionSlug?: string | null;
  collectionName?: string | null;
  collectionImage?: string | null;
  reserveHealth?: string | null;
  mintEligible?: boolean;
};

type WalletTokensResponse = {
  walletRequired?: boolean;
  verificationAvailable?: boolean;
  provider?: string;
  issues?: string[];
  tokens?: WalletTokenRow[];
  stats?: {
    totalTokens?: number;
    communityMatches?: number;
    noCommunity?: number;
    mintEligible?: number;
  };
};

type ProtocolHealth = {
  ok?: boolean;
  productionReady?: boolean;
  mode?: string;
  stats?: Record<string, number | null>;
  reserveHealth?: { status?: string };
};

type RiskRow = {
  collection?: VaultCollection;
  id?: string;
  name?: string;
  symbol?: string;
  tokenMint?: string;
  riskScore?: number | null;
  reserveStatus?: string | null;
  eligibility?: string | null;
  instantSell?: boolean | null;
  emergency?: boolean | null;
  lastScannedAt?: string | null;
};

type CapabilitiesResponse = {
  ok?: boolean;
  mode?: string;
  cluster?: string;
  rpcUrl?: string;
  capabilities?: Record<string, boolean>;
  warnings?: string[];
  setupChecklist?: {
    storageProvider?: string;
    creativePreviewReady?: boolean;
    devnetLaunchReady?: boolean;
    productionLaunchReady?: boolean;
    items?: Array<{ key: string; label: string; ok: boolean; requiredFor?: string[]; fix?: string }>;
  };
  publicReadiness?: {
    professionalPreviewReady?: boolean;
    launchAvailable?: boolean;
    mintingAvailable?: boolean;
    creatorSetupRequired?: boolean;
    messages?: string[];
  };
  setupModes?: Array<{ id: string; label: string; ready: boolean; output: string; missing: string[]; blockedBy: string[] }>;
};

type ImageProvidersResponse = {
  ok?: boolean;
  active?: { provider?: string; authPresent?: boolean; canGenerateStudioBible?: boolean; quotaStatus?: string; lastProbeResult?: string; selectedModel?: string };
  providers?: Array<{ provider: string; authPresent?: boolean; canGenerateStudioBible?: boolean; quotaStatus?: string; lastProbeResult?: string; selectedModel?: string }>;
};

type TokenScan = {
  mint: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  supply?: string | number;
  imageUri?: string;
  logoUri?: string;
  metadataUri?: string;
  provider?: string;
  riskScore?: number;
};

export function HomeReferencePage() {
  const home = useProductData("/product/home");
  const health = useApiResource<ProtocolHealth>("/protocol/health");
  const data = home.data;
  const stats = { ...(data?.stats ?? {}), ...(health.data?.stats ?? {}) };
  const collections = data?.collections ?? [];
  const recentMints = data?.recentMints ?? [];
  const myVaults = data?.nfts ?? [];
  const market = data?.marketSnapshot;

  return (
    <ReferenceShell active="home" stats={stats}>
      {home.error ? <BackendUnavailableBanner message={home.error.message} retry={home.reload} /> : null}
      <section className="ref-panel ref-hero relative overflow-visible p-4 sm:p-5">
        <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
          <img src={brandAssets.pageHeroes.home} alt="" className="phew-home-hero-bg-art" />
          <div className="absolute inset-0 grid-mask opacity-25" />
          <div className="absolute left-[48%] top-[-34%] size-[480px] rounded-full bg-vault-green/10 blur-3xl" />
        </div>
        <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px_390px] xl:items-stretch">
          <div className="self-center">
            <h1 className="max-w-3xl text-[34px] font-black leading-[1.03] text-white sm:text-[44px]">
              Real tokens.<br />
              <span className="text-vault-green">Real backing.</span> Real ownership.
            </h1>
            <p className="mt-3 max-w-2xl text-base font-semibold text-white">The protocol for token-backed NFT vaults.</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Lock community tokens. Mint verified vault NFTs. Trade freely. Stake for rewards. Redeem anytime.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ReferenceButton href="/collections" asset={phewProtocolIconAssets.community}>Explore Collections</ReferenceButton>
              <ReferenceButton href="/create-community" tone="outline" asset={phewProtocolIconAssets.reserve}>Create Community</ReferenceButton>
            </div>
          </div>
          <div className="ref-hero-mascot-stage min-h-[230px]">
            <span className="ref-hero-ring" />
            <img src={brandAssets.pageHeroes.home} alt="" className="phew-home-hero-subject" />
          </div>
          <div className="ref-home-overview h-full">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase text-white">Protocol Overview</p>
                <p className="mt-1 text-xs text-slate-500">Live health, reserve state, and activity counts.</p>
              </div>
              <ReferenceBadge tone={health.data?.ok ? "green" : health.error ? "red" : "gold"}>{health.loading ? "Loading" : health.error ? "Backend" : "24H"}</ReferenceBadge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <ReferenceMetric label="Total Value Locked" value={formatCurrency(stats.tvlUsd)} asset={phewProtocolIconAssets.reserve} />
              <ReferenceMetric label="Total Vaults" value={formatMetric(stats.totalVaults ?? stats.vaults ?? stats.nfts)} asset={phewProtocolIconAssets.lockTokens} />
              <ReferenceMetric label="Active Communities" value={formatMetric(stats.activeCommunities ?? stats.collections)} asset={phewProtocolIconAssets.community} />
              <ReferenceMetric label="Phews Minted" value={formatMetric(stats.phewsMinted ?? stats.nfts)} asset={phewProtocolIconAssets.mintNft} />
              <ReferenceMetric label="Total Trades" value={formatMetric(stats.totalTrades)} asset={phewProtocolIconAssets.stake} />
              <ReferenceMetric label="Unique Wallets" value={formatMetric(stats.uniqueWallets)} asset={phewProtocolIconAssets.proof} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <ReferenceMetric label="TVL" value={formatCurrency(stats.tvlUsd)} asset={phewProtocolIconAssets.reserve} />
        <ReferenceMetric label="Total Vaults" value={formatMetric(stats.totalVaults ?? stats.nfts)} asset={phewProtocolIconAssets.lockTokens} />
        <ReferenceMetric label="Active Communities" value={formatMetric(stats.activeCommunities ?? stats.collections)} asset={phewProtocolIconAssets.community} />
        <ReferenceMetric label="Phews Minted" value={formatMetric(stats.phewsMinted ?? stats.nfts)} asset={phewProtocolIconAssets.mintNft} />
        <ReferenceMetric label="Total Trades" value={formatMetric(stats.totalTrades)} asset={phewProtocolIconAssets.stake} />
        <ReferenceMetric label="Reserve Proof" value={health.data?.ok ? "Verified" : "N/A"} asset={phewProtocolIconAssets.proof} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <ReferencePanel title="Trending Communities" action={<Link href="/collections" className="text-sm text-vault-green">View all</Link>}>
          {collections.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {collections.slice(0, 5).map((collection) => <CommunityTile key={collection.dbId ?? collection.id} collection={collection} />)}
            </div>
          ) : (
            <ReferenceEmpty mascot title="No communities returned" body="The dashboard is waiting for live backend collections. No demo communities are inserted." action={<ReferenceButton href="/create-community" tone="outline">Create Community</ReferenceButton>} />
          )}
        </ReferencePanel>
        <ReferencePanel title="Market Snapshot" action={<ReferenceBadge tone="green">24H</ReferenceBadge>}>
          <div className="grid gap-3 lg:grid-cols-[190px_minmax(0,1fr)]">
            <ReferenceRows rows={[
              { label: "Volume", value: formatSol(market?.volume24hSol) },
              { label: "Sales", value: formatMetric(market?.sales24h) },
              { label: "Avg. Price", value: formatSol(market?.avgPriceSol) },
              { label: "Unique Buyers", value: formatMetric(market?.uniqueBuyers) }
            ]} />
            <div className="relative min-h-40 overflow-hidden rounded-lg border border-vault-line bg-black/35">
              <span className="absolute inset-0 grid-mask opacity-25" />
              <span className="absolute bottom-8 left-4 right-4 h-24 rounded-[50%] border-t-2 border-vault-green shadow-green" />
              <p className="absolute inset-x-0 top-1/2 text-center text-sm text-slate-400">Data pending backend</p>
            </div>
          </div>
          <ReferenceButton href="/marketplace" tone="outline" className="mt-3 w-full" icon={ArrowRight}>Explore Marketplace</ReferenceButton>
        </ReferencePanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.72fr_0.72fr]">
        <ReferencePanel title="How It Works">
          <div className="grid gap-3 sm:grid-cols-4">
            {([
              ["Lock Tokens", "lockTokens"],
              ["Mint Vault NFT", "mintNft"],
              ["Trade & Stake", "stake"],
              ["Redeem Anytime", "redeem"]
            ] as Array<[string, PhewProtocolIconName]>).map(([label, icon], index) => (
              <div key={label} className="ref-action-tile text-center">
                <div className="mx-auto grid h-24 w-24 place-items-center rounded-md border border-vault-green/20 bg-vault-green/8 shadow-[inset_0_0_28px_rgba(186,255,0,0.08)] sm:h-28 sm:w-28">
                  <PhewProtocolIcon name={icon} className="h-20 w-20 sm:h-24 sm:w-24" />
                </div>
                <p className="mt-3 text-sm font-black text-white">{label}</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">{["Lock in reserve vault.", "Receive verified NFT.", "Trade or stake.", "Burn to redeem."][index]}</p>
              </div>
            ))}
          </div>
        </ReferencePanel>
        <ReferencePanel title="Recent Mints" action={<span className="text-sm text-slate-400">View all</span>}>
          <CompactList rows={recentMints.slice(0, 5).map((mint) => ({
            image: String(mint.image ?? ""),
            title: String(mint.name ?? mint.id ?? "Vault mint"),
            subtitle: String(mint.collection ?? "N/A"),
            value: String(mint.amount ?? "N/A")
          }))} empty="No recent mints returned." />
        </ReferencePanel>
        <ReferencePanel title="My Vaults" action={<Link href="/my-vaults" className="text-sm text-vault-green">View all</Link>}>
          <CompactList rows={myVaults.slice(0, 5).map((vault) => ({
            image: vault.image,
            title: vault.name,
            subtitle: vault.tier,
            value: vault.status
          }))} empty="Connect wallet to load owned vaults." />
        </ReferencePanel>
      </div>

      <section className="ref-panel ref-home-cta relative overflow-visible p-4">
        <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-center">
          <div className="ref-hero-mascot-stage min-h-[110px]">
            <span className="ref-hero-ring !bottom-2 !w-32" />
            <PhewMascot mood="running" size="md" className="ref-free-mascot !bottom-0 !w-32" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-vault-green">Ready to launch your community?</h2>
            <p className="mt-1 text-sm text-slate-300">Create your token-backed NFT vault collection. Lock. Mint. Trade. Stake. Redeem.</p>
          </div>
          <ReferenceButton href="/create-community" asset={phewProtocolIconAssets.community}>Create Community</ReferenceButton>
        </div>
      </section>
    </ReferenceShell>
  );
}

export function CollectionsReferencePage() {
  const [query, setQuery] = useState("");
  const product = useProductData("/product/collections");
  const collections = product.data?.collections ?? [];
  const visible = useMemo(() => collections.filter((collection) => {
    const text = `${collection.name} ${collection.symbol} ${collection.tokenMint}`.toLowerCase();
    return !query.trim() || text.includes(query.trim().toLowerCase());
  }), [collections, query]);

  return (
    <ReferenceShell active="collections" stats={product.data?.stats}>
      <ReferenceHeader
        title="Collections"
        subtitle="Explore and manage token-backed NFT collections on Phew Run."
        mascotPose="explorer"
        actions={<ReferenceButton href="/create-community" icon={Users}>Create Collection</ReferenceButton>}
      />
      {product.error ? <BackendUnavailableBanner message={product.error.message} retry={product.reload} /> : null}
      <ReferencePanel>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_120px_150px_160px_170px]">
          <SearchControl value={query} onChange={setQuery} placeholder="Search collections by name, symbol, or token mint..." />
          <ReferenceButton tone="ghost" icon={Filter}>Filters</ReferenceButton>
          <ReferenceButton tone="ghost">All Status</ReferenceButton>
          <ReferenceButton tone="ghost">All Networks</ReferenceButton>
          <ReferenceButton tone="ghost">Sort: Recently Updated</ReferenceButton>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <ReferenceMetric label="All Collections" value={formatMetric(collections.length || product.data?.stats?.collections)} asset={phewProtocolIconAssets.community} />
          <ReferenceMetric label="Launched" value={formatMetric(collections.filter((c) => /launch/i.test(c.launchStatus ?? "")).length || null)} asset={phewProtocolIconAssets.reserve} />
          <ReferenceMetric label="In Review" value={formatMetric(collections.filter((c) => /review/i.test(c.launchStatus ?? "")).length || null)} asset={phewProtocolIconAssets.proof} />
          <ReferenceMetric label="Not Launched" value={formatMetric(collections.filter((c) => !/launch/i.test(c.launchStatus ?? "")).length || null)} asset={phewProtocolIconAssets.strategy} />
          <ReferenceMetric label="Paused" value={formatMetric(collections.filter((c) => c.reserveHealth === "PAUSED").length || null)} asset={phewProtocolIconAssets.lockTokens} />
          <ReferenceMetric label="Archived" value="N/A" asset={phewProtocolIconAssets.redeem} />
        </div>
      </ReferencePanel>
      <ReferenceTable
        columns={["Collection", "Symbol", "Token Mint", "Network", "Reserve Health", "Launch Gate", "Profile Gate", "Mint Gate", "TVL", "Floor", "Holders", "Updated"]}
        rows={visible.map((collection) => [
          <CollectionIdentity key="id" collection={collection} />,
          collection.symbol,
          shortAddress(collection.tokenMint),
          collection.chain || "Solana",
          <span key="reserve">{collection.reserveHealth ?? "N/A"}<br /><small className="text-slate-500">Backend pending</small></span>,
          gateLabel(collection.launchGatePassed),
          gateLabel(collection.profileGatePassed),
          collection.mintEligible ? "Open" : "Closed",
          formatCurrency(null),
          formatSol(collection.floorSol),
          formatMetric(collection.holders),
          "N/A"
        ])}
        empty={<ReferenceEmpty mascot mascotMood="proof" title="No collections found" body={collections.length ? "Try adjusting your search or filters." : "No backend collections were returned. Demo rows are not rendered."} action={query ? <ReferenceButton tone="outline" onClick={() => setQuery("")}>Clear Filters</ReferenceButton> : undefined} />}
      />
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>Showing {visible.length} of {collections.length} collections</span>
        <div className="flex gap-2">
          <LockedButton>Prev</LockedButton>
          <LockedButton>Next</LockedButton>
        </div>
      </div>
    </ReferenceShell>
  );
}

export function CollectionDetailReferencePage({ id }: { id: string }) {
  const product = useProductData(`/product/collections/${encodeURIComponent(id)}`);
  const collection = product.data?.collection ?? product.data?.collections?.[0] ?? null;
  const nfts = product.data?.nfts ?? [];

  return (
    <ReferenceShell active="collections" stats={product.data?.stats}>
      {product.error ? <BackendUnavailableBanner message={product.error.message} retry={product.reload} /> : null}
      {!collection ? (
        <div className="space-y-4">
          <ReferenceHeader
            eyebrow={<><ReferenceBadge tone="muted">Collections</ReferenceBadge><ReferenceBadge tone={product.loading ? "cyan" : product.error ? "red" : "gold"}>{product.loading ? "Loading" : product.error ? "Backend" : "N/A data"}</ReferenceBadge></>}
            title={product.loading ? "Loading Collection" : "Collection Not Available"}
            subtitle="This route keeps the collection-detail geometry while waiting for backend collection data. No static demo collection is rendered."
            mascot
            mascotPose={product.error ? "error" : product.loading ? "loading" : "explorer"}
            actions={<ReferenceButton href="/collections" tone="outline">Back to Collections</ReferenceButton>}
          />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
            <main className="space-y-4">
              <ReferencePanel title="Collection Identity">
                <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
                  <div className="grid aspect-square place-items-center rounded-lg border border-dashed border-vault-line bg-black/25">
                    <img src={brandAssets.nftSlot} alt="" className="size-20 object-contain opacity-85" />
                  </div>
                  <ReferenceRows rows={[
                    { label: "Requested ID", value: shortAddress(id) },
                    { label: "Collection", value: "N/A" },
                    { label: "Symbol", value: "N/A" },
                    { label: "Token Mint", value: "N/A" },
                    { label: "Launch Status", value: product.loading ? "Loading" : "N/A", tone: product.loading ? "cyan" : "gold" }
                  ]} />
                </div>
              </ReferencePanel>
              <ReferencePanel title="Vault NFTs">
                <ReferenceTable
                  columns={["Vault NFT", "Token ID", "Backing", "Status", "Owner", "Minted At"]}
                  rows={[]}
                  empty={<ReferenceEmpty mascotMood="proof" title="No vault NFTs returned" body="Vault rows appear only when the backend returns real NFTs for this collection." />}
                />
              </ReferencePanel>
            </main>
            <aside className="space-y-4">
              <ReferencePanel title="Reserve Health">
                <ReferenceRows rows={[
                  { label: "Backing Status", value: "N/A" },
                  { label: "Reserve Ratio", value: "N/A" },
                  { label: "Reserve PDA", value: "N/A" }
                ]} />
              </ReferencePanel>
              <ReferencePanel title="Collection Actions">
                <div className="grid gap-2">
                  <LockedButton>Mint Vault NFT</LockedButton>
                  <LockedButton>Stake Vault NFT</LockedButton>
                  <LockedButton>Redeem Vault NFT</LockedButton>
                  <LockedButton>View Proof</LockedButton>
                </div>
              </ReferencePanel>
            </aside>
          </div>
        </div>
      ) : (
        <>
          <section className="ref-panel ref-collection-detail-hero relative overflow-hidden p-4">
            <img src={collection.banner || collection.image || brandAssets.pageHeroes.collections} alt="" className="absolute inset-0 h-full w-full object-cover opacity-38" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.92),rgba(0,0,0,0.72)_48%,rgba(0,0,0,0.5)),radial-gradient(circle_at_78%_12%,rgba(186,255,0,0.18),transparent_32%)]" />
            <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_300px_300px]">
              <img src={collection.image || brandAssets.nftSlot} alt="" className="aspect-square w-full rounded-lg border border-vault-line bg-black/35 object-cover" />
              <div className="min-w-0 self-center">
                <p className="text-sm text-slate-400">Collections / {collection.symbol}</p>
                <h1 className="mt-2 break-words text-4xl font-black text-white">{collection.name}</h1>
                <p className="mt-2 text-sm text-slate-300">{collection.description || collection.subtitle || "N/A"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ReferenceBadge tone="green">Phew Verified</ReferenceBadge>
                  <ReferenceBadge tone="cyan">DAO Controlled</ReferenceBadge>
                  <ReferenceBadge tone="muted">{collection.launchStatus ?? "N/A"}</ReferenceBadge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <MiniFact label="Token Mint" value={shortAddress(collection.tokenMint)} />
                  <MiniFact label="Network" value={collection.chain || "Solana"} />
                  <MiniFact label="Created By" value="N/A" />
                  <MiniFact label="Launched" value={collection.launchStatus ?? "N/A"} />
                </div>
              </div>
              <ReferencePanel title="Reserve Health" className="h-full">
                <div className="grid place-items-center rounded-lg border border-vault-green/30 bg-vault-green/5 p-6 text-center">
                  <ShieldCheck className="size-16 text-vault-green" />
                  <p className="mt-2 text-2xl font-black text-vault-green">{collection.reserveRatioBps ? `${collection.reserveRatioBps / 100}%` : "N/A"}</p>
                </div>
                <ReferenceRows className="mt-3" rows={[
                  { label: "Backing Status", value: collection.reserveHealth ?? "N/A" },
                  { label: "Reserve Ratio", value: collection.reserveRatioBps ? `${collection.reserveRatioBps} bps` : "N/A" },
                  { label: "Proof Status", value: collection.reserveVaultPda ? "Available" : "Unverified" }
                ]} />
                <ReferenceButton href={`/collections/${collection.id}/proof`} tone="ghost" className="mt-3 w-full" disabled={!collection.reserveVaultPda}>View Reserve Proof</ReferenceButton>
              </ReferencePanel>
              <ReferencePanel title="Launch Status" className="h-full">
                <ReferenceRows rows={[
                  { label: "Launch Status", value: collection.launchStatus ?? "Not Launched", tone: collection.launchGatePassed ? "green" : "gold" },
                  { label: "Mint Eligibility", value: collection.mintEligible ? "Eligible" : "Not Eligible" },
                  { label: "Total Vault NFTs", value: formatMetric(collection.vaults) },
                  { label: "Collection Size", value: formatMetric(collection.supply) },
                  { label: "Metadata URI", value: "N/A" }
                ]} />
              </ReferencePanel>
            </div>
          </section>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <main className="space-y-4">
              <ReferencePanel title="Collection Overview">
                <div className="grid gap-3 md:grid-cols-4">
                  <ReferenceMetric label="Total Value Locked" value={formatCurrency(null)} />
                  <ReferenceMetric label="Floor Price (PH3W)" value={formatSol(collection.floorSol)} />
                  <ReferenceMetric label="Total Volume" value={formatSol(collection.volumeSol)} />
                  <ReferenceMetric label="Unique Holders" value={formatMetric(collection.holders)} />
                  <ReferenceMetric label="Total Trades" value="N/A" />
                  <ReferenceMetric label="24H Volume" value={formatSol(collection.volume24hSol)} />
                  <ReferenceMetric label="24H Sales" value={formatMetric(collection.sales)} />
                  <ReferenceMetric label="Average Price" value="N/A" />
                </div>
              </ReferencePanel>
              <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
                <ReferencePanel title="Reserve Proof">
                  <ReferenceRows rows={[
                    { label: "Proof Type", value: "N/A" },
                    { label: "Last Verified", value: "N/A" },
                    { label: "Next Verification", value: "N/A" },
                    { label: "Proof Hash", value: "N/A" }
                  ]} />
                  <InlineProtocolStatus className="mt-3" asset={brandAssets.proofRing} title="Proof moment" body="Large proof animation now appears only after a verified proof success." />
                </ReferencePanel>
                <ReferencePanel title="Vault NFTs" action={<SearchControl value="" onChange={() => undefined} placeholder="Search token ID..." />}>
                  <ReferenceTable
                    columns={["Vault NFT", "Token ID", "Backing", "Status", "Owner", "Minted At"]}
                    rows={nfts.map((nft) => [
                      <CollectionIdentity key={nft.id} image={nft.image} title={nft.name} subtitle={collection.symbol} />,
                      nft.number ? `#${nft.number}` : shortAddress(nft.mint),
                      nft.lockedAmount || "N/A",
                      nft.status,
                      "N/A",
                      "N/A"
                    ])}
                    empty={<ReferenceEmpty mascotMood="proof" title="No vault NFTs returned" body="Vault rows appear only when the backend returns real NFTs for this collection." />}
                  />
                </ReferencePanel>
              </div>
            </main>
            <aside className="space-y-4">
              <ReferencePanel title="Collection Actions" subtitle="Actions are gated by backend verification and launch requirements.">
                <div className="grid gap-2">
                  <LockedButton>Mint Vault NFT</LockedButton>
                  <LockedButton>Stake Vault NFT</LockedButton>
                  <LockedButton>Redeem Vault NFT</LockedButton>
                  <LockedButton>View Marketplace</LockedButton>
                </div>
              </ReferencePanel>
              <ReferencePanel title="Mint Moment">
                <InlineProtocolStatus asset={brandAssets.pictograms.mintNft} title="Post-success modal" body="Mint celebration is skippable and opens only after backend confirmation." />
              </ReferencePanel>
              <ReferencePanel title="Collection Activity">
                <ReferenceEmpty title="No activity yet" body="Mints, trades, and raids will appear here." object={brandAssets.nftSlot} />
              </ReferencePanel>
            </aside>
          </div>
        </>
      )}
    </ReferenceShell>
  );
}

export function MintReferencePage() {
  const wallet = useWalletAuth();
  const tokenEndpoint = wallet.address ? `/product/wallet-tokens?wallet=${encodeURIComponent(wallet.address)}` : "/product/wallet-tokens";
  const walletTokens = useApiResource<WalletTokensResponse>(tokenEndpoint, { enabled: wallet.connected && Boolean(wallet.address) });
  const data = unwrapApiData(walletTokens.data) ?? walletTokens.data ?? null;
  const tokens = data?.tokens ?? [];
  const communityTokens = tokens.filter((token) => token.communityStatus === "COMMUNITY_EXISTS");
  const noCommunityTokens = tokens.filter((token) => token.communityStatus === "NO_COMMUNITY");

  return (
    <ReferenceShell active="mint">
      <section className="ref-panel ref-hero relative overflow-visible p-4 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid min-h-[250px] gap-4 overflow-hidden rounded-lg border border-vault-line bg-[radial-gradient(circle_at_70%_45%,rgba(186,255,0,0.24),transparent_34%),linear-gradient(135deg,rgba(186,255,0,0.06),rgba(22,215,210,0.03),rgba(0,0,0,0.7))] p-5 md:grid-cols-[minmax(0,1fr)_420px]">
            <div className="self-center">
              <ReferenceBadge tone="green">Phew Mint</ReferenceBadge>
              <h1 className="mt-4 max-w-xl text-[42px] font-black leading-none text-white sm:text-[56px]">Mint Your <span className="text-vault-green">Vault</span></h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-slate-300">Turn detected wallet tokens into verifiable, token-backed NFT vaults. Existing communities and no-community paths stay separated.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ReferenceButton icon={RefreshCcw} disabled={!wallet.connected}>Auto-Detect Tokens</ReferenceButton>
                <ReferenceButton href="/goal" tone="outline">How It Works</ReferenceButton>
              </div>
            </div>
            <div className="ref-hero-mascot-stage min-h-[220px]">
              <span className="ref-hero-ring" />
              <img src={brandAssets.vaultSafe} alt="" className="absolute bottom-6 right-4 h-36 w-36 object-contain drop-shadow-[0_0_28px_rgba(186,255,0,0.35)] sm:h-48 sm:w-48" />
              <PhewMascot mood="mint" size="lg" className="ref-free-mascot !bottom-4 !left-[36%] !w-48 sm:!w-56" />
              <img src={brandAssets.tokenObject} alt="" className="absolute right-40 top-8 size-14 object-contain drop-shadow-[0_0_18px_rgba(186,255,0,0.42)]" />
            </div>
          </div>
          <aside className="space-y-4">
            <ReferencePanel title="Your Mint Stats">
              <div className="grid grid-cols-2 gap-3">
                <ReferenceMetric label="Total Eligible" value={wallet.connected ? formatMetric(data?.stats?.mintEligible ?? tokens.length) : "N/A"} asset={phewProtocolIconAssets.lockTokens} />
                <ReferenceMetric label="Communities" value={wallet.connected ? formatMetric(data?.stats?.communityMatches ?? communityTokens.length) : "N/A"} asset={phewProtocolIconAssets.community} />
                <ReferenceMetric label="Vaults Minted" value="N/A" asset={phewProtocolIconAssets.mintNft} />
                <ReferenceMetric label="Total Value" value={wallet.connected ? formatWalletTokenValue(tokens) : "N/A"} asset={phewProtocolIconAssets.reserve} />
              </div>
            </ReferencePanel>
            <ReferencePanel title="Ready To Mint?">
              <InlineProtocolStatus asset={brandAssets.pictograms.mintNft} title={wallet.connected ? "Select a token below" : "Wallet required"} body={wallet.connected ? "Mint action is enabled only for backend-eligible community token rows." : "Connect a wallet to load SPL token balances."} />
            </ReferencePanel>
          </aside>
        </div>
      </section>

      {walletTokens.error ? <BackendUnavailableBanner message={walletTokens.error.message} retry={walletTokens.reload} /> : null}
      {!wallet.connected ? <WalletRequiredBanner action={<ReferenceButton>Connect Wallet</ReferenceButton>} /> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-4">
          <ReferencePanel
            title="Detected Tokens in Your Wallet"
            subtitle={wallet.connected ? `Wallet scan returned ${tokens.length} token rows.` : "Connect wallet to scan live token balances."}
            action={<ReferenceButton icon={RefreshCcw} tone="ghost" disabled={!wallet.connected} onClick={walletTokens.reload}>Refresh</ReferenceButton>}
          >
            <div className="mb-3 flex flex-wrap gap-2">
              <ReferenceBadge tone="green">All Eligible ({wallet.connected ? tokens.length : "N/A"})</ReferenceBadge>
              <ReferenceBadge tone="cyan">Community Exists ({wallet.connected ? communityTokens.length : "N/A"})</ReferenceBadge>
              <ReferenceBadge tone="gold">No Community ({wallet.connected ? noCommunityTokens.length : "N/A"})</ReferenceBadge>
            </div>
            <ReferenceTable
              columns={["Token", "Balance", "Value (USD)", "Community / Collection", "Action"]}
              rows={tokens.map((token) => [
                <TokenIdentity key="token" token={token} />,
                `${formatWalletTokenBalance(token)} ${token.symbol ?? ""}`.trim(),
                formatWalletTokenValue([token]),
                <CollectionIdentity key="collection" image={token.collectionImage ?? undefined} title={token.collectionName ?? (token.communityStatus === "NO_COMMUNITY" ? "No Community Yet" : "N/A")} subtitle={token.reserveHealth ?? token.collectionSlug ?? "N/A"} />,
                token.communityStatus === "COMMUNITY_EXISTS" ? <ReferenceButton key="action" href={token.collectionSlug ? `/collections/${token.collectionSlug}` : "/collections"} tone={token.mintEligible ? "primary" : "outline"}>{token.mintEligible ? "Mint here" : "Community gated"}</ReferenceButton> : <ReferenceButton key="action" href={`/create-community?token=${encodeURIComponent(token.mint)}`} tone="outline">Create Community</ReferenceButton>
              ])}
              empty={<ReferenceEmpty mascotMood="mint" title={wallet.connected ? "No token rows" : "Wallet scan required"} body={wallet.connected ? "No live SPL token balances were returned by the backend." : "Connect a wallet to load eligible tokens."} />}
            />
          </ReferencePanel>
        </main>
        <aside className="space-y-4">
          <ReferencePanel title="Mint Options">
            <div className="grid gap-3">
              <ReferenceButton href={communityTokens[0]?.collectionSlug ? `/collections/${communityTokens[0].collectionSlug}` : "/collections"} asset={phewProtocolIconAssets.community} disabled={!communityTokens.length}>Mint to Existing Community</ReferenceButton>
              <ReferenceButton href="/create-community" tone="outline" asset={phewProtocolIconAssets.raid}>Create New Community</ReferenceButton>
            </div>
          </ReferencePanel>
          <ReferencePanel title="How It Works">
            <ReferenceStepper steps={["Detect Tokens", "Choose Action", "Lock & Verify", "Mint NFT", "Build & Grow"]} activeIndex={wallet.connected ? 1 : 0} />
          </ReferencePanel>
          <ReferencePanel title="Not Seeing a Token?">
            <InlineProtocolStatus asset={brandAssets.tokenObject} title="Backend scan only" body="Refresh wallet inventory or create a community from a known SPL token mint." />
          </ReferencePanel>
        </aside>
      </div>
    </ReferenceShell>
  );
}

export function MarketplaceReferencePage() {
  const product = useProductData("/product/marketplace");
  const data = product.data;
  const nfts = data?.nfts ?? [];
  const collections = data?.collections ?? [];
  const listings = data?.listings ?? [];
  const items = nfts.length ? nfts : listings.slice(0, 8).map(listingToVaultLike);

  return (
    <ReferenceShell active="marketplace" stats={data?.stats}>
      <section className="ref-panel ref-hero relative overflow-visible p-4 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid min-h-[250px] gap-4 overflow-hidden rounded-lg border border-vault-line bg-[radial-gradient(circle_at_70%_42%,rgba(186,255,0,0.23),transparent_34%),linear-gradient(135deg,rgba(186,255,0,0.06),rgba(22,215,210,0.04),rgba(0,0,0,0.72))] p-5 md:grid-cols-[minmax(0,1fr)_430px]">
            <div className="self-center">
              <ReferenceBadge tone="green">Phew Market</ReferenceBadge>
              <h1 className="mt-4 max-w-xl text-[42px] font-black leading-none text-white sm:text-[56px]">Market<span className="text-vault-green">place</span></h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-slate-300">Trade verified, token-backed NFT vaults. Value, ask price, offer, and reserve health are always shown separately.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ReferenceButton href="/collections">Explore Collections</ReferenceButton>
                <ReferenceButton href="/profile" tone="outline">Sell Your Vault</ReferenceButton>
              </div>
            </div>
            <div className="ref-hero-mascot-stage min-h-[220px]">
              <span className="ref-hero-ring" />
              <img src={brandAssets.generatedIcons.marketplace} alt="" className="absolute bottom-8 right-16 h-40 w-40 object-contain drop-shadow-[0_0_32px_rgba(186,255,0,0.38)] sm:h-52 sm:w-52" />
              <PhewMascot mood="running" size="lg" className="ref-free-mascot !bottom-5 !left-[35%] !w-48 sm:!w-56" />
              <img src={brandAssets.nftSlot} alt="" className="absolute right-12 top-6 size-14 rotate-12 object-contain drop-shadow-[0_0_18px_rgba(22,215,210,0.45)]" />
            </div>
          </div>
          <aside className="space-y-4">
            <ReferencePanel title="Market Overview" action={<ReferenceBadge tone="green">24H</ReferenceBadge>}>
              <div className="grid grid-cols-2 gap-3">
                <ReferenceMetric label="Volume" value={formatSol(data?.marketSnapshot?.volume24hSol ?? data?.stats?.volume24hSol)} />
                <ReferenceMetric label="Sales" value={formatMetric(data?.marketSnapshot?.sales24h ?? data?.stats?.sales24h)} />
                <ReferenceMetric label="Avg. Price" value={formatSol(data?.marketSnapshot?.avgPriceSol)} />
                <ReferenceMetric label="Listed" value={formatMetric(items.length || data?.stats?.listed)} />
              </div>
              <ReferenceMetric className="mt-3" label="Total Value Locked (Market)" value={formatSol(data?.stats?.tvlSol ?? data?.stats?.marketTvlSol)} detail={formatCurrency(data?.stats?.tvlUsd)} />
            </ReferencePanel>
          </aside>
        </div>
      </section>
      {product.error ? <BackendUnavailableBanner message={product.error.message} retry={product.reload} /> : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-4">
          <ReferencePanel>
            <div className="mb-4 grid gap-3 lg:grid-cols-[repeat(4,max-content)_minmax(220px,1fr)_100px]">
              {["All Items", "Vault NFTs", "Collections", "Bundles"].map((label, index) => <ReferenceBadge key={label} tone={index === 0 ? "green" : "muted"} className="justify-center px-4 py-2">{label}</ReferenceBadge>)}
              <ReferenceInput placeholder="Search items or collections..." />
              <ReferenceButton tone="outline" icon={Filter}>Filter</ReferenceButton>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {items.map((vault, index) => <MarketVaultCard key={vault.id || index} vault={vault} collection={collections.find((collection) => collection.id === vault.collectionId || collection.dbId === vault.collectionId)} />)}
            </div>
            {!items.length ? <ReferenceEmpty title="No marketplace listings" body="Marketplace stays empty until backend returns verified Vault NFT listings." mascotMood="loading" /> : null}
          </ReferencePanel>
          <ReferencePanel>
            <div className="grid gap-3 md:grid-cols-4">
              {[
                ["100% Verified", "All vaults are checked through proof routes.", phewProtocolIconAssets.proof],
                ["Secure Trades", "Escrow and purchase intents stay backend-gated.", phewProtocolIconAssets.lockTokens],
                ["Community First", "Listings preserve collection context.", phewProtocolIconAssets.community],
                ["Rewards Enabled", "Trade activity can feed rewards.", phewProtocolIconAssets.stake]
              ].map(([title, body, asset]) => <InlineProtocolStatus key={title} asset={asset} title={title} body={body} />)}
            </div>
          </ReferencePanel>
        </main>
        <aside className="space-y-4">
          <ReferencePanel title="Top Collections" action={<ReferenceButton href="/collections" tone="ghost">View all</ReferenceButton>}>
            <CompactList rows={collections.slice(0, 5).map((collection) => ({ image: collection.image, title: collection.name, subtitle: `Floor ${formatSol(collection.floorSol)}`, value: formatSol(collection.volumeSol) }))} empty="Top collection rows load from backend marketplace data." />
          </ReferencePanel>
          <ReferencePanel title="Recent Activity">
            <CompactList rows={activityRows(data).slice(0, 5)} empty="Sales and listings appear after real marketplace activity." />
          </ReferencePanel>
          <ReferencePanel title="List Your Vault">
            <InlineProtocolStatus asset={brandAssets.vaultSafe} title="Listing flow gated" body="Create listing is available only for wallet-owned, proof-valid vault NFTs." />
            <ReferenceButton href="/profile" className="mt-3 w-full">List Now</ReferenceButton>
          </ReferencePanel>
        </aside>
      </div>
    </ReferenceShell>
  );
}

export function ProfileReferencePage() {
  const wallet = useWalletAuth();
  const endpoint = wallet.address ? `/product/profile?wallet=${encodeURIComponent(wallet.address)}` : "/product/profile";
  const product = useProductData(endpoint, wallet.connected);
  const data = product.data;
  const nfts = data?.nfts ?? [];
  const staked = nfts.filter((vault) => vault.status === "Staked");
  const available = nfts.filter((vault) => vault.status !== "Staked");

  return (
    <ReferenceShell active="my-vaults" stats={data?.stats}>
      <section className="ref-panel ref-hero relative overflow-visible p-4 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="grid min-h-[260px] gap-4 overflow-hidden rounded-lg border border-vault-line bg-[radial-gradient(circle_at_70%_45%,rgba(186,255,0,0.19),transparent_35%),linear-gradient(135deg,rgba(120,44,255,0.11),rgba(22,215,210,0.04),rgba(0,0,0,0.75))] p-5 md:grid-cols-[160px_minmax(0,1fr)_360px]">
            <div className="self-center">
              <div className="grid size-32 place-items-center rounded-full border border-vault-green/55 bg-vault-green/8 shadow-green">
                <PhewMascot mood="idle" size="md" />
              </div>
              <ReferenceBadge tone={wallet.connected ? "green" : "gold"} className="mt-3">{wallet.connected ? "Online" : "Wallet required"}</ReferenceBadge>
            </div>
            <div className="self-center">
              <p className="text-sm text-slate-400">Home / Profile</p>
              <h1 className="mt-4 text-[34px] font-black leading-tight text-white sm:text-[44px]">{wallet.address ? shortAddress(wallet.address, 4) : "Wallet Portfolio"}</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-slate-300">Building the future of communities on Phew. Verify, stake, earn, trade, and redeem from one portfolio.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <MiniFact label="Member Since" value="N/A" />
                <MiniFact label="Wallet" value={shortAddress(wallet.address, 4)} />
                <MiniFact label="Network" value="Solana Devnet" />
                <MiniFact label="Rank" value="N/A" />
              </div>
            </div>
            <div className="ref-hero-mascot-stage min-h-[210px]">
              <span className="ref-hero-ring" />
              <PhewMascot mood="success" size="lg" className="ref-free-mascot !bottom-1 !left-[48%] !w-52" />
              <img src={brandAssets.proofRing} alt="" className="absolute right-10 top-8 size-16 object-contain" />
            </div>
          </div>
          <aside className="space-y-4">
            <ReferencePanel title="Wallet Overview" action={<ReferenceButton href="/my-vaults" tone="ghost">View full wallet</ReferenceButton>}>
              <ReferenceMetric label="Total Wallet Value" value={formatSol(data?.stats?.walletValueSol ?? data?.stats?.totalWalletValueSol)} detail={formatCurrency(data?.stats?.walletValueUsd)} />
              <ReferenceRows className="mt-3" rows={[
                { label: "Locked in Vaults", value: formatSol(sumVaultNumber(nfts, "backingSol")) },
                { label: "Staked NFTs", value: formatSol(sumVaultNumber(staked, "backingSol")) },
                { label: "Available Balance", value: "N/A" }
              ]} />
            </ReferencePanel>
          </aside>
        </div>
      </section>
      {!wallet.connected ? <WalletRequiredBanner action={<ReferenceButton>Connect Wallet</ReferenceButton>} /> : null}
      {product.error ? <BackendUnavailableBanner message={product.error.message} retry={product.reload} /> : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <ReferenceMetric label="Total Value Locked" value={formatSol(sumVaultNumber(nfts, "backingSol"))} asset={phewProtocolIconAssets.lockTokens} />
            <ReferenceMetric label="Total Vaults" value={formatMetric(nfts.length || data?.stats?.nfts)} asset={phewProtocolIconAssets.mintNft} />
            <ReferenceMetric label="Total Rewards" value={formatMetric(data?.stats?.claimableRewards)} asset={phewProtocolIconAssets.stake} />
            <ReferenceMetric label="Raid XP" value={formatMetric(data?.stats?.raidXp)} asset={phewProtocolIconAssets.raid} />
            <ReferenceMetric label="Proofs Verified" value={formatMetric(data?.stats?.proofsVerified)} asset={phewProtocolIconAssets.proof} />
            <ReferenceMetric label="Communities" value={formatMetric(data?.stats?.communities ?? data?.collections?.length)} asset={phewProtocolIconAssets.community} />
          </div>
          <ReferencePanel title="Your NFTs">
            <div className="mb-4 flex flex-wrap gap-2">
              <ReferenceBadge tone="green">Staked NFTs ({staked.length})</ReferenceBadge>
              <ReferenceBadge tone="cyan">Available to Stake ({available.length})</ReferenceBadge>
            </div>
            <div className="space-y-5">
              <VaultShelf title="Staked NFTs (Earning)" vaults={staked} actionLabel="Earning" />
              <VaultShelf title="Available to Stake" vaults={available} actionLabel="Stake Now" />
            </div>
          </ReferencePanel>
        </main>
        <aside className="space-y-4">
          <ReferencePanel title="Staking Overview">
            <div className="grid grid-cols-3 gap-3">
              <ReferenceMetric label="Total Staked NFTs" value={formatMetric(staked.length || data?.stats?.totalStakedVaults)} />
              <ReferenceMetric label="Total Staked Value" value={formatSol(sumVaultNumber(staked, "backingSol"))} />
              <ReferenceMetric label="Rewards Earned" value={formatMetric(data?.stats?.totalRewards)} />
            </div>
            <ReferenceButton href="/staking" className="mt-3 w-full">Stake More NFTs</ReferenceButton>
          </ReferencePanel>
          <ReferencePanel title="Rewards Overview">
            <ReferenceMetric label="Claimable" value={formatMetric(data?.stats?.claimableRewards)} detail="PHEW" />
            <LockedButton>Claim Rewards</LockedButton>
          </ReferencePanel>
          <ReferencePanel title="Achievements">
            <CompactList rows={[
              { title: "OG Community Member", subtitle: "Joined an OG community", value: nfts.length ? "Active" : "N/A" },
              { title: "Raid Master", subtitle: "Participated in raids", value: formatMetric(data?.stats?.raidXp) },
              { title: "Proof Verifier", subtitle: "Verified proof routes", value: formatMetric(data?.stats?.proofsVerified) }
            ]} empty="Achievements are calculated from backend portfolio data." />
          </ReferencePanel>
        </aside>
      </div>
    </ReferenceShell>
  );
}

export function RedeemReferencePage() {
  const wallet = useWalletAuth();
  const endpoint = wallet.address ? `/product/profile?wallet=${encodeURIComponent(wallet.address)}` : "/product/profile";
  const product = useProductData(endpoint, wallet.connected);
  const data = product.data;
  const nfts = data?.nfts ?? [];
  const redeemable = nfts.filter((vault) => vault.status === "Redeemable" && vault.mint);
  const selected = redeemable[0] ?? null;

  return (
    <ReferenceShell active="redeem" stats={data?.stats}>
      <ReferenceHeader
        eyebrow={<><ReferenceBadge tone="green">Redeem</ReferenceBadge><ReferenceBadge tone="cyan">Proof-first flow</ReferenceBadge></>}
        title="Redeem Vault NFTs"
        subtitle="Select a wallet-owned redeemable vault, verify proof, build the transaction, then submit after wallet signature."
        mascotPose="redeem"
        aside={<div className="grid gap-3 sm:grid-cols-3"><ReferenceMetric label="Eligible" value={wallet.connected ? formatMetric(redeemable.length) : "N/A"} /><ReferenceMetric label="Locked Value" value={formatSol(sumVaultNumber(redeemable, "backingSol"))} /><ReferenceMetric label="Selected" value={selected ? "Ready" : "N/A"} /></div>}
      />
      {!wallet.connected ? <WalletRequiredBanner action={<ReferenceButton>Connect Wallet</ReferenceButton>} /> : null}
      {product.error ? <BackendUnavailableBanner message={product.error.message} retry={product.reload} /> : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-4">
          <ReferencePanel title="Eligible Wallet-Owned Vault NFTs">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {redeemable.map((vault, index) => <VaultSlot key={vault.id} vault={vault} selected={index === 0} />)}
            </div>
            {!redeemable.length ? <ReferenceEmpty mascotMood="redeem" title="No redeemable vault NFTs" body={wallet.connected ? "No wallet-owned vaults are currently redeemable." : "Connect wallet to load redeemable vault inventory."} /> : null}
          </ReferencePanel>
          <ReferencePanel title="Redeem Checks">
            <div className="grid gap-3 md:grid-cols-4">
              <CheckRow label="Wallet connected" ok={wallet.connected} />
              <CheckRow label="Vault selected" ok={Boolean(selected)} />
              <CheckRow label="Proof verified" ok={null} />
              <CheckRow label="Tx built" ok={null} />
            </div>
          </ReferencePanel>
        </main>
        <aside className="space-y-4">
          <ReferencePanel title="Selected Vault">
            {selected ? <VaultSlot vault={selected} selected /> : <ReferenceEmpty mascotMood="redeem" title="Vault" body="N/A" />}
            <ReferenceRows className="mt-3" rows={[
              { label: "NFT Mint", value: shortAddress(selected?.mint) },
              { label: "Locked Tokens", value: selected?.lockedAmount ?? "N/A" },
              { label: "Backing Value", value: selected ? formatCurrency(selected.backingUsd) : "N/A" },
              { label: "Status", value: selected?.status ?? "N/A" }
            ]} />
          </ReferencePanel>
          <ReferencePanel title="Proof + Redeem Flow">
            <ReferenceStepper steps={["Proof", "Build", "Sign", "Submit", "Return Tokens"]} activeIndex={selected ? 1 : 0} />
            <div className="mt-3 grid gap-2">
              <LockedButton>Check Proof</LockedButton>
              <LockedButton>Build Redeem Tx</LockedButton>
              <LockedButton>Sign + Submit</LockedButton>
            </div>
          </ReferencePanel>
        </aside>
      </div>
    </ReferenceShell>
  );
}

export function GoalReferencePage() {
  const loop = [
    ["01", "Scan Wallet", "Detect SPL tokens and map balances to community status.", phewProtocolIconAssets.proof],
    ["02", "Create Community", "Launch a token community when no verified collection exists.", phewProtocolIconAssets.community],
    ["03", "Lock Tokens", "Move real token backing into protocol-controlled reserve state.", phewProtocolIconAssets.lockTokens],
    ["04", "Mint Vault NFT", "Issue a collection NFT that points to backing and proof.", phewProtocolIconAssets.mintNft],
    ["05", "Stake / Redeem / Trade", "Earn, exit, or list while preserving reserve clarity.", phewProtocolIconAssets.stake],
    ["06", "Raids + Leaderboards", "Coordinate community missions and reward verified builders.", phewProtocolIconAssets.raid]
  ];

  return (
    <ReferenceShell active="goal">
      <section className="ref-panel ref-hero relative overflow-visible p-4 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="grid min-h-[280px] gap-4 overflow-hidden rounded-lg border border-vault-line bg-[radial-gradient(circle_at_68%_40%,rgba(186,255,0,0.24),transparent_34%),linear-gradient(135deg,rgba(120,44,255,0.1),rgba(22,215,210,0.05),rgba(0,0,0,0.72))] p-5 md:grid-cols-[minmax(0,1fr)_430px]">
            <div className="self-center">
              <ReferenceBadge tone="green">TokenToo / Phew Loop</ReferenceBadge>
              <h1 className="mt-4 max-w-3xl text-[38px] font-black leading-none text-white sm:text-[54px]">Turn tokens into <span className="text-vault-green">community-owned vault economies.</span></h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">Phew scans a wallet, routes tokens to communities, locks backing, mints proof-linked Vault NFTs, then lets holders stake, redeem, trade, raid, and climb the protocol leaderboard.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ReferenceButton href="/mint">Start With Mint</ReferenceButton>
                <ReferenceButton href="/collections" tone="outline">Explore Collections</ReferenceButton>
              </div>
            </div>
            <div className="ref-hero-mascot-stage min-h-[230px]">
              <span className="ref-hero-ring" />
              <PhewMascot mood="running" size="lg" className="ref-free-mascot !bottom-3 !left-[42%] !w-56" />
              <img src={brandAssets.vaultSafe} alt="" className="absolute bottom-7 right-2 h-40 w-40 object-contain" />
              <img src={brandAssets.tokenStack} alt="" className="absolute right-24 top-7 size-16 object-contain" />
            </div>
          </div>
          <ReferencePanel title="Protocol Outcome">
            <ReferenceRows rows={[
              { label: "Frontend promise", value: "Wallet-aware token-to-vault loop" },
              { label: "Financial clarity", value: "Value and price are separate" },
              { label: "Trust model", value: "Proof before action" },
              { label: "Community layer", value: "Raids, rewards, leaderboard" }
            ]} />
          </ReferencePanel>
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-4">
          <ReferencePanel title="Full Product Loop">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {loop.map(([stage, title, body, asset]) => (
                <div key={stage} className="rounded-lg border border-vault-line bg-black/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-vault-green">{stage}</span>
                    <img src={asset} alt="" className="size-10 object-contain" />
                  </div>
                  <h2 className="mt-5 text-lg font-black text-white">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
                </div>
              ))}
            </div>
          </ReferencePanel>
          <ReferencePanel title="Why The Loop Matters">
            <div className="grid gap-3 md:grid-cols-4">
              <ReferenceMetric label="Tokens" value="Input" asset={brandAssets.tokenObject} />
              <ReferenceMetric label="Vault NFT" value="Identity" asset={brandAssets.nftSlot} />
              <ReferenceMetric label="Proof" value="Trust" asset={brandAssets.proofRing} />
              <ReferenceMetric label="Raids" value="Growth" asset={phewProtocolIconAssets.raid} />
            </div>
          </ReferencePanel>
        </main>
        <aside className="space-y-4">
          <ReferencePanel title="Launch Path">
            <ReferenceStepper steps={["Scan", "Create", "Lock", "Mint", "Stake", "Raid"]} activeIndex={0} />
            <ReferenceButton href="/create-community" className="mt-4 w-full">Create Community</ReferenceButton>
          </ReferencePanel>
          <ReferencePanel title="Guardrails">
            <ReferenceRows rows={[
              { label: "No fake data", value: "N/A until backend" },
              { label: "No fake success", value: "Backend confirmed only" },
              { label: "No hidden risk", value: "Proof and reserve badges" },
              { label: "No generic flow", value: "Phew-native product loop" }
            ]} />
          </ReferencePanel>
        </aside>
      </div>
    </ReferenceShell>
  );
}

export function StakingReferencePage() {
  const wallet = useWalletAuth();
  const endpoint = wallet.address ? `/product/staking?wallet=${encodeURIComponent(wallet.address)}` : "/product/staking";
  const product = useProductData(endpoint, wallet.connected);
  const data = product.data;
  const eligible = data?.eligibleVaults ?? data?.nfts ?? [];
  const positions = data?.positions ?? [];
  const selected = eligible[0] ?? null;

  return (
    <ReferenceShell active="staking" stats={data?.stats}>
      <ReferenceHeader
        eyebrow={<ReferenceBadge tone="green">Staking</ReferenceBadge>}
        title="Staking"
        subtitle="Stake your eligible Vault NFTs to earn rewards and support the protocol."
        mascotPose="stake"
        aside={<div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-3"><ReferenceMetric label="Total Staked Vaults" value={formatMetric(data?.stats?.totalStakedVaults)} /><ReferenceMetric label="Total Rewards (PHEW)" value={formatMetric(data?.stats?.totalRewards)} /><ReferenceMetric label="Your Earned" value={formatMetric(data?.stats?.claimableRewards)} /></div>}
      />
      {!wallet.connected ? <WalletRequiredBanner action={<ReferenceButton>Connect Wallet</ReferenceButton>} /> : null}
      {product.error ? <BackendUnavailableBanner message={product.error.message} retry={product.reload} /> : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <main className="space-y-4">
          <ReferencePanel title="1. Eligible Vault NFTs" subtitle="Select an eligible Vault NFT to stake.">
            <div className="grid gap-3 lg:grid-cols-[minmax(280px,0.8fr)_repeat(4,minmax(140px,1fr))]">
              {!eligible.length ? (
              <ReferenceEmpty className="lg:col-span-5" mascotMood="stake" title="No eligible Vault NFTs" body={wallet.connected ? "No eligible vault NFTs were returned by the backend." : "Connect a wallet to view eligible vault NFTs."} action={<ReferenceButton href="/collections" tone="outline">Explore Vaults</ReferenceButton>} />
              ) : null}
              {eligible.slice(0, 4).map((vault, index) => <VaultSlot key={vault.id} vault={vault} selected={index === 0} />)}
            </div>
          </ReferencePanel>
          <ReferencePanel title="3. Your Active Staking Positions" action={<ReferenceButton tone="ghost">View History</ReferenceButton>}>
            <ReferenceTable
              columns={["Position ID", "Vault NFT", "Collection", "Staked At", "Lock Ends", "Rewards", "Status", "Actions"]}
              rows={positions.map((position, index) => [
                positionText(position, "id") || `#${index + 1}`,
                positionText(position, "vaultNft.name") || "N/A",
                positionText(position, "collection.name") || "N/A",
                positionText(position, "stakedAt") || "N/A",
                positionText(position, "lockEndsAt") || "N/A",
                positionText(position, "rewards") || "N/A",
                positionText(position, "status") || "N/A",
                <LockedButton key="action">Manage</LockedButton>
              ])}
              empty={<ReferenceEmpty mascotMood="stake" title="No active staking positions" body="Stake an eligible Vault NFT to start earning rewards." action={<ReferenceButton tone="outline">Stake a Vault</ReferenceButton>} />}
            />
          </ReferencePanel>
          <ReferencePanel title="6. Staking Activity">
            <ReferenceTable columns={["Type", "Position ID", "Vault NFT", "Amount", "Status", "Tx Hash", "Date"]} rows={[]} empty={<ReferenceEmpty mascotMood="stake" title="No activity found" body="Your staking rewards activity will appear here." />} />
          </ReferencePanel>
        </main>
        <aside className="space-y-4">
          <ReferencePanel title="2. Selected Vault">
            {selected ? <VaultSlot vault={selected} selected /> : <ReferenceEmpty mascotMood="stake" title="Vault" body="N/A" />}
            <ReferenceRows className="mt-3" rows={[
              { label: "Vault", value: selected?.name ?? "N/A" },
              { label: "Collection", value: selected?.collectionId ?? "N/A" },
              { label: "Mint", value: shortAddress(selected?.mint) },
              { label: "Status", value: selected?.status ?? "N/A", tone: selected ? "green" : "gold" }
            ]} />
            <ReferenceButton className="mt-3 w-full" icon={LockKeyhole} disabled={!wallet.connected || !selected}>Stake Vault</ReferenceButton>
          </ReferencePanel>
          <ReferencePanel title="4. Rewards">
            <ReferenceMetric label="Claimable Rewards" value={formatMetric(data?.stats?.claimableRewards)} detail="Rewards are updated from backend." />
            <LockedButton>Claim Rewards</LockedButton>
          </ReferencePanel>
          <ReferencePanel title="5. Staking Guide">
            <ReferenceStepper steps={["Select", "Stake", "Earn", "Claim"]} activeIndex={0} />
            <div className="ref-hero-mascot-stage mt-3 min-h-[110px]">
              <span className="ref-hero-ring !bottom-2 !w-32" />
              <PhewMascot mood="stake" size="md" className="ref-free-mascot !bottom-0 !w-32" />
            </div>
          </ReferencePanel>
          <ReferencePanel title="8. Success Moment">
            <InlineProtocolStatus asset={brandAssets.vaultSafe} title="Stake modal ready" body="Stake and unstake game moments are handled by the shared success modal after real completion." />
          </ReferencePanel>
        </aside>
      </div>
    </ReferenceShell>
  );
}

export function AdminRiskReferencePage() {
  const product = useProductData("/product/admin/risk");
  const collections = product.data?.collections ?? [];
  const riskRows = riskRowsFromData(product.data);
  const [token, setToken] = useState("");

  return (
    <ReferenceShell active="risk" stats={product.data?.stats}>
      <ReferenceHeader
        eyebrow={<><ReferenceBadge tone="muted">Admin</ReferenceBadge><ReferenceBadge tone="gold">Public-safe mode</ReferenceBadge></>}
        title="Risk Dashboard"
        subtitle="Monitor protocol risk, reserve health, and collection eligibility."
        mascot
        mascotPose="admin"
        mascotClassName="!w-[160px]"
        warning={<div className="rounded-lg border border-vault-gold/45 bg-vault-gold/10 p-3 text-sm text-slate-200"><AlertTriangle className="mr-2 inline size-5 text-vault-gold" /> Risk data is for protocol use only. Values are backend-verified. No manual overrides in public-safe mode.</div>}
      />
      {product.error ? <BackendUnavailableBanner message={product.error.message} retry={product.reload} /> : null}
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <ReferenceMetric label="Collections Scanned" value={formatMetric(collections.length || product.data?.stats?.collectionsScanned)} icon={Search} />
        <ReferenceMetric label="High Risk" value={formatMetric(product.data?.stats?.highRisk)} icon={AlertTriangle} tone="gold" />
        <ReferenceMetric label="Eligibility Locked" value={formatMetric(product.data?.stats?.eligibilityLocked)} icon={LockKeyhole} />
        <ReferenceMetric label="Paused / Emergency" value={formatMetric(product.data?.stats?.pausedEmergency)} icon={PauseCircle} tone="gold" />
        <ReferenceMetric label="Instant Sell Eligible" value={formatMetric(product.data?.stats?.instantSellEligible)} icon={Zap} />
        <ReferenceMetric label="Backed Reserves" value={formatMetric(product.data?.stats?.backedReserves)} icon={Layers3} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="space-y-4">
          <ReferencePanel title="Collection Risk & Eligibility" action={<ReferenceButton tone="ghost" icon={Filter}>Filters</ReferenceButton>}>
            <ReferenceTable
              columns={["Collection", "Symbol", "Token Mint", "Risk Score", "Reserve Status", "Eligibility", "Instant Sell", "Emergency", "Last Scanned", "Audit / Proof"]}
              rows={riskRows.map((row) => [
                row.collection ? <CollectionIdentity key={row.collection.id} collection={row.collection} /> : row.name ?? "N/A",
                row.collection?.symbol ?? row.symbol ?? "N/A",
                shortAddress(row.collection?.tokenMint ?? row.tokenMint),
                formatMetric(row.collection?.riskScore ?? row.riskScore),
                row.collection?.reserveHealth ?? row.reserveStatus ?? "N/A",
                eligibilityLabel(row),
                row.collection?.instantSellEnabled || row.instantSell ? "Yes" : "N/A",
                row.emergency ? "Paused" : "No",
                row.lastScannedAt ?? "N/A",
                <ReferenceButton key="view" tone="ghost">View</ReferenceButton>
              ])}
              empty={<ReferenceEmpty mascotMood="warning" title="No risk rows" body="Risk rows appear after backend collections or scan snapshots are returned." />}
            />
          </ReferencePanel>
          <div className="grid gap-4 lg:grid-cols-3">
            <ReferencePanel title="Backend Data Sources">
              <ReferenceRows rows={["Database", "Helius RPC", "Solana Program", "PDA Verification", "Audit & Proof Service"].map((label) => ({ label, value: "N/A" }))} />
            </ReferencePanel>
            <ReferencePanel title="Reserve & Proof Verification">
              <ReferenceRows rows={["Reserve PDA Verification", "Backing Token Balances", "Vault Proofs", "Lock Proof Consistency", "Launch Proofs"].map((label) => ({ label, value: "N/A" }))} />
            </ReferencePanel>
            <ReferencePanel title="Risk Engine Controls">
              <ReferenceRows rows={["Auto Scan", "Auto Update Eligibility", "Auto Pause High Risk", "Enforce Instant Sell Rules", "Emergency Pause All"].map((label) => ({ label, value: "Off" }))} />
            </ReferencePanel>
          </div>
        </main>
        <aside className="space-y-4">
          <ReferencePanel title="Token Scan Risk Notes" action={<ReferenceBadge tone="green">CA-first</ReferenceBadge>}>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_78px]">
              <ReferenceInput value={token} onChange={setToken} placeholder="Paste token contract address..." />
              <ReferenceButton tone="outline" className="w-full">Scan</ReferenceButton>
            </div>
          </ReferencePanel>
          <ReferencePanel title="Risk Breakdown (Last Scan)">
            <ReferenceRows rows={["Contract Risk", "Holder Concentration", "Liquidity Risk", "Mint / Freeze Authority", "Honeypot Check", "Proxy / Upgradeable", "Metadata Risk", "Sanction / Blocklist"].map((label) => ({ label, value: "N/A" }))} />
          </ReferencePanel>
          <ReferencePanel title="Risk Status Summary">
            <ReferenceEmpty mascotMood="warning" title="No scan data yet" body="Run a scan to view risk summary." action={<ReferenceButton tone="outline" icon={RefreshCcw}>Run Full Scan</ReferenceButton>} />
          </ReferencePanel>
          <ReferencePanel title="Recent Risk Scans">
            <ReferenceTable columns={["Time", "Type", "Triggered By", "Status"]} rows={[]} empty={<ReferenceEmpty mascotMood="warning" title="No scans yet" body="Risk scans will appear here." />} />
          </ReferencePanel>
        </aside>
      </div>
    </ReferenceShell>
  );
}

export function StrategyEngineReferencePage() {
  const wallet = useWalletAuth();
  const endpoint = wallet.address ? `/product/instant-sell?wallet=${encodeURIComponent(wallet.address)}` : "/product/instant-sell";
  const product = useProductData(endpoint, wallet.connected);
  const quotes = product.data?.quotes ?? [];
  const poolReady = Boolean(product.data?.poolConfigured);

  return (
    <ReferenceShell active="strategy-engine" stats={product.data?.stats}>
      <ReferenceHeader
        eyebrow={<ReferenceBadge tone="gold">Public-safe strategy</ReferenceBadge>}
        title="Strategy Engine"
        subtitle="Review instant-sell liquidity, quote readiness, and risk-discount inputs without inventing pool data."
        mascotPose="strategy"
        aside={<StrategyStatusPanel walletConnected={wallet.connected} poolReady={poolReady} />}
      />
      {!wallet.connected ? <WalletRequiredBanner action={<ReferenceButton>Connect Wallet</ReferenceButton>} /> : null}
      {product.error ? <BackendUnavailableBanner message={product.error.message} retry={product.reload} /> : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-4">
          <ReferencePanel title="Strategy Engine Console">
            <div className="grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)]">
              <div className="grid min-h-36 place-items-center rounded-lg border border-vault-green/30 bg-vault-green/5">
                <img src={poolReady ? brandAssets.energyBeam : brandAssets.errorGlitch} alt="" className="size-24 object-contain" />
              </div>
              <div>
                <div className="rounded-lg border border-vault-gold/40 bg-vault-gold/10 p-4 text-sm text-slate-200">
                  {poolReady ? "Instant-sell strategy is configured. Quotes still depend on eligible wallet inventory, backing, unlock date, and live liquidity." : "Instant-sell liquidity is unavailable. Quote writes remain blocked until real pool liquidity is configured."}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                  <ReferenceInput placeholder="Vault NFT mint" disabled={!poolReady || !wallet.connected} />
                  <LockedButton>Request quote</LockedButton>
                </div>
              </div>
            </div>
            <ReferenceTable
              className="mt-4"
              columns={["Quote ID", "Vault", "Best Bid", "Discount", "Status", "Updated"]}
              rows={quotes.map((quote, index) => [
                positionText(quote, "id") || `quote-${index + 1}`,
                positionText(quote, "vaultMint") || "N/A",
                positionText(quote, "bestBid") || "N/A",
                positionText(quote, "discount") || "N/A",
                positionText(quote, "status") || "N/A",
                positionText(quote, "updatedAt") || "N/A"
              ])}
              empty={<ReferenceEmpty mascotMood="redeem" title="No quotes" body="Quotes appear only after real pool-backed quote requests for this wallet." />}
            />
          </ReferencePanel>
          <ReferencePanel title="Risk Discount Inputs">
            <div className="grid gap-3 md:grid-cols-4">
              <ReferenceMetric label="Wallet" value={wallet.address ? shortAddress(wallet.address) : "Disconnected"} />
              <ReferenceMetric label="Liquidity Pool" value={poolReady ? "Configured" : "Unavailable"} tone={poolReady ? "green" : "gold"} />
              <ReferenceMetric label="Quotes" value={formatMetric(quotes.length)} />
              <ReferenceMetric label="Live Source" value={quotes.length ? "Quotes table" : "N/A"} />
            </div>
          </ReferencePanel>
        </main>
        <aside className="space-y-4">
          <ReferencePanel title="Protocol Rules">
            <CheckRow label="Wallet authenticated" ok={wallet.connected} />
            <CheckRow label="Real pool configured" ok={poolReady} />
            <CheckRow label="Quote rows returned" ok={quotes.length > 0 ? true : null} />
          </ReferencePanel>
          <ReferencePanel title="Backend State">
            <ReferenceRows rows={[
              { label: "Pool configured", value: poolReady ? "Yes" : "N/A", tone: poolReady ? "green" : "gold" },
              { label: "Route", value: "/product/instant-sell" },
              { label: "Wallet", value: wallet.address ? shortAddress(wallet.address) : "N/A" }
            ]} />
          </ReferencePanel>
        </aside>
      </div>
    </ReferenceShell>
  );
}

export function AdminSetupReferencePage() {
  const capabilities = useApiResource<CapabilitiesResponse>("/system/capabilities");
  const imageProviders = useApiResource<ImageProvidersResponse>("/system/image-providers");
  const data = capabilities.data;
  const providers = imageProviders.data?.providers ?? [];
  const checklist = data?.setupChecklist?.items ?? [];
  const complete = checklist.filter((item) => item.ok).length;
  const total = checklist.length || 10;
  const capabilityKeys = [
    ["Image Generation", "openaiImagesAvailable"],
    ["Paid Generation", "aiGenerationEnabled"],
    ["Caching", "permanentStorageConfigured"],
    ["Layer Pack", "approvedLayerPackAvailable"],
    ["Studio Mode", "professionalPreviewReady"],
    ["Public Mint", "mintingAvailable"],
    ["Community Launch", "launchAvailable"]
  ] as const;

  return (
    <ReferenceShell active="setup">
      <ReferenceHeader
        eyebrow={<><ReferenceBadge tone="muted">Founders & Operators</ReferenceBadge><ReferenceBadge tone={data?.publicReadiness?.launchAvailable ? "green" : "gold"}>{data?.publicReadiness?.launchAvailable ? "Setup complete" : "Setup not complete"}</ReferenceBadge></>}
        title="Admin Setup"
        subtitle="Configure protocol settings, providers, and backend services."
        mascot
        mascotPose="admin"
        mascotClassName="!w-[160px]"
        warning={<div className="rounded-lg border border-vault-gold/45 bg-vault-gold/10 p-3 text-sm text-slate-200"><AlertTriangle className="mr-2 inline size-5 text-vault-gold" /> Complete all required sections to enable protocol features. No user-facing actions are enabled until setup is validated.</div>}
      />
      {capabilities.error ? <BackendUnavailableBanner message={capabilities.error.message} retry={capabilities.reload} /> : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px_260px]">
        <ReferencePanel title="System Capabilities" className="xl:col-span-1">
          <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-7">
            {capabilityKeys.map(([label, key]) => (
              <div key={key} className="rounded-lg border border-vault-gold/35 bg-black/25 p-3">
                <p className="truncate text-xs font-black text-white">{label}</p>
                <ReferenceBadge tone={data?.capabilities?.[key] ? "green" : "muted"} className="mt-2">{data?.capabilities?.[key] ? "Enabled" : "Disabled"}</ReferenceBadge>
              </div>
            ))}
          </div>
        </ReferencePanel>
        <ReferencePanel title="Setup Progress">
          <p className="text-3xl font-black text-vault-green">{complete} <span className="text-white">/ {total}</span></p>
          <p className="mt-1 text-xs text-slate-400">sections complete</p>
          <div className="mt-3 h-2 rounded-full bg-white/10"><span className="block h-full rounded-full bg-vault-green" style={{ width: `${total ? (complete / total) * 100 : 0}%` }} /></div>
        </ReferencePanel>
        <ReferencePanel title="Validate All" subtitle="Run full system validation.">
          <ReferenceButton tone="outline" icon={ShieldCheck} className="w-full">Validate All</ReferenceButton>
        </ReferencePanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <ReferencePanel title="1. Image Providers">
          <ReferenceTable
            columns={["Provider", "Status", "Approval", "Paid Gen", "Config"]}
            rows={(providers.length ? providers : [{ provider: "Phew Studio (Primary)" }, { provider: "OpenAI (DALL-E)" }, { provider: "Imagen (Fallback)" }, { provider: "Custom Provider" }]).map((provider) => [
              provider.provider,
              provider.authPresent ? "Configured" : "Not Configured",
              provider.canGenerateStudioBible ? "Approved" : "Pending",
              provider.canGenerateStudioBible ? "On" : "Off",
              <ReferenceButton key="configure" tone="ghost">Configure</ReferenceButton>
            ])}
          />
          <div className="mt-3 rounded-lg border border-vault-gold/40 bg-vault-gold/10 p-3 text-sm text-vault-gold">No providers approved. Image generation is disabled.</div>
        </ReferencePanel>
        <ReferencePanel title="2. Provider Configuration Checklist">
          <ReferenceRows rows={[
            { label: "Studio provider configured", value: imageProviders.data?.active?.provider ?? "N/A" },
            { label: "Provider explicitly approved", value: imageProviders.data?.active?.canGenerateStudioBible ? "Yes" : "N/A" },
            { label: "Paid generation enabled", value: data?.capabilities?.aiGenerationEnabled ? "Yes" : "N/A" },
            { label: "Payment method configured", value: "N/A" },
            { label: "Usage limits configured", value: "N/A" },
            { label: "Fallback provider enabled", value: "N/A" }
          ]} />
        </ReferencePanel>
        <ReferencePanel title="3. Cache & Storage">
          <ReferenceRows rows={[
            { label: "Image Cache", value: data?.capabilities?.permanentStorageConfigured ? "Enabled" : "Disabled" },
            { label: "Metadata Cache", value: data?.capabilities?.tokenMetadataAvailable ? "Enabled" : "Disabled" },
            { label: "Layer Pack Cache", value: data?.capabilities?.approvedLayerPackAvailable ? "Enabled" : "Disabled" },
            { label: "Cache TTL", value: "N/A" },
            { label: "Storage Provider", value: data?.setupChecklist?.storageProvider ?? "N/A" },
            { label: "Storage Bucket", value: "N/A" }
          ]} />
        </ReferencePanel>
        <ReferencePanel title="4. Backend Health">
          <ReferenceRows rows={["API Server", "Database", "Helius RPC", "Solana Program", "Queue / Worker", "Storage", "Redis"].map((label) => ({ label, value: healthValue(label, data?.capabilities) }))} />
          <ReferenceButton tone="outline" icon={RefreshCcw} className="mt-3 w-full">Run Health Check</ReferenceButton>
        </ReferencePanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <ReferencePanel title="5. Solana Integration">
          <ReferenceRows rows={[
            { label: "Network", value: data?.cluster ?? "Solana Devnet" },
            { label: "RPC Endpoint", value: data?.rpcUrl ?? "N/A" },
            { label: "Program ID", value: data?.capabilities?.devnetProgramConfigured ? "Configured" : "N/A" },
            { label: "Program Authority", value: "N/A" },
            { label: "PDA Seed", value: "N/A" }
          ]} />
        </ReferencePanel>
        <ReferencePanel title="6. Studio Provider (Paid Generation)">
          <ReferenceRows rows={[
            { label: "Paid Generation", value: data?.capabilities?.aiGenerationEnabled ? "On" : "Off" },
            { label: "Require Payment Signature", value: "Off" },
            { label: "Price (USD)", value: "N/A" },
            { label: "Max Generation Size", value: "N/A" },
            { label: "Daily Generation Limit", value: "N/A" },
            { label: "Timeout (sec)", value: "N/A" }
          ]} />
        </ReferencePanel>
        <ReferencePanel title="7. Layer Pack (Curated)">
          <ReferenceRows rows={[
            { label: "Layer Pack Status", value: data?.capabilities?.approvedLayerPackAvailable ? "Loaded" : "Not Loaded" },
            { label: "Total Layers", value: "N/A" },
            { label: "Trait Validation", value: "Disabled" },
            { label: "Duplicate Prevention", value: "Disabled" },
            { label: "Rarity Rules", value: "Not Configured" }
          ]} />
        </ReferencePanel>
        <ReferencePanel title="8. AI & Fallback Rules">
          <ReferenceRows rows={[
            { label: "Primary Provider", value: imageProviders.data?.active?.provider ?? "N/A" },
            { label: "Fallback Provider", value: "N/A" },
            { label: "Fallback Enabled", value: "Off" },
            { label: "Retry Attempts", value: "N/A" },
            { label: "Timeout (sec)", value: "N/A" }
          ]} />
        </ReferencePanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.15fr_0.8fr_1fr]">
        <ReferencePanel title="9. Environment Diagnostics">
          <ReferenceRows rows={[
            { label: "Node Environment", value: data?.mode ?? "N/A" },
            { label: "App Version", value: "N/A" },
            { label: "Server Time", value: "N/A" },
            { label: "Uptime", value: "N/A" },
            { label: "Memory Usage", value: "N/A" }
          ]} />
        </ReferencePanel>
        <ReferencePanel title="10. Validation & Launch Readiness">
          <ReferenceRows rows={(checklist.length ? checklist : [
            { key: "core", label: "All core services healthy", ok: false },
            { key: "providers", label: "Providers configured & approved", ok: false },
            { key: "payment", label: "Payment configured", ok: false },
            { key: "program", label: "On-chain program configured", ok: false },
            { key: "layer", label: "Layer pack loaded & validated", ok: false }
          ]).map((item) => ({ label: item.label, value: item.ok ? "Ready" : "N/A", tone: item.ok ? "green" : "gold" }))} />
        </ReferencePanel>
        <ReferencePanel title="Setup Actions">
          <div className="grid gap-2">
            <LockedButton>Validate All Sections</LockedButton>
            <LockedButton>Save Configuration</LockedButton>
            <ReferenceButton tone="danger" disabled>Reset Setup</ReferenceButton>
          </div>
        </ReferencePanel>
        <ReferencePanel title="Activity Log">
          <ReferenceTable columns={["Time", "Event", "User", "Status"]} rows={[]} empty={<ReferenceEmpty mascotMood="warning" title="No activity yet" body="Setup changes will appear here." />} />
        </ReferencePanel>
      </div>
    </ReferenceShell>
  );
}

export function StudioReferencePage() {
  const wallet = useWalletAuth();
  const capabilities = useApiResource<CapabilitiesResponse>("/system/capabilities");
  const [tokenMint, setTokenMint] = useState("");
  const [scan, setScan] = useState<TokenScan | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const studioReady = Boolean(capabilities.data?.publicReadiness?.professionalPreviewReady || capabilities.data?.capabilities?.professionalPreviewReady);
  const activeIndex = scan ? 1 : 0;

  async function scanToken() {
    const mint = tokenMint.trim();
    if (!mint) {
      setScanError("Enter a token contract address first.");
      return;
    }
    setScanning(true);
    setScanError(null);
    setScan(null);
    try {
      const response = await apiFetch<TokenScan>(`/tokens/${encodeURIComponent(mint)}/scan`, { timeoutMs: 30_000 });
      setScan(unwrapApiData(response) ?? response);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Token scan failed");
    } finally {
      setScanning(false);
    }
  }

  return (
    <ReferenceShell active="studio">
      <ReferenceHeader
        eyebrow={<><ReferenceBadge tone="muted">Studio</ReferenceBadge><ReferenceBadge tone={studioReady ? "green" : "gold"}>{studioReady ? "Subscription active" : "Setup gated"}</ReferenceBadge></>}
        title="Studio Mode"
        subtitle="Build a token-backed NFT collection with the Phew Studio workbench."
        mascotPose="studio"
        actions={<><ReferenceButton tone="ghost">Studio Docs</ReferenceButton><ReferenceButton tone="ghost">Watch Tutorial</ReferenceButton><ReferenceButton tone="ghost" icon={SlidersHorizontal}>Studio Settings</ReferenceButton></>}
      />
      {capabilities.error ? <BackendUnavailableBanner message={capabilities.error.message} retry={capabilities.reload} /> : null}
      <div className="grid gap-4 xl:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <ReferencePanel title="Studio Workflow">
            <ReferenceStepper steps={["Token Scan", "Brand Kit", "Studio Bible", "Layer Pack", "Launch Readiness"]} activeIndex={activeIndex} />
          </ReferencePanel>
          <ReferencePanel title="Run Status">
            <ReferenceRows rows={[
              { label: "Run ID", value: "N/A" },
              { label: "Created", value: "N/A" },
              { label: "Last Updated", value: "N/A" },
              { label: "Status", value: scan ? "Token scanned" : "Not Started", tone: scan ? "green" : "gold" },
              { label: "Owner", value: wallet.address ? shortAddress(wallet.address) : "N/A" }
            ]} />
          </ReferencePanel>
          <LockedButton>Save Draft</LockedButton>
        </aside>
        <main className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
            <ReferencePanel title="1. Token Scan (CA-First)" subtitle="Enter the token contract address to fetch on-chain metadata and supply.">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
                <ReferenceInput value={tokenMint} onChange={setTokenMint} placeholder="Paste token CA..." />
                <ReferenceButton icon={Search} onClick={scanToken} disabled={scanning}>{scanning ? "Scanning" : "Scan Token"}</ReferenceButton>
              </div>
              {scanError ? <div className="mt-3 rounded-lg border border-vault-red/40 bg-vault-red/10 p-3 text-sm text-vault-red">{scanError}</div> : null}
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <ReferenceMetric label="Network" value="Solana" />
                <ReferenceMetric label="Metadata" value={scan?.metadataUri ? "Loaded" : "N/A"} />
                <ReferenceMetric label="Total Supply" value={na(scan?.supply)} />
                <ReferenceMetric label="Holders" value="N/A" />
              </div>
              <div className="mt-3 rounded-lg border border-vault-line bg-black/25 p-3 text-sm text-slate-400">We never auto-generate. You control every step.</div>
            </ReferencePanel>
            <ReferencePanel title="Fast Studio Preview (Estimate)">
              <div className="grid gap-3 sm:grid-cols-2">
                <ReferenceMetric label="Estimated Cost" value="N/A USD" />
                <ReferenceMetric label="Estimated Time" value="N/A min" />
              </div>
              <ReferenceRows className="mt-3" rows={[
                { label: "Image Provider (Studio)", value: capabilities.data?.capabilities?.aiGenerationEnabled ? "Configured" : "N/A" },
                { label: "Explicit Approval", value: "Required" },
                { label: "Cache Status", value: "N/A" }
              ]} />
            </ReferencePanel>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <ReferencePanel title="3. Studio Bible (Style Guide)" subtitle="The bible defines the visual rules and creative direction for your collection.">
              <div className="grid gap-4">
                <InlineProtocolStatus asset={scan ? brandAssets.rewardBurst : brandAssets.pictograms.strategy} title={scanning ? "Scanning token" : scan ? "Token scan ready" : "Studio Bible gated"} body="Studio Bible completion will use the success modal after a real generation completion event." />
                <div>
                  <ReferenceBadge tone="gold">Not Generated</ReferenceBadge>
                  <ReferenceRows className="mt-3" rows={["Colors & Mood", "Typography", "Character / Mascot Rules", "Do's & Don'ts", "Scene & Background Rules", "Trait Behavior Rules"].map((label) => ({ label, value: "N/A" }))} />
                  <LockedButton>Generate Studio Bible</LockedButton>
                </div>
              </div>
            </ReferencePanel>
            <ReferencePanel title="4. Layer Pack (Curated)" subtitle="Curate, validate and lock your layer pack before approval.">
              <div className="grid gap-4">
                <InlineProtocolStatus asset={brandAssets.tokenStack} title="Layer pack gated" body="Layer pack approval has a modal-ready action, but no success is displayed before backend approval." />
                <div>
                  <ReferenceBadge tone="gold">Not Curated</ReferenceBadge>
                  <ReferenceRows className="mt-3" rows={["Layer Count", "Combinations", "Duplicates", "Validation", "Status"].map((label) => ({ label, value: "N/A" }))} />
                  <LockedButton>Open Layer Pack Manager</LockedButton>
                </div>
              </div>
            </ReferencePanel>
          </div>
          <ReferencePanel title="5. Launch Readiness" subtitle="Complete all requirements to enable collection launch.">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {["Token Scanned", "Brand Kit", "Studio Bible", "Layer Pack", "Approvals", "Launch"].map((label, index) => (
                <ReferenceMetric key={label} label={label} value={index === 0 && scan ? "Ready" : index === 0 ? "Not Started" : "Locked"} tone={index === 0 && scan ? "green" : "muted"} />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <LockedButton>Launch Collection</LockedButton>
              <LockedButton>Export Studio Package</LockedButton>
            </div>
          </ReferencePanel>
        </main>
      </div>
    </ReferenceShell>
  );
}

function InlineProtocolStatus({ asset, title, body, className }: { asset: string; title: string; body: string; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-vault-line bg-black/25 p-4", className)}>
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-md border border-vault-green/30 bg-vault-green/10">
          <img src={asset} alt="" className="size-8 object-contain" />
        </span>
        <span className="min-w-0">
          <strong className="block text-sm text-white">{title}</strong>
          <span className="mt-1 block text-xs leading-5 text-slate-500">{body}</span>
        </span>
      </div>
    </div>
  );
}

function StrategyStatusPanel({ walletConnected, poolReady }: { walletConnected: boolean; poolReady: boolean }) {
  const ready = walletConnected && poolReady;
  return (
    <div className="rounded-lg border border-vault-line bg-black/35 p-4">
      <div className="flex items-center gap-3">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-md border", ready ? "border-vault-green/35 bg-vault-green/10" : "border-vault-gold/35 bg-vault-gold/10")}>
          <img src={ready ? brandAssets.energyBeam : brandAssets.errorGlitch} alt="" className="size-8 object-contain" />
        </span>
        <div className="min-w-0">
          <p className="font-black text-white">{ready ? "Strategy route ready" : "Strategy route gated"}</p>
          <p className="mt-1 text-sm text-slate-400">Quotes remain locked to backend wallet inventory, reserve backing, and real liquidity.</p>
        </div>
      </div>
      <ReferenceRows className="mt-3" rows={[
        { label: "Wallet", value: walletConnected ? "Connected" : "Disconnected", tone: walletConnected ? "green" : "gold" },
        { label: "Pool", value: poolReady ? "Configured" : "Unavailable", tone: poolReady ? "green" : "gold" }
      ]} />
    </div>
  );
}

function useProductData(endpoint: string, enabled = true) {
  const state = useApiResource<ProductData | VaultCollection[] | VaultNft[]>(endpoint, { enabled });
  const data = normalizeProductData(endpoint, state.data);
  return { ...state, data };
}

function normalizeProductData(endpoint: string, data: ProductData | VaultCollection[] | VaultNft[] | null): ProductData | null {
  const unwrapped = unwrapApiData<ProductData | VaultCollection[] | VaultNft[]>(data);
  if (!unwrapped) return null;
  if (!Array.isArray(unwrapped)) return unwrapped;
  if (endpoint.includes("/nfts")) return { nfts: unwrapped as VaultNft[] };
  return { collections: unwrapped as VaultCollection[] };
}

function CommunityTile({ collection }: { collection: VaultCollection }) {
  return (
    <Link href={`/collections/${encodeURIComponent(collection.id)}`} className="group overflow-hidden rounded-lg border border-vault-line bg-black/35 transition hover:border-vault-green/50">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={collection.image || brandAssets.nftSlot} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        <ReferenceBadge tone="green" className="absolute left-2 top-2">Live</ReferenceBadge>
        <div className="absolute inset-x-3 bottom-3">
          <p className="truncate text-sm font-black text-white">{collection.name}</p>
          <p className="truncate text-xs text-slate-400">{collection.symbol}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 text-xs">
        <MiniFact label="Vaults" value={formatMetric(collection.vaults)} />
        <MiniFact label="Floor" value={formatSol(collection.floorSol)} />
      </div>
    </Link>
  );
}

function CollectionIdentity({ collection, image, title, subtitle }: { collection?: VaultCollection; image?: string; title?: string; subtitle?: string }) {
  const img = collection?.image ?? image ?? brandAssets.nftSlot;
  const name = collection?.name ?? title ?? "N/A";
  const sub = collection?.launchStatus ?? subtitle ?? "N/A";
  return (
    <Link href={collection ? `/collections/${encodeURIComponent(collection.id)}` : "#"} className="flex min-w-[180px] items-center gap-3">
      <img src={img} alt="" className="size-12 rounded-md border border-vault-line bg-black/35 object-cover" />
      <span className="min-w-0">
        <span className="block truncate font-black text-white">{name}</span>
        <span className="block truncate text-xs text-slate-400">{sub}</span>
      </span>
    </Link>
  );
}

function VaultSlot({ vault, selected }: { vault: VaultNft; selected?: boolean }) {
  return (
    <div className={cn("rounded-lg border bg-black/35 p-3", selected ? "border-vault-green shadow-green" : "border-vault-line")}>
      <div className="relative mx-auto aspect-[4/5] max-w-[140px] rounded-md border border-dashed border-vault-line bg-black/45 p-2">
        <img src={vault.image || brandAssets.nftSlot} alt="" className="h-full w-full rounded object-cover" />
        {selected ? <CheckCircle2 className="absolute right-2 top-2 size-5 text-vault-green" /> : null}
      </div>
      <p className="mt-3 truncate text-sm font-black text-white">{vault.name}</p>
      <div className="mt-2 grid gap-1 text-xs">
        <MiniFact label="Collection" value={vault.collectionId} />
        <MiniFact label="Mint" value={shortAddress(vault.mint)} />
        <MiniFact label="Status" value={vault.status} />
      </div>
    </div>
  );
}

function TokenIdentity({ token }: { token: WalletTokenRow }) {
  return (
    <div className="flex min-w-[180px] items-center gap-3">
      <img src={token.collectionImage || brandAssets.tokenObject} alt="" className="size-12 rounded-md border border-vault-line bg-black/35 object-contain" />
      <span className="min-w-0">
        <span className="block truncate font-black text-white">{token.symbol ?? shortAddress(token.mint, 4)}</span>
        <span className="block truncate text-xs text-slate-400">{token.name ?? shortAddress(token.mint)}</span>
      </span>
    </div>
  );
}

function MarketVaultCard({ vault, collection }: { vault: VaultNft; collection?: VaultCollection }) {
  return (
    <Link href={vault.mint ? `/vaults/${encodeURIComponent(vault.mint)}/proof` : "/marketplace"} className="group overflow-hidden rounded-lg border border-vault-line bg-black/35 transition hover:border-vault-green/55">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={vault.image || brandAssets.vaultSafe} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <ReferenceBadge tone="green" className="absolute left-2 top-2">Verified</ReferenceBadge>
      </div>
      <div className="p-3">
        <p className="truncate font-black text-white">{vault.name}</p>
        <p className="mt-1 truncate text-xs text-slate-400">{collection?.name ?? vault.collectionId ?? "N/A"}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <MiniFact label="Tokens Locked" value={vault.lockedAmount ?? "N/A"} />
          <MiniFact label="Backing Value" value={formatCurrency(vault.backingUsd)} />
          <MiniFact label="Ask Price" value={formatSol(vault.priceSol)} />
          <MiniFact label="Best Offer" value={vault.priceSol ? formatSol(vault.priceSol * 0.94) : "N/A"} />
        </div>
      </div>
    </Link>
  );
}

function VaultShelf({ title, vaults, actionLabel }: { title: string; vaults: VaultNft[]; actionLabel: string }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-white">{title}</h2>
        <ReferenceButton tone="ghost">View all</ReferenceButton>
      </div>
      {vaults.length ? (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {vaults.slice(0, 5).map((vault) => (
            <div key={vault.id} className="overflow-hidden rounded-lg border border-vault-line bg-black/35">
              <img src={vault.image || brandAssets.nftSlot} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="p-3">
                <p className="truncate text-sm font-black text-white">{vault.name}</p>
                <p className="mt-1 text-sm text-slate-300">{formatSol(vault.priceSol || vault.backingSol)}</p>
                <ReferenceButton href={actionLabel === "Stake Now" ? "/staking" : "/profile"} tone={actionLabel === "Stake Now" ? "outline" : "ghost"} className="mt-3 w-full">{actionLabel}</ReferenceButton>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ReferenceEmpty title={title} body="No backend wallet NFT rows for this section." object={brandAssets.nftSlot} />
      )}
    </div>
  );
}

function CompactList({ rows, empty }: { rows: Array<{ image?: string; title: string; subtitle: string; value: string }>; empty: string }) {
  if (!rows.length) return <ReferenceEmpty title="N/A" body={empty} object={brandAssets.nftSlot} />;
  return (
    <div className="divide-y divide-vault-line rounded-lg border border-vault-line bg-black/20">
      {rows.map((row, index) => (
        <div key={`${row.title}-${index}`} className="flex items-center gap-3 px-3 py-2.5">
          <img src={row.image || brandAssets.nftSlot} alt="" className="size-9 rounded-md border border-vault-line object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">{row.title}</p>
            <p className="truncate text-xs text-slate-500">{row.subtitle}</p>
          </div>
          <span className="text-xs font-semibold text-slate-300">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function listingToVaultLike(listing: unknown, index: number): VaultNft {
  const row = (listing && typeof listing === "object" ? listing : {}) as Record<string, unknown>;
  const collection = row.collection && typeof row.collection === "object" ? row.collection as Record<string, unknown> : null;
  return {
    id: String(row.id ?? row.listingId ?? `listing-${index}`),
    collectionId: String(row.collectionId ?? collection?.id ?? "N/A"),
    name: String(row.name ?? row.nftName ?? row.title ?? `Vault Listing #${index + 1}`),
    number: index + 1,
    image: String(row.image ?? row.nftImage ?? row.assetUri ?? brandAssets.vaultSafe),
    priceSol: numberField(row, "priceSol") ?? numberField(row, "askPriceSol") ?? 0,
    backingUsd: numberField(row, "backingUsd") ?? numberField(row, "backingValueUsd") ?? 0,
    backingSol: numberField(row, "backingSol") ?? numberField(row, "backingValueSol") ?? 0,
    lockedAmount: String(row.lockedAmount ?? row.tokensLocked ?? "N/A"),
    duration: String(row.duration ?? "N/A"),
    tier: String(row.tier ?? "Vault"),
    status: "Flexible",
    rarity: "Rare",
    apy: 0,
    unlockDate: String(row.unlockDate ?? "N/A"),
    role: "Vault",
    rank: "N/A",
    aura: "N/A",
    background: "N/A",
    badges: [],
    mint: typeof row.mint === "string" ? row.mint : undefined
  };
}

function activityRows(data?: ProductData | null) {
  const raw = Array.isArray(data?.activity) ? data.activity : [];
  return raw.map((item, index) => {
    const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    return {
      image: typeof row.image === "string" ? row.image : brandAssets.proofRing,
      title: String(row.action ?? row.title ?? `Activity #${index + 1}`),
      subtitle: String(row.actor ?? row.collectionName ?? "Backend activity"),
      value: String(row.amount ?? row.priceSol ?? row.time ?? "N/A")
    };
  });
}

function formatWalletTokenBalance(token: WalletTokenRow) {
  if (token.uiAmountString) return token.uiAmountString;
  if (!token.amount || !/^\d+$/.test(token.amount)) return "N/A";
  const decimals = Number(token.decimals ?? 0);
  if (!decimals) return Number(token.amount).toLocaleString();
  const padded = token.amount.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${Number(whole).toLocaleString()}.${fraction.slice(0, 6)}` : Number(whole).toLocaleString();
}

function formatWalletTokenValue(tokens: WalletTokenRow[]) {
  const usd = tokens.reduce((sum, token) => sum + (typeof token.valueUsd === "number" ? token.valueUsd : 0), 0);
  if (usd > 0) return formatCurrency(usd);
  const sol = tokens.reduce((sum, token) => sum + (typeof token.valueSol === "number" ? token.valueSol : 0), 0);
  return sol > 0 ? formatSol(sol) : "N/A";
}

function sumVaultNumber(vaults: VaultNft[], key: "backingSol" | "priceSol" | "backingUsd") {
  const total = vaults.reduce((sum, vault) => sum + (typeof vault[key] === "number" ? vault[key] : 0), 0);
  return total || null;
}

function numberField(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] uppercase text-slate-500">{label}</p>
      <p className="truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function gateLabel(value?: boolean) {
  if (value === true) return "Verified";
  if (value === false) return "Locked";
  return "N/A";
}

function eligibilityLabel(row: RiskRow) {
  if (row.collection?.mintEligible) return "Eligible";
  return row.eligibility ?? "N/A";
}

function riskRowsFromData(data: ProductData | null): RiskRow[] {
  const raw = (data && typeof data === "object" ? (data as Record<string, unknown>).riskRows : undefined) as RiskRow[] | undefined;
  if (Array.isArray(raw)) return raw;
  return (data?.collections ?? []).map((collection) => ({ collection }));
}

function positionText(position: unknown, path: string) {
  const value = path.split(".").reduce<unknown>((current, key) => (current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined), position);
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function healthValue(label: string, capabilities?: Record<string, boolean>) {
  const normalized = label.toLowerCase();
  if (normalized.includes("database")) return capabilities?.databaseAvailable ? "Ready" : "Unknown";
  if (normalized.includes("helius")) return capabilities?.heliusAvailable ? "Ready" : "Unknown";
  if (normalized.includes("solana")) return capabilities?.solanaAvailable || capabilities?.solanaTransactionProviderDevnet ? "Ready" : "Unknown";
  if (normalized.includes("storage")) return capabilities?.permanentStorageConfigured ? "Ready" : "Unknown";
  return "Unknown";
}

function formatMetric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "N/A";
}

function formatCurrency(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "N/A";
}

function formatSol(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toLocaleString(undefined, { maximumFractionDigits: 3 })} SOL` : "N/A";
}
