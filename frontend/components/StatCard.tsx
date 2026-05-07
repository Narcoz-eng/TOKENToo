import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const accents = {
  purple: "bg-vault-purple/15 text-vault-purple",
  green: "bg-vault-green/10 text-vault-green",
  cyan: "bg-vault-cyan/10 text-vault-cyan",
  gold: "bg-vault-gold/10 text-vault-gold"
};

export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  accent = "purple",
  className
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: string;
  accent?: keyof typeof accents;
  className?: string;
}) {
  return (
    <div className={cn("phew-panel phew-card-hover relative overflow-hidden rounded-lg p-4", className)}>
      <div className="relative flex items-center gap-4">
        <div className={cn("flex size-12 items-center justify-center rounded-md border border-current/20", accents[accent])}>
          <Icon className="size-6" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
          <p className="text-xl font-bold text-white">{value}</p>
          {delta ? <p className="mt-1 text-xs font-semibold text-vault-green">{delta}</p> : null}
        </div>
      </div>
    </div>
  );
}
