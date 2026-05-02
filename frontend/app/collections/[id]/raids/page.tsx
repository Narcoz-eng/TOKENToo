import Link from "next/link";
import { Shield, Swords, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Leaderboard } from "@/components/Leaderboard";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { collections, getCollection, leaderboard, raidMissions, raidRooms } from "@/lib/mock-data";

export function generateStaticParams() {
  return collections.map((collection) => ({ id: collection.id }));
}

export default function CollectionRaidsPage({ params }: { params: { id: string } }) {
  const collection = getCollection(params.id);
  const activeRaid = raidRooms[0];

  return (
    <AppShell active="raids">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <SectionCard className="relative overflow-hidden p-0">
            <img src={collection.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-r from-vault-ink via-vault-ink/85 to-vault-ink/30" />
            <div className="relative grid gap-6 p-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
              <img src={collection.image} alt={collection.name} className="aspect-square rounded-lg object-cover shadow-glow" />
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-black">{collection.name} Raids</h1>
                  <StatusPill accent="green">Level {collection.level}</StatusPill>
                </div>
                <p className="mt-3 max-w-2xl text-slate-300">{collection.vibe}. Complete missions, raise collection XP, and unlock future mint traits.</p>
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <MiniStat label="Raiders" value="25,341" />
                  <MiniStat label="Online" value={collection.online.toLocaleString()} />
                  <MiniStat label="XP 24h" value="85.4K" />
                  <MiniStat label="Pool" value="12,850 SOL" />
                </div>
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <SectionCard title="Mission Board">
              <div className="space-y-3">
                {raidMissions.map((mission) => (
                  <div key={mission.id} className="rounded-lg border border-vault-line bg-black/20 p-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_90px_90px] md:items-center">
                      <div>
                        <p className="font-bold">{mission.title}</p>
                        <p className="text-xs text-slate-500">{mission.type}</p>
                      </div>
                      <ProgressBar value={mission.progress} max={mission.target} color={mission.progress === mission.target ? "green" : "purple"} />
                      <p className="font-bold text-vault-green">+{mission.xp} XP</p>
                      <p className="text-right font-bold text-vault-gold">{mission.rewardSol} SOL</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Current Boss">
              <img src={collection.banner} alt="" className="h-44 w-full rounded-lg object-cover" />
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black">{activeRaid.boss}</h2>
                  <p className="text-sm text-slate-400">Community raid boss</p>
                </div>
                <StatusPill accent="purple">Epic</StatusPill>
              </div>
              <div className="mt-4">
                <ProgressBar value={45.6} max={100} />
                <p className="mt-2 text-sm text-slate-400">45.6M / 100M HP</p>
              </div>
              <button className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-vault-purple font-bold">
                <Swords className="size-4" /> Attack Boss
              </button>
            </SectionCard>
          </div>

          <SectionCard title="Raid Channels">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Room Name</th>
                    <th className="px-3 py-3">Creator</th>
                    <th className="px-3 py-3">Participants</th>
                    <th className="px-3 py-3">Progress</th>
                    <th className="px-3 py-3">Ends In</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {raidRooms.map((raid) => (
                    <tr key={raid.id} className="border-t border-vault-line">
                      <td className="px-3 py-4 font-bold">{raid.name} <StatusPill accent={raid.status === "Live" ? "green" : "gold"}>{raid.status}</StatusPill></td>
                      <td className="px-3 py-4">FrogMaster</td>
                      <td className="px-3 py-4">{raid.participants.toLocaleString()} / {raid.capacity.toLocaleString()}</td>
                      <td className="px-3 py-4"><ProgressBar value={raid.progress} /></td>
                      <td className="px-3 py-4">{raid.endsIn}</td>
                      <td className="px-3 py-4"><button className="h-9 rounded-lg bg-vault-purple px-4 font-bold">Enter Room</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <SectionCard title="Raid Room Info">
            <div className="space-y-4">
              <Info label="Room" value={activeRaid.name} />
              <Info label="Creator" value="FrogMaster" />
              <Info label="Privacy" value="Public" />
              <Info label="Raid Type" value="Community" />
              <Info label="Participants" value={`${activeRaid.participants.toLocaleString()} / ${activeRaid.capacity.toLocaleString()}`} />
            </div>
          </SectionCard>
          <SectionCard title="Rewards Pool">
            <p className="text-sm text-slate-400">Total rewards</p>
            <p className="mt-1 text-3xl font-black">{activeRaid.rewardSol.toLocaleString()} SOL</p>
            <p className="mt-2 text-vault-green">+ Exclusive NFTs and cNFT badges</p>
            <button className="mt-5 h-11 w-full rounded-lg bg-vault-purple font-bold">Claim Eligible Rewards</button>
          </SectionCard>
          <SectionCard>
            <Leaderboard rows={leaderboard} title="Top Contributors" />
          </SectionCard>
          <SectionCard title="Anti-Abuse Signals">
            <div className="space-y-3">
              {["Daily XP cap active", "Wallet age checked", "Minimum holding time enforced", "Wash trade rewards blocked"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg bg-black/20 p-3 text-sm">
                  <Shield className="size-4 text-vault-green" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </aside>
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-vault-line bg-black/35 p-4">
      <p className="text-xl font-black">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-vault-line pb-3 text-sm last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
