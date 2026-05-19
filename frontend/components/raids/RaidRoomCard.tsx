"use client";

import { cn } from "@/lib/utils";
import { TransactionStatus } from "@/components/TransactionStatus";
import type { RaidJoinState, RaidRoomView } from "./raid-types";
import { PlatformPictogram, RaidPictogram } from "./RaidPictogram";

export function RaidRoomCard({
  raid,
  selected,
  joinState,
  onSelect,
  onJoin
}: {
  raid: RaidRoomView;
  selected: boolean;
  joinState: RaidJoinState;
  onSelect: () => void;
  onJoin: () => void;
}) {
  const joinDisabled = joinState.status === "validating" || joinState.status === "pending" || raid.status !== "Live";
  return (
    <article
      className={cn(
        "phew-panel phew-card-hover relative overflow-hidden rounded-lg p-3",
        selected && "border-vault-green/55 shadow-green",
        raid.status === "Ended" && "opacity-75"
      )}
    >
      <button type="button" onClick={onSelect} className="absolute inset-0 z-0 cursor-pointer" aria-label={`Select ${raid.name}`} />
      <div className="relative z-10 grid gap-3 lg:grid-cols-[minmax(210px,1.25fr)_minmax(220px,1fr)_110px_128px_105px] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative grid size-14 shrink-0 place-items-center rounded-full border border-vault-green/45 bg-black/45">
            {raid.collectionImage ? <img src={raid.collectionImage} alt="" className="size-11 rounded-full object-cover" /> : <RaidPictogram name="flag" className="size-9" />}
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border border-black bg-vault-green text-black">
              <PlatformPictogram platform={raid.platform} className="size-3.5 border-0 bg-transparent text-black" />
            </span>
          </div>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className={cn("rounded border px-2 py-0.5 text-[10px] font-black uppercase", raid.status === "Live" ? "border-vault-green/60 bg-vault-green/12 text-vault-green" : raid.status === "Scheduled" ? "border-vault-gold/60 bg-vault-gold/12 text-vault-gold" : "border-slate-500/50 bg-slate-500/10 text-slate-300")}>{raid.status}</span>
              <span className="text-[10px] font-black uppercase text-slate-500">{raid.platform}</span>
            </div>
            <h3 className="truncate text-base font-black text-white">{raid.name}</h3>
            <p className="truncate text-xs font-semibold text-slate-400">{raid.collectionName}</p>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
            <span className="font-bold uppercase text-slate-500">Mission progress</span>
            <span className="font-black text-vault-green">{raid.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full border border-vault-line bg-black/45">
            <div className="h-full rounded-full bg-vault-green shadow-green transition-all" style={{ width: `${raid.progress}%` }} />
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
            <RaidPictogram name="proof" className="size-4" />
            {raid.missionCount !== null ? `${raid.missionCount} missions` : "Missions N/A"}
          </div>
        </div>

        <Metric label="Participants" value={raid.participants !== null ? raid.participants.toLocaleString() : "N/A"} />
        <Metric label="Reward Pool" value={raid.rewardPool} detail={raid.xpTarget ? `${raid.xpTarget.toLocaleString()} XP target` : undefined} />
        <Metric label={raid.status === "Scheduled" ? "Starts in" : raid.status === "Live" ? "Ends in" : "Status"} value={raid.timeLabel} />

        <div className="lg:col-span-5">
          {joinState.status !== "idle" ? (
            <TransactionStatus
              status={joinState.status}
              label={joinState.status === "failed" ? "Raid unavailable" : joinState.status === "confirmed" ? "Raid joined" : "Raid join pending"}
              detail={joinState.detail}
            />
          ) : null}
        </div>
      </div>
      <div className="relative z-10 mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-vault-line pt-3">
        <div className="min-w-0 truncate text-xs text-slate-500">
          Target: <span className="text-slate-300">{raid.targetLink ?? "N/A"}</span>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onJoin();
          }}
          disabled={joinDisabled}
          className="phew-button phew-button-primary inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-xs font-black text-black disabled:opacity-50"
        >
          <RaidPictogram name="flag" className="size-4" />
          {raid.status === "Live" ? "Join Raid" : raid.status === "Scheduled" ? "Notify Me" : "View Results"}
        </button>
      </div>
    </article>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0 rounded-md border border-vault-line bg-black/25 p-3">
      <p className="text-[11px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
      {detail ? <p className="mt-1 truncate text-[11px] text-slate-500">{detail}</p> : null}
    </div>
  );
}
