import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Crown, Rocket, Shield, Swords, Trophy, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Leaderboard } from "@/components/Leaderboard";
import { ProgressBar } from "@/components/ProgressBar";
import { RaidCard } from "@/components/RaidCard";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { collections, getCollection, leaderboard, raidRooms } from "@/lib/mock-data";

export default function RaidsPage() {
  const active = raidRooms[0];
  const activeCollection = getCollection(active.collectionId);

  return (
    <AppShell active="raids">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="glass relative overflow-hidden rounded-lg p-6 sm:p-8">
            <img src={activeCollection.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
            <div className="absolute inset-0 bg-gradient-to-r from-vault-ink via-vault-ink/80 to-transparent" />
            <div className="relative max-w-3xl">
              <h1 className="text-4xl font-black sm:text-5xl">RAID. <span className="text-vault-purple">EARN.</span> <span className="text-vault-cyan">UPGRADE.</span></h1>
              <p className="mt-4 max-w-xl text-lg text-slate-300">Join raids with your community, complete missions, and earn XP, rewards, and exclusive loot.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/collections/${activeCollection.id}/raids`} className="h-12 rounded-lg bg-vault-purple px-6 py-3 font-bold shadow-glow">Join a Raid</Link>
                <Link href="#missions" className="h-12 rounded-lg border border-vault-line bg-black/35 px-6 py-3 font-bold">How Raids Work</Link>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-4">
                <HeroRaidMetric icon={Shield} label="Active Raids" value="25" />
                <HeroRaidMetric icon={Users} label="Participants" value="2,341" />
                <HeroRaidMetric icon={Rocket} label="XP 24h" value="85.4K" />
                <HeroRaidMetric icon={Trophy} label="Rewards" value="12,850 SOL" />
              </div>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <SectionCard id="missions" title="Active Raid Missions">
              <div className="mb-4 flex flex-wrap gap-2">
                {["Daily Missions", "Weekly Missions", "Community Missions", "Special Events"].map((tab, index) => (
                  <button key={tab} className={index === 0 ? "rounded-lg bg-vault-purple px-4 py-2 text-sm font-semibold" : "rounded-lg border border-vault-line bg-black/25 px-4 py-2 text-sm text-slate-300"}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {[
                  ["Complete 3 Raids", 66, "+200 XP", "150"],
                  ["Stake a Vault NFT", 100, "+150 XP", "100"],
                  ["Hold a Vault NFT for 7 Days", 71, "+250 XP", "200"],
                  ["Invite 3 Friends", 33, "+100 XP", "75"],
                  ["Trade on Marketplace", 100, "+100 XP", "75"]
                ].map(([title, progress, xp, reward]) => (
                  <div key={title as string} className="rounded-lg border border-vault-line bg-black/20 p-4">
                    <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_90px_80px] md:items-center">
                      <p className="font-semibold">{title as string}</p>
                      <ProgressBar value={progress as number} color={(progress as number) === 100 ? "green" : "purple"} />
                      <p className="font-bold text-vault-green">{xp as string}</p>
                      <p className="text-right font-bold text-vault-gold">{reward as string}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Raid Tiers">
              <div className="grid gap-3">
                {["Bronze Raider", "Silver Raider", "Gold Raider", "Platinum Raider", "Diamond Raider"].map((tier, index) => (
                  <div key={tier} className={index === 0 ? "rounded-lg border border-vault-purple bg-vault-purple/15 p-3" : "rounded-lg border border-vault-line bg-black/20 p-3"}>
                    <div className="flex items-center gap-3">
                      <Crown className={index === 0 ? "size-8 text-vault-gold" : "size-8 text-slate-500"} />
                      <div>
                        <p className="font-semibold">{tier}</p>
                        <p className="text-xs text-slate-400">{index === 0 ? "0 - 2,000 XP" : `${index * 5000} - ${(index + 1) * 7000} XP`}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-vault-line pt-4">
                <p className="font-bold">Bronze Raider</p>
                <p className="mt-1 text-sm text-slate-400">Your current tier. Next tier: Silver Raider.</p>
                <ProgressBar value={1250} max={2000} color="purple" />
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Available Raids" action={<Link href="/raids" className="text-sm font-semibold text-vault-purple">View All</Link>}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {raidRooms.map((raid) => (
                <RaidCard key={raid.id} raid={raid} collection={getCollection(raid.collectionId)} />
              ))}
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <SectionCard title="Current Raid">
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-vault-green">{active.name}</h2>
                  <StatusPill accent="green">Live</StatusPill>
                </div>
                <p className="mt-2 text-sm text-slate-400">Ends in</p>
                <p className="mt-1 text-2xl font-black tracking-normal">02 : 14 : 37 : 42</p>
              </div>
              <ProgressBar value={active.progress} label="Community progress" />
              <Link href={`/collections/${activeCollection.id}/raids`} className="flex h-12 items-center justify-center rounded-lg bg-vault-purple font-bold">Join Raid</Link>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Metric label="Rank" value="#23" />
                <Metric label="XP" value="2,850" />
                <Metric label="Rewards" value="150" />
              </div>
            </div>
          </SectionCard>

          <SectionCard>
            <Leaderboard rows={leaderboard} />
          </SectionCard>

          <SectionCard title="Recent Raid Activity">
            <div className="space-y-3">
              {["SwampKing completed Swamp Takeover", "LilypadOG earned 150 SOL", "ToxicToad joined Bone Yard Battle", "MemeFrog completed all missions"].map((line, index) => (
                <div key={line} className="flex items-center gap-3 rounded-lg bg-black/20 p-3 text-sm">
                  <Swords className="size-5 text-vault-purple" />
                  <div className="flex-1">
                    <p>{line}</p>
                    <p className="text-xs text-slate-500">{index + 2}m ago</p>
                  </div>
                  <span className="font-bold text-vault-green">+{(index + 1) * 150} XP</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </aside>
      </div>
    </AppShell>
  );
}

function HeroRaidMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-vault-line bg-black/35 p-4">
      <Icon className="mb-2 size-5 text-vault-purple" />
      <p className="font-bold">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-vault-line bg-black/25 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
