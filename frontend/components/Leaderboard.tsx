import type { LeaderboardRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Leaderboard({ rows, title = "Raid Leaderboard" }: { rows: LeaderboardRow[]; title?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase">{title}</h3>
        <a className="text-xs font-semibold text-vault-purple" href="/raids">View All</a>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={`${row.rank}-${row.name}`}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm",
              row.highlight ? "border-vault-purple/40 bg-vault-purple/15" : "bg-black/20"
            )}
          >
            <span className="w-6 text-slate-400">{row.rank}</span>
            <img src={row.image} alt={row.name} className="size-8 rounded-full object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-white">{row.name}</span>
              {row.role ? <span className="text-xs text-vault-purple">{row.role} · {row.badge}</span> : null}
            </span>
            <span className="text-slate-300">{row.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
