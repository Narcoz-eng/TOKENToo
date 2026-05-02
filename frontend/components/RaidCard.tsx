import { Shield, Swords } from "lucide-react";
import type { RaidRoom, VaultCollection } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { StatusPill } from "./StatusPill";

export function RaidCard({ raid, collection }: { raid: RaidRoom; collection: VaultCollection }) {
  return (
    <article className="glass overflow-hidden rounded-lg">
      <div className="relative h-36 overflow-hidden">
        <img src={collection.banner} alt={raid.name} className="h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-vault-ink to-transparent" />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <StatusPill accent={raid.status === "Live" ? "green" : "gold"}>{raid.status}</StatusPill>
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-white">{raid.name}</h3>
            <p className="text-sm text-slate-400">{collection.name}</p>
          </div>
          <Swords className="size-5 text-vault-purple" />
        </div>
        <ProgressBar value={raid.progress} />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500">Participants</p>
            <p className="font-semibold">{raid.participants.toLocaleString()} / {raid.capacity.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-slate-500">Reward Pool</p>
            <p className="font-semibold text-vault-green">{raid.rewardSol.toLocaleString()} SOL</p>
          </div>
        </div>
        <button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-vault-purple text-sm font-bold">
          <Shield className="size-4" /> {raid.status === "Live" ? "Join Raid" : "View Details"}
        </button>
      </div>
    </article>
  );
}

