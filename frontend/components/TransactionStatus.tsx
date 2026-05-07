import { AlertTriangle, CheckCircle2, Loader2, RadioTower } from "lucide-react";
import { cn } from "@/lib/utils";

export type TxStatus = "idle" | "validating" | "signing" | "pending" | "confirmed" | "failed";

export function TransactionStatus({ status, label, detail }: { status: TxStatus; label: string; detail?: string | null }) {
  const Icon = status === "pending" || status === "validating" || status === "signing" ? Loader2 : status === "confirmed" ? CheckCircle2 : status === "failed" ? AlertTriangle : RadioTower;
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm",
        status === "confirmed" && "border-vault-green/45 bg-vault-green/10 text-vault-green",
        (status === "pending" || status === "validating" || status === "signing") && "border-vault-cyan/45 bg-vault-cyan/10 text-vault-cyan",
        status === "failed" && "border-vault-red/45 bg-vault-red/10 text-vault-red",
        status === "idle" && "border-vault-line bg-black/30 text-slate-300"
      )}
    >
      <div className="flex items-center gap-2 font-black">
        <Icon className={cn("size-4", (status === "pending" || status === "validating" || status === "signing") && "animate-spin")} />
        {label}
      </div>
      {detail ? <p className="mt-2 text-xs opacity-80">{detail}</p> : null}
    </div>
  );
}
