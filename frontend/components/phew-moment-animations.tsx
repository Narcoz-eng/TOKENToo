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

export function ProofVerifiedAnimation(props: PhewMomentProps) {
  return <MomentStoryboard {...props} moment="proof" defaultTitle="Proof Verified" steps={proofSteps} />;
}

export function CommunityLaunchAnimation(props: PhewMomentProps) {
  return <MomentStoryboard {...props} moment="community" defaultTitle="Community Launch" steps={communitySteps} />;
}

export function StudioBibleAnimation(props: PhewMomentProps) {
  return <MomentStoryboard {...props} moment="studio" defaultTitle="Studio Bible Generated" steps={studioSteps} />;
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

export function phewMomentStyle(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties;
}
