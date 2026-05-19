"use client";

import type { CSSProperties, ReactNode } from "react";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";
import { PhewMascotActor, type PhewMascotMood } from "./PhewMascot";

export type PhewGameMomentMode =
  | "mint"
  | "stake"
  | "unstake"
  | "redeem"
  | "proof"
  | "community"
  | "studio"
  | "reward"
  | "scan"
  | "layer"
  | "raid";
export type PhewGameMomentState = "idle" | "wallet-disconnected" | "loading" | "preparing" | "signing" | "submitting" | "confirming" | "success" | "error";
export type PhewMotionObjectKind = "token" | "tokenStack" | "nft" | "vault" | "lock" | "proof" | "reward" | "community" | "scan" | "layer" | "raid" | "error";

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

type GameFlowFrame = {
  title: string;
  caption: string;
  primary: PhewMotionObjectKind;
  target: PhewMotionObjectKind;
  effect: "select" | "lock" | "form" | "burst" | "unlock" | "exit" | "burn" | "scan" | "check" | "submit";
  actorMood?: PhewMascotMood;
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
  const frames = gameFlowFrames(mode);
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
        <PhewGameFrame mode={mode} state={canonicalState} frame={frame} frameIndex={frameIndex} frames={frames} tokenSymbol={tokenSymbol} image={image} />
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
  image
}: {
  mode: PhewGameMomentMode;
  state: PhewGameMomentState;
  frame: GameFlowFrame;
  frameIndex: number;
  frames: GameFlowFrame[];
  tokenSymbol?: string | null;
  image?: string | null;
}) {
  const actorMood = state === "success" ? "success" : state === "error" ? "error" : frame.actorMood ?? moodFor(mode, state);
  const targetKind = state === "error" ? "error" : frame.target;
  return (
    <div className="phew-game-frame" data-effect={frame.effect}>
      <PhewMascotActor mood={actorMood} className="phew-game-actor" />
      <PhewMotionObject role="primary" kind={frame.primary} mode={mode} tokenSymbol={tokenSymbol} image={image} />
      <PhewMotionObject role="target" kind={targetKind} mode={mode} label={objectLabel(targetKind, mode)} />

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

      {state === "success" ? (
        <div className="phew-game-confirm phew-game-confirm-success">
          <img src={brandAssets.rewardBurst} alt="" />
        </div>
      ) : null}
      {state === "error" ? (
        <div className="phew-game-confirm phew-game-confirm-error">
          <img src={brandAssets.errorGlitch} alt="" />
        </div>
      ) : null}

      <PhewParticleBurst active={state !== "idle" && state !== "wallet-disconnected"} mode={mode} />
    </div>
  );
}

export function PhewMotionObject({
  role,
  kind,
  mode,
  label,
  tokenSymbol,
  image
}: {
  role: "primary" | "target";
  kind: PhewMotionObjectKind;
  mode: PhewGameMomentMode;
  label?: ReactNode;
  tokenSymbol?: string | null;
  image?: string | null;
}) {
  const asset = motionObjectAsset(kind, mode, image);
  const chip = role === "primary" && ["token", "tokenStack", "reward", "scan", "raid", "community"].includes(kind);
  const text = role === "primary" ? tokenSymbol || objectLabel(kind, mode) : label ?? objectLabel(kind, mode);

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
  return (
    <div className="phew-game-particles phew-particle-burst" data-mode={mode}>
      {Array.from({ length: count }, (_, index) => <span key={index} style={{ "--i": index } as CSSProperties} />)}
    </div>
  );
}

function gameFlowFrames(mode: PhewGameMomentMode): GameFlowFrame[] {
  const flows: Record<PhewGameMomentMode, GameFlowFrame[]> = {
    mint: [
      { title: "Token selected", caption: "Token reserve is staged for mint.", primary: "token", target: "vault", effect: "select", actorMood: "mint" },
      { title: "Token locks into vault", caption: "Backing moves into the reserve vault.", primary: "token", target: "vault", effect: "lock", actorMood: "mint" },
      { title: "NFT card forms", caption: "Vault NFT takes shape from verified backing.", primary: "nft", target: "vault", effect: "form", actorMood: "mint" },
      { title: "Verified success burst", caption: "Mint success is shown only after confirmation.", primary: "nft", target: "reward", effect: "burst", actorMood: "success" }
    ],
    stake: [
      { title: "NFT selected", caption: "Eligible vault NFT is selected.", primary: "nft", target: "vault", effect: "select", actorMood: "stake" },
      { title: "NFT moves into vault", caption: "Stake transfer enters the vault lane.", primary: "nft", target: "vault", effect: "lock", actorMood: "stake" },
      { title: "Vault locks", caption: "Position is locked after backend confirmation.", primary: "nft", target: "lock", effect: "lock", actorMood: "stake" },
      { title: "Rewards activate", caption: "Reward state activates after confirmed stake.", primary: "nft", target: "reward", effect: "burst", actorMood: "success" }
    ],
    unstake: [
      { title: "Vault unlocks", caption: "Position unlock begins from backend state.", primary: "lock", target: "vault", effect: "unlock", actorMood: "stake" },
      { title: "NFT exits", caption: "Vault NFT leaves the staked lane.", primary: "nft", target: "lock", effect: "exit", actorMood: "stake" },
      { title: "Ownership restored", caption: "Wallet ownership returns after confirmation.", primary: "nft", target: "tokenStack", effect: "exit", actorMood: "stake" },
      { title: "Success burst", caption: "Unstake success is shown only when confirmed.", primary: "nft", target: "reward", effect: "burst", actorMood: "success" }
    ],
    redeem: [
      { title: "NFT verified", caption: "Vault NFT and reserve proof are checked.", primary: "nft", target: "proof", effect: "scan", actorMood: "redeem" },
      { title: "NFT invalidates", caption: "Redeem path invalidates or burns the NFT.", primary: "nft", target: "lock", effect: "burn", actorMood: "redeem" },
      { title: "Tokens return", caption: "Backing returns to the wallet lane.", primary: "tokenStack", target: "token", effect: "exit", actorMood: "redeem" },
      { title: "Redeem confirmed", caption: "Redeem success appears after real confirmation.", primary: "tokenStack", target: "reward", effect: "burst", actorMood: "success" }
    ],
    proof: [
      { title: "Scan starts", caption: "Proof lookup loads the vault position.", primary: "nft", target: "scan", effect: "scan", actorMood: "proof" },
      { title: "Reserve and owner checks", caption: "Reserve, owner, and position checks run.", primary: "nft", target: "proof", effect: "check", actorMood: "proof" },
      { title: "Verification ring completes", caption: "Proof ring closes only after checks pass.", primary: "proof", target: "proof", effect: "check", actorMood: "proof" },
      { title: "Proof verified", caption: "Proof success is gated by real verification.", primary: "proof", target: "reward", effect: "burst", actorMood: "success" }
    ],
    community: [
      { title: "Token CA scanned", caption: "Token contract address enters the launch scanner.", primary: "token", target: "scan", effect: "scan", actorMood: "running" },
      { title: "Reserve vault created", caption: "Reserve vault is built from launch config.", primary: "token", target: "vault", effect: "lock", actorMood: "running" },
      { title: "Collection initialized", caption: "Collection account initializes after signing.", primary: "community", target: "vault", effect: "form", actorMood: "running" },
      { title: "Community launched", caption: "Launch success appears after confirmation.", primary: "community", target: "reward", effect: "burst", actorMood: "success" }
    ],
    raid: [
      { title: "Mission joined", caption: "Wallet joins a live mission room.", primary: "raid", target: "community", effect: "select", actorMood: "running" },
      { title: "Proof submitted", caption: "Proof enters manual or configured verification.", primary: "proof", target: "raid", effect: "submit", actorMood: "proof" },
      { title: "XP and reward burst", caption: "Approved participation unlocks XP and rewards.", primary: "reward", target: "raid", effect: "burst", actorMood: "success" },
      { title: "Raid success", caption: "Raid success appears only after backend approval.", primary: "raid", target: "reward", effect: "burst", actorMood: "success" }
    ],
    studio: [
      { title: "Prompt approved", caption: "Studio request enters the build queue.", primary: "layer", target: "scan", effect: "scan", actorMood: "loading" },
      { title: "Brand bible builds", caption: "Style bible and layer grammar are assembled.", primary: "layer", target: "community", effect: "form", actorMood: "loading" },
      { title: "Layer pack checks", caption: "Trait pack consistency is checked.", primary: "nft", target: "proof", effect: "check", actorMood: "proof" },
      { title: "Studio success", caption: "Studio assets are ready after provider result.", primary: "nft", target: "reward", effect: "burst", actorMood: "success" }
    ],
    reward: [
      { title: "Reward ready", caption: "Reward route reports pending value.", primary: "reward", target: "proof", effect: "select", actorMood: "running" },
      { title: "Eligibility checked", caption: "Wallet and mission eligibility are checked.", primary: "proof", target: "reward", effect: "check", actorMood: "proof" },
      { title: "Reward queued", caption: "Claim waits for payout confirmation.", primary: "reward", target: "vault", effect: "submit", actorMood: "running" },
      { title: "Reward confirmed", caption: "Reward success appears after backend approval.", primary: "reward", target: "reward", effect: "burst", actorMood: "success" }
    ],
    scan: [
      { title: "Scan starts", caption: "Token or vault input enters the scanner.", primary: "token", target: "scan", effect: "scan", actorMood: "proof" },
      { title: "Metadata checked", caption: "Metadata and ownership records are inspected.", primary: "token", target: "proof", effect: "check", actorMood: "proof" },
      { title: "Risk checked", caption: "Risk and availability gates are reviewed.", primary: "proof", target: "vault", effect: "check", actorMood: "warning" },
      { title: "Scan complete", caption: "Scan success appears after real results.", primary: "proof", target: "reward", effect: "burst", actorMood: "success" }
    ],
    layer: [
      { title: "Layer pack selected", caption: "Curated layer pack enters validation.", primary: "layer", target: "proof", effect: "select", actorMood: "loading" },
      { title: "Traits checked", caption: "Trait coverage and rarity spread are checked.", primary: "layer", target: "proof", effect: "check", actorMood: "proof" },
      { title: "Pack approved", caption: "Layer pack passes configured QA.", primary: "nft", target: "community", effect: "form", actorMood: "loading" },
      { title: "Ready burst", caption: "Layer pack success appears after approval.", primary: "nft", target: "reward", effect: "burst", actorMood: "success" }
    ]
  };
  return flows[mode];
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

function motionObjectAsset(kind: PhewMotionObjectKind, mode: PhewGameMomentMode, image?: string | null) {
  if (kind === "nft" && image) return image;
  if (kind === "token") return brandAssets.tokenObject;
  if (kind === "tokenStack") return brandAssets.tokenStack;
  if (kind === "nft") return brandAssets.nftSlot;
  if (kind === "vault") return brandAssets.vaultSafe;
  if (kind === "lock") return brandAssets.lockUnlock;
  if (kind === "proof" || kind === "scan") return kind === "proof" && mode === "raid" ? brandAssets.raid.proof : brandAssets.proofRing;
  if (kind === "reward") return mode === "raid" ? brandAssets.raid.xp : brandAssets.rewardBurst;
  if (kind === "community") return brandAssets.pictograms.community;
  if (kind === "layer") return brandAssets.tokenStack;
  if (kind === "raid") return brandAssets.raid.flag;
  return brandAssets.errorGlitch;
}

function objectLabel(kind: PhewMotionObjectKind, mode: PhewGameMomentMode) {
  if (kind === "token") return "token";
  if (kind === "tokenStack") return "tokens";
  if (kind === "nft") return "nft";
  if (kind === "vault") return "vault";
  if (kind === "lock") return "lock";
  if (kind === "proof" || kind === "scan") return "proof";
  if (kind === "reward") return mode === "raid" ? "xp" : "reward";
  if (kind === "community") return "community";
  if (kind === "layer") return "layers";
  if (kind === "raid") return "raid";
  return "error";
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
    mint: "Mint Game Flow",
    stake: "Stake Game Flow",
    unstake: "Unstake Game Flow",
    redeem: "Redeem Game Flow",
    proof: "Proof Game Flow",
    community: "Community Launch Flow",
    studio: "Studio Bible Flow",
    reward: "Reward Flow",
    scan: "Token Scan Flow",
    layer: "Layer Pack Flow",
    raid: "Raid Game Flow"
  };
  return labels[mode];
}
