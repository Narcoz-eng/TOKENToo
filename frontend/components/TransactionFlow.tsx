"use client";

import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

export type TransactionFlowState = "idle" | "wallet-disconnected" | "preparing" | "signing" | "submitting" | "sending" | "confirming" | "success" | "error";
export type TransactionFlowMoment = "mint" | "stake" | "unstake" | "redeem" | "proof" | "community" | "community-launch" | "studio" | "studio-bible" | "reward" | "scan" | "raid";

export type TransactionFlowStep = {
  state: TransactionFlowState;
  label: string;
  detail: string;
};

export function TransactionFlow({
  state,
  title,
  description,
  tokenSymbol,
  image,
  detail,
  className,
  compact = false,
  moment,
  steps
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
  const normalizedState = normalizeState(state);
  const normalizedMoment = normalizeMoment(moment ?? inferMoment(title));
  const icon = transactionIcon(normalizedMoment, normalizedState);
  const activeIndex = steps?.findIndex((step) => normalizeState(step.state) === normalizedState) ?? -1;
  return (
    <section className={cn("phew-inline-flow-status", compact && "phew-inline-flow-status-compact", `phew-inline-flow-${normalizedState}`, className)} data-moment={normalizedMoment} data-state={normalizedState}>
      <div className="phew-inline-flow-head">
        <div className="phew-inline-flow-icon">
          <img src={image || icon} alt="" />
        </div>
        <div className="min-w-0">
          <p className="phew-inline-flow-kicker">{momentLabel(normalizedMoment)}</p>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        <span className="phew-inline-flow-pill">{stateLabel(normalizedState)}</span>
      </div>
      <div className="phew-inline-flow-meta">
        {tokenSymbol ? <span>{tokenSymbol}</span> : null}
        {detail ? <span>{detail}</span> : null}
        {!tokenSymbol && !detail ? <span>Waiting for backend state</span> : null}
      </div>
      {steps?.length ? (
        <div className="phew-inline-flow-steps" aria-hidden="true">
          {steps.map((step, index) => (
            <span key={`${step.label}-${index}`} className={cn(index <= activeIndex && activeIndex >= 0 && "is-active", index === activeIndex && "is-current")} title={step.detail || step.label} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function transactionStateFromTxStatus(status: string | null | undefined): TransactionFlowState {
  if (!status) return "idle";
  const normalized = status.toLowerCase();
  if (["confirmed", "success", "complete", "completed", "redeemed", "staked", "unstaked"].some((item) => normalized.includes(item))) return "success";
  if (["fail", "error", "rejected", "skipped", "needs", "not_implemented", "unavailable", "no_adapter", "not_paid", "accounted_not_paid"].some((item) => normalized.includes(item))) return "error";
  if (["wallet_disconnected", "wallet disconnected", "wallet_required", "wallet required", "disconnected"].some((item) => normalized.includes(item))) return "wallet-disconnected";
  if (["signing", "signature"].some((item) => normalized.includes(item))) return "signing";
  if (["sending", "submitting", "submitted", "pending"].some((item) => normalized.includes(item))) return "submitting";
  if (["confirming"].some((item) => normalized.includes(item))) return "confirming";
  if (["validating", "building", "preparing", "processing", "loading"].some((item) => normalized.includes(item))) return "preparing";
  return "idle";
}

function normalizeState(state: TransactionFlowState): Exclude<TransactionFlowState, "sending"> {
  if (state === "sending") return "submitting";
  return state;
}

function normalizeMoment(moment: TransactionFlowMoment): Exclude<TransactionFlowMoment, "community-launch" | "studio-bible"> {
  if (moment === "community-launch") return "community";
  if (moment === "studio-bible") return "studio";
  return moment;
}

function inferMoment(title: string): TransactionFlowMoment {
  const normalized = title.toLowerCase();
  if (normalized.includes("unstake")) return "unstake";
  if (normalized.includes("stake")) return "stake";
  if (normalized.includes("redeem")) return "redeem";
  if (normalized.includes("proof")) return "proof";
  if (normalized.includes("community") || normalized.includes("launch")) return "community";
  if (normalized.includes("studio") || normalized.includes("setup")) return "studio";
  if (normalized.includes("raid")) return "raid";
  if (normalized.includes("reward") || normalized.includes("claim")) return "reward";
  if (normalized.includes("scan")) return "scan";
  return "mint";
}

function transactionIcon(moment: ReturnType<typeof normalizeMoment>, state: ReturnType<typeof normalizeState>) {
  if (state === "error") return brandAssets.errorGlitch;
  if (state === "success") return brandAssets.rewardBurst;
  if (moment === "mint") return brandAssets.generatedIcons.mint;
  if (moment === "stake") return brandAssets.generatedIcons.stake;
  if (moment === "unstake") return brandAssets.generatedIcons.unstake;
  if (moment === "redeem") return brandAssets.generatedIcons.redeem;
  if (moment === "proof" || moment === "scan") return brandAssets.generatedIcons.proof;
  if (moment === "community") return brandAssets.generatedIcons.community;
  if (moment === "raid") return brandAssets.generatedIcons.raid;
  if (moment === "reward") return brandAssets.generatedIcons.xpReward;
  if (moment === "studio") return brandAssets.generatedIcons.studio;
  return brandAssets.generatedIcons.strategy;
}

function stateLabel(state: ReturnType<typeof normalizeState>) {
  if (state === "wallet-disconnected") return "Wallet locked";
  if (state === "preparing") return "Preparing";
  if (state === "signing") return "Signing";
  if (state === "submitting") return "Submitted";
  if (state === "confirming") return "Confirming";
  if (state === "success") return "Confirmed";
  if (state === "error") return "Blocked";
  return "Idle";
}

function momentLabel(moment: ReturnType<typeof normalizeMoment>) {
  if (moment === "mint") return "Mint status";
  if (moment === "stake") return "Stake status";
  if (moment === "unstake") return "Unstake status";
  if (moment === "redeem") return "Redeem status";
  if (moment === "proof") return "Proof status";
  if (moment === "community") return "Launch status";
  if (moment === "raid") return "Raid status";
  if (moment === "reward") return "Reward status";
  if (moment === "scan") return "Scan status";
  return "Studio status";
}
