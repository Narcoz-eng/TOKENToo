import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Boxes, Coins, Crown, LockKeyhole, Swords, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CollectionCard } from "@/components/CollectionCard";
import { Leaderboard } from "@/components/Leaderboard";
import { ProgressBar } from "@/components/ProgressBar";
import { RaidCard } from "@/components/RaidCard";
import { SectionCard } from "@/components/SectionCard";
import { StatCard } from "@/components/StatCard";
import { activity, collections, getCollection, leaderboard, raidRooms } from "@/lib/mock-data";

export default function HomePage() {
  const frog = getCollection();

  return (
    <AppShell active="home">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="glass relative overflow-hidden rounded-lg p-6 sm:p-8">
            <div className="absolute inset-0 opacity-60">
              <img src={frog.banner} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-vault-ink via-vault-ink/70 to-transparent" />
            </div>
            <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="max-w-3xl space-y-6">
                <div>
                  <p className="text-sm font-bold uppercase text-vault-purple">VaultX Season 1</p>
                  <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-white sm:text-6xl">
                    Lock. Earn. Raid. <span className="text-vault-green">Build your legacy.</span>
                  </h1>
                  <p className="mt-4 max-w-xl text-base text-slate-300">
                    Lock community tokens, mint backed Vault NFTs, stake for rewards, and raid together to level up each collection.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/collections" className="inline-flex h-12 items-center gap-2 rounded-lg bg-vault-purple px-5 text-sm font-bold shadow-glow">
                    Explore Collections <ArrowRight className="size-4" />
                  </Link>
                  <Link href="/mint" className="inline-flex h-12 items-center gap-2 rounded-lg border border-vault-line bg-black/30 px-5 text-sm font-bold">
                    Mint Vault NFT
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <HeroMetric label="TVL" value="$18.42M" />
                  <HeroMetric label="Vaults" value="4,523" />
                  <HeroMetric label="Communities" value="128" />
                  <HeroMetric label="Raiders" value="25,341" />
                </div>
              </div>
              <div className="glass rounded-lg p-5">
                <p className="text-sm font-bold uppercase text-purple-200">Current Raid</p>
                <h2 className="mt-3 text-2xl font-black text-vault-green">Swamp Takeover</h2>
                <div className="mt-5 grid grid-cols-4 gap-2 text-center">
                  {["02", "14", "37", "42"].map((value, index) => (
                    <div key={`${value}-${index}`} className="rounded-lg border border-vault-line bg-black/30 p-3">
                      <p className="text-xl font-bold">{value}</p>
                      <p className="text-[10px] uppercase text-slate-500">{["Days", "Hrs", "Mins", "Secs"][index]}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5">
                  <ProgressBar value={85.4} label="Community progress" />
                  <div className="mt-2 flex justify-between text-xs text-slate-400">
                    <span>85,420 / 120,000 XP</span>
                    <span className="text-vault-green">71%</span>
                  </div>
                </div>
                <Link href="/raids" className="mt-5 flex h-12 items-center justify-center rounded-lg bg-vault-purple font-bold">
                  Join the Raid
                </Link>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-4">
            <StatCard icon={LockKeyhole} label="Token Vaults" value="4,523" delta="+18.6%" />
            <StatCard icon={Coins} label="Rewards Paid" value="12,850 SOL" delta="+24.8%" accent="green" />
            <StatCard icon={Swords} label="Active Raids" value="25" delta="+9 today" accent="cyan" />
            <StatCard icon={Crown} label="Traits Unlocked" value="342" delta="+3 this week" accent="gold" />
          </div>

          <SectionCard
            title="Trending Collections"
            action={<Link href="/collections" className="text-sm font-semibold text-vault-purple">View All</Link>}
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {collections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="How It Works">
            <div className="grid gap-3 md:grid-cols-5">
              {[
                { title: "1. Lock", body: "Lock community tokens in an isolated vault.", icon: LockKeyhole },
                { title: "2. Mint", body: "Receive a backed Vault NFT.", icon: Boxes },
                { title: "3. Stake", body: "Stake NFTs for APY and XP.", icon: Coins },
                { title: "4. Raid", body: "Complete missions with the collection.", icon: Swords },
                { title: "5. Upgrade", body: "Unlock new traits and badges.", icon: Crown }
              ].map(({ title, body, icon: Icon }) => (
                <div key={title} className="rounded-lg border border-vault-line bg-black/25 p-4">
                  <Icon className="mb-3 size-8 text-vault-purple" />
                  <h3 className="font-bold">{title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{body}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <SectionCard title="Live Raids">
            <div className="space-y-4">
              {raidRooms.slice(0, 3).map((raid) => (
                <div key={raid.id} className="flex items-center gap-3">
                  <img src={getCollection(raid.collectionId).image} alt="" className="size-10 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="truncate font-semibold">{raid.name}</span>
                      <span className="text-vault-purple">{raid.progress}%</span>
                    </div>
                    <ProgressBar value={raid.progress} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recent Activity">
            <div className="space-y-4">
              {activity.map((item) => (
                <div key={item.actor + item.time} className="flex items-center gap-3">
                  <img src={item.image} alt="" className="size-9 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p><span className="font-semibold">{item.actor}</span> <span className="text-slate-400">{item.action}</span></p>
                    <p className="text-xs text-slate-500">{item.time}</p>
                  </div>
                  <span className="text-sm font-bold text-vault-green">{item.amount}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard>
            <Leaderboard rows={leaderboard.slice(0, 5)} title="Top Raiders" />
          </SectionCard>
        </aside>
      </div>
    </AppShell>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-vault-line bg-black/35 p-3">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
