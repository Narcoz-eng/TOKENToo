"use client";

import {
  ReferenceTransactionScene,
  type ReferenceSceneMode,
  type ReferenceSceneState
} from "@/components/reference-ui";

export type TransactionFlowState = "idle" | "wallet-disconnected" | "preparing" | "signing" | "submitting" | "sending" | "confirming" | "success" | "error";
export type TransactionFlowMoment = "mint" | "stake" | "unstake" | "redeem" | "proof" | "community" | "community-launch" | "studio" | "studio-bible" | "reward" | "scan";

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
  return (
    <ReferenceTransactionScene
      mode={normalizeMoment(moment ?? inferMoment(title))}
      state={normalizeState(state)}
      title={title}
      description={description}
      tokenSymbol={tokenSymbol}
      image={image}
      detail={detail}
      steps={steps?.map((step) => step.label)}
      compact={compact}
      className={className}
    />
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

function normalizeState(state: TransactionFlowState): ReferenceSceneState {
  if (state === "sending") return "submitting";
  return state;
}

function normalizeMoment(moment: TransactionFlowMoment): ReferenceSceneMode {
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
  if (normalized.includes("reward") || normalized.includes("claim")) return "reward";
  if (normalized.includes("scan")) return "scan";
  return "mint";
}

