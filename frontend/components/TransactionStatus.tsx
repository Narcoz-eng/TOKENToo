import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

export type TxStatus = "idle" | "validating" | "signing" | "pending" | "confirmed" | "failed";

export function TransactionStatus({ status, label, detail }: { status: TxStatus; label: string; detail?: string | null }) {
  const busy = status === "pending" || status === "validating" || status === "signing";
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
        <img src={transactionStatusAsset(status)} alt="" className={cn("size-4 object-contain", busy && "animate-spin")} />
        {label}
      </div>
      {detail ? <p className="mt-2 text-xs opacity-80">{detail}</p> : null}
    </div>
  );
}

function transactionStatusAsset(status: TxStatus) {
  if (status === "confirmed") return brandAssets.rewardBurst;
  if (status === "failed") return brandAssets.errorGlitch;
  if (status === "pending" || status === "validating" || status === "signing") return brandAssets.energyBeam;
  return brandAssets.proofRing;
}
