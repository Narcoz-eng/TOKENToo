"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, LockKeyhole, PackageCheck, RadioTower, ShieldCheck, Sparkles, Undo2, WalletCards } from "lucide-react";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CollectionCard } from "./CollectionCard";
import { TrustBadge } from "./protocol-trust";
import { TransactionFlow, type TransactionFlowMoment, type TransactionFlowState } from "./TransactionFlow";

type ShellStats = {
  collections?: number | null;
  nfts?: number | null;
  totalVaults?: number | null;
  tvlUsd?: number | null;
};

export function PhewShell({ children, active, stats }: { children: ReactNode; active: string; stats?: ShellStats }) {
  return (
    <div className="phew-app-bg min-h-screen bg-vault-radial text-white">
      <Sidebar active={active} stats={stats} />
      <div className="relative min-h-screen lg:pl-56">
        <TopBar />
        <main className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}

export function PhewWorkspace({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-5", className)}>{children}</div>;
}

export function PhewSidebar(props: Parameters<typeof Sidebar>[0]) {
  return <Sidebar {...props} />;
}

export function PhewTopbar() {
  return <TopBar />;
}

export function PhewCard({
  children,
  className,
  title,
  action,
  id
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={cn("phew-panel relative rounded-lg p-4", className)}>
      {(title || action) ? (
        <div className="relative mb-4 flex items-center justify-between gap-4">
          {title ? <h2 className="text-sm font-black uppercase text-white">{title}</h2> : <div />}
          {action}
        </div>
      ) : null}
      <div className="relative">{children}</div>
    </section>
  );
}

type PhewButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon;
  loading?: boolean;
  success?: boolean;
  tone?: "primary" | "outline" | "ghost" | "gold" | "danger";
};

export function PhewButton({ children, className, icon: Icon, loading, success, tone = "primary", disabled, ...props }: PhewButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(buttonClassName(tone, success), "disabled:cursor-not-allowed disabled:opacity-50", className)}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className="size-4" /> : null}
      <span>{children}</span>
    </button>
  );
}

export function PhewLinkButton({
  href,
  children,
  className,
  icon: Icon,
  tone = "primary",
  success,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; icon?: LucideIcon; tone?: PhewButtonProps["tone"]; success?: boolean }) {
  return (
    <Link href={href} className={cn(buttonClassName(tone, success), className)} {...props}>
      {Icon ? <Icon className="size-4" /> : null}
      <span>{children}</span>
    </Link>
  );
}

function buttonClassName(tone: PhewButtonProps["tone"], success?: boolean) {
  return cn(
    "phew-button inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-black transition",
    tone === "primary" && "phew-button-primary text-black",
    tone === "outline" && "border border-vault-green/50 bg-vault-green/10 text-vault-green hover:bg-vault-green/15",
    tone === "ghost" && "border border-vault-line bg-black/35 text-slate-100 hover:border-vault-cyan/60 hover:text-vault-cyan",
    tone === "gold" && "border border-vault-gold/55 bg-vault-gold/10 text-vault-gold hover:bg-vault-gold/15",
    tone === "danger" && "border border-vault-red/55 bg-vault-red/10 text-vault-red hover:bg-vault-red/15",
    success && "phew-success-pop"
  );
}

export function PhewStat({
  icon: Icon,
  label,
  value,
  detail,
  accent = "green",
  className
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  accent?: "green" | "cyan" | "gold" | "red";
  className?: string;
}) {
  const tone = {
    green: "bg-vault-green/10 text-vault-green",
    cyan: "bg-vault-cyan/10 text-vault-cyan",
    gold: "bg-vault-gold/10 text-vault-gold",
    red: "bg-vault-red/10 text-vault-red"
  }[accent];
  return (
    <div className={cn("phew-panel phew-card-hover relative overflow-hidden rounded-lg p-4", className)}>
      <div className="relative flex min-w-0 items-center gap-4">
        {Icon ? (
          <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-md border border-current/20", tone)}>
            <Icon className="size-6" />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
          <p className="mt-1 break-words text-xl font-black text-white">{value}</p>
          {detail ? <p className="mt-1 text-xs font-semibold text-slate-400">{detail}</p> : null}
        </div>
      </div>
    </div>
  );
}

export const PhewStatCard = PhewStat;
export const PhewTrustBadge = TrustBadge;
export const PhewCollectionCard = CollectionCard;

type PhewStatusTone = "idle" | "loading" | "success" | "error" | "warning";

export function PhewStatusBadge({ children, status = "idle" }: { children: ReactNode; status?: PhewStatusTone }) {
  const styles = {
    idle: "border-vault-line bg-black/30 text-slate-300",
    loading: "border-vault-cyan/50 bg-vault-cyan/10 text-vault-cyan",
    success: "border-vault-green/50 bg-vault-green/10 text-vault-green",
    error: "border-vault-red/50 bg-vault-red/10 text-vault-red",
    warning: "border-vault-gold/50 bg-vault-gold/10 text-vault-gold"
  }[status];
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-black uppercase", styles)}>{children}</span>;
}

export function PhewBadge({ children, tone = "idle", className }: { children: ReactNode; tone?: PhewStatusTone; className?: string }) {
  const styles = {
    idle: "border-vault-line bg-black/30 text-slate-300",
    loading: "border-vault-cyan/50 bg-vault-cyan/10 text-vault-cyan",
    success: "border-vault-green/50 bg-vault-green/10 text-vault-green",
    error: "border-vault-red/50 bg-vault-red/10 text-vault-red",
    warning: "border-vault-gold/50 bg-vault-gold/10 text-vault-gold"
  }[tone];
  return <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-black uppercase", styles, className)}>{children}</span>;
}

export function PhewStatus({
  label,
  value,
  tone = "idle",
  detail,
  className
}: {
  label: string;
  value: ReactNode;
  tone?: PhewStatusTone;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-vault-line bg-black/25 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
          <p className="mt-1 break-words text-sm font-black text-white">{value}</p>
        </div>
        <PhewBadge tone={tone}>{tone}</PhewBadge>
      </div>
      {detail ? <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p> : null}
    </div>
  );
}

export function PhewStepper({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  return (
    <div className="grid gap-2 md:grid-cols-[repeat(var(--step-count),minmax(0,1fr))]" style={{ "--step-count": steps.length } as CSSProperties}>
      {steps.map((step, index) => {
        const complete = index < activeIndex;
        const active = index === activeIndex;
        return (
          <div
            key={step}
            className={cn(
              "rounded-md border px-3 py-3 text-sm font-black transition",
              complete && "border-vault-green/60 bg-vault-green/12 text-vault-green",
              active && "border-vault-cyan/70 bg-vault-cyan/12 text-vault-cyan shadow-glow",
              !complete && !active && "border-vault-line bg-black/35 text-slate-500"
            )}
          >
            <span className="mr-2 text-xs">{String(index + 1).padStart(2, "0")}</span>
            {step}
          </div>
        );
      })}
    </div>
  );
}

export function PhewActionPanel({
  title,
  description,
  children,
  status = "idle",
  className
}: {
  title: string;
  description?: string;
  children: ReactNode;
  status?: "idle" | "loading" | "success" | "error" | "warning";
  className?: string;
}) {
  const Icon = status === "loading" ? Loader2 : status === "success" ? CheckCircle2 : status === "error" ? AlertTriangle : status === "warning" ? Clock3 : RadioTower;
  return (
    <PhewCard className={cn("p-5", className)}>
      <div className="mb-4 flex items-start gap-3">
        <div className={cn("grid size-10 shrink-0 place-items-center rounded-md border", status === "success" ? "border-vault-green/40 bg-vault-green/10 text-vault-green" : status === "error" ? "border-vault-red/40 bg-vault-red/10 text-vault-red" : status === "warning" ? "border-vault-gold/40 bg-vault-gold/10 text-vault-gold" : "border-vault-cyan/35 bg-vault-cyan/10 text-vault-cyan")}>
          <Icon className={cn("size-5", status === "loading" && "animate-spin")} />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase text-white">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p> : null}
        </div>
      </div>
      {children}
    </PhewCard>
  );
}

export function PhewStepPanel({
  step,
  title,
  description,
  status = "idle",
  children,
  action,
  className
}: {
  step: number | string;
  title: string;
  description?: string;
  status?: PhewStatusTone;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <PhewCard className={cn("p-4", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border text-sm font-black", status === "success" ? "border-vault-green bg-vault-green/15 text-vault-green" : status === "error" ? "border-vault-red bg-vault-red/15 text-vault-red" : status === "loading" ? "border-vault-cyan bg-vault-cyan/15 text-vault-cyan" : "border-vault-green/45 bg-black/35 text-vault-green")}>
            {step}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-black uppercase text-white">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-5 text-slate-400">{description}</p> : null}
          </div>
        </div>
        {action ?? <PhewBadge tone={status}>{status}</PhewBadge>}
      </div>
      {children ? <div>{children}</div> : null}
    </PhewCard>
  );
}

export function PhewStatusPanel({
  title,
  rows,
  className,
  action
}: {
  title?: string;
  rows: Array<{ label: string; value: ReactNode; tone?: PhewStatusTone; detail?: ReactNode }>;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <PhewCard title={title} action={action} className={className}>
      <div className="grid gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex min-w-0 items-start justify-between gap-4 rounded-md border border-vault-line bg-black/25 p-3 text-sm">
            <div className="min-w-0">
              <p className="text-xs uppercase text-slate-500">{row.label}</p>
              {row.detail ? <p className="mt-1 text-xs leading-5 text-slate-400">{row.detail}</p> : null}
            </div>
            <div className="min-w-0 text-right">
              <p className="break-words font-black text-white">{row.value}</p>
              {row.tone ? <PhewBadge tone={row.tone} className="mt-2">{row.tone}</PhewBadge> : null}
            </div>
          </div>
        ))}
      </div>
    </PhewCard>
  );
}

export function PhewTrustPanel({
  title = "Protocol Trust",
  rows,
  className
}: {
  title?: string;
  rows: Array<{ label: string; ok?: boolean | null; detail?: ReactNode }>;
  className?: string;
}) {
  return (
    <PhewCard title={title} className={className}>
      <div className="grid gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 rounded-md border border-vault-line bg-black/25 p-3 text-sm">
            <span className="text-slate-300">{row.label}</span>
            <span className={row.ok ? "text-vault-green" : row.ok === false ? "text-vault-red" : "text-vault-gold"}>{row.ok ? "Verified" : row.ok === false ? "Blocked" : "N/A"}</span>
          </div>
        ))}
      </div>
    </PhewCard>
  );
}

export function PhewActionCard({
  title,
  description,
  children,
  locked,
  status = "idle",
  className
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  locked?: boolean;
  status?: PhewStatusTone;
  className?: string;
}) {
  return (
    <PhewActionPanel title={title} description={description} status={locked ? "warning" : status} className={className}>
      {locked ? <p className="mb-3 rounded-md border border-vault-line bg-black/30 p-3 text-sm text-slate-400">Action locked until required backend checks pass.</p> : null}
      {children}
    </PhewActionPanel>
  );
}

export function PhewMascotActor({
  pose = "run",
  className,
  label = "Phew mascot"
}: {
  pose?: "run" | "point" | "guide" | "success" | "error";
  className?: string;
  label?: string;
}) {
  return <img src={brandAssets.mascotPoses[pose]} alt={label} data-pose={pose} className={cn("object-contain drop-shadow-[0_0_26px_rgba(186,255,0,0.42)]", className)} />;
}

export function PhewNftSlot({
  image,
  tokenSymbol,
  label = "Vault NFT",
  className
}: {
  image?: string | null;
  tokenSymbol?: string | null;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-vault-green/35 bg-black/60 p-2", className)}>
      {image ? <img src={image} alt="" className="aspect-[4/5] w-full rounded-md object-cover" /> : <img src={brandAssets.nftSlot} alt="" className="aspect-[4/5] w-full rounded-md object-contain p-1" />}
      <div className="absolute inset-x-3 bottom-3 rounded-md border border-vault-green/35 bg-black/70 px-2 py-1 text-center">
        <p className="truncate text-[10px] font-black uppercase text-vault-green">{tokenSymbol || label}</p>
      </div>
    </div>
  );
}

export function PhewProofRing({
  state = "idle",
  className
}: {
  state?: "idle" | "loading" | "success" | "error";
  className?: string;
}) {
  return (
    <div className={cn("phew-proof-ring relative grid aspect-square place-items-center rounded-full border bg-black/35", state === "success" ? "border-vault-green text-vault-green shadow-green" : state === "error" ? "border-vault-red text-vault-red" : state === "loading" ? "border-vault-cyan text-vault-cyan" : "border-vault-line text-slate-400", className)} data-state={state}>
      <img src={state === "error" ? brandAssets.redeemParticles : brandAssets.proofRing} alt="" className="h-3/4 w-3/4 object-contain" />
    </div>
  );
}

export function PhewTransactionScene(props: {
  state: TransactionFlowState;
  title: string;
  description?: string;
  tokenSymbol?: string | null;
  image?: string | null;
  detail?: string | null;
  className?: string;
  compact?: boolean;
  moment?: TransactionFlowMoment;
}) {
  return <TransactionFlow {...props} />;
}

export function PhewLoadingState({ title = "Loading backend state", detail }: { title?: string; detail?: string }) {
  return (
    <PhewCard>
      <div className="phew-loading-stage relative min-h-48 overflow-hidden rounded-lg">
        <img src={brandAssets.motionCore} alt="" className="phew-motion-image absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 grid-mask opacity-30" />
        <div className="relative grid min-h-48 place-items-center p-6 text-center">
          <PhewProofRing state="loading" className="mb-4 size-24" />
          <p className="font-black text-white">{title}</p>
          {detail ? <p className="mt-2 max-w-md text-sm text-slate-400">{detail}</p> : null}
        </div>
      </div>
    </PhewCard>
  );
}

export function PhewErrorState({ title = "Action failed", message, action }: { title?: string; message: ReactNode; action?: ReactNode }) {
  return (
    <PhewCard className="border-vault-red/45 bg-vault-red/10">
      <div className="flex items-start gap-4">
        <PhewProofRing state="error" className="size-20 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-lg font-black text-vault-red">{title}</h2>
          <div className="mt-2 break-words text-sm leading-6 text-slate-300">{message}</div>
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </PhewCard>
  );
}

export function PhewEmptyState({
  title,
  body,
  action,
  image = brandAssets.mascot,
  className
}: {
  title: string;
  body: string;
  action?: ReactNode;
  image?: string;
  className?: string;
}) {
  return (
    <PhewCard className={cn("p-5", className)}>
      <div className="grid gap-5 md:grid-cols-[150px_minmax(0,1fr)] md:items-center">
        <div className="relative mx-auto size-36 overflow-visible rounded-lg border border-dashed border-vault-green/35 bg-vault-green/5">
          <img src={image} alt="" className="absolute inset-0 h-full w-full scale-110 object-contain p-2 drop-shadow-[0_0_24px_rgba(186,255,0,0.22)]" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{body}</p>
          {action ? <div className="mt-5">{action}</div> : null}
        </div>
      </div>
    </PhewCard>
  );
}

export function PhewVaultCard({
  image,
  title,
  tokenSymbol,
  status,
  rows,
  className
}: {
  image?: string | null;
  title: string;
  tokenSymbol?: string | null;
  status?: ReactNode;
  rows?: Array<{ label: string; value: ReactNode }>;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-vault-green/30 bg-black/45 p-4 shadow-green", className)}>
      <div className="relative overflow-hidden rounded-lg border border-vault-line bg-black/40">
        {image ? (
          <img src={image} alt="" className="aspect-[4/5] w-full object-cover" />
        ) : (
          <GenericVaultArt tokenSymbol={tokenSymbol} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          {status ? <div className="mb-2">{status}</div> : null}
          <p className="break-words text-xl font-black text-white">{title}</p>
          {tokenSymbol ? <p className="mt-1 text-xs font-black uppercase text-vault-green">{tokenSymbol}</p> : null}
        </div>
      </div>
      {rows?.length ? (
        <div className="mt-4 grid gap-2">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 border-b border-vault-line py-2 text-sm last:border-0">
              <span className="text-slate-400">{row.label}</span>
              <span className="min-w-0 break-words text-right font-semibold text-white">{row.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PhewProofPanel({
  title = "Proof",
  rows,
  verified
}: {
  title?: string;
  rows: Array<{ label: string; value: ReactNode; ok?: boolean | null }>;
  verified?: boolean;
}) {
  return (
    <PhewCard title={title}>
      <div className="mb-4 flex flex-wrap gap-2">
        <PhewStatusBadge status={verified ? "success" : "warning"}>{verified ? "Proof verified" : "Verification pending"}</PhewStatusBadge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0 rounded-lg border border-vault-line bg-black/25 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase text-slate-500">{row.label}</p>
              {row.ok !== undefined && row.ok !== null ? <ShieldCheck className={cn("size-4", row.ok ? "text-vault-green" : "text-vault-gold")} /> : null}
            </div>
            <p className="mt-2 break-words text-sm font-bold text-white">{row.value}</p>
          </div>
        ))}
      </div>
    </PhewCard>
  );
}

export const VaultCard = PhewVaultCard;
export const ProofPanel = PhewProofPanel;

export type PhewAnimationState = "idle" | "loading" | "success" | "error";
export type PhewAnimationMoment = "mint" | "stake" | "unstake" | "redeem" | "proof" | "community" | "community-launch" | "studio" | "studio-bible" | "reward" | "scan" | "layer";

export function PhewAnimationFrame({
  moment,
  state = "idle",
  tokenSymbol,
  collectionImage,
  title,
  subtitle,
  reducedMotion,
  className
}: {
  moment: PhewAnimationMoment;
  state?: PhewAnimationState;
  tokenSymbol?: string | null;
  collectionImage?: string | null;
  title?: string;
  subtitle?: string;
  reducedMotion?: boolean;
  className?: string;
}) {
  const visualMoment = normalizeAnimationMoment(moment);
  const active = state === "loading" || state === "success";
  const frameClass = cn(
    "phew-coded-moment relative isolate min-h-[260px] min-w-0 w-full max-w-full overflow-hidden rounded-lg border border-vault-line bg-black/40",
    `phew-moment-${visualMoment}`,
    state === "success" && "phew-moment-success",
    state === "error" && "phew-moment-error",
    reducedMotion && "phew-reduced-motion",
    className
  );

  return (
    <div className={frameClass} data-state={state} data-active={active}>
      <img src={brandAssets.motionCore} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen motion-reduce:animate-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(186,255,0,0.18),transparent_32%),linear-gradient(180deg,rgba(2,8,6,0.18),rgba(2,8,6,0.92))]" />
      <div className="absolute inset-0 grid-mask opacity-25" />
      <span className="phew-moment-orbit absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-vault-cyan/30 motion-reduce:animate-none" />
      <span className="phew-moment-orbit absolute left-1/2 top-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-vault-green/35 motion-reduce:animate-none" style={{ animationDelay: "220ms" }} />
      <span className="phew-coded-beam" />
      <img src={state === "success" ? brandAssets.mascotPoses.success : state === "error" ? brandAssets.mascotPoses.error : brandAssets.mascotPoses.run} alt="" className="phew-coded-mascot" />
      <div className="phew-moment-card absolute left-1/2 top-1/2 w-32 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-vault-green/50 bg-black/75 p-2 shadow-green motion-reduce:animate-none sm:w-36">
        {collectionImage ? (
          <img src={collectionImage} alt="" className="aspect-[4/5] w-full rounded-md object-cover" />
        ) : (
          <PhewNftSlot tokenSymbol={tokenSymbol} className="border-0 bg-transparent p-0" />
        )}
      </div>
      <div className="phew-coded-object">
        <img src={momentObjectAsset(visualMoment, state)} alt="" className="size-14 object-contain" />
      </div>
      <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-3">
        <div className="rounded-md border border-vault-line bg-black/55 px-3 py-2 backdrop-blur">
          <p className="text-xs font-black uppercase text-vault-green">{title ?? momentTitle(visualMoment)}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle ?? stateLabel(state)}</p>
        </div>
        <PhewStatusBadge status={state === "success" ? "success" : state === "error" ? "error" : state === "loading" ? "loading" : "idle"}>
          {state}
        </PhewStatusBadge>
      </div>
      {active ? <MomentParticles moment={visualMoment} /> : null}
    </div>
  );
}

export function PhewAnimationStage(props: Parameters<typeof PhewAnimationFrame>[0]) {
  return <PhewAnimationFrame {...props} />;
}

function MomentParticles({ moment }: { moment: PhewAnimationMoment }) {
  const count = moment === "proof" || moment === "studio" ? 18 : 12;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-inherit">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="phew-particle motion-reduce:animate-none" style={{ "--i": index, "--count": count } as CSSProperties} />
      ))}
    </div>
  );
}

function GenericVaultArt({ tokenSymbol, compact = false }: { tokenSymbol?: string | null; compact?: boolean }) {
  return (
    <div className={cn("grid aspect-[4/5] w-full place-items-center rounded-md border border-vault-green/35 bg-[radial-gradient(circle_at_50%_25%,rgba(186,255,0,0.25),rgba(3,9,11,0.92)_50%,rgba(0,0,0,0.98))]", compact ? "p-2" : "p-4")}>
      <div className="text-center">
        <img src={brandAssets.nftSlot} alt="" className={cn("mx-auto object-contain drop-shadow-[0_0_20px_rgba(186,255,0,0.38)]", compact ? "size-16" : "size-24")} />
        <p className="mt-3 text-sm font-black text-vault-green">{tokenSymbol || "PHEW"}</p>
        <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">Vault NFT</p>
      </div>
    </div>
  );
}

function momentObjectAsset(moment: ReturnType<typeof normalizeAnimationMoment>, state: PhewAnimationState) {
  if (state === "error") return brandAssets.errorGlitch;
  if (state === "success") return brandAssets.proofRing;
  return brandAssets.transactionObjects[moment];
}

function MomentGlyph({ moment, state }: { moment: ReturnType<typeof normalizeAnimationMoment>; state: PhewAnimationState }) {
  if (state === "success") return <CheckCircle2 className="size-10 text-vault-green" />;
  if (state === "error") return <AlertTriangle className="size-10 text-vault-red" />;
  if (moment === "stake") return <LockKeyhole className="size-10 text-vault-green" />;
  if (moment === "unstake" || moment === "redeem") return <Undo2 className="size-10 text-vault-cyan" />;
  if (moment === "proof") return <ShieldCheck className="size-10 text-vault-green" />;
  if (moment === "community" || moment === "scan") return <RadioTower className="size-10 text-vault-cyan" />;
  if (moment === "studio" || moment === "layer") return <PackageCheck className="size-10 text-vault-green" />;
  if (moment === "reward") return <Sparkles className="size-10 text-vault-gold" />;
  return <WalletCards className="size-10 text-vault-green" />;
}

function normalizeAnimationMoment(moment: PhewAnimationMoment) {
  if (moment === "community-launch") return "community";
  if (moment === "studio-bible") return "studio";
  return moment;
}

function momentTitle(moment: ReturnType<typeof normalizeAnimationMoment>) {
  const labels: Record<ReturnType<typeof normalizeAnimationMoment>, string> = {
    mint: "Mint Vault NFT",
    stake: "Stake NFT",
    unstake: "Unstake NFT",
    redeem: "Redeem NFT",
    proof: "Proof Verified",
    community: "Community Launch",
    studio: "Studio Bible Generated",
    reward: "Reward Claim",
    scan: "Token Scan",
    layer: "Layer Pack Approved"
  };
  return labels[moment];
}

function stateLabel(state: PhewAnimationState) {
  if (state === "loading") return "Awaiting backend confirmation";
  if (state === "success") return "Confirmed by backend state";
  if (state === "error") return "Action failed";
  return "Ready when data is available";
}
