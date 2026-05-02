import Link from "next/link";
import { Filter, PlusCircle, Search, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CollectionCard } from "@/components/CollectionCard";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { collections } from "@/lib/mock-data";

export default function CollectionsPage() {
  return (
    <AppShell active="collections">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-vault-purple">Communities</p>
            <h1 className="mt-2 text-4xl font-black">Collections</h1>
            <p className="mt-2 max-w-2xl text-slate-400">Each token has an isolated vault, community identity, raid room, staking boost table, marketplace, and fee ledger.</p>
          </div>
          <Link href="/create-collection" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-vault-purple px-5 text-sm font-bold shadow-glow">
            <PlusCircle className="size-4" /> Create Collection
          </Link>
        </div>

        <SectionCard>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
            <label className="relative block">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input className="h-11 w-full rounded-lg border border-vault-line bg-black/25 pl-11 text-sm outline-none focus:border-vault-purple" placeholder="Search token, mint, mascot, vibe..." />
            </label>
            <button className="flex h-11 items-center justify-center gap-2 rounded-lg border border-vault-line bg-black/25 text-sm">
              <Filter className="size-4" /> Risk Gate
            </button>
            <button className="h-11 rounded-lg border border-vault-line bg-black/25 text-sm">Level: High to Low</button>
            <button className="h-11 rounded-lg bg-vault-purple text-sm font-bold">Apply Filters</button>
          </div>
        </SectionCard>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>

        <SectionCard title="Collection Risk Gates">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Collection</th>
                  <th className="px-3 py-3">Risk Score</th>
                  <th className="px-3 py-3">Instant Sell</th>
                  <th className="px-3 py-3">Liquidity</th>
                  <th className="px-3 py-3">Progress</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((collection) => (
                  <tr key={collection.id} className="border-t border-vault-line">
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <img src={collection.image} alt="" className="size-10 rounded-lg object-cover" />
                        <div>
                          <p className="font-bold">{collection.name}</p>
                          <p className="text-xs text-slate-500">{collection.tokenMint.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 font-bold text-vault-green">{collection.riskScore}</td>
                    <td className="px-3 py-4">
                      <StatusPill accent={collection.instantSellEnabled ? "green" : "red"}>
                        {collection.instantSellEnabled ? "Enabled" : "Disabled"}
                      </StatusPill>
                    </td>
                    <td className="px-3 py-4">{collection.volume24hSol.toLocaleString()} SOL 24h</td>
                    <td className="px-3 py-4">
                      <ProgressBar value={collection.xp} max={collection.nextXp} />
                    </td>
                    <td className="px-3 py-4">
                      <Link href={`/collections/${collection.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-vault-purple/50 px-3 text-vault-purple">
                        <ShieldCheck className="size-4" /> Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
