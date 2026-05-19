"use client";

import type { RaidRoomView } from "./raid-types";
import { RaidPictogram } from "./RaidPictogram";

const rewardRows = [
  { label: "XP", value: "Per approved mission" },
  { label: "Token rewards", value: "Backend pool gated" },
  { label: "NFT boosts", value: "Optional reward" },
  { label: "Staking multiplier", value: "Creator configured" },
  { label: "Role unlocks", value: "Community role" },
  { label: "Raffle entries", value: "Review required" }
];

export function RaidRewardsPanel({ raid }: { raid: RaidRoomView | null }) {
  return (
    <section className="phew-panel rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase text-white">Rewards</h2>
        <RaidPictogram name="reward" className="size-6" />
      </div>
      <div className="mb-3 rounded-md border border-vault-green/30 bg-vault-green/10 p-3">
        <p className="text-xs font-bold uppercase text-slate-500">Selected raid pool</p>
        <p className="mt-1 text-lg font-black text-vault-green">{raid?.rewardPool ?? "N/A"}</p>
      </div>
      <div className="divide-y divide-vault-line">
        {rewardRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 py-2.5 text-sm">
            <span className="text-slate-300">{row.label}</span>
            <span className="text-right text-xs font-black uppercase text-slate-500">{row.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
