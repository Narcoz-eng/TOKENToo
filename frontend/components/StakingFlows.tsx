"use client";

import { useState } from "react";
import { AnimatedButton } from "./AnimatedButton";
import { PhewSuccessMomentModal, type PhewSuccessMomentAction } from "./PhewSuccessMomentModal";
import { TransactionStatus, type TxStatus } from "./TransactionStatus";
import { assertBackendActionCompleted } from "@/lib/action-contracts";
import { brandAssets } from "@/lib/brand-assets";

type FlowResult = { ok?: boolean; message?: string; status?: string; payoutStatus?: string };
type LocalFlowState = "idle" | "wallet-disconnected" | "preparing" | "signing" | "sending" | "submitting" | "confirming" | "success" | "error";

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
  const [flowState, setFlowState] = useState<LocalFlowState>("idle");
  const [detail, setDetail] = useState<string | null>(null);
  const [successMomentOpen, setSuccessMomentOpen] = useState(false);

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
      if (moment !== "reward") setSuccessMomentOpen(true);
    } catch (error) {
      setStatus("failed");
      setFlowState("error");
      setDetail(error instanceof Error ? error.message : "Transaction failed");
    }
  }

  const sceneState: LocalFlowState = walletDisconnected && flowState === "idle" ? "wallet-disconnected" : flowState;
  const busy = flowState === "preparing" || flowState === "signing" || flowState === "sending" || flowState === "submitting" || flowState === "confirming";
  const blockedDetail = disabled ? disabledReason ?? "Action locked until backend prerequisites pass." : null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-black uppercase text-white">{title}</p>
      <div className="rounded-lg border border-vault-line bg-black/25 p-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-md border border-vault-green/30 bg-vault-green/10">
            <img src={flowIconAsset(moment)} alt="" className="size-8 object-contain" />
          </span>
          <span className="min-w-0">
            <strong className="block text-sm text-white">{sceneState === "success" ? successLabel : sceneState === "error" ? "Action failed" : idleLabel}</strong>
            <span className="mt-1 block text-xs leading-5 text-slate-500">{detail ?? blockedDetail ?? (walletDisconnected ? "Connect a wallet before signing this protocol action." : "Backend confirmation required.")}</span>
          </span>
        </div>
      </div>
      <TransactionStatus status={status} label={status === "pending" || status === "validating" ? pendingLabel : status === "confirmed" ? successLabel : status === "failed" ? "Action failed" : idleLabel} detail={detail} />
      <AnimatedButton tone="outline" iconAsset={flowIconAsset(moment)} loading={busy} success={status === "confirmed"} disabled={disabled || busy} onClick={run}>
        {buttonLabel}
      </AnimatedButton>
      {successMomentOpen && moment !== "reward" ? (
        <PhewSuccessMomentModal
          action={momentToSuccessAction(moment)}
          tokenSymbol={tokenSymbol}
          nftImage={collectionImage}
          title={successLabel}
          subtitle={detail ?? "Backend confirmed the staking action."}
          onClose={() => setSuccessMomentOpen(false)}
        />
      ) : null}
    </div>
  );
}

function momentToSuccessAction(moment: "stake" | "unstake" | "reward"): PhewSuccessMomentAction {
  if (moment === "unstake") return "unstake";
  return "stake";
}

function flowIconAsset(moment: "stake" | "unstake" | "reward") {
  if (moment === "stake") return brandAssets.vaultSafe;
  if (moment === "unstake") return brandAssets.redeemParticles;
  return brandAssets.rewardBurst;
}
