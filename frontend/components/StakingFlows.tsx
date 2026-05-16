"use client";

import { useState } from "react";
import { LockKeyhole, Sparkles, UnlockKeyhole } from "lucide-react";
import { AnimatedButton } from "./AnimatedButton";
import { RewardClaimAnimation, StakeMomentAnimation, UnstakeMomentAnimation, type PhewMomentState } from "./phew-moment-animations";
import { ProgressBar } from "./ProgressBar";
import { TransactionStatus, type TxStatus } from "./TransactionStatus";

type FlowResult = { ok?: boolean; message?: string };

async function defaultUnavailable(): Promise<FlowResult> {
  throw new Error("This transaction endpoint is not configured yet.");
}

export function StakeFlow({ onStake = defaultUnavailable, collectionImage, tokenSymbol }: { onStake?: () => Promise<FlowResult>; collectionImage?: string | null; tokenSymbol?: string | null }) {
  return <BaseFlow title="Stake vault" idleLabel="Ready to stake an eligible wallet NFT" pendingLabel="Submitting stake request" successLabel="Stake confirmed" buttonLabel="Stake" icon={LockKeyhole} animation="stake" onRun={onStake} collectionImage={collectionImage} tokenSymbol={tokenSymbol} />;
}

export function UnstakeFlow({ onUnstake = defaultUnavailable, collectionImage, tokenSymbol }: { onUnstake?: () => Promise<FlowResult>; collectionImage?: string | null; tokenSymbol?: string | null }) {
  return <BaseFlow title="Unstake vault" idleLabel="Ready to unstake an active position" pendingLabel="Submitting unstake request" successLabel="Unstake confirmed" buttonLabel="Unstake" icon={UnlockKeyhole} animation="unstake" onRun={onUnstake} collectionImage={collectionImage} tokenSymbol={tokenSymbol} />;
}

export function ClaimRewardsFlow({ onClaim = defaultUnavailable, collectionImage, tokenSymbol }: { onClaim?: () => Promise<FlowResult>; collectionImage?: string | null; tokenSymbol?: string | null }) {
  return <BaseFlow title="Claim rewards" idleLabel="Rewards available when API reports them" pendingLabel="Claiming rewards" successLabel="Rewards claimed" buttonLabel="Claim" icon={Sparkles} animation="claim" onRun={onClaim} collectionImage={collectionImage} tokenSymbol={tokenSymbol} />;
}

function BaseFlow({
  title,
  idleLabel,
  pendingLabel,
  successLabel,
  buttonLabel,
  icon,
  animation,
  onRun,
  collectionImage,
  tokenSymbol
}: {
  title: string;
  idleLabel: string;
  pendingLabel: string;
  successLabel: string;
  buttonLabel: string;
  icon: typeof LockKeyhole;
  animation: "stake" | "unstake" | "claim";
  onRun: () => Promise<FlowResult>;
  collectionImage?: string | null;
  tokenSymbol?: string | null;
}) {
  const [status, setStatus] = useState<TxStatus>("idle");
  const [detail, setDetail] = useState<string | null>(null);

  async function run() {
    setStatus("pending");
    setDetail(null);
    try {
      const result = await onRun();
      setStatus("confirmed");
      setDetail(result.message ?? null);
    } catch (error) {
      setStatus("failed");
      setDetail(error instanceof Error ? error.message : "Transaction failed");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-black uppercase text-white">{title}</p>
      {animation === "stake" ? <StakeMomentAnimation state={momentState(status)} collectionImage={collectionImage} tokenSymbol={tokenSymbol} /> : null}
      {animation === "unstake" ? <UnstakeMomentAnimation state={momentState(status)} collectionImage={collectionImage} tokenSymbol={tokenSymbol} /> : null}
      {animation === "claim" ? <RewardClaimAnimation state={momentState(status)} collectionImage={collectionImage} tokenSymbol={tokenSymbol} /> : null}
      {status === "pending" ? <ProgressBar value={62} label={pendingLabel} /> : null}
      <TransactionStatus status={status} label={status === "pending" ? pendingLabel : status === "confirmed" ? successLabel : status === "failed" ? "Action failed" : idleLabel} detail={detail} />
      <AnimatedButton tone="outline" icon={icon} loading={status === "pending"} success={status === "confirmed"} onClick={run}>
        {buttonLabel}
      </AnimatedButton>
    </div>
  );
}

function momentState(status: TxStatus): PhewMomentState {
  if (status === "pending" || status === "validating" || status === "signing") return "loading";
  if (status === "confirmed") return "success";
  if (status === "failed") return "error";
  return "idle";
}
