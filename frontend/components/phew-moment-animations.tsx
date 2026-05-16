"use client";

import type { CSSProperties } from "react";
import { CheckCircle2, CircleAlert, LockKeyhole, PackageCheck, RadioTower, ShieldCheck, Sparkles, Undo2, WalletCards } from "lucide-react";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

export type PhewMomentState = "idle" | "loading" | "success" | "error";

export type PhewMomentProps = {
  state?: PhewMomentState;
  collectionImage?: string | null;
  tokenSymbol?: string | null;
  title?: string;
  className?: string;
  reducedMotion?: boolean;
};

type StoryStep = {
  title: string;
  caption: string;
  kind: "scan" | "transfer" | "validate" | "lock" | "success" | "reward" | "redeem" | "launch" | "studio";
};

const stakeSteps: StoryStep[] = [
  { title: "Stake initiated", caption: "You are staking your NFT", kind: "scan" },
  { title: "Transferring", caption: "Sending NFT to the vault", kind: "transfer" },
  { title: "Validating", caption: "Verifying ownership on-chain", kind: "validate" },
  { title: "Locking", caption: "Locking NFT in staking vault", kind: "lock" },
  { title: "Stake confirmed", caption: "Backend confirmed the stake", kind: "success" },
  { title: "Rewards active", caption: "Rewards can accrue from real positions", kind: "reward" }
];

const unstakeSteps: StoryStep[] = [
  { title: "Unstake initiated", caption: "Position selected", kind: "scan" },
  { title: "Unlocking", caption: "Opening staking vault", kind: "lock" },
  { title: "Validating", caption: "Checking staking position", kind: "validate" },
  { title: "Returning", caption: "Moving NFT back to wallet", kind: "transfer" },
  { title: "Unstake confirmed", caption: "Backend confirmed release", kind: "success" },
  { title: "Vault ready", caption: "NFT can be held or redeemed", kind: "redeem" }
];

const redeemSteps: StoryStep[] = [
  { title: "Redeem initiated", caption: "Eligible wallet NFT selected", kind: "scan" },
  { title: "Proof check", caption: "Reading vault proof", kind: "validate" },
  { title: "Build transaction", caption: "Backend builds redeem tx", kind: "transfer" },
  { title: "Wallet signature", caption: "Awaiting owner signature", kind: "lock" },
  { title: "Redeem confirmed", caption: "Tokens released by backend", kind: "success" },
  { title: "NFT closed", caption: "Redeem state is final", kind: "redeem" }
];

const mintSteps: StoryStep[] = [
  { title: "Terms validated", caption: "Amount and community checked", kind: "scan" },
  { title: "Tokens locked", caption: "Reserve position prepared", kind: "lock" },
  { title: "Mint built", caption: "Transaction returned by backend", kind: "transfer" },
  { title: "Wallet signed", caption: "Owner approved mint", kind: "validate" },
  { title: "Vault minted", caption: "NFT exists with proof", kind: "success" },
  { title: "Proof ready", caption: "Open reserve explorer", kind: "reward" }
];

const proofSteps: StoryStep[] = [
  { title: "Proof lookup", caption: "Vault mint loaded", kind: "scan" },
  { title: "Owner check", caption: "Owner proof inspected", kind: "validate" },
  { title: "Reserve check", caption: "Backing PDA inspected", kind: "lock" },
  { title: "Proof verified", caption: "No blocking issues returned", kind: "success" }
];

const communitySteps: StoryStep[] = [
  { title: "Token scan", caption: "CA metadata loaded", kind: "scan" },
  { title: "Access gate", caption: "Fee or holder access verified", kind: "validate" },
  { title: "Launch build", caption: "Collection transaction created", kind: "transfer" },
  { title: "Reserve live", caption: "Launch status confirmed", kind: "success" }
];

const studioSteps: StoryStep[] = [
  { title: "Prompt pack", caption: "Studio request approved", kind: "studio" },
  { title: "Cache check", caption: "Reuse existing outputs first", kind: "scan" },
  { title: "Provider run", caption: "Selected provider only", kind: "transfer" },
  { title: "Layer pack", caption: "Traits and bible returned", kind: "validate" },
  { title: "Studio Bible", caption: "Generated assets ready", kind: "success" }
];

const rewardSteps: StoryStep[] = [
  { title: "Claim requested", caption: "Real staking position selected", kind: "scan" },
  { title: "Reward read", caption: "Backend calculates claim", kind: "validate" },
  { title: "Claim confirmed", caption: "Result returned by backend", kind: "success" },
  { title: "Rewards updated", caption: "Refresh positions", kind: "reward" }
];

export function MintMomentAnimation(props: PhewMomentProps) {
  return <MomentStoryboard {...props} moment="mint" defaultTitle="Mint Vault NFT" steps={mintSteps} />;
}

export function StakeMomentAnimation(props: PhewMomentProps) {
  return <MomentStoryboard {...props} moment="stake" defaultTitle="Stake NFT" steps={stakeSteps} />;
}

export function UnstakeMomentAnimation(props: PhewMomentProps) {
  return <MomentStoryboard {...props} moment="unstake" defaultTitle="Unstake NFT" steps={unstakeSteps} />;
}

export function RedeemMomentAnimation(props: PhewMomentProps) {
  return <MomentStoryboard {...props} moment="redeem" defaultTitle="Redeem NFT" steps={redeemSteps} />;
}

export function ProofVerifiedAnimation(props: PhewMomentProps) {
  return <MomentStoryboard {...props} moment="proof" defaultTitle="Proof Verified" steps={proofSteps} />;
}

export function CommunityLaunchAnimation(props: PhewMomentProps) {
  return <MomentStoryboard {...props} moment="community" defaultTitle="Community Launch" steps={communitySteps} />;
}

export function StudioBibleAnimation(props: PhewMomentProps) {
  return <MomentStoryboard {...props} moment="studio" defaultTitle="Studio Bible Generated" steps={studioSteps} />;
}

export function RewardClaimAnimation(props: PhewMomentProps) {
  return <MomentStoryboard {...props} moment="reward" defaultTitle="Reward Claim" steps={rewardSteps} />;
}

function MomentStoryboard({
  state = "idle",
  collectionImage,
  tokenSymbol,
  title,
  className,
  reducedMotion,
  defaultTitle,
  steps,
  moment
}: PhewMomentProps & { defaultTitle: string; steps: StoryStep[]; moment: string }) {
  const activeIndex = getActiveIndex(state, steps.length);
  const statusLabel = state === "success" ? "Confirmed" : state === "error" ? "Action failed" : state === "loading" ? "Processing" : "Ready";
  return (
    <div className={cn("phew-storyboard", reducedMotion && "phew-reduced-motion", className)} data-state={state} data-moment={moment}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-vault-green">{tokenSymbol || "PHEW"} Protocol Moment</p>
          <h3 className="mt-1 text-lg font-black text-white">{title ?? defaultTitle}</h3>
        </div>
        <span className={cn("rounded-md border px-3 py-1 text-xs font-black uppercase", state === "success" && "border-vault-green/50 bg-vault-green/10 text-vault-green", state === "error" && "border-vault-red/50 bg-vault-red/10 text-vault-red", state === "loading" && "border-vault-cyan/50 bg-vault-cyan/10 text-vault-cyan", state === "idle" && "border-vault-line bg-black/30 text-slate-300")}>{statusLabel}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {steps.map((step, index) => (
          <StoryPanel
            key={`${step.title}-${index}`}
            step={step}
            index={index}
            total={steps.length}
            active={index === activeIndex}
            complete={state === "success" || index < activeIndex}
            state={state}
            collectionImage={collectionImage}
            tokenSymbol={tokenSymbol}
          />
        ))}
      </div>
    </div>
  );
}

function StoryPanel({
  step,
  index,
  total,
  active,
  complete,
  state,
  collectionImage,
  tokenSymbol
}: {
  step: StoryStep;
  index: number;
  total: number;
  active: boolean;
  complete: boolean;
  state: PhewMomentState;
  collectionImage?: string | null;
  tokenSymbol?: string | null;
}) {
  const Icon = stepIcon(step.kind, complete, state);
  return (
    <div className={cn("phew-story-panel", active && "phew-story-panel-active", complete && "phew-story-panel-complete", state === "error" && active && "phew-story-panel-error")}>
      <div className="relative z-10 flex min-h-[250px] flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-black uppercase text-white">{index + 1}. {step.title}</p>
            <p className="mt-1 max-w-[16rem] text-sm font-bold text-vault-green">{step.caption}</p>
          </div>
          <div className="grid size-10 shrink-0 place-items-center rounded-md border border-vault-green/35 bg-vault-green/10 text-vault-green">
            <Icon className={cn("size-5", active && state === "loading" && "animate-pulse")} />
          </div>
        </div>

        <div className="relative mt-5 flex flex-1 items-center justify-center">
          <MomentStage step={step} active={active} complete={complete} collectionImage={collectionImage} tokenSymbol={tokenSymbol} />
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {Array.from({ length: Math.min(total, 6) }, (_, dotIndex) => (
            <span key={dotIndex} className={cn("h-2 rounded-full border border-vault-green/35 bg-black/60", dotIndex <= index && "bg-vault-green shadow-green")} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MomentStage({ step, active, complete, collectionImage, tokenSymbol }: { step: StoryStep; active: boolean; complete: boolean; collectionImage?: string | null; tokenSymbol?: string | null }) {
  return (
    <div className={cn("phew-moment-stage", active && "phew-moment-stage-active", complete && "phew-moment-stage-complete")} data-kind={step.kind}>
      <span className="phew-stage-ring" />
      <img src={brandAssets.logo} alt="" className="phew-story-mascot" />
      <div className="phew-story-nft">
        {collectionImage ? (
          <img src={collectionImage} alt="" className="h-full w-full rounded-md object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center rounded-md bg-[radial-gradient(circle_at_50%_28%,rgba(186,255,0,0.24),rgba(0,0,0,0.9)_62%)]">
            <div className="text-center">
              <p className="text-4xl font-black text-vault-green">?</p>
              <p className="mt-1 text-[10px] font-black uppercase text-slate-400">{tokenSymbol || "NFT"}</p>
            </div>
          </div>
        )}
      </div>
      <div className="phew-story-object" data-kind={step.kind}>
        <StageObject kind={step.kind} />
      </div>
      <span className="phew-stage-beam" />
    </div>
  );
}

function StageObject({ kind }: { kind: StoryStep["kind"] }) {
  if (kind === "success") return <CheckCircle2 className="size-16 text-vault-green" />;
  if (kind === "reward") return <Sparkles className="size-14 text-vault-gold" />;
  if (kind === "validate") return <ShieldCheck className="size-14 text-vault-green" />;
  if (kind === "lock") return <LockKeyhole className="size-14 text-vault-green" />;
  if (kind === "redeem") return <Undo2 className="size-14 text-vault-cyan" />;
  if (kind === "launch") return <RadioTower className="size-14 text-vault-green" />;
  if (kind === "studio") return <PackageCheck className="size-14 text-vault-green" />;
  return <WalletCards className="size-14 text-vault-cyan" />;
}

function stepIcon(kind: StoryStep["kind"], complete: boolean, state: PhewMomentState) {
  if (state === "error") return CircleAlert;
  if (complete) return CheckCircle2;
  if (kind === "validate") return ShieldCheck;
  if (kind === "lock") return LockKeyhole;
  if (kind === "reward") return Sparkles;
  if (kind === "studio") return PackageCheck;
  return RadioTower;
}

function getActiveIndex(state: PhewMomentState, total: number) {
  if (state === "idle") return 0;
  if (state === "success") return total - 1;
  if (state === "error") return Math.max(0, total - 2);
  return Math.max(1, Math.min(total - 2, Math.ceil(total / 2)));
}

export function phewMomentStateFromTx(status?: string | null): PhewMomentState {
  if (!status) return "idle";
  const normalized = status.toLowerCase();
  if (["confirmed", "success", "complete", "completed", "redeemed", "staked", "unstaked"].some((item) => normalized.includes(item))) return "success";
  if (["fail", "error", "rejected", "skipped", "needs"].some((item) => normalized.includes(item))) return "error";
  if (["pending", "validating", "signing", "processing", "building", "loading", "submitting"].some((item) => normalized.includes(item))) return "loading";
  return "idle";
}

export function phewMomentStyle(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties;
}
