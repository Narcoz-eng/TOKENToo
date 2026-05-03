import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Flame, Rocket, Shield, Sparkles, Swords, Trophy, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CollectionCard } from "@/components/CollectionCard";
import { Leaderboard } from "@/components/Leaderboard";
import { ProgressBar } from "@/components/ProgressBar";
import { RaidCard } from "@/components/RaidCard";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { collections, competitions, getCollection, leaderboard, raidRooms, socialActivity } from "@/lib/mock-data";

export default function HomePage() {
  const featured = getCollection("frog-vaults");

  return (
    <AppShell active="home">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <section className="glass relative overflow-hidden rounded-lg p-6 sm:p-8">
            <img src={featured.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
            <div className="absolute inset-0 bg-gradient-to-r from-vault-ink via-vault-ink/85 to-vault-ink/30" />
            <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
              <div className="max-w-4xl">
                <p className="text-sm font-bold uppercase text-vault-purple">VaultX Faction Network</p>
                <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">
                  Join a faction. Build identity. Win raids together.
                </h1>
                <p className="mt-4 max-w-2xl text-lg text-slate-300">
                  VaultX turns token holders into guild members with roles, ranks, badges, live raid rooms, trait unlocks, and collection-vs-collection battles.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/collections" className="inline-flex h-12 items-center gap-2 rounded-lg bg-vault-purple px-6 text-sm font-bold shadow-glow">
                    Join a Faction <UserPlus className="size-4" />
                  </Link>
                  <Link href={`/collections/${featured.id}/community`} className="inline-flex h-12 items-center gap-2 rounded-lg border border-vault-green/50 bg-vault-green/10 px-6 text-sm font-bold text-vault-green">
                    Enter Community Hub <ArrowRight className="size-4" />
                  </Link>
                </div>
                <div className="mt-7 grid gap-3 sm:grid-cols-4">
                  <HeroMetric icon={Users} label="Active Raiders" value="25,341" />
                  <HeroMetric icon={Shield} label="Guilds Formed" value="128" />
                  <HeroMetric icon={Swords} label="Live Raids" value="25" />
                  <HeroMetric icon={Sparkles} label="Traits Unlocked" value="342" />
                </div>
              </div>

              <div className="glass rounded-lg p-5">
                <img src={featured.image} alt={featured.name} className="aspect-square w-full rounded-lg object-cover shadow-glow" />
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-black">{featured.name}</h2>
                    <StatusPill accent="green">Level {featured.level}</StatusPill>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{featured.mascot} · {featured.styleProfile.artStyle}</p>
                  <ProgressBar value={featured.xp} max={featured.nextXp} />
                  <Link href={`/collections/${featured.id}/community`} className="mt-4 flex h-11 items-center justify-center rounded-lg bg-vault-purple font-bold">
                    Join Collection
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <SectionCard title="Featured Factions" action={<Link href="/collections" className="text-sm font-semibold text-vault-purple">View All</Link>}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {collections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Collection Wars">
            <div className="grid gap-4 lg:grid-cols-2">
              {competitions.map((competition) => (
                <CompetitionCard key={competition.id} competition={competition} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Live Raid Rooms">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {raidRooms.map((raid) => (
                <RaidCard key={raid.id} raid={raid} collection={getCollection(raid.collectionId)} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Why Factions Matter">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                ["Identity", "Roles, ranks, badges, and unique collection style profiles.", Shield],
                ["Progression", "XP unlocks new traits, boosts, and cNFT status rewards.", Sparkles],
                ["Competition", "Collections battle for boosts and faster unlocks.", Trophy],
                ["Belonging", "Community hubs make holders feel like members, not users.", Users]
              ].map(([title, body, Icon]) => (
                <div key={title as string} className="rounded-lg border border-vault-line bg-black/25 p-4">
                  <Icon className="mb-3 size-7 text-vault-purple" />
                  <h3 className="font-bold">{title as string}</h3>
                  <p className="mt-1 text-sm text-slate-400">{body as string}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <SectionCard title="Trending Communities">
            <div className="space-y-3">
              {collections.slice(0, 5).map((collection, index) => (
                <Link href={`/collections/${collection.id}/community`} key={collection.id} className="flex items-center gap-3 rounded-lg bg-black/25 p-3">
                  <span className="text-slate-500">{index + 1}</span>
                  <img src={collection.image} alt="" className="size-11 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{collection.name}</p>
                    <p className="text-xs text-vault-purple">{collection.mascot} · {collection.activeUsers24h.toLocaleString()} active</p>
                  </div>
                  <StatusPill accent="green">L{collection.level}</StatusPill>
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Faction Feed">
            <div className="space-y-3">
              {socialActivity.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-lg border border-vault-line bg-black/25 p-3">
                  <div className="flex items-start gap-3">
                    <img src={item.avatar} alt="" className="size-9 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p><span className="font-bold">{item.actor}</span> <span className="text-slate-400">{item.action}</span></p>
                      <p className="mt-1 text-xs text-vault-green">+{item.xp} XP · {item.role}</p>
                    </div>
                    {item.reaction === "fire" ? <Flame className="size-4 text-vault-gold" /> : item.reaction === "rocket" ? <Rocket className="size-4 text-vault-cyan" /> : <Swords className="size-4 text-vault-red" />}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard>
            <Leaderboard rows={leaderboard.slice(0, 6)} title="Status Leaders" />
          </SectionCard>
        </aside>
      </div>
    </AppShell>
  );
}

function HeroMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-vault-line bg-black/35 p-4">
      <Icon className="mb-2 size-5 text-vault-purple" />
      <p className="text-xl font-black">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function CompetitionCard({ competition }: { competition: (typeof competitions)[number] }) {
  const left = getCollection(competition.leftCollectionId);
  const right = getCollection(competition.rightCollectionId);
  const total = competition.leftScore + competition.rightScore;
  const leftPct = Math.round((competition.leftScore / total) * 100);
  const rightPct = 100 - leftPct;

  return (
    <article className="rounded-lg border border-vault-line bg-black/25 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-black">{competition.title}</h3>
        <StatusPill accent="gold">Ends {competition.endsIn}</StatusPill>
      </div>
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <FactionSide collection={left} score={competition.leftScore} />
        <div className="rounded-lg border border-vault-purple/40 bg-vault-purple/15 px-3 py-2 text-sm font-black">VS</div>
        <FactionSide collection={right} score={competition.rightScore} right />
      </div>
      <div className="mt-5 flex overflow-hidden rounded-full bg-slate-800">
        <div className="h-2 bg-vault-green" style={{ width: `${leftPct}%` }} />
        <div className="h-2 bg-vault-purple" style={{ width: `${rightPct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>{leftPct}%</span>
        <span>{rightPct}%</span>
      </div>
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <div className="rounded-lg border border-vault-green/30 bg-vault-green/10 p-3 text-vault-green">{competition.reward}</div>
        <div className="rounded-lg border border-vault-red/30 bg-vault-red/10 p-3 text-vault-red">{competition.penalty}</div>
      </div>
    </article>
  );
}

function FactionSide({ collection, score, right }: { collection: ReturnType<typeof getCollection>; score: number; right?: boolean }) {
  return (
    <div className={right ? "text-right" : ""}>
      <div className={right ? "flex flex-row-reverse items-center gap-3" : "flex items-center gap-3"}>
        <img src={collection.image} alt="" className="size-14 rounded-lg object-cover" />
        <div>
          <p className="font-black">{collection.symbol}</p>
          <p className="text-xs text-slate-400">{collection.mascot}</p>
        </div>
      </div>
      <p className="mt-3 text-2xl font-black text-vault-green">{score.toLocaleString()} XP</p>
    </div>
  );
}
