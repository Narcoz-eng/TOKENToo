import Link from "next/link";
import { Flame, Rocket, Shield, Skull, Swords, UserMinus, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Leaderboard } from "@/components/Leaderboard";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { collections, communityMembers, getCollection, getRaid, leaderboard, raidMissions, raidRooms } from "@/lib/mock-data";

export function generateStaticParams() {
  return collections.flatMap((collection) =>
    raidRooms
      .filter((raid) => raid.collectionId === collection.id || collection.id === "frog-vaults")
      .map((raid) => ({ id: collection.id, raidId: raid.id }))
  );
}

export default function RaidRoomPage({ params }: { params: { id: string; raidId: string } }) {
  const collection = getCollection(params.id);
  const raid = getRaid(collection.id, params.raidId);

  return (
    <AppShell active="raids">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <section className="glass relative overflow-hidden rounded-lg p-6">
            <img src={collection.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-r from-vault-ink via-vault-ink/85 to-vault-ink/40" />
            <div className="relative grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
              <img src={collection.image} alt="" className="aspect-square rounded-lg border border-vault-purple/50 object-cover shadow-glow" />
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/collections/${collection.id}/raids`} className="text-sm text-slate-400">Raid Rooms</Link>
                  <StatusPill accent={raid.status === "Live" ? "green" : "gold"}>{raid.status}</StatusPill>
                </div>
                <h1 className="mt-3 text-4xl font-black sm:text-5xl">{raid.name}</h1>
                <p className="mt-3 max-w-2xl text-slate-300">A live {collection.name} mission room. Join the faction push, complete missions, react to raid events, and climb the room leaderboard.</p>
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <RoomMetric label="Countdown" value={raid.endsIn} />
                  <RoomMetric label="Participants" value={`${raid.participants.toLocaleString()} / ${raid.capacity.toLocaleString()}`} />
                  <RoomMetric label="Rewards" value={`${raid.rewardSol.toLocaleString()} SOL`} green />
                  <RoomMetric label="Progress" value={`${raid.progress}%`} />
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button className="flex h-12 items-center gap-2 rounded-lg bg-vault-purple px-6 font-bold shadow-glow">
                    <UserPlus className="size-4" /> Join Room
                  </button>
                  <button className="flex h-12 items-center gap-2 rounded-lg border border-vault-line bg-black/30 px-6 font-bold">
                    <UserMinus className="size-4" /> Leave
                  </button>
                  <Reaction icon={Flame} label="128" />
                  <Reaction icon={Rocket} label="92" />
                  <Reaction icon={Skull} label="41" />
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <SectionCard title="Mission List">
              <div className="space-y-3">
                {raidMissions.map((mission, index) => (
                  <div key={mission.id} className="rounded-lg border border-vault-line bg-black/25 p-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_90px_90px] md:items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <Swords className="size-4 text-vault-purple" />
                          <p className="font-bold">{mission.title}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{mission.type} · abuse checks active</p>
                      </div>
                      <ProgressBar value={mission.progress} max={mission.target} color={mission.progress === mission.target ? "green" : "purple"} />
                      <span className="font-bold text-vault-green">+{mission.xp} XP</span>
                      <span className="text-right font-bold text-vault-gold">{mission.rewardSol} SOL</span>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">{mission.progress}/{mission.target} complete · mission lane {index + 1}</div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Rewards Pool">
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-slate-400">Total rewards</p>
                  <p className="text-4xl font-black">{raid.rewardSol.toLocaleString()} SOL</p>
                  <p className="mt-1 text-sm text-vault-green">+ cNFT badges, XP roles, and future trait priority</p>
                </div>
                <ProgressBar value={raid.progress} />
                <div className="grid grid-cols-2 gap-3">
                  <RoomMetric label="Boss" value={raid.boss} />
                  <RoomMetric label="Your rank" value="#23" green />
                </div>
                <button className="h-11 w-full rounded-lg bg-vault-purple font-bold">Claim When Complete</button>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Participants">
            <div className="grid gap-3 md:grid-cols-5">
              {communityMembers.map((member) => (
                <div key={member.id} className="rounded-lg border border-vault-line bg-black/25 p-3 text-center">
                  <img src={member.avatar} alt="" className="mx-auto size-14 rounded-lg object-cover" />
                  <p className="mt-2 font-bold">{member.name}</p>
                  <p className="text-xs text-vault-purple">{member.role} · {member.rank}</p>
                  <p className="mt-1 text-xs text-vault-green">{member.xp.toLocaleString()} XP</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <SectionCard title="Room Progress">
            <ProgressBar value={raid.progress} />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <RoomMetric label="Raiders" value={raid.participants.toLocaleString()} />
              <RoomMetric label="Capacity" value={raid.capacity.toLocaleString()} />
              <RoomMetric label="Ends in" value={raid.endsIn} />
              <RoomMetric label="Faction" value={collection.mascot} green />
            </div>
          </SectionCard>

          <SectionCard>
            <Leaderboard rows={leaderboard} title="Room Leaderboard" />
          </SectionCard>

          <SectionCard title="Live Reactions">
            <div className="grid grid-cols-3 gap-3">
              <Reaction icon={Flame} label="Fire" large />
              <Reaction icon={Rocket} label="Boost" large />
              <Reaction icon={Skull} label="Boss" large />
            </div>
          </SectionCard>

          <SectionCard title="Safety Rules">
            {["Daily XP cap", "Wallet age check", "Minimum holding time", "No wash-trade rewards"].map((rule) => (
              <div key={rule} className="mb-2 flex items-center gap-2 rounded-lg bg-black/25 p-3 text-sm">
                <Shield className="size-4 text-vault-green" />
                {rule}
              </div>
            ))}
          </SectionCard>
        </aside>
      </div>
    </AppShell>
  );
}

function RoomMetric({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="rounded-lg border border-vault-line bg-black/30 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={green ? "mt-1 font-black text-vault-green" : "mt-1 font-black text-white"}>{value}</p>
    </div>
  );
}

function Reaction({ icon: Icon, label, large }: { icon: typeof Flame; label: string; large?: boolean }) {
  return (
    <button className={large ? "rounded-lg border border-vault-line bg-black/30 p-4 text-vault-gold" : "flex h-12 items-center gap-2 rounded-lg border border-vault-line bg-black/30 px-4 font-bold text-vault-gold"}>
      <Icon className={large ? "mx-auto mb-2 size-6" : "size-4"} />
      <span className={large ? "block text-center text-sm font-bold" : ""}>{label}</span>
    </button>
  );
}
