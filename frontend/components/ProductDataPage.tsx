"use client";

import Link from "next/link";
import { ArrowRight, LockKeyhole, Shield, Swords, UserPlus } from "lucide-react";
import { useWalletDisplay } from "@/hooks/useWalletDisplay";
import { useApiResource } from "@/hooks/useApiResource";
import type { VaultCollection, VaultNft, RaidRoom } from "@/lib/types";
import { AppShell } from "./AppShell";
import { CollectionCard } from "./CollectionCard";
import { EmptyState, ErrorState, LoadingState, WalletDisconnectedState } from "./ApiState";
import { MarketplaceGrid } from "./MarketplaceGrid";
import { RaidCard } from "./RaidCard";
import { SectionCard } from "./SectionCard";
import { StatCard } from "./StatCard";
import { NFTCard } from "./NFTCard";

type ProductData = {
  title?: string;
  subtitle?: string;
  collections?: VaultCollection[];
  collection?: VaultCollection;
  nfts?: VaultNft[];
  raids?: RaidRoom[];
  stats?: Record<string, number>;
  walletRequired?: boolean;
  walletAddress?: string;
  positions?: unknown[];
  listings?: unknown[];
  activity?: unknown[];
  user?: unknown;
};

export function ProductDataPage({ active, title, endpoint, walletRequired, children }: { active: string; title: string; endpoint: string; walletRequired?: boolean; children?: (data: ProductData) => React.ReactNode }) {
  const wallet = useWalletDisplay();
  const walletPath = wallet.address ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}wallet=${encodeURIComponent(wallet.address)}` : endpoint;
  const state = useApiResource<ProductData>(walletPath);

  return (
    <AppShell active={active}>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-vault-purple">API-backed</p>
            <h1 className="mt-2 text-4xl font-black">{title}</h1>
            <p className="mt-2 max-w-3xl text-slate-400">This page now reads persisted VaultX API state and shows loading, empty, error, and wallet-disconnected states instead of prototype mock data.</p>
          </div>
          <Link href="/create-collection" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-vault-purple px-5 text-sm font-bold shadow-glow">
            <UserPlus className="size-4" /> Create Community
          </Link>
        </div>

        {walletRequired && !wallet.connected ? <WalletDisconnectedState /> : null}
        {state.loading ? <LoadingState /> : null}
        {state.error ? <ErrorState error={state.error} retry={state.reload} /> : null}
        {!state.loading && !state.error && state.data ? children ? children(state.data) : <DefaultProductView data={state.data} /> : null}
      </div>
    </AppShell>
  );
}

export function DefaultProductView({ data }: { data: ProductData }) {
  const collections = data.collections ?? (data.collection ? [data.collection] : []);
  const nfts = data.nfts ?? [];
  const raids = data.raids ?? [];

  if (!collections.length && !nfts.length && !raids.length && !data.stats) {
    return <EmptyState title="No persisted data yet" body="Create and approve a community, launch it, then mint a Vault NFT to populate this page from Supabase." action={<Link href="/create-collection" className="inline-flex h-11 items-center justify-center rounded-lg bg-vault-purple px-5 text-sm font-bold">Start Create Community</Link>} />;
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
