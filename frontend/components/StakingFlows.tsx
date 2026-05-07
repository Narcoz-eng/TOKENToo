"use client";

import { useState } from "react";
import { LockKeyhole, Sparkles, UnlockKeyhole } from "lucide-react";
import { AnimatedButton } from "./AnimatedButton";
import { RewardBurstAnimation, StakeAnimation, UnstakeAnimation } from "./animations";
import { ProgressBar } from "./ProgressBar";
import { TransactionStatus, type TxStatus } from "./TransactionStatus";

type FlowResult = { ok?: boolean; message?: string };

async function defaultUnavailable(): Promise<FlowResult> {
  throw new Error("This transaction endpoint is not configured yet.");
}

export function StakeFlow({ onStake = defaultUnavailable }: { onStake?: () => Promise<FlowResult> }) {
  return <BaseFlow title="Stake vault" idleLabel="Ready to bind" pendingLabel="Binding NFT to vault frame" successLabel="Stake confirmed" buttonLabel="Stake" icon={LockKeyhole} animation="stake" onRun={onStake} />;
}

export function UnstakeFlow({ onUnstake = defaultUnavailable }: { onUnstake?: () => Promise<FlowResult> }) {
  return <BaseFlow title="Unstake vault" idleLabel="Ready to unlock" pendingLabel="Opening vault energy ring" successLabel="Unstake confirmed" buttonLabel="Unstake" icon={UnlockKeyhole} animation="unstake" onRun={onUnstake} />;
}

export function ClaimRewardsFlow({ onClaim = defaultUnavailable }: { onClaim?: () => Promise<FlowResult> }) {
  return <BaseFlow title="Claim rewards" idleLabel="Rewards available when API reports them" pendingLabel="Claiming rewards" successLabel="Rewards claimed" buttonLabel="Claim" icon={Sparkles} animation="claim" onRun={onClaim} />;
}

function BaseFlow({
  title,
  idleLabel,
  pendingLabel,
  successLabel,
  buttonLabel,
  icon,
  animation,
  onRun
}: {
  title: string;
  idleLabel: string;
  pendingLabel: string;
  successLabel: string;
  buttonLabel: string;
  icon: typeof LockKeyhole;
  animation: "stake" | "unstake" | "claim";
  onRun: () => Promise<FlowResult>;
}) {
  const [status, setStatus] = useState<TxStatus>("idle");
  const [detail, setDetail] = useState<string | null>(null);

  async function run() {
    setStatus("pending");
    setDetail(null);
    try {
      const result = await onRun();
      setStatus("success");
      setDetail(result.message ?? null);
    } catch (error) {
      setStatus("error");
      setDetail(error instanceof Error ? error.message : "Transaction failed");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-black uppercase text-white">{title}</p>
      {animation === "stake" ? <StakeAnimation active={status === "pending"} rarity="Epic" label={status === "pending" ? "Lock-in" : "Stake"} /> : null}
      {animation === "unstake" ? <UnstakeAnimation active={status === "pending"} rarity="Rare" label={status === "pending" ? "Unlock" : "Unstake"} /> : null}
      {animation === "claim" ? <RewardBurstAnimation active={status === "pending" || status === "success"} rarity="Rare" label={status === "success" ? "Claimed" : "Rewards"} /> : null}
      {status === "pending" ? <ProgressBar value={62} label={pendingLabel} /> : null}
      <TransactionStatus status={status} label={status === "pending" ? pendingLabel : status === "success" ? successLabel : status === "error" ? "Action failed" : idleLabel} detail={detail} />
      <AnimatedButton tone="outline" icon={icon} loading={status === "pending"} success={status === "success"} onClick={run}>
        {buttonLabel}
      </AnimatedButton>
    </div>
  );
}
