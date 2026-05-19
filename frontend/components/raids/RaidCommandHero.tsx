"use client";

import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";
import type { RaidCommandStats } from "./raid-types";
import { RaidPictogram } from "./RaidPictogram";

const statIcons: Array<{ key: keyof RaidCommandStats; label: string; icon: "room" | "wallet" | "xp" | "reward" | "proof" }> = [
  { key: "liveRaids", label: "Live raids", icon: "room" },
  { key: "participants", label: "Participants", icon: "wallet" },
  { key: "xpAwarded", label: "XP awarded", icon: "xp" },
  { key: "rewardsPending", label: "Rewards pending", icon: "reward" },
  { key: "successRate", label: "Success rate", icon: "proof" }
];

export function RaidCommandHero({
  stats,
  unavailable,
  onCreate,
  onJoinLive
}: {
  stats: RaidCommandStats;
  unavailable: boolean;
  onCreate: () => void;
  onJoinLive: () => void;
}) {
  return (
    <section className="phew-panel phew-scanline relative overflow-visible rounded-lg border-vault-green/25 p-5 md:p-6">
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_30%,rgba(186,255,0,0.22),transparent_31%),linear-gradient(112deg,rgba(2,8,6,0.98),rgba(2,8,6,0.72)_54%,rgba(10,22,9,0.82))]" />
        <div className="absolute inset-0 grid-mask opacity-25" />
      </div>
      <div className="relative min-h-[250px]">
        <div className="min-w-0 lg:pr-[360px]">
          <div className="inline-flex items-center gap-2 rounded-md border border-vault-green/35 bg-vault-green/10 px-2.5 py-1 text-xs font-black uppercase text-vault-green">
            <RaidPictogram name="flag" className="size-4" />
            Raid command center
          </div>
          <h1 className="mt-4 text-4xl font-black leading-none tracking-normal text-white sm:text-5xl lg:text-6xl">
            Raid <span className="text-vault-green">Rooms</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">Coordinate community missions, prove participation, earn XP, unlock rewards.</p>
          {unavailable ? <p className="mt-3 text-sm font-semibold text-vault-gold">Live raid API data is unavailable; dashboard values stay N/A.</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={onCreate} className="phew-button phew-button-primary inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black">
              <RaidPictogram name="room" className="size-5" />
              Create Raid
            </button>
            <button type="button" onClick={onJoinLive} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-vault-green/45 bg-black/35 px-5 text-sm font-black text-vault-green hover:border-vault-green hover:bg-vault-green/10">
              <RaidPictogram name="target" className="size-5" />
              Join Live Raid
            </button>
          </div>
        </div>

        <div className="phew-raid-commander pointer-events-none absolute -right-4 -top-9 hidden h-72 w-[390px] overflow-visible lg:block">
          <span className="absolute bottom-4 right-8 h-7 w-56 rounded-full border border-vault-green/70 shadow-green" />
          <span className="absolute right-24 top-12 h-32 w-1.5 rounded-full bg-vault-green shadow-green" />
          <CommanderFlag className="absolute right-2 top-5 h-24 w-32 drop-shadow-[0_0_24px_rgba(186,255,0,0.45)]" />
          <img src={brandAssets.mascotPoses.running} alt="" className="absolute bottom-2 right-[4.5rem] z-10 h-56 w-56 object-contain drop-shadow-[0_0_34px_rgba(186,255,0,0.55)]" />
        </div>

        <div className="phew-raid-commander relative mt-5 min-h-[190px] overflow-visible lg:hidden">
          <span className="absolute bottom-4 left-1/2 h-6 w-44 -translate-x-1/2 rounded-full border border-vault-green/70 shadow-green" />
          <span className="absolute left-[57%] top-7 h-24 w-1.5 rounded-full bg-vault-green shadow-green" />
          <CommanderFlag className="absolute left-[55%] top-2 h-20 w-28 drop-shadow-[0_0_24px_rgba(186,255,0,0.45)]" />
          <img src={brandAssets.mascotPoses.running} alt="" className="absolute bottom-1 left-1/2 z-10 h-44 w-44 -translate-x-1/2 object-contain drop-shadow-[0_0_34px_rgba(186,255,0,0.55)]" />
        </div>
      </div>
      <div className="relative mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {statIcons.map((item) => (
          <div key={item.key} className="rounded-lg border border-vault-line bg-black/35 p-3">
            <div className="flex items-center gap-3">
              <div className={cn("grid size-10 shrink-0 place-items-center rounded-md border border-vault-green/25 bg-vault-green/10", item.key === "successRate" && "border-vault-cyan/30 bg-vault-cyan/10")}>
                <RaidPictogram name={item.icon} className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-black leading-tight text-white">{stats[item.key]}</p>
                <p className="mt-0.5 text-[11px] font-bold uppercase text-slate-500">{item.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CommanderFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 104" className={className} aria-hidden="true">
      <path d="M18 18C48 0 75 26 128 8v62C78 88 50 58 18 78V18Z" fill="#06110F" stroke="#BAFF00" strokeWidth="7" strokeLinejoin="round" />
      <path d="m72 22 8 16 18 3-13 12 3 18-16-9-16 9 3-18-13-12 18-3 8-16Z" fill="#F8FFF1" stroke="#06110F" strokeWidth="5" strokeLinejoin="round" />
      <path d="M25 23c28-10 54 18 96 3" stroke="#16D7D2" strokeWidth="4" strokeLinecap="round" opacity=".75" />
    </svg>
  );
}
