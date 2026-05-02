import Link from "next/link";
import { Gift, TrendingUp, Users, WalletCards } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Leaderboard } from "@/components/Leaderboard";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionCard } from "@/components/SectionCard";
import { StatCard } from "@/components/StatCard";
import { StatusPill } from "@/components/StatusPill";
import { activity, getCollection, leaderboard, vaultNfts } from "@/lib/mock-data";

export default function StakingPage() {
  const collection = getCollection();
  const stakedVaults = vaultNfts.slice(0, 4);

  return (
    <AppShell active="staking">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <section className="glass relative overflow-hidden rounded-lg p-6">
            <img src="/art/hero-frog.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-r from-vault-ink via-vault-ink/90 to-vault-ink/20" />
            <div className="relative">
              <h1 className="text-4xl font-black">Staking</h1>
              <p className="mt-2 text-slate-300">Stake Vault NFTs to earn rewards, boost APY, unlock badges, and add collection XP.</p>
              <div className="mt-6 grid gap-3 md:grid-cols-4">
                <StatCard icon={WalletCards} label="Total Value Staked" value="$18.42M" delta="+24.8% (7D)" />
                <StatCard icon={Users} label="Total Stakers" value="12,541" delta="+12.4% (7D)" />
                <StatCard icon={TrendingUp} label="Average APY" value="28.7%" delta="+2.3% (7D)" accent="green" />
                <StatCard icon={Gift} label="Rewards Distributed" value="125,420 SOL" accent="gold" />
              </div>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <SectionCard title="My Staked Vaults" action={<span className="text-sm text-vault-green">Total Value: $9,820.45</span>}>
              <div className="space-y-3">
                {stakedVaults.map((nft) => (
                  <div key={nft.id} className="grid gap-3 rounded-lg border border-vault-line bg-black/20 p-3 md:grid-cols-[minmax(220px,1.5fr)_1fr_1fr_1fr_1fr] md:items-center">
                    <div className="flex items-center gap-3">
                      <img src={nft.image} alt="" className="size-16 rounded-lg object-cover" />
                      <div>
                        <p className="font-bold">{nft.name}</p>
                        <p className="text-sm text-slate-400">#{nft.number}</p>
                        <StatusPill accent="purple">{collection.symbol} Vaults</StatusPill>
                      </div>
                    </div>
                    <VaultRow label="Locked Amount" value={nft.lockedAmount} />
                    <VaultRow label="Lock Duration" value={nft.duration} />
                    <VaultRow label="APY" value={`${nft.apy}%`} green />
                    <VaultRow label="Earned" value={`${(nft.priceSol * 100).toFixed(2)} SOL`} />
                  </div>
                ))}
              </div>
              <button className="mt-4 h-11 w-full rounded-lg border border-vault-purple/60 bg-vault-purple/10 font-bold text-vault-purple">+ Stake More Vaults</button>
            </SectionCard>

            <SectionCard title="Stake New Vault">
              <div className="space-y-5">
                <label className="block">
                  <span className="text-sm text-slate-400">Select Vault</span>
                  <select className="mt-2 h-11 w-full rounded-lg border border-vault-line bg-black/25 px-3 text-sm outline-none">
                    <option>Swamp Watcher #8421</option>
                    <option>Toxic Sage #1209</option>
                  </select>
                </label>
                <div>
                  <p className="mb-3 text-sm text-slate-400">Choose Lock Duration</p>
                  <div className="grid grid-cols-3 gap-2">
                    {["30 Days", "90 Days", "180 Days"].map((duration, index) => (
                      <button key={duration} className={index === 1 ? "rounded-lg border border-vault-green bg-vault-green/10 p-3 text-vault-green" : "rounded-lg border border-vault-line bg-black/25 p-3 text-slate-300"}>
                        <p className="font-bold">{duration}</p>
                        <p className="text-xs">{[18.7, 32.5, 41.3][index]}% APY</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-400">You will earn estimated</p>
                  <p className="mt-1 text-3xl font-black text-vault-green">2,845.20 SOL</p>
                  <p className="text-sm text-slate-500">$6,502.11</p>
                </div>
                <button className="h-12 w-full rounded-lg bg-vault-purple font-bold shadow-glow">Stake Vault</button>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Staking Benefits">
            <div className="grid gap-3 md:grid-cols-5">
              {["Higher Rewards", "Raid Boost", "XP Multiplier", "Exclusive Perks", "Voting Power"].map((benefit) => (
                <div key={benefit} className="rounded-lg border border-vault-line bg-black/25 p-4">
                  <TrendingUp className="mb-3 size-8 text-vault-green" />
                  <p className="font-bold">{benefit}</p>
                  <p className="mt-1 text-sm text-slate-400">Staked vaults increase rewards, raid impact, and community progression.</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard>
            <Leaderboard rows={leaderboard.slice(0, 5)} title="Top Stakers" />
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <SectionCard title="My Earnings">
            <p className="text-sm text-slate-400">Claimable Rewards</p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-black text-vault-green">345.75 SOL</p>
                <p className="text-slate-500">$789.32</p>
              </div>
              <button className="h-10 rounded-lg bg-vault-purple px-4 font-bold">Claim All</button>
            </div>
            <div className="mt-5 border-t border-vault-line pt-4">
              <Info label="Pending Rewards" value="899.45 SOL" />
              <Info label="Boosted APY" value="+87.5%" />
            </div>
          </SectionCard>

          <SectionCard title="Reward Breakdown">
            <div className="space-y-4">
              {["Staking Rewards", "Raid Rewards", "Collection Boost", "Referral Bonus"].map((label, index) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{label}</span>
                    <span>{[60, 25, 10, 5][index]}%</span>
                  </div>
                  <ProgressBar value={[60, 25, 10, 5][index]} color={index === 0 ? "purple" : index === 1 ? "gold" : "green"} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Your Boosts">
            <div className="space-y-3">
              {["VIP Raider +20%", "Collection Level 3 +15%", "90D Lock Bonus +15%", "Community Activity +12.5%", "Referral Boost +25%"].map((boost) => (
                <div key={boost} className="rounded-lg bg-black/20 p-3 text-sm text-vault-green">{boost}</div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recent Activity">
            <div className="space-y-3">
              {activity.map((item) => (
                <div key={item.actor + item.time} className="flex items-center gap-3 rounded-lg bg-black/20 p-3 text-sm">
                  <img src={item.image} alt="" className="size-9 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
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

function VaultRow({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="text-sm">
      <p className="text-slate-500">{label}</p>
      <p className={green ? "font-bold text-vault-green" : "font-semibold text-white"}>{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
