"use client";

import type { CSSProperties, ReactNode } from "react";
import { gameFlowAssets, type GameFlowFrameDescriptor, type GameFlowMode, type GameFlowObjectKey } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";
import { PhewMascotActor, type PhewMascotMood } from "./PhewMascot";

export type PhewGameMomentMode = GameFlowMode;
export type PhewGameMomentState = "idle" | "wallet-disconnected" | "loading" | "preparing" | "signing" | "submitting" | "confirming" | "success" | "error";
export type PhewMotionObjectKind = GameFlowObjectKey;

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

type GameFlowFrame = GameFlowFrameDescriptor;

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

export function RaidGameMoment(props: Omit<PhewGameMomentProps, "mode">) {
  return <PhewGameMoment {...props} mode="raid" />;
}

export function PhewGameMoment(props: PhewGameMomentProps) {
  return <PhewGameFlow {...props} />;
}

export function PhewGameFlow({
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
  const flow = gameFlowAssets.flows[mode];
  const frames = flow.frames;
  const stepLabels = steps ?? frames.map((frame) => frame.title);
  const stepIndex = activeStep ?? gameStepIndex(canonicalState, stepLabels.length);
  const frameIndex = frameIndexFromStep(stepIndex, stepLabels.length, frames.length);
  const frame = frames[frameIndex] ?? frames[0];

  return (
    <section
      className={cn("phew-game-scene", compact && "phew-game-compact", reducedMotion && "phew-reduced-motion", `phew-game-${mode}`, `phew-game-state-${canonicalState}`, className)}
      data-mode={mode}
      data-state={canonicalState}
      data-frame={frameIndex}
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
        <PhewGameFrame mode={mode} state={canonicalState} frame={frame} frameIndex={frameIndex} frames={frames} tokenSymbol={tokenSymbol} image={image} reducedMotion={reducedMotion} />
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

export function PhewGameFrame({
  mode,
  state,
  frame,
  frameIndex,
  frames,
  tokenSymbol,
  image,
  reducedMotion
}: {
  mode: PhewGameMomentMode;
  state: PhewGameMomentState;
  frame: GameFlowFrame;
  frameIndex: number;
  frames: readonly GameFlowFrame[];
  tokenSymbol?: string | null;
  image?: string | null;
  reducedMotion?: boolean;
}) {
  const flow = gameFlowAssets.flows[mode];
  const actorMood = state === "success" ? "success" : state === "error" ? "error" : toMascotMood(frame.actorMood) ?? moodFor(mode, state);
  const targetKind = state === "error" ? "error" : frame.target;
  return (
    <div className={cn("phew-game-frame", reducedMotion && "phew-game-frame-reduced")} data-effect={frame.effect}>
      {reducedMotion ? <img src={frame.image} alt="" className="phew-game-frame-fallback" /> : null}
      <div className="phew-game-live-layer" aria-hidden={reducedMotion || undefined}>
        <PhewMascotActor mood={actorMood} className="phew-game-actor" />
        <PhewMotionObject role="primary" kind={frame.primary} tokenSymbol={tokenSymbol} image={image} />
        <PhewMotionObject role="target" kind={targetKind} label={objectLabel(targetKind, mode)} />

        {state === "success" ? (
          <div className="phew-game-confirm phew-game-confirm-success">
            <img src={motionObjectAsset(flow.confirmObject)} alt="" />
          </div>
        ) : null}
        {state === "error" ? (
          <div className="phew-game-confirm phew-game-confirm-error">
            <img src={gameFlowAssets.objects.error} alt="" />
          </div>
        ) : null}

        <PhewParticleBurst active={!reducedMotion && state !== "idle" && state !== "wallet-disconnected"} mode={mode} />
      </div>

      <div className="phew-game-frame-copy">
        <span>Frame {frameIndex + 1} / {frames.length}</span>
        <strong>{frame.title}</strong>
        <p>{frame.caption}</p>
      </div>

      <div className="phew-game-frame-rail" aria-hidden="true">
        {frames.map((item, index) => (
          <span key={item.title} className={cn(index <= frameIndex && "is-active", index === frameIndex && "is-current")} title={item.title} />
        ))}
      </div>

    </div>
  );
}

export function PhewMotionObject({
  role,
  kind,
  label,
  tokenSymbol,
  image
}: {
  role: "primary" | "target";
  kind: PhewMotionObjectKind;
  label?: ReactNode;
  tokenSymbol?: string | null;
  image?: string | null;
}) {
  const asset = motionObjectAsset(kind, image);
  const chip = role === "primary" && chipMotionObjects.has(kind);
  const text = role === "primary" ? tokenSymbol || objectLabel(kind) : label ?? objectLabel(kind);

  return (
    <div className={cn("phew-motion-object", role === "primary" ? "phew-game-token" : "phew-game-target", chip && "phew-game-token-chip")} data-kind={kind} data-role={role}>
      {role === "target" ? <span className="phew-game-target-core" /> : null}
      <img src={asset} alt="" className={role === "primary" ? "phew-game-token-image object-contain p-2" : undefined} />
      <span>{text}</span>
    </div>
  );
}

export function PhewParticleBurst({ active, mode = "reward", count = 18 }: { active?: boolean; mode?: PhewGameMomentMode; count?: number }) {
  if (!active) return null;
  const variant = gameFlowAssets.flows[mode].particleVariant;
  const particleAsset = variant === "xp" ? gameFlowAssets.objects.xp : gameFlowAssets.objects.reward;
  return (
    <div className="phew-game-particles phew-particle-burst" data-mode={mode} data-variant={variant}>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} style={{ "--i": index } as CSSProperties}>
          {index % 4 === 0 ? <img src={particleAsset} alt="" /> : null}
        </span>
      ))}
    </div>
  );
}

function gameFlowFrames(mode: PhewGameMomentMode): GameFlowFrame[] {
  return [...gameFlowAssets.flows[mode].frames];
}

function gameStepIndex(state: PhewGameMomentState, count: number) {
  if (state === "success") return Math.max(0, count - 1);
  if (state === "error" || state === "wallet-disconnected" || state === "idle") return 0;
  if (state === "confirming") return Math.max(0, count - 2);
  if (state === "signing" || state === "submitting") return Math.min(count - 1, 2);
  return Math.min(count - 1, 1);
}

function frameIndexFromStep(stepIndex: number, stepCount: number, frameCount: number) {
  if (frameCount <= 1) return 0;
  if (stepCount <= 1) return Math.min(frameCount - 1, stepIndex);
  return Math.max(0, Math.min(frameCount - 1, Math.round((stepIndex / (stepCount - 1)) * (frameCount - 1))));
}

function moodFor(mode: PhewGameMomentMode, state: PhewGameMomentState): PhewMascotMood {
  if (state === "success") return "success";
  if (state === "error") return "error";
  if (state === "wallet-disconnected") return "idle";
  if (mode === "mint") return "mint";
  if (mode === "stake" || mode === "unstake") return "stake";
  if (mode === "redeem") return "redeem";
  if (mode === "proof" || mode === "scan") return "proof";
  if (mode === "community" || mode === "raid") return "running";
  return "loading";
}

const chipMotionObjects = new Set<PhewMotionObjectKind>(["token", "tokenStack", "reward", "scan", "raid", "raidProof", "community", "reserve", "layer", "xp"]);

function motionObjectAsset(kind: PhewMotionObjectKind, image?: string | null) {
  if (kind === "nft" && image) return image;
  return gameFlowAssets.objects[kind] ?? gameFlowAssets.objects.error;
}

function objectLabel(kind: PhewMotionObjectKind, mode?: PhewGameMomentMode) {
  const labels: Record<PhewMotionObjectKind, string> = {
    token: "token",
    tokenStack: "tokens",
    nft: "nft",
    vault: "vault",
    lock: "lock",
    unlock: "unlock",
    proof: "proof",
    scan: "scan",
    reward: mode === "raid" ? "xp" : "reward",
    community: "community",
    reserve: "reserve",
    layer: "layers",
    raid: "raid",
    raidProof: "proof",
    xp: "xp",
    error: "error"
  };
  return labels[kind];
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
  return gameFlowAssets.flows[mode].label;
}

function toMascotMood(value: unknown): PhewMascotMood | undefined {
  if (value === "idle" || value === "running" || value === "success" || value === "loading" || value === "warning" || value === "error" || value === "mint" || value === "stake" || value === "redeem" || value === "proof") {
    return value;
  }
  return undefined;
}
