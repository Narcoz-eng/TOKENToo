import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, Coins, Crown, Flame, Gem, LockKeyhole, Swords, Trophy, WalletCards } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Leaderboard } from "@/components/Leaderboard";
import { NFTCard } from "@/components/NFTCard";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionCard } from "@/components/SectionCard";
import { StatCard } from "@/components/StatCard";
import { activity, getCollection, leaderboard, vaultNfts } from "@/lib/mock-data";

export default function ProfilePage() {
  const collection = getCollection();

  return (
    <AppShell active="profile">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <SectionCard>
            <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_360px] lg:items-center">
              <img src={collection.image} alt="" className="aspect-square w-full rounded-lg object-cover shadow-glow" />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-black">FrogMaster</h1>
                  <BadgeCheck className="size-7 text-vault-purple" />
                </div>
                <p className="mt-2 text-vault-purple">Legendary Raider · Swamp Prophet · Founder</p>
                <p className="mt-4 max-w-xl text-slate-300">Your faction identity, status badges, raid record, and Vault NFT roles across the VaultX ecosystem.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge icon={Crown} label="Legendary Raider" />
                  <Badge icon={Gem} label="Top Holder" />
                  <Badge icon={Flame} label="Raid Master" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <StatBox label="Vaults" value="12" />
                  <StatBox label="cNFTs" value="28" />
                  <StatBox label="Raids Won" value="45" />
                </div>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="text-sm uppercase text-slate-400">Active Collection</p>
                <h2 className="mt-2 text-2xl font-black">{collection.name}</h2>
                <p className="mt-1 text-vault-green">Level {collection.level}</p>
                <ProgressBar value={collection.xp} max={collection.nextXp} />
                <p className="mt-2 text-sm text-slate-400">{collection.xp.toLocaleString()} / {collection.nextXp.toLocaleString()} XP</p>
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-4 md:grid-cols-5">
            <StatCard icon={WalletCards} label="Total Vaults" value="4,523" />
            <StatCard icon={LockKeyhole} label="Locked Value" value="$7.28M" />
            <StatCard icon={Coins} label="Floor Price" value="12.5 SOL" accent="gold" />
            <StatCard icon={Swords} label="Raid XP" value="85.4K" accent="purple" />
            <StatCard icon={Trophy} label="Yield APY" value="38.7%" accent="green" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_520px]">
            <SectionCard title="Your Vaults" action={<Link href="/marketplace" className="text-sm text-vault-purple">View All</Link>}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {vaultNfts.slice(0, 4).map((nft) => (
                  <NFTCard key={nft.id} nft={nft} collection={collection} />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Raid Missions" action={<Link href="/raids" className="text-sm text-vault-purple">View All</Link>}>
              <div className="space-y-4">
                {[
                  ["Tweet about $FROG Vaults", "1/1", 100, 100],
                  ["Invite 3 friends", "2/3", 66, 150],
                  ["Trade a vault NFT", "1/1", 100, 100],
                  ["Hold any vault for 7 days", "7/7", 100, 200]
                ].map(([title, count, progress, xp]) => (
                  <div key={title as string} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_80px_80px] md:items-center">
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="font-semibold">{title as string}</span>
                        <span className="text-slate-400">{count as string}</span>
                      </div>
                      <ProgressBar value={progress as number} />
                    </div>
                    <span className="font-bold text-vault-green">+{xp as number} XP</span>
                    <span className="text-right text-vault-gold">{Math.round((xp as number) / 2)} SOL</span>
                  </div>
                ))}
                <button className="h-11 w-full rounded-lg bg-vault-purple font-bold">Claim All Rewards</button>
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <SectionCard title="Collection Progress">
              <p className="text-2xl font-black text-vault-green">Level {collection.level}</p>
              <ProgressBar value={collection.xp} max={collection.nextXp} />
              <p className="mt-2 text-sm text-slate-400">Level 4 unlocks premium accessories and cNFT role badges.</p>
            </SectionCard>
            <SectionCard title="Yield Pool">
              <p className="text-sm text-slate-400">Total APY</p>
              <p className="text-4xl font-black text-vault-green">38.7%</p>
              <div className="mt-5 grid grid-cols-7 gap-2">
                {[44, 31, 38, 50, 28, 39, 30].map((height, index) => (
                  <div key={index} className="rounded-t bg-vault-purple" style={{ height }} />
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Marketplace">
              <div className="space-y-3">
                {vaultNfts.slice(0, 4).map((nft) => (
                  <Link key={nft.id} href={`/nfts/${nft.id}`} className="flex items-center gap-3 rounded-lg bg-black/20 p-2">
                    <img src={nft.image} alt="" className="size-10 rounded-lg object-cover" />
                    <div className="flex-1">
                      <p className="font-semibold">{nft.name}</p>
                      <p className="text-xs text-slate-500">#{nft.number}</p>
                    </div>
                    <span>{nft.priceSol} SOL</span>
                  </Link>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>

        <aside className="space-y-5">
          <SectionCard>
            <Leaderboard rows={leaderboard} />
          </SectionCard>
          <SectionCard title="Recent Activity">
            <div className="space-y-3">
              {activity.map((item) => (
                <div key={item.actor + item.time} className="flex items-center gap-3 rounded-lg bg-black/20 p-3 text-sm">
                  <img src={item.image} alt="" className="size-9 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p>{item.actor} {item.action}</p>
                    <p className="text-xs text-slate-500">{item.time}</p>
                  </div>
                  <span className="text-vault-green">{item.amount}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </aside>
      </div>
    </AppShell>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-vault-line bg-black/25 p-4">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function Badge({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-vault-purple/40 bg-vault-purple/15 px-3 py-2 text-xs font-bold text-purple-100">
      <Icon className="size-4 text-vault-gold" />
      {label}
    </span>
  );
}
