import { cn } from "@/lib/utils";
import type { Accent } from "@/lib/types";

const tones: Record<Accent, string> = {
  purple: "border-vault-purple/50 bg-vault-purple/15 text-purple-100",
  green: "border-vault-green/50 bg-vault-green/10 text-vault-green",
  cyan: "border-vault-cyan/50 bg-vault-cyan/10 text-vault-cyan",
  gold: "border-vault-gold/50 bg-vault-gold/10 text-vault-gold",
  red: "border-vault-red/50 bg-vault-red/10 text-vault-red"
};

export function StatusPill({ children, accent = "purple" }: { children: React.ReactNode; accent?: Accent }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold", tones[accent])}>
      {children}
    </span>
  );
}

