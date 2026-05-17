"use client";

import { useState } from "react";
import { AnimatedButton } from "./AnimatedButton";
import { TransactionFlow, type TransactionFlowState } from "./TransactionFlow";
import { TransactionStatus, type TxStatus } from "./TransactionStatus";
import { assertBackendActionCompleted } from "@/lib/action-contracts";
import { brandAssets } from "@/lib/brand-assets";

type FlowResult = { ok?: boolean; message?: string; status?: string; payoutStatus?: string };

async function defaultUnavailable(): Promise<FlowResult> {
  throw new Error("This transaction endpoint is not configured yet.");
}

export function StakeFlow({ onStake = defaultUnavailable, collectionImage, tokenSymbol, disabled, disabledReason, walletDisconnected }: { onStake?: () => Promise<FlowResult>; collectionImage?: string | null; tokenSymbol?: string | null; disabled?: boolean; disabledReason?: string | null; walletDisconnected?: boolean }) {
  return <BaseFlow title="Stake vault" idleLabel="Ready to stake an eligible wallet NFT" pendingLabel="Submitting stake request" successLabel="Stake confirmed" buttonLabel="Stake" moment="stake" onRun={onStake} collectionImage={collectionImage} tokenSymbol={tokenSymbol} disabled={disabled} disabledReason={disabledReason} walletDisconnected={walletDisconnected} />;
}

export function UnstakeFlow({ onUnstake = defaultUnavailable, collectionImage, tokenSymbol, disabled, disabledReason, walletDisconnected }: { onUnstake?: () => Promise<FlowResult>; collectionImage?: string | null; tokenSymbol?: string | null; disabled?: boolean; disabledReason?: string | null; walletDisconnected?: boolean }) {
  return <BaseFlow title="Unstake vault" idleLabel="Ready to unstake an active position" pendingLabel="Submitting unstake request" successLabel="Unstake confirmed" buttonLabel="Unstake" moment="unstake" onRun={onUnstake} collectionImage={collectionImage} tokenSymbol={tokenSymbol} disabled={disabled} disabledReason={disabledReason} walletDisconnected={walletDisconnected} />;
}

export function ClaimRewardsFlow({ onClaim = defaultUnavailable, collectionImage, tokenSymbol, disabled, disabledReason, walletDisconnected }: { onClaim?: () => Promise<FlowResult>; collectionImage?: string | null; tokenSymbol?: string | null; disabled?: boolean; disabledReason?: string | null; walletDisconnected?: boolean }) {
  return <BaseFlow title="Claim rewards" idleLabel="Rewards available when API reports them" pendingLabel="Claiming rewards" successLabel="Rewards claimed" buttonLabel="Claim" moment="reward" onRun={onClaim} collectionImage={collectionImage} tokenSymbol={tokenSymbol} disabled={disabled} disabledReason={disabledReason} walletDisconnected={walletDisconnected} />;
}

function BaseFlow({
  title,
  idleLabel,
  pendingLabel,
  successLabel,
  buttonLabel,
  moment,
  onRun,
  collectionImage,
  tokenSymbol,
  disabled,
  disabledReason,
  walletDisconnected
}: {
  title: string;
  idleLabel: string;
  pendingLabel: string;
  successLabel: string;
  buttonLabel: string;
  moment: "stake" | "unstake" | "reward";
  onRun: () => Promise<FlowResult>;
  collectionImage?: string | null;
  tokenSymbol?: string | null;
  disabled?: boolean;
  disabledReason?: string | null;
  walletDisconnected?: boolean;
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
      setFlowState("submitting");
      const result = await onRun();
      const outcome = assertBackendActionCompleted(result, "Backend did not confirm a completed transaction.");
      setStatus("confirmed");
      setFlowState("success");
      setDetail(outcome.detail ?? result.message ?? null);
    } catch (error) {
      setStatus("failed");
      setFlowState("error");
      setDetail(error instanceof Error ? error.message : "Transaction failed");
    }
  }

  const sceneState: TransactionFlowState = walletDisconnected && flowState === "idle" ? "wallet-disconnected" : flowState;
  const busy = flowState === "preparing" || flowState === "signing" || flowState === "sending" || flowState === "submitting" || flowState === "confirming";
  const blockedDetail = disabled ? disabledReason ?? "Action locked until backend prerequisites pass." : null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-black uppercase text-white">{title}</p>
      <TransactionFlow state={sceneState} moment={moment} title={title} description={walletDisconnected ? "Connect a wallet before signing this protocol action." : idleLabel} image={collectionImage} tokenSymbol={tokenSymbol} detail={detail ?? blockedDetail} compact />
      <TransactionStatus status={status} label={status === "pending" || status === "validating" ? pendingLabel : status === "confirmed" ? successLabel : status === "failed" ? "Action failed" : idleLabel} detail={detail} />
      <AnimatedButton tone="outline" iconAsset={flowIconAsset(moment)} loading={busy} success={status === "confirmed"} disabled={disabled || busy} onClick={run}>
        {buttonLabel}
      </AnimatedButton>
    </div>
  );
}

function flowIconAsset(moment: "stake" | "unstake" | "reward") {
  if (moment === "stake") return brandAssets.vaultSafe;
  if (moment === "unstake") return brandAssets.redeemParticles;
  return brandAssets.rewardBurst;
}
