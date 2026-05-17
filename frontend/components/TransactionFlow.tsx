"use client";

import { CheckCircle2, CircleAlert, Clock3, Loader2, LockKeyhole, PackageCheck, RadioTower, Send, ShieldCheck, Sparkles, Undo2, WalletCards } from "lucide-react";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

export type TransactionFlowState = "idle" | "preparing" | "signing" | "sending" | "confirming" | "success" | "error";
export type TransactionFlowMoment = "mint" | "stake" | "unstake" | "redeem" | "proof" | "community" | "studio" | "reward" | "scan";

export type TransactionFlowStep = {
  state: TransactionFlowState;
  label: string;
  detail: string;
};

const defaultSteps: TransactionFlowStep[] = [
  { state: "preparing", label: "Prepare", detail: "Backend checks inputs" },
  { state: "signing", label: "Sign", detail: "Wallet approval" },
  { state: "sending", label: "Send", detail: "Submit transaction" },
  { state: "confirming", label: "Confirm", detail: "Await chain/backend state" }
];

export function TransactionFlow({
  state,
  title,
  description,
  tokenSymbol,
  image,
  steps = defaultSteps,
  detail,
  className,
  compact = false,
  moment
}: {
  state: TransactionFlowState;
  title: string;
  description?: string;
  tokenSymbol?: string | null;
  image?: string | null;
  steps?: TransactionFlowStep[];
  detail?: string | null;
  className?: string;
  compact?: boolean;
  moment?: TransactionFlowMoment;
}) {
  const activeIndex = flowIndex(state, steps);
  const status = flowStatusLabel(state);
  const visualMoment = moment ?? inferMoment(title);
  const active = state !== "idle" && state !== "error";
  return (
    <div className={cn("transaction-flow rounded-lg border border-vault-line bg-black/30 p-4", compact ? "space-y-3" : "space-y-4", className)} data-state={state} data-moment={visualMoment}>
      <div className="flex items-start gap-4">
        <div className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-md border border-vault-line bg-black/40">
          {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <img src={brandAssets.logo} alt="" className="size-10 object-contain opacity-90" />}
          <span className={cn("absolute inset-0 border border-transparent", state === "success" && "border-vault-green/60", state === "error" && "border-vault-red/60")} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-black uppercase text-white">{title}</p>
              {description ? <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p> : null}
            </div>
            <span className={cn("inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-black uppercase", badgeClass(state))}>
              {stateIcon(state)}
              {status}
            </span>
          </div>
          {tokenSymbol ? <p className="mt-2 text-xs font-black uppercase text-vault-green">{tokenSymbol}</p> : null}
        </div>
      </div>

      <div className={cn("phew-tx-stage", compact && "phew-tx-stage-compact", active && "phew-tx-stage-active", state === "success" && "phew-tx-stage-success", state === "error" && "phew-tx-stage-error")} data-state={state} data-moment={visualMoment}>
        <span className="phew-tx-orbit phew-tx-orbit-a" />
        <span className="phew-tx-orbit phew-tx-orbit-b" />
        <span className="phew-tx-beam" />
        <img src={brandAssets.logo} alt="" className="phew-tx-mascot" />
        <div className="phew-tx-nft">
          {image ? (
            <img src={image} alt="" className="h-full w-full rounded-md object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center rounded-md bg-[radial-gradient(circle_at_50%_26%,rgba(186,255,0,0.18),rgba(0,0,0,0.9)_62%)]">
              <div className="text-center">
                <WalletCards className="mx-auto size-7 text-slate-400" />
                <p className="mt-2 text-[10px] font-black uppercase text-vault-green">NFT art slot</p>
              </div>
            </div>
          )}
          <span className="mt-2 inline-flex max-w-full rounded-md border border-vault-green/35 bg-black/60 px-2 py-1 text-[10px] font-black uppercase text-vault-green">{tokenSymbol || "Token symbol"}</span>
        </div>
        <div className="phew-tx-object">
          <StageObject moment={visualMoment} state={state} />
        </div>
        <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-center gap-2">
          {steps.map((step, index) => {
            const complete = state === "success" || (activeIndex >= 0 && index < activeIndex);
            const current = step.state === state || (state === "idle" && index === 0);
            return <span key={`${step.state}-dot`} className={cn("h-1.5 flex-1 max-w-16 rounded-full border border-vault-line bg-black/60", complete && "border-vault-green bg-vault-green", current && !complete && "border-vault-cyan bg-vault-cyan")} />;
          })}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {steps.map((step, index) => {
          const active = step.state === state;
          const complete = state === "success" || (activeIndex >= 0 && index < activeIndex);
          return (
            <div key={step.state} className={cn("rounded-md border px-3 py-3", complete ? "border-vault-green/35 bg-vault-green/8" : active ? "border-vault-cyan/45 bg-vault-cyan/8" : "border-vault-line bg-black/25")}>
              <div className="flex items-center justify-between gap-2">
                <p className={cn("text-xs font-black uppercase", complete ? "text-vault-green" : active ? "text-vault-cyan" : "text-slate-500")}>{step.label}</p>
                {complete ? <CheckCircle2 className="size-3.5 text-vault-green" /> : active ? <Loader2 className="size-3.5 animate-spin text-vault-cyan" /> : <Clock3 className="size-3.5 text-slate-600" />}
              </div>
              {!compact ? <p className="mt-1 text-xs leading-5 text-slate-500">{step.detail}</p> : null}
            </div>
          );
        })}
      </div>

      {detail ? (
        <div className={cn("rounded-md border px-3 py-2 text-xs", state === "error" ? "border-vault-red/35 bg-vault-red/10 text-vault-red" : "border-vault-line bg-black/25 text-slate-400")}>
          {detail}
        </div>
      ) : null}
    </div>
  );
}

function StageObject({ moment, state }: { moment: TransactionFlowMoment; state: TransactionFlowState }) {
  if (state === "success") return <CheckCircle2 className="size-12 text-vault-green" />;
  if (state === "error") return <CircleAlert className="size-12 text-vault-red" />;
  if (moment === "stake") return <LockKeyhole className="size-11 text-vault-green" />;
  if (moment === "unstake" || moment === "redeem") return <Undo2 className="size-11 text-vault-cyan" />;
  if (moment === "proof") return <ShieldCheck className="size-11 text-vault-green" />;
  if (moment === "community" || moment === "scan") return <RadioTower className="size-11 text-vault-cyan" />;
  if (moment === "studio") return <PackageCheck className="size-11 text-vault-green" />;
  if (moment === "reward") return <Sparkles className="size-11 text-vault-gold" />;
  return <WalletCards className="size-11 text-vault-green" />;
}

function inferMoment(title: string): TransactionFlowMoment {
  const normalized = title.toLowerCase();
  if (normalized.includes("unstake")) return "unstake";
  if (normalized.includes("stake")) return "stake";
  if (normalized.includes("redeem")) return "redeem";
  if (normalized.includes("proof")) return "proof";
  if (normalized.includes("community") || normalized.includes("launch")) return "community";
  if (normalized.includes("studio") || normalized.includes("setup")) return "studio";
  if (normalized.includes("reward") || normalized.includes("claim")) return "reward";
  if (normalized.includes("scan")) return "scan";
  return "mint";
}

export function transactionStateFromTxStatus(status: string | null | undefined): TransactionFlowState {
  if (!status) return "idle";
  const normalized = status.toLowerCase();
  if (["confirmed", "success", "complete", "completed", "redeemed", "staked", "unstaked"].some((item) => normalized.includes(item))) return "success";
  if (["fail", "error", "rejected", "skipped", "needs"].some((item) => normalized.includes(item))) return "error";
  if (["signing", "signature"].some((item) => normalized.includes(item))) return "signing";
  if (["sending", "submitting", "submitted"].some((item) => normalized.includes(item))) return "sending";
  if (["confirming", "pending"].some((item) => normalized.includes(item))) return "confirming";
  if (["validating", "building", "preparing", "processing", "loading"].some((item) => normalized.includes(item))) return "preparing";
  return "idle";
}

function flowIndex(state: TransactionFlowState, steps: TransactionFlowStep[]) {
  if (state === "idle") return -1;
  if (state === "success") return steps.length;
  if (state === "error") return -1;
  return steps.findIndex((step) => step.state === state);
}

function flowStatusLabel(state: TransactionFlowState) {
  const labels: Record<TransactionFlowState, string> = {
    idle: "Ready",
    preparing: "Preparing",
    signing: "Signing",
    sending: "Sending",
    confirming: "Confirming",
    success: "Success",
    error: "Error"
  };
  return labels[state];
}

function badgeClass(state: TransactionFlowState) {
  if (state === "success") return "border-vault-green/45 bg-vault-green/10 text-vault-green";
  if (state === "error") return "border-vault-red/45 bg-vault-red/10 text-vault-red";
  if (state === "idle") return "border-vault-line bg-black/30 text-slate-400";
  return "border-vault-cyan/40 bg-vault-cyan/10 text-vault-cyan";
}

function stateIcon(state: TransactionFlowState) {
  if (state === "success") return <CheckCircle2 className="size-3.5" />;
  if (state === "error") return <CircleAlert className="size-3.5" />;
  if (state === "signing") return <WalletCards className="size-3.5" />;
  if (state === "sending") return <Send className="size-3.5" />;
  if (state === "confirming") return <ShieldCheck className="size-3.5" />;
  if (state === "preparing") return <Loader2 className="size-3.5 animate-spin" />;
  return <RadioTower className="size-3.5" />;
}
