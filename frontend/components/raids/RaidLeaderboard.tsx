"use client";

import type { RaidLeaderboardRow } from "./raid-types";
import { RaidPictogram } from "./RaidPictogram";

export function RaidLeaderboard({ rows }: { rows: RaidLeaderboardRow[] }) {
  return (
    <section className="phew-panel rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase text-white">Leaderboard</h2>
        <RaidPictogram name="xp" className="size-6" />
      </div>
      <div className="overflow-hidden rounded-md border border-vault-line bg-black/20">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-vault-line text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-3 py-2 font-black uppercase">Rank</th>
                <th className="whitespace-nowrap px-3 py-2 font-black uppercase">Wallet</th>
                <th className="whitespace-nowrap px-3 py-2 font-black uppercase">XP</th>
                <th className="whitespace-nowrap px-3 py-2 font-black uppercase">Raids</th>
                <th className="whitespace-nowrap px-3 py-2 font-black uppercase">Streak</th>
                <th className="whitespace-nowrap px-3 py-2 font-black uppercase">Rewards</th>
                <th className="whitespace-nowrap px-3 py-2 font-black uppercase">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vault-line">
              {rows.length ? rows.map((row) => (
                <tr key={`${row.rank}-${row.wallet}`} className="text-slate-200">
                  <td className="whitespace-nowrap px-3 py-2 font-black text-vault-green">{row.rank}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.wallet}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-black">{row.xp}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.completed}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.streak}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.rewards}</td>
                  <td className="whitespace-nowrap px-3 py-2"><span className="rounded border border-vault-green/35 bg-vault-green/10 px-2 py-1 text-[10px] font-black uppercase text-vault-green">{row.role}</span></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">Leaderboard rows are N/A until backend participant data is available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
