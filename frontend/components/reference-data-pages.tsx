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
import { BackendUnavailableBanner, CheckRow, LockedButton, ReferenceBadge, ReferenceButton, ReferenceEmpty, ReferenceHeader, ReferenceInput, ReferenceMetric, ReferencePanel, ReferenceRows, ReferenceShell, ReferenceStepper, ReferenceTable, ReferenceTransactionScene, SearchControl, WalletRequiredBanner, na, shortAddress } from "@/components/reference-ui";
import { useApiResource } from "@/hooks/useApiResource";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { unwrapApiData } from "@/lib/api";
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
          <div className="absolute inset-0 grid-mask opacity-25" />
          <div className="absolute left-[48%] top-[-34%] size-[480px] rounded-full bg-vault-green/10 blur-3xl" />
        </div>
        <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1fr)_310px_420px] xl:items-stretch">
          <div className="self-center">
            <h1 className="max-w-3xl text-[38px] font-black leading-[1.02] text-white sm:text-[52px]">
              Real tokens. <span className="text-vault-green">Real backing.</span> Real ownership.
            </h1>
            <p className="mt-3 max-w-2xl text-base font-semibold text-white">The protocol for token-backed NFT vaults.</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Lock community tokens. Mint verified vault NFTs. Trade freely. Stake for rewards. Redeem anytime.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ReferenceButton href="/collections" asset={brandAssets.nftSlot}>Explore Collections</ReferenceButton>
              <ReferenceButton href="/create-community" tone="outline" icon={Users}>Create Community</ReferenceButton>
            </div>
          </div>
          <div className="ref-hero-mascot-stage min-h-[220px]">
            <span className="ref-hero-ring" />
            <img src={brandAssets.mascotPoses.run} alt="Phew mascot" className="ref-free-mascot !w-[clamp(185px,20vw,280px)]" />
          </div>
          <ReferencePanel title="Protocol Overview" action={<ReferenceBadge tone={health.data?.ok ? "green" : health.error ? "red" : "gold"}>{health.loading ? "Loading" : health.error ? "Backend" : "24H"}</ReferenceBadge>} className="h-full">
            <div className="grid gap-2 sm:grid-cols-2">
              <ReferenceMetric label="Total Value Locked" value={formatCurrency(stats.tvlUsd)} asset={brandAssets.vaultSafe} />
              <ReferenceMetric label="Total Vaults" value={formatMetric(stats.totalVaults ?? stats.vaults ?? stats.nfts)} asset={brandAssets.nftSlot} />
              <ReferenceMetric label="Active Communities" value={formatMetric(stats.activeCommunities ?? stats.collections)} asset={brandAssets.tokenObject} />
              <ReferenceMetric label="Phews Minted" value={formatMetric(stats.phewsMinted ?? stats.nfts)} asset={brandAssets.proofRing} />
              <ReferenceMetric label="Total Trades" value={formatMetric(stats.totalTrades)} asset={brandAssets.energyBeam} />
              <ReferenceMetric label="Unique Wallets" value={formatMetric(stats.uniqueWallets)} asset={brandAssets.rewardBurst} />
            </div>
          </ReferencePanel>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-5">
        <ReferenceMetric label="TVL" value={formatCurrency(stats.tvlUsd)} asset={brandAssets.vaultSafe} />
        <ReferenceMetric label="Total Vaults" value={formatMetric(stats.totalVaults ?? stats.nfts)} asset={brandAssets.nftSlot} />
        <ReferenceMetric label="Active Communities" value={formatMetric(stats.activeCommunities ?? stats.collections)} asset={brandAssets.tokenObject} />
        <ReferenceMetric label="Phews Minted" value={formatMetric(stats.phewsMinted ?? stats.nfts)} asset={brandAssets.proofRing} />
        <ReferenceMetric label="Total Trades" value={formatMetric(stats.totalTrades)} asset={brandAssets.energyBeam} />
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
            {[
              ["Lock Tokens", brandAssets.vaultSafe],
              ["Mint Vault NFT", brandAssets.nftSlot],
              ["Trade & Stake", brandAssets.energyBeam],
              ["Redeem Anytime", brandAssets.rewardBurst]
            ].map(([label, asset], index) => (
              <div key={label} className="rounded-lg border border-vault-line bg-black/25 p-4 text-center">
                <img src={asset} alt="" className="mx-auto size-12 object-contain" />
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

      <section className="ref-panel relative overflow-visible p-4">
        <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-center">
          <div className="ref-hero-mascot-stage min-h-[110px]">
            <span className="ref-hero-ring !bottom-2 !w-32" />
            <img src={brandAssets.mascotPoses.point} alt="Phew mascot" className="ref-free-mascot !bottom-0 !w-32" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-vault-green">Ready to launch your community?</h2>
            <p className="mt-1 text-sm text-slate-300">Create your token-backed NFT vault collection. Lock. Mint. Trade. Stake. Redeem.</p>
          </div>
          <ReferenceButton href="/create-community">Create Community</ReferenceButton>
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
          <ReferenceMetric label="All Collections" value={formatMetric(collections.length || product.data?.stats?.collections)} icon={LockKeyhole} />
          <ReferenceMetric label="Launched" value={formatMetric(collections.filter((c) => /launch/i.test(c.launchStatus ?? "")).length || null)} icon={ShieldCheck} />
          <ReferenceMetric label="In Review" value={formatMetric(collections.filter((c) => /review/i.test(c.launchStatus ?? "")).length || null)} icon={Search} />
          <ReferenceMetric label="Not Launched" value={formatMetric(collections.filter((c) => !/launch/i.test(c.launchStatus ?? "")).length || null)} icon={Zap} />
          <ReferenceMetric label="Paused" value={formatMetric(collections.filter((c) => c.reserveHealth === "PAUSED").length || null)} icon={PauseCircle} />
          <ReferenceMetric label="Archived" value="N/A" icon={Boxes} />
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
        empty={<ReferenceEmpty mascot title="No collections found" body={collections.length ? "Try adjusting your search or filters." : "No backend collections were returned. Demo rows are not rendered."} action={query ? <ReferenceButton tone="outline" onClick={() => setQuery("")}>Clear Filters</ReferenceButton> : undefined} />}
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
        <ReferenceEmpty mascot title={product.loading ? "Loading collection" : "Collection not available"} body="The route is waiting for backend collection detail data. No static screenshot UI is rendered." />
      ) : (
        <>
          <section className="ref-panel p-4">
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
                  <ReferenceTransactionScene mode="proof" state="idle" title="Proof Verified Animation" tokenSymbol={collection.symbol} compact className="mt-3" />
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
                    empty={<ReferenceEmpty title="No vault NFTs returned" body="Vault rows appear only when the backend returns real NFTs for this collection." />}
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
              <ReferencePanel title="Mint Moment Animation">
                <ReferenceTransactionScene mode="mint" state="idle" title="Mint Moment" tokenSymbol={collection.symbol} image={collection.image} compact />
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
        aside={<div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1"><ReferenceMetric label="Total Staked Vaults" value={formatMetric(data?.stats?.totalStakedVaults)} /><ReferenceMetric label="Total Rewards (PHEW)" value={formatMetric(data?.stats?.totalRewards)} /><ReferenceMetric label="Your Earned" value={formatMetric(data?.stats?.claimableRewards)} /></div>}
      />
      {!wallet.connected ? <WalletRequiredBanner action={<ReferenceButton>Connect Wallet</ReferenceButton>} /> : null}
      {product.error ? <BackendUnavailableBanner message={product.error.message} retry={product.reload} /> : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <main className="space-y-4">
          <ReferencePanel title="1. Eligible Vault NFTs" subtitle="Select an eligible Vault NFT to stake.">
            <div className="grid gap-3 lg:grid-cols-[minmax(280px,0.8fr)_repeat(4,minmax(140px,1fr))]">
              {!eligible.length ? (
                <ReferenceEmpty title="No eligible Vault NFTs" body={wallet.connected ? "No eligible vault NFTs were returned by the backend." : "Connect a wallet to view eligible vault NFTs."} action={<ReferenceButton href="/collections" tone="outline">Explore Vaults</ReferenceButton>} />
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
              empty={<ReferenceEmpty title="No active staking positions" body="Stake an eligible Vault NFT to start earning rewards." action={<ReferenceButton tone="outline">Stake a Vault</ReferenceButton>} />}
            />
          </ReferencePanel>
          <ReferencePanel title="6. Staking Activity">
            <ReferenceTable columns={["Type", "Position ID", "Vault NFT", "Amount", "Status", "Tx Hash", "Date"]} rows={[]} empty={<ReferenceEmpty title="No activity found" body="Your staking rewards activity will appear here." />} />
          </ReferencePanel>
        </main>
        <aside className="space-y-4">
          <ReferencePanel title="2. Selected Vault">
            {selected ? <VaultSlot vault={selected} selected /> : <ReferenceEmpty title="Vault" body="N/A" object={brandAssets.nftSlot} />}
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
              <img src={brandAssets.mascotPoses.point} alt="Phew mascot" className="ref-free-mascot !bottom-0 !w-32" />
            </div>
          </ReferencePanel>
          <ReferencePanel title="8. Animation Preview">
            <ReferenceTransactionScene mode="stake" state={!wallet.connected ? "wallet-disconnected" : "idle"} title="Stake Moment" tokenSymbol={selected?.tier ?? "TOKEN"} image={selected?.image} compact />
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
              empty={<ReferenceEmpty title="No risk rows" body="Risk rows appear after backend collections or scan snapshots are returned." />}
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
            <ReferenceInput value={token} onChange={setToken} placeholder="Paste token contract address..." right={<ReferenceButton tone="outline">Scan</ReferenceButton>} />
          </ReferencePanel>
          <ReferencePanel title="Risk Breakdown (Last Scan)">
            <ReferenceRows rows={["Contract Risk", "Holder Concentration", "Liquidity Risk", "Mint / Freeze Authority", "Honeypot Check", "Proxy / Upgradeable", "Metadata Risk", "Sanction / Blocklist"].map((label) => ({ label, value: "N/A" }))} />
          </ReferencePanel>
          <ReferencePanel title="Risk Status Summary">
            <ReferenceEmpty title="No scan data yet" body="Run a scan to view risk summary." action={<ReferenceButton tone="outline" icon={RefreshCcw}>Run Full Scan</ReferenceButton>} />
          </ReferencePanel>
          <ReferencePanel title="Recent Risk Scans">
            <ReferenceTable columns={["Time", "Type", "Triggered By", "Status"]} rows={[]} empty={<ReferenceEmpty title="No scans yet" body="Risk scans will appear here." />} />
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
        aside={<ReferenceTransactionScene mode="redeem" state={!wallet.connected ? "wallet-disconnected" : poolReady ? "idle" : "error"} title="Strategy quote route" description="Wallet inventory, reserve backing, risk, and quote state stay locked to backend responses." tokenSymbol="PHEW" compact />}
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
              empty={<ReferenceEmpty title="No quotes" body="Quotes appear only after real pool-backed quote requests for this wallet." />}
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

function formatMetric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "N/A";
}

function formatCurrency(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "N/A";
}

function formatSol(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toLocaleString(undefined, { maximumFractionDigits: 3 })} SOL` : "N/A";
}
