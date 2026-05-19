"use client";

import type { CSSProperties, ReactNode } from "react";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";
import { PhewMascotActor, type PhewMascotMood } from "./PhewMascot";

export type PhewGameMomentMode = "mint" | "stake" | "unstake" | "redeem" | "proof" | "community" | "studio" | "reward" | "scan" | "layer";
export type PhewGameMomentState = "idle" | "wallet-disconnected" | "loading" | "preparing" | "signing" | "submitting" | "confirming" | "success" | "error";

export type PhewGameMomentProps = {
  mode: PhewGameMomentMode;
  state?: PhewGameMomentState;
  title: ReactNode;
  description?: ReactNode;
  tokenSymbol?: string | null;
  image?: string | null;
  detail?: ReactNode;
  steps?: string[];
  activeStep?: number;
  compact?: boolean;
  className?: string;
  reducedMotion?: boolean;
};

export function MintGameMoment(props: Omit<PhewGameMomentProps, "mode">) {
  return <PhewGameMoment {...props} mode="mint" />;
}

export function StakeGameMoment(props: Omit<PhewGameMomentProps, "mode">) {
  return <PhewGameMoment {...props} mode="stake" />;
}

export function UnstakeGameMoment(props: Omit<PhewGameMomentProps, "mode">) {
  return <PhewGameMoment {...props} mode="unstake" />;
}

export function RedeemGameMoment(props: Omit<PhewGameMomentProps, "mode">) {
  return <PhewGameMoment {...props} mode="redeem" />;
}

export function ProofGameMoment(props: Omit<PhewGameMomentProps, "mode">) {
  return <PhewGameMoment {...props} mode="proof" />;
}

export function CommunityLaunchMoment(props: Omit<PhewGameMomentProps, "mode">) {
  return <PhewGameMoment {...props} mode="community" />;
}

export function PhewGameMoment({
  mode,
  state = "idle",
  title,
  description,
  tokenSymbol,
  image,
  detail,
  steps,
  activeStep,
  compact,
  className,
  reducedMotion
}: PhewGameMomentProps) {
  const canonicalState = state === "preparing" ? "loading" : state;
  const stepLabels = steps ?? gameSteps(mode);
  const stepIndex = activeStep ?? gameStepIndex(canonicalState, stepLabels.length);
  const actorMood = moodFor(mode, canonicalState);
  const target = targetFor(mode, canonicalState);
  const nftIsToken = mode === "redeem" || mode === "community" || mode === "scan";

  return (
    <section
      className={cn("phew-game-scene", compact && "phew-game-compact", reducedMotion && "phew-reduced-motion", `phew-game-${mode}`, `phew-game-state-${canonicalState}`, className)}
      data-mode={mode}
      data-state={canonicalState}
    >
      <div className="phew-game-head">
        <div className="min-w-0">
          <p className="phew-game-kicker">{modeLabel(mode)}</p>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <span className="phew-game-state-pill">{stateLabel(canonicalState)}</span>
      </div>

      <div className="phew-game-canvas">
        <span className="phew-game-grid" />
        <span className="phew-game-floor" />
        <span className="phew-game-orbit phew-game-orbit-a" />
        <span className="phew-game-orbit phew-game-orbit-b" />
        <span className="phew-game-beam phew-game-beam-a" />
        <span className="phew-game-beam phew-game-beam-b" />
        <span className="phew-game-scan phew-game-scan-a" />
        <span className="phew-game-scan phew-game-scan-b" />

        <PhewMascotActor mood={actorMood} className="phew-game-actor" />

        <div className={cn("phew-game-token", nftIsToken && "phew-game-token-chip")}>
          {image ? <img src={image} alt="" className="phew-game-token-image" /> : <img src={nftIsToken ? brandAssets.tokenStack : brandAssets.nftSlot} alt="" className="phew-game-token-image object-contain p-2" />}
          <span>{tokenSymbol || "TOKEN"}</span>
        </div>

        <div className="phew-game-target">
          <span className="phew-game-target-core" />
          <img src={target.asset} alt="" />
          <strong>{target.label}</strong>
        </div>

        {canonicalState === "success" ? (
          <div className="phew-game-confirm phew-game-confirm-success">
            <img src={brandAssets.rewardBurst} alt="" />
          </div>
        ) : null}
        {canonicalState === "error" ? (
          <div className="phew-game-confirm phew-game-confirm-error">
            <img src={brandAssets.errorGlitch} alt="" />
          </div>
        ) : null}

        <div className="phew-game-particles">
          {Array.from({ length: 18 }, (_, index) => <span key={index} style={{ "--i": index } as CSSProperties} />)}
        </div>
      </div>

      <div className="phew-game-bottom">
        <div className="phew-game-dots" aria-hidden="true">
          {stepLabels.map((step, index) => (
            <span key={`${step}-${index}`} className={cn(index <= stepIndex && "is-active", index === stepIndex && "is-current")} />
          ))}
        </div>
        <div className="min-w-0 text-right text-xs text-slate-400">
          <span className="font-black uppercase text-white">{stepLabels[stepIndex] ?? stepLabels[0]}</span>
          {detail ? <span className="ml-2 text-slate-500">{detail}</span> : null}
        </div>
      </div>
    </section>
  );
}

function gameSteps(mode: PhewGameMomentMode) {
  if (mode === "stake") return ["Initiated", "Transfer", "Validate", "Lock", "Confirm", "Rewards"];
  if (mode === "unstake") return ["Select", "Validate", "Unlock", "Release", "Confirm"];
  if (mode === "redeem") return ["Eligible", "Proof", "Unlock", "Invalidate", "Return", "Confirm"];
  if (mode === "proof") return ["Load", "Owner", "Reserve", "Position", "Verify"];
  if (mode === "community") return ["Scan", "Gate", "Create", "Sign", "Submit", "Reserve"];
  if (mode === "studio") return ["Token", "Brand", "Bible", "Layers", "Launch"];
  if (mode === "mint") return ["Configure", "Lock", "Mint", "Confirm"];
  return ["Ready", "Build", "Submit", "Confirm"];
}

function gameStepIndex(state: PhewGameMomentState, count: number) {
  if (state === "success") return Math.max(0, count - 1);
  if (state === "error" || state === "wallet-disconnected" || state === "idle") return 0;
  if (state === "confirming") return Math.max(0, count - 2);
  if (state === "signing" || state === "submitting") return Math.min(count - 1, 2);
  return Math.min(count - 1, 1);
}

function moodFor(mode: PhewGameMomentMode, state: PhewGameMomentState): PhewMascotMood {
  if (state === "success") return "success";
  if (state === "error") return "error";
  if (state === "wallet-disconnected") return "idle";
  if (mode === "mint") return "mint";
  if (mode === "stake" || mode === "unstake") return "stake";
  if (mode === "redeem") return "redeem";
  if (mode === "proof" || mode === "scan") return "proof";
  if (mode === "community") return "running";
  return "loading";
}

function targetFor(mode: PhewGameMomentMode, state: PhewGameMomentState) {
  if (state === "error") return { asset: brandAssets.errorGlitch, label: "error" };
  if (state === "success") return { asset: brandAssets.rewardBurst, label: "done" };
  if (mode === "redeem") return { asset: brandAssets.tokenStack, label: "wallet" };
  if (mode === "unstake") return { asset: brandAssets.lockUnlock, label: "unlock" };
  if (mode === "proof" || mode === "scan") return { asset: brandAssets.proofRing, label: "proof" };
  if (mode === "community") return { asset: brandAssets.vaultSafe, label: "launch" };
  if (mode === "reward") return { asset: brandAssets.rewardBurst, label: "reward" };
  return { asset: brandAssets.vaultSafe, label: "vault" };
}

function stateLabel(state: PhewGameMomentState) {
  if (state === "wallet-disconnected") return "Wallet locked";
  if (state === "loading") return "Loading";
  if (state === "signing") return "Signing";
  if (state === "submitting") return "Submitted";
  if (state === "confirming") return "Confirming";
  if (state === "success") return "Success";
  if (state === "error") return "Error";
  return "Idle";
}

function modeLabel(mode: PhewGameMomentMode) {
  const labels: Record<PhewGameMomentMode, string> = {
    mint: "Mint Game Moment",
    stake: "Stake Game Moment",
    unstake: "Unstake Game Moment",
    redeem: "Redeem Game Moment",
    proof: "Proof Scan",
    community: "Community Launch",
    studio: "Studio Bible",
    reward: "Reward Burst",
    scan: "Token Scan",
    layer: "Layer Pack"
  };
  return labels[mode];
}
