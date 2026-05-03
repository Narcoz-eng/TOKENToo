import Link from "next/link";
import { BadgeCheck, Bell, Flame, Rocket, Shield, Skull, Sparkles, Swords, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProgressBar } from "@/components/ProgressBar";
import { RaidCard } from "@/components/RaidCard";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { collections, communityMembers, getCollection, raidRooms, socialActivity } from "@/lib/mock-data";

const reactionIcons = {
  fire: Flame,
  rocket: Rocket,
  skull: Skull
};

export function generateStaticParams() {
  return collections.map((collection) => ({ id: collection.id }));
}

export default function CommunityPage({ params }: { params: { id: string } }) {
  const collection = getCollection(params.id);
  const collectionRaids = raidRooms.filter((raid) => raid.collectionId === collection.id || collection.id === "frog-vaults").slice(0, 3);
  const feed = socialActivity.filter((item) => item.collectionId === collection.id || collection.id === "frog-vaults").slice(0, 5);
  const progress = Math.round((collection.xp / collection.nextXp) * 1000) / 10;

  return (
    <AppShell active="profile">
      <div className="space-y-5">
        <section className="glass relative overflow-hidden rounded-lg p-5 sm:p-7">
          <img src={collection.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
          <div className="absolute inset-0 bg-gradient-to-r from-vault-ink via-vault-ink/85 to-vault-ink/35" />
          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
            <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center">
              <img src={collection.image} alt={collection.name} className="aspect-square w-full rounded-lg border border-vault-purple/50 object-cover shadow-glow" />
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-black sm:text-5xl">{collection.name}</h1>
                  <BadgeCheck className="size-7 text-vault-purple" />
                  <StatusPill accent="green">Level {collection.level}</StatusPill>
                </div>
                <p className="mt-3 max-w-2xl text-lg text-slate-300">{collection.vibe}. Members join the faction, earn roles, raid together, and unlock future trait packs.</p>
                <div className="mt-5 max-w-2xl">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Faction XP</span>
                    <span className="font-bold text-vault-green">{collection.xp.toLocaleString()} / {collection.nextXp.toLocaleString()} XP</span>
                  </div>
                  <ProgressBar value={collection.xp} max={collection.nextXp} />
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button className="flex h-12 items-center gap-2 rounded-lg bg-vault-purple px-6 font-bold shadow-glow">
                    <UserPlus className="size-4" /> Join Collection
                  </button>
                  <Link href={`/collections/${collection.id}/raids`} className="flex h-12 items-center gap-2 rounded-lg border border-vault-green/50 bg-vault-green/10 px-6 font-bold text-vault-green">
                    <Swords className="size-4" /> Join Raid
                  </Link>
                  <button className="flex h-12 items-center gap-2 rounded-lg border border-vault-line bg-black/30 px-6 font-bold">
                    <Bell className="size-4" /> Follow
                  </button>
                </div>
              </div>
            </div>
            <div className="glass rounded-lg p-4">
              <p className="text-sm font-bold uppercase text-vault-purple">Next unlock at Level {collection.level + 1}</p>
              <p className="mt-2 text-3xl font-black text-vault-green">{progress}% complete</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {collection.nextUnlocks.map((unlock) => (
                  <div key={unlock} className="rounded-lg border border-vault-line bg-black/35 p-3 text-sm">
                    <Sparkles className="mb-2 size-4 text-vault-gold" />
                    {unlock}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <SectionCard title="Live Community Feed" action={<StatusPill accent="green">Real-time style</StatusPill>}>
              <div className="grid gap-3">
                {feed.map((item) => {
                  const Icon = reactionIcons[item.reaction];
                  return (
                    <div key={item.id} className="rounded-lg border border-vault-line bg-black/25 p-4">
                      <div className="flex items-start gap-3">
                        <img src={item.avatar} alt="" className="size-11 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold">{item.actor}</p>
                            <StatusPill accent="purple">{item.role}</StatusPill>
                            <span className="text-xs text-slate-500">{item.time}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-300">{item.action}</p>
                          {item.nft ? <p className="mt-1 text-xs text-vault-green">{item.nft}</p> : null}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-vault-green">+{item.xp} XP</p>
                          <button className="mt-2 inline-flex size-9 items-center justify-center rounded-lg border border-vault-line bg-black/35 text-vault-gold" aria-label="React">
                            <Icon className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Active Raid Rooms">
              <div className="grid gap-4 md:grid-cols-3">
                {collectionRaids.map((raid) => (
                  <RaidCard key={raid.id} raid={raid} collection={getCollection(raid.collectionId)} />
                ))}
              </div>
            </SectionCard>
          </div>

          <aside className="space-y-5">
            <SectionCard title="Collection Identity">
              <div className="space-y-4">
                <IdentityRow label="Theme" value={collection.theme} />
                <IdentityRow label="Mascot" value={collection.mascot} />
                <IdentityRow label="Mascot type" value={collection.mascotType} />
                <IdentityRow label="Silhouette" value={collection.silhouette} />
              </div>
              <p className="mt-4 rounded-lg border border-vault-purple/30 bg-vault-purple/10 p-4 text-sm leading-6 text-slate-300">{collection.description}</p>
            </SectionCard>

            <SectionCard title="Members and Roles">
              <div className="space-y-3">
                {communityMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 rounded-lg bg-black/25 p-3">
                    <img src={member.avatar} alt="" className="size-10 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-bold">{member.name}</p>
                        <StatusPill accent={member.role === "Whale" ? "gold" : member.role === "Founder" ? "purple" : "green"}>{member.role}</StatusPill>
                      </div>
                      <p className="text-xs text-slate-400">{member.rank} · {member.vaults} vaults · {member.xp.toLocaleString()} XP</p>
                    </div>
                    <button className="h-8 rounded-lg border border-vault-line px-3 text-xs font-bold">{member.followed ? "Following" : "Follow"}</button>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Unlock Progress">
              <div className="space-y-4">
                <ProgressBar value={collection.xp} max={collection.nextXp} />
                <div className="grid grid-cols-2 gap-3">
                  {collection.traitLayers.headgear.slice(0, 2).map((trait) => (
                    <div key={trait} className="rounded-lg border border-dashed border-vault-line bg-black/25 p-3 text-sm text-slate-300">
                      <Shield className="mb-2 size-5 text-vault-purple" />
                      Locked: {trait}
                    </div>
                  ))}
                </div>
                <button className="h-11 w-full rounded-lg bg-vault-purple font-bold">Unlock Missions</button>
              </div>
            </SectionCard>

            <SectionCard title="Guild Pulse">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Pulse label="Active 24h" value={collection.activeUsers24h.toLocaleString()} />
                <Pulse label="Raid success" value={`${collection.raidSuccessRate}%`} />
                <Pulse label="Avg hold" value={`${collection.averageHoldDays}d`} />
                <Pulse label="Members" value={collection.holders.toLocaleString()} />
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function IdentityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-vault-line pb-3 text-sm last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="max-w-[220px] text-right font-semibold capitalize">{value}</span>
    </div>
  );
}

function Pulse({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-vault-line bg-black/25 p-3">
      <p className="text-lg font-black">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
