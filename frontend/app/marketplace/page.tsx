import Link from "next/link";
import { Boxes, Grid2X2, ListFilter, Search, TrendingUp, Users, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MarketplaceGrid } from "@/components/MarketplaceGrid";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionCard } from "@/components/SectionCard";
import { StatCard } from "@/components/StatCard";
import { StatusPill } from "@/components/StatusPill";
import { activity, collections, getCollection, vaultNfts } from "@/lib/mock-data";

export default function MarketplacePage() {
  return (
    <AppShell active="marketplace">
      <div className="grid gap-5 2xl:grid-cols-[280px_minmax(0,1fr)_380px]">
        <aside className="space-y-5">
          <SectionCard title="Filters">
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold">Collections</p>
                <div className="space-y-2 text-sm">
                  {collections.map((collection) => (
                    <label key={collection.id} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2"><input type="checkbox" defaultChecked={collection.id === "frog-vaults"} /> {collection.name}</span>
                      <span className="text-slate-500">{collection.vaults.toLocaleString()}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">Rarity</p>
                <div className="space-y-2 text-sm">
                  {["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"].map((rarity) => (
                    <label key={rarity} className="flex items-center gap-2">
                      <input type="checkbox" /> {rarity}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">Price Range</p>
                <div className="grid grid-cols-2 gap-2">
                  <input className="h-10 rounded-lg border border-vault-line bg-black/25 px-3 text-sm" placeholder="Min" />
                  <input className="h-10 rounded-lg border border-vault-line bg-black/25 px-3 text-sm" placeholder="Max" />
                </div>
              </div>
              <button className="h-11 w-full rounded-lg bg-vault-purple font-bold">Apply Filters</button>
            </div>
          </SectionCard>
        </aside>

        <div className="space-y-5">
          <section className="glass relative overflow-hidden rounded-lg p-6">
            <img src="/art/hero-frog.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
            <div className="absolute inset-0 bg-gradient-to-r from-vault-ink via-vault-ink/85 to-vault-ink/20" />
            <div className="relative">
              <h1 className="text-4xl font-black">Marketplace</h1>
              <p className="mt-2 text-slate-300">Trade backed Vault NFTs from token communities with floor, risk, and backing context.</p>
              <div className="mt-6 grid gap-3 md:grid-cols-4">
                <StatCard icon={Boxes} label="Total NFTs" value="489,231" />
                <StatCard icon={Users} label="Owners" value="124,532" accent="gold" />
                <StatCard icon={Zap} label="Volume" value="2.45M SOL" accent="purple" />
                <StatCard icon={TrendingUp} label="24h Volume" value="+24.8%" accent="green" />
              </div>
            </div>
          </section>

          <SectionCard>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {["All NFTs", "Buy Now", "Auctions", "My Listings", "Watchlist"].map((tab, index) => (
                  <button key={tab} className={index === 0 ? "rounded-lg bg-vault-purple px-4 py-2 text-sm font-semibold" : "rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/5"}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_140px_140px_180px_110px]">
                <label className="relative">
                  <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <input className="h-11 w-full rounded-lg border border-vault-line bg-black/25 pl-11 text-sm outline-none" placeholder="Search NFTs by name or ID" />
                </label>
                {["Collections", "Rarity", "Price", "Traits"].map((filter) => (
                  <button key={filter} className="h-11 rounded-lg border border-vault-line bg-black/25 text-sm">{filter}</button>
                ))}
                <button className="flex h-11 items-center justify-center gap-2 rounded-lg border border-vault-line bg-black/25 text-sm">
                  <ListFilter className="size-4" /> Low to High
                </button>
                <button className="flex h-11 items-center justify-center rounded-lg border border-vault-purple bg-vault-purple/15 text-vault-purple">
                  <Grid2X2 className="size-4" />
                </button>
              </div>
            </div>
          </SectionCard>

          <MarketplaceGrid />
        </div>

        <aside className="space-y-5">
          <SectionCard title="Top Collections" action={<Link href="/collections" className="text-sm text-vault-purple">View All</Link>}>
            <div className="space-y-3">
              {collections.map((collection, index) => (
                <Link key={collection.id} href={`/collections/${collection.id}`} className="flex items-center gap-3 rounded-lg bg-black/20 p-3">
                  <span className="text-slate-500">{index + 1}</span>
                  <img src={collection.image} alt="" className="size-10 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{collection.name}</p>
                    <p className="text-xs text-slate-500">Floor {collection.floorSol} SOL</p>
                  </div>
                  <span className="font-semibold">{collection.volume24hSol.toLocaleString()} SOL</span>
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recent Sales">
            <div className="space-y-3">
              {vaultNfts.slice(0, 5).map((nft, index) => (
                <div key={nft.id} className="flex items-center gap-3 rounded-lg bg-black/20 p-3">
                  <img src={nft.image} alt="" className="size-10 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{nft.name} #{nft.number}</p>
                    <p className="text-xs text-slate-500">{index * 3 + 2}m ago</p>
                  </div>
                  <span>{nft.priceSol.toFixed(2)} SOL</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Live Activity">
            <div className="space-y-3">
              {activity.map((item) => (
                <div key={item.actor + item.time} className="flex items-center gap-3 rounded-lg bg-black/20 p-3 text-sm">
                  <img src={item.image} alt="" className="size-9 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p><span className="font-semibold">{item.actor}</span> <span className="text-slate-400">{item.action}</span></p>
                    <p className="text-xs text-slate-500">{item.time}</p>
                  </div>
                  <span className="font-bold text-vault-green">{item.amount}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard className="border-vault-purple/50 bg-vault-purple/10">
            <h2 className="text-xl font-black">List Your NFTs</h2>
            <p className="mt-2 text-sm text-slate-300">List backed Vault NFTs and show buyers the token backing, unlock date, and collection level.</p>
            <Link href="/profile" className="mt-5 flex h-11 items-center justify-center rounded-lg bg-vault-purple font-bold">List NFT Now</Link>
          </SectionCard>
        </aside>
      </div>
    </AppShell>
  );
}
