"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  LockKeyhole,
  LucideIcon,
  RefreshCcw,
  Search,
  Wallet
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PhewEmptyState } from "@/components/PhewEmptyState";
import { PhewPageHero, type PhewHeroMascotPose } from "@/components/PhewPageHero";
import { PhewMascot, type PhewMascotMood } from "@/components/PhewMascot";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

export type ReferenceTone = "green" | "cyan" | "gold" | "red" | "muted";
type ReferenceMascotPose = PhewHeroMascotPose | "run" | "point" | "guide";

export function ReferenceShell({
  active,
  stats,
  children,
  className
}: {
  active: string;
  stats?: { collections?: number | null; nfts?: number | null; totalVaults?: number | null; tvlUsd?: number | null };
  children: ReactNode;
  className?: string;
}) {
  return (
    <AppShell active={active} stats={stats}>
      <div className={cn("reference-page space-y-4", className)}>{children}</div>
    </AppShell>
  );
}

export function ReferenceHeader({
  eyebrow,
  title,
  subtitle,
  mascot = false,
  mascotPose = "running",
  mascotClassName,
  actions,
  aside,
  warning,
  heroAsset,
  className
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  mascot?: boolean;
  mascotPose?: ReferenceMascotPose;
  mascotClassName?: string;
  actions?: ReactNode;
  aside?: ReactNode;
  warning?: ReactNode;
  heroAsset?: string | null;
  className?: string;
}) {
  const referenceHero = heroAsset ?? referenceHeroAsset(title, mascotPose);

  return (
    <PhewPageHero
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      actions={actions}
      mascotPose={heroPoseFromReferencePose(mascotPose)}
      mascotClassName={mascotClassName}
      backgroundAsset={referenceHero}
      visualAsset={referenceHero}
      visualMode="banner"
      heroSize="large"
      sidePanel={aside}
      warning={warning}
      className={className}
    />
  );
}

export function ReferencePanel({
  title,
  subtitle,
  action,
  children,
  className
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("ref-panel p-4", className)}>
      {title || subtitle || action ? (
        <div className="mb-3 flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            {title ? <h2 className="text-base font-black leading-tight text-white">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function ReferenceMetric({
  label,
  value,
  icon: Icon,
  asset,
  tone = "green",
  detail,
  className
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  asset?: string;
  tone?: ReferenceTone;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ref-metric min-w-0", toneClass(tone), className)}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-slate-400">{label}</p>
          <p className="mt-1 break-words text-xl font-black leading-tight text-white">{value}</p>
          {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
        </div>
        {asset ? <img src={asset} alt="" className="size-8 shrink-0 object-contain" /> : Icon ? <Icon className="size-6 shrink-0" /> : null}
      </div>
    </div>
  );
}

export function ReferenceBadge({ children, tone = "muted", className }: { children: ReactNode; tone?: ReferenceTone; className?: string }) {
  return <span className={cn("ref-badge", toneClass(tone), className)}>{children}</span>;
}

export function ReferenceButton({
  href,
  children,
  icon: Icon,
  asset,
  tone = "primary",
  disabled,
  onClick,
  className,
  type = "button"
}: {
  href?: string;
  children: ReactNode;
  icon?: LucideIcon;
  asset?: string;
  tone?: "primary" | "outline" | "ghost" | "danger";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
}) {
  const body = (
    <>
      {asset ? <img src={asset} alt="" className="size-4 shrink-0 object-contain" /> : Icon ? <Icon className="size-4 shrink-0" /> : null}
      <span className="truncate">{children}</span>
    </>
  );
  const classes = cn(
    "ref-button",
    tone === "primary" && "ref-button-primary",
    tone === "outline" && "ref-button-outline",
    tone === "ghost" && "ref-button-ghost",
    tone === "danger" && "ref-button-danger",
    disabled && "pointer-events-none opacity-50",
    className
  );
  if (href && !disabled) return <Link href={href} className={classes}>{body}</Link>;
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {body}
    </button>
  );
}

export function ReferenceInput({
  value,
  onChange,
  placeholder,
  disabled,
  right,
  className,
  type = "text"
}: {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  right?: ReactNode;
  className?: string;
  type?: string;
}) {
  return (
    <label className={cn("ref-input-wrap", className)}>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="ref-input"
      />
      {right ? <span className="ref-input-right">{right}</span> : null}
    </label>
  );
}

export function ReferenceRows({ rows, className }: { rows: Array<{ label: ReactNode; value: ReactNode; tone?: ReferenceTone; detail?: ReactNode }>; className?: string }) {
  return (
    <div className={cn("divide-y divide-vault-line/70 overflow-hidden rounded-md border border-vault-line bg-black/20", className)}>
      {rows.map((row, index) => (
        <div key={index} className="flex min-w-0 items-start justify-between gap-4 px-3 py-2.5 text-sm">
          <div className="min-w-0">
            <p className="text-slate-400">{row.label}</p>
            {row.detail ? <p className="mt-1 text-xs text-slate-500">{row.detail}</p> : null}
          </div>
          <span className={cn("min-w-0 break-words text-right font-semibold text-white", row.tone && toneTextClass(row.tone))}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ReferenceEmpty({
  title,
  body,
  action,
  mascot,
  mascotMood = "loading",
  object,
  className
}: {
  title: ReactNode;
  body: ReactNode;
  action?: ReactNode;
  mascot?: boolean;
  mascotMood?: PhewMascotMood;
  object?: string;
  className?: string;
}) {
  return (
    <PhewEmptyState
      title={title}
      body={body}
      action={action}
      mascotPose={mascotMood}
      object={mascot ? undefined : object}
      table
      className={className}
    />
  );
}

export function ReferenceStepper({ steps, activeIndex = 0, className }: { steps: string[]; activeIndex?: number; className?: string }) {
  return (
    <div className={cn("ref-stepper", className)}>
      {steps.map((step, index) => {
        const active = index === activeIndex;
        const complete = index < activeIndex;
        return (
          <div key={step} className={cn("ref-step", active && "is-active", complete && "is-complete")}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </div>
        );
      })}
    </div>
  );
}

export function ReferenceProgressDots({ count = 5, activeIndex = 0, className }: { count?: number; activeIndex?: number; className?: string }) {
  return (
    <div className={cn("ref-progress-dots", className)}>
      {Array.from({ length: count }, (_, index) => <span key={index} className={cn(index <= activeIndex && "is-active", index === activeIndex && "is-current")} />)}
    </div>
  );
}

export function ReferenceTable({
  columns,
  rows,
  empty,
  className
}: {
  columns: string[];
  rows: ReactNode[][];
  empty?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-vault-line bg-black/20", className)}>
      <div className="min-w-full overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-vault-line text-xs text-slate-400">
            <tr>
              {columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-3 font-semibold">{column}</th>)}
            </tr>
          </thead>
          {rows.length ? (
            <tbody className="divide-y divide-vault-line/80">
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="bg-black/10">
                  {row.map((cell, index) => <td key={index} className="min-w-0 whitespace-nowrap px-3 py-3 align-middle text-slate-200">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          ) : null}
        </table>
      </div>
      {!rows.length && empty ? <div className="p-3">{empty}</div> : null}
    </div>
  );
}

export function WalletRequiredBanner({ action }: { action?: ReactNode }) {
  return (
    <div className="ref-state-banner ref-state-wallet">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="ref-state-mascot">
            <PhewMascot mood="idle" size="sm" alt="" />
          </span>
          <div className="min-w-0">
            <p className="font-black text-white">Wallet required</p>
            <p className="text-sm text-slate-400">Connect your wallet to view wallet-specific vaults and enable actions.</p>
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}

export function BackendUnavailableBanner({ message, retry }: { message?: ReactNode; retry?: () => void }) {
  return (
    <div className="ref-state-banner ref-state-backend">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="ref-state-mascot ref-state-mascot-error">
            <PhewMascot mood="warning" size="sm" alt="" />
          </span>
          <div>
            <p className="font-black text-vault-red">Backend unavailable</p>
            <p className="text-sm text-slate-300">{message ?? "Live API data could not be loaded. N/A state is preserved."}</p>
          </div>
        </div>
        {retry ? <ReferenceButton icon={RefreshCcw} tone="danger" onClick={retry}>Retry</ReferenceButton> : null}
      </div>
    </div>
  );
}

export function SearchControl({ value, onChange, placeholder = "Search collections, tokens, wallets..." }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <ReferenceInput
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      right={<Search className="size-4 text-slate-400" />}
    />
  );
}

export function ExternalAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-vault-green hover:text-white">
      {children}
      <ExternalLink className="size-3.5" />
    </Link>
  );
}

export function LockedButton({ children }: { children: ReactNode }) {
  return <ReferenceButton icon={LockKeyhole} tone="ghost" disabled>{children}</ReferenceButton>;
}

export function CheckRow({ label, ok, pendingLabel = "N/A" }: { label: ReactNode; ok?: boolean | null; pendingLabel?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-vault-line py-2.5 text-sm last:border-0">
      <span className="text-slate-300">{label}</span>
      <span className={ok ? "text-vault-green" : ok === false ? "text-vault-red" : "text-vault-gold"}>
        {ok ? <CheckCircle2 className="mr-1 inline size-4 align-[-3px]" /> : ok === false ? <AlertTriangle className="mr-1 inline size-4 align-[-3px]" /> : <Circle className="mr-1 inline size-3 align-[-1px]" />}
        {ok ? "Verified" : ok === false ? "Blocked" : pendingLabel}
      </span>
    </div>
  );
}

export function WalletButtonProxy({ children }: { children?: ReactNode }) {
  return (
    <ReferenceButton icon={Wallet} tone="primary">
      {children ?? "Connect Wallet"}
    </ReferenceButton>
  );
}

export function na(value: unknown): string {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "number" && Number.isFinite(value)) return value.toLocaleString();
  return String(value);
}

export function shortAddress(value?: string | null, size = 6): string {
  if (!value) return "N/A";
  return value.length > size * 2 + 3 ? `${value.slice(0, size)}...${value.slice(-size)}` : value;
}

function heroPoseFromReferencePose(pose: ReferenceMascotPose): PhewHeroMascotPose {
  if (pose === "run") return "running";
  if (pose === "point" || pose === "guide") return "loading";
  return pose;
}

function referenceHeroAsset(title: ReactNode, pose: ReferenceMascotPose) {
  const label = typeof title === "string" ? title.toLowerCase() : "";
  if (label.includes("collection")) return brandAssets.pageHeroes.collections;
  if (label.includes("staking") || pose === "stake") return brandAssets.pageHeroes.staking;
  if (label.includes("redeem") || pose === "redeem") return brandAssets.pageHeroes.redeem;
  if (label.includes("proof") || pose === "explorer") return brandAssets.pageHeroes.proof;
  if (label.includes("setup")) return brandAssets.pageHeroes.adminRisk;
  if (label.includes("risk") || pose === "admin") return brandAssets.pageHeroes.adminRisk;
  if (label.includes("strategy") || pose === "strategy") return brandAssets.pageHeroes.studioStrategy;
  if (label.includes("studio") || pose === "studio") return brandAssets.pageHeroes.studioStrategy;
  if (label.includes("raid")) return brandAssets.pageHeroes.raids;
  if (label.includes("mint")) return brandAssets.pageHeroes.mint;
  return brandAssets.pageHeroes.home;
}

function toneClass(tone: ReferenceTone) {
  if (tone === "green") return "ref-tone-green";
  if (tone === "cyan") return "ref-tone-cyan";
  if (tone === "gold") return "ref-tone-gold";
  if (tone === "red") return "ref-tone-red";
  return "ref-tone-muted";
}

function toneTextClass(tone: ReferenceTone) {
  if (tone === "green") return "text-vault-green";
  if (tone === "cyan") return "text-vault-cyan";
  if (tone === "gold") return "text-vault-gold";
  if (tone === "red") return "text-vault-red";
  return "text-slate-300";
}
