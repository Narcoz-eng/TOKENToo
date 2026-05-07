import { AlertTriangle, CheckCircle2, Loader2, RadioTower } from "lucide-react";
import { cn } from "@/lib/utils";

export type TxStatus = "idle" | "pending" | "success" | "error";

export function TransactionStatus({ status, label, detail }: { status: TxStatus; label: string; detail?: string | null }) {
  const Icon = status === "pending" ? Loader2 : status === "success" ? CheckCircle2 : status === "error" ? AlertTriangle : RadioTower;
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm",
        status === "success" && "border-vault-green/45 bg-vault-green/10 text-vault-green",
        status === "pending" && "border-vault-cyan/45 bg-vault-cyan/10 text-vault-cyan",
        status === "error" && "border-vault-red/45 bg-vault-red/10 text-vault-red",
        status === "idle" && "border-vault-line bg-black/30 text-slate-300"
      )}
    >
      <div className="flex items-center gap-2 font-black">
        <Icon className={cn("size-4", status === "pending" && "animate-spin")} />
        {label}
      </div>
      {detail ? <p className="mt-2 text-xs opacity-80">{detail}</p> : null}
    </div>
  );
}
