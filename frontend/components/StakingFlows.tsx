"use client";

import { useState } from "react";
import { LockKeyhole, Sparkles, UnlockKeyhole, type LucideIcon } from "lucide-react";
import { AnimatedButton } from "./AnimatedButton";
import { TransactionFlow, type TransactionFlowState } from "./TransactionFlow";
import { TransactionStatus, type TxStatus } from "./TransactionStatus";

type FlowResult = { ok?: boolean; message?: string };

async function defaultUnavailable(): Promise<FlowResult> {
  throw new Error("This transaction endpoint is not configured yet.");
}

export function StakeFlow({ onStake = defaultUnavailable, collectionImage, tokenSymbol }: { onStake?: () => Promise<FlowResult>; collectionImage?: string | null; tokenSymbol?: string | null }) {
  return <BaseFlow title="Stake vault" idleLabel="Ready to stake an eligible wallet NFT" pendingLabel="Submitting stake request" successLabel="Stake confirmed" buttonLabel="Stake" icon={LockKeyhole} onRun={onStake} collectionImage={collectionImage} tokenSymbol={tokenSymbol} />;
}

export function UnstakeFlow({ onUnstake = defaultUnavailable, collectionImage, tokenSymbol }: { onUnstake?: () => Promise<FlowResult>; collectionImage?: string | null; tokenSymbol?: string | null }) {
  return <BaseFlow title="Unstake vault" idleLabel="Ready to unstake an active position" pendingLabel="Submitting unstake request" successLabel="Unstake confirmed" buttonLabel="Unstake" icon={UnlockKeyhole} onRun={onUnstake} collectionImage={collectionImage} tokenSymbol={tokenSymbol} />;
}

export function ClaimRewardsFlow({ onClaim = defaultUnavailable, collectionImage, tokenSymbol }: { onClaim?: () => Promise<FlowResult>; collectionImage?: string | null; tokenSymbol?: string | null }) {
  return <BaseFlow title="Claim rewards" idleLabel="Rewards available when API reports them" pendingLabel="Claiming rewards" successLabel="Rewards claimed" buttonLabel="Claim" icon={Sparkles} onRun={onClaim} collectionImage={collectionImage} tokenSymbol={tokenSymbol} />;
}

function BaseFlow({
  title,
  idleLabel,
  pendingLabel,
  successLabel,
  buttonLabel,
  icon,
  onRun,
  collectionImage,
  tokenSymbol
}: {
  title: string;
  idleLabel: string;
  pendingLabel: string;
  successLabel: string;
  buttonLabel: string;
  icon: LucideIcon;
  onRun: () => Promise<FlowResult>;
  collectionImage?: string | null;
  tokenSymbol?: string | null;
}) {
  const [status, setStatus] = useState<TxStatus>("idle");
  const [flowState, setFlowState] = useState<TransactionFlowState>("idle");
  const [detail, setDetail] = useState<string | null>(null);

  async function run() {
    setStatus("validating");
    setFlowState("preparing");
    setDetail(null);
    try {
      await Promise.resolve();
      setStatus("pending");
      setFlowState("sending");
      const result = await onRun();
      setStatus("confirmed");
      setFlowState("success");
      setDetail(result.message ?? null);
    } catch (error) {
      setStatus("failed");
      setFlowState("error");
      setDetail(error instanceof Error ? error.message : "Transaction failed");
    }
  }

  const busy = flowState === "preparing" || flowState === "signing" || flowState === "sending" || flowState === "confirming";

  return (
    <div className="space-y-3">
      <p className="text-sm font-black uppercase text-white">{title}</p>
      <TransactionFlow state={flowState} title={title} description={idleLabel} image={collectionImage} tokenSymbol={tokenSymbol} detail={detail} compact />
      <TransactionStatus status={status} label={status === "pending" || status === "validating" ? pendingLabel : status === "confirmed" ? successLabel : status === "failed" ? "Action failed" : idleLabel} detail={detail} />
      <AnimatedButton tone="outline" icon={icon} loading={busy} success={status === "confirmed"} onClick={run}>
        {buttonLabel}
      </AnimatedButton>
    </div>
  );
}
