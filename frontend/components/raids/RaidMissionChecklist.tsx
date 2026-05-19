"use client";

import { cn } from "@/lib/utils";
import type { RaidMissionView } from "./raid-types";
import { MissionPictogram, RaidPictogram } from "./RaidPictogram";

export function RaidMissionChecklist({
  missions,
  progress,
  targetAvailable,
  onOpenTarget
}: {
  missions: RaidMissionView[];
  progress: number;
  targetAvailable: boolean;
  onOpenTarget: () => void;
}) {
  return (
    <section className="phew-panel rounded-lg p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase text-white">Mission Checklist</h2>
          <p className="mt-1 text-xs text-slate-500">Participation stays pending until proof review is configured or completed.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase text-slate-500">Your Progress</p>
          <p className="text-sm font-black text-vault-green">{progress}%</p>
        </div>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full border border-vault-line bg-black/45">
        <div className="h-full rounded-full bg-vault-green shadow-green transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="divide-y divide-vault-line">
        {missions.map((mission) => (
          <div key={mission.id} className="flex min-w-0 items-center justify-between gap-3 py-2.5 text-sm">
            <div className="flex min-w-0 items-center gap-3">
              <MissionPictogram mission={mission} className={cn("size-5", mission.status === "approved" ? "text-vault-green" : mission.status === "rejected" ? "text-vault-red" : "text-slate-400")} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-200">{mission.label}</p>
                <p className="truncate text-[11px] text-slate-500">{mission.review}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-right">
              <span className="text-xs font-bold text-slate-400">{mission.xp !== null ? `+${mission.xp} XP` : "XP N/A"}</span>
              <ProofBadge state={mission.status} />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onOpenTarget}
        disabled={!targetAvailable}
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-vault-green/45 bg-vault-green/10 text-sm font-black text-vault-green hover:bg-vault-green/15 disabled:border-vault-line disabled:bg-black/30 disabled:text-slate-500"
      >
        <RaidPictogram name="target" className="size-4" />
        Open Target
      </button>
    </section>
  );
}

function ProofBadge({ state }: { state: RaidMissionView["status"] }) {
  const className = {
    "not-started": "border-slate-600 bg-black/30 text-slate-400",
    "opened-target": "border-vault-cyan/50 bg-vault-cyan/10 text-vault-cyan",
    "pending-proof": "border-vault-gold/50 bg-vault-gold/10 text-vault-gold",
    submitted: "border-vault-cyan/50 bg-vault-cyan/10 text-vault-cyan",
    verifying: "border-vault-cyan/50 bg-vault-cyan/10 text-vault-cyan",
    approved: "border-vault-green/50 bg-vault-green/10 text-vault-green",
    rejected: "border-vault-red/50 bg-vault-red/10 text-vault-red"
  }[state];
  return <span className={cn("rounded border px-2 py-0.5 text-[10px] font-black uppercase", className)}>{state.replace(/-/g, " ")}</span>;
}
