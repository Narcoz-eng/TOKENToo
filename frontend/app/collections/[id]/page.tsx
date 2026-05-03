import Link from "next/link";
import { BadgeCheck, Flame, Globe, Send, Share2, Swords, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Leaderboard } from "@/components/Leaderboard";
import { NFTCard } from "@/components/NFTCard";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { collections, getCollection, leaderboard, raidRooms, riskAccent, vaultNfts } from "@/lib/mock-data";

export function generateStaticParams() {
  return collections.map((collection) => ({ id: collection.id }));
}

export default function CollectionDetailPage({ params }: { params: { id: string } }) {
  const collection = getCollection(params.id);
  const nfts = vaultNfts.filter((nft) => nft.collectionId === collection.id || collection.id === "frog-vaults").slice(0, 5);
  const xpPercent = Math.round((collection.xp / collection.nextXp) * 1000) / 10;

  return (
    <AppShell active="collections">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="text-sm text-slate-400">
            <Link href="/collections">Collections</Link> <span className="mx-2">/</span> <span className="text-white">{collection.name}</span>
          </div>

          <SectionCard className="overflow-hidden p-0">
            <div className="grid gap-6 p-5 lg:grid-cols-[260px_minmax(0,1fr)_420px]">
              <img src={collection.image} alt={collection.name} className="aspect-square w-full rounded-lg object-cover shadow-glow" />
              <div className="space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-4xl font-black">{collection.name}</h1>
                    <BadgeCheck className="size-7 text-vault-purple" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusPill accent="purple">{collection.chain}</StatusPill>
                    <StatusPill accent="green">{collection.category}</StatusPill>
                    <StatusPill accent="cyan">Community Driven</StatusPill>
                    <StatusPill accent={riskAccent(collection.riskTier)}>{collection.riskTier}</StatusPill>
                    <StatusPill accent="gold">{collection.mascot}</StatusPill>
                  </div>
                  <p className="mt-4 max-w-2xl text-slate-300">{collection.description}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className="h-11 rounded-lg bg-vault-purple px-5 text-sm font-bold shadow-glow">Join Collection</button>
                  <button className="h-11 rounded-lg border border-vault-line bg-black/25 px-5 text-sm font-bold">Follow</button>
                  {[Globe, Send, Users, Share2].map((Icon, index) => (
                    <button key={index} className="flex size-11 items-center justify-center rounded-lg border border-vault-line bg-black/25 text-slate-300" aria-label="Social link">
                      <Icon className="size-4" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5 border-vault-line lg:border-l lg:pl-6">
                <Metric label="Floor Price" value={`${collection.floorSol} SOL`} />
                <Metric label="Total Volume" value={`${collection.volumeSol.toLocaleString()} SOL`} />
                <Metric label="Owners" value={collection.holders.toLocaleString()} />
                <Metric label="Total Supply" value={collection.supply.toLocaleString()} />
                <Metric label="Minted" value={`${collection.minted.toLocaleString()} (${Math.round((collection.minted / collection.supply) * 100)}%)`} />
                <Metric label="Unique Holders" value={collection.holders.toLocaleString()} />
                <Metric label="Total XP" value={collection.xp.toLocaleString()} />
                <Metric label="Active 24h" value={collection.activeUsers24h.toLocaleString()} />
                <Metric label="Raid Success" value={`${collection.raidSuccessRate}%`} />
                <Metric label="Avg Hold" value={`${collection.averageHoldDays}d`} />
              </div>
            </div>
          </SectionCard>

          <nav className="glass flex flex-wrap gap-2 rounded-lg p-2">
            {[
              ["Overview", `/collections/${collection.id}`],
              ["NFTs", "#vaults"],
              ["Community", `/collections/${collection.id}/community`],
              ["Raids", `/collections/${collection.id}/raids`],
              ["Activity", "#activity"]
            ].map(([label, href], index) => (
              <Link key={label} href={href} className={index === 0 ? "rounded-lg bg-vault-purple px-4 py-2 text-sm font-bold" : "rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/5"}>
                {label}
              </Link>
            ))}
          </nav>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="Collection Level">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-black text-vault-green">Level {collection.level}</p>
                    <span className="text-sm text-slate-400">Level {collection.level + 1}</span>
                  </div>
                  <div className="mt-4">
                    <ProgressBar value={collection.xp} max={collection.nextXp} />
                    <div className="mt-2 flex justify-between text-sm">
                      <span>{collection.xp.toLocaleString()} / {collection.nextXp.toLocaleString()} XP</span>
                      <span className="text-vault-green">{xpPercent}%</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <StatusPill accent="purple">+3 New Traits</StatusPill>
                    <StatusPill accent="green">Yield Boost</StatusPill>
                    <StatusPill accent="cyan">cNFT Drop</StatusPill>
                  </div>
                </div>
                <img src={collection.banner} alt="" className="h-32 rounded-lg object-cover" />
              </div>
            </SectionCard>

            <SectionCard title="Community Progress">
              <div className="space-y-5">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-slate-400">XP earned through raids, volume, holding, and staking.</p>
                    <p className="mt-2 text-3xl font-black text-vault-green">{collection.xp.toLocaleString()} XP</p>
                  </div>
                  <StatusPill accent="green">{xpPercent}%</StatusPill>
                </div>
                <ProgressBar value={collection.xp} max={collection.nextXp} />
                <div className="grid grid-cols-5 gap-2 text-center text-xs text-slate-400">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div key={level} className={level <= collection.level ? "text-vault-green" : ""}>
                      <div className="mx-auto mb-2 size-3 rounded-full bg-current" />
                      Level {level}
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard
            id="vaults"
            title="Vaults"
            action={<Link href="/marketplace" className="text-sm font-semibold text-vault-purple">Open Marketplace</Link>}
          >
            <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px_180px]">
              <input className="h-10 rounded-lg border border-vault-line bg-black/25 px-3 text-sm outline-none" placeholder="Search vaults..." />
              <button className="rounded-lg border border-vault-line bg-black/25 text-sm">Rarity</button>
              <button className="rounded-lg border border-vault-line bg-black/25 text-sm">Level</button>
              <button className="rounded-lg border border-vault-line bg-black/25 text-sm">Price: Low to High</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {nfts.map((nft) => (
                <NFTCard key={nft.id} nft={nft} collection={collection} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Trait Breakdown">
            <div className="grid gap-3 md:grid-cols-6">
              {[
                ["Base", collection.traitLayers.base[0]],
                ["Headgear", collection.traitLayers.headgear[0]],
                ["Eyes", collection.traitLayers.eyes[0]],
                ["Aura", collection.traitLayers.aura[0]],
                ["Accessory", collection.traitLayers.accessory[0]],
                ["Background", collection.traitLayers.background[0]]
              ].map(([trait, value], index) => (
                <div key={trait} className="rounded-lg border border-vault-line bg-black/25 p-4">
                  <p className="text-sm font-semibold">{trait}</p>
                  <p className="mt-1 text-xs text-slate-400">{value}</p>
                  <ProgressBar value={48 - index * 4} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard id="activity" title="Collection Activity">
            <div className="grid gap-3 md:grid-cols-3">
              {["FrogMaster joined the faction", "SwampKing reacted to Swamp Takeover", "ToxicToad minted Toxic Sage"].map((item, index) => (
                <div key={item} className="rounded-lg border border-vault-line bg-black/25 p-4">
                  <Flame className="mb-3 size-5 text-vault-gold" />
                  <p className="font-semibold">{item}</p>
                  <p className="mt-1 text-sm text-vault-green">+{[75, 120, 220][index]} XP</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <SectionCard title="About Collection">
            <p className="text-sm leading-6 text-slate-300">{collection.description}</p>
            <div className="mt-5 space-y-3 text-sm">
              <Info label="Creator" value="FrogMaster" />
              <Info label="Collection Type" value="Vault" />
              <Info label="Blockchain" value="Solana" />
              <Info label="Royalty" value="2.5%" />
              <Info label="Mascot" value={collection.mascot} />
            </div>
          </SectionCard>

          <SectionCard title={`Level ${collection.level} Benefits`}>
            <div className="space-y-3 text-sm">
              {["5 New Backgrounds", "3 New Traits", "+5% Yield Boost", "Raid Rewards Boost", "cNFT Airdrop"].map((benefit) => (
                <div key={benefit} className="flex items-center justify-between rounded-lg bg-black/20 p-3">
                  <span>{benefit}</span>
                  <span className="text-vault-green">✓</span>
                </div>
              ))}
            </div>
            <Link href={`/collections/${collection.id}/community`} className="mt-4 flex h-11 items-center justify-center rounded-lg bg-vault-purple font-bold">
              View Community
            </Link>
          </SectionCard>

          <SectionCard>
            <Leaderboard rows={leaderboard.slice(0, 5)} title="Top Contributors" />
          </SectionCard>

          <SectionCard title="Active Raids">
            <div className="space-y-3">
              {raidRooms.slice(0, 3).map((raid) => (
                <Link href={`/collections/${collection.id}/raids/${raid.id}`} key={raid.id} className="flex items-center gap-3 rounded-lg bg-black/20 p-3">
                  <Swords className="size-4 text-vault-purple" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{raid.name}</p>
                    <p className="text-xs text-slate-400">{raid.rewardSol.toLocaleString()} SOL pool</p>
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>
        </aside>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
