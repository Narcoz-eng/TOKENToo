import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max = 100,
  color = "green",
  label
}: {
  value: number;
  max?: number;
  color?: "green" | "purple" | "cyan" | "gold";
  label?: string;
}) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const fill = {
    green: "bg-vault-green shadow-green",
    purple: "bg-vault-purple shadow-glow",
    cyan: "bg-vault-cyan",
    gold: "bg-vault-gold"
  }[color];

  return (
    <div>
      {label ? <div className="mb-2 text-xs text-slate-400">{label}</div> : null}
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className={cn("h-full rounded-full", fill)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

