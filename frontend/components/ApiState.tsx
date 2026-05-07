"use client";

import { AlertTriangle, CheckCircle2, Loader2, RefreshCcw, Wallet, XCircle } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { StatusPill } from "./StatusPill";
import { brandAssets } from "@/lib/brand-assets";

export function LoadingState({ label = "Loading Phew.run data" }: { label?: string }) {
  return (
    <SectionCard>
      <div className="flex min-h-48 items-center justify-center gap-3 text-slate-300">
        <Loader2 className="size-5 animate-spin text-vault-purple" />
        {label}
      </div>
    </SectionCard>
  );
}

export function ErrorState({ error, retry }: { error: string; retry?: () => void }) {
  return (
    <SectionCard>
      <div className="rounded-lg border border-vault-red/40 bg-vault-red/10 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 text-vault-red" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-vault-red">Data is temporarily unavailable</p>
            <p className="mt-2 break-words text-sm text-slate-300">{error}</p>
          </div>
        </div>
        {retry ? (
          <button onClick={retry} className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-vault-line bg-black/25 px-4 text-sm font-bold">
            <RefreshCcw className="size-4" /> Retry
          </button>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <SectionCard>
      <div className="phew-scanline grid gap-6 rounded-lg border border-dashed border-vault-green/35 bg-vault-green/5 p-6 text-left md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
        <img src={brandAssets.emptyVault} alt="" className="mx-auto aspect-square w-40 rounded-lg object-cover opacity-90 shadow-green" />
        <div>
          <p className="text-xl font-black">{title}</p>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">{body}</p>
          {action ? <div className="mt-5">{action}</div> : null}
        </div>
      </div>
    </SectionCard>
  );
}

export function WalletDisconnectedState({ action }: { action?: React.ReactNode }) {
  return (
    <SectionCard>
      <div className="rounded-lg border border-vault-green/35 bg-vault-green/10 p-6">
        <div className="flex items-start gap-3">
          <Wallet className="size-6 text-vault-green" />
          <div>
            <p className="text-xl font-black">Connect your wallet</p>
            <p className="mt-2 text-sm text-slate-300">This view is wallet-specific. Connect and authenticate your wallet to see owned vaults, staking, listings, claims, and mint intents.</p>
            {action ? <div className="mt-4">{action}</div> : null}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export function SetupWarning({ warnings }: { warnings?: string[] }) {
  if (!warnings?.length) return null;
  return (
    <div className="rounded-lg border border-vault-gold/40 bg-vault-gold/10 p-4 text-sm text-slate-200">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-vault-gold" />
        <div className="space-y-1">
          {warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      </div>
    </div>
  );
}

export function CapabilityBadge({ label, enabled }: { label: string; enabled?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-vault-line bg-black/25 px-3 py-2 text-xs font-semibold text-slate-200">
      {enabled ? <CheckCircle2 className="size-3.5 text-vault-green" /> : <XCircle className="size-3.5 text-vault-gold" />}
      {label}
    </span>
  );
}

export function FounderStatusPanel({ status }: { status?: { mode?: string; capabilities?: Record<string, boolean>; warnings?: string[] } | null }) {
  const capabilities = status?.capabilities;
  if (!capabilities) return null;
  return (
    <SectionCard title="Founder Status">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill accent="cyan">Mode {status?.mode ?? "development"}</StatusPill>
        <StatusPill accent={capabilities.databaseAvailable ? "green" : "gold"}>{capabilities.databaseAvailable ? "DB connected" : "DB setup needed"}</StatusPill>
      </div>
      <div className="flex flex-wrap gap-2">
        <CapabilityBadge label="OpenAI Images" enabled={capabilities.openaiImagesAvailable} />
        <CapabilityBadge label="Pinata" enabled={capabilities.pinataAvailable} />
        <CapabilityBadge label="Solana" enabled={capabilities.solanaAvailable} />
        <CapabilityBadge label="Program ID" enabled={capabilities.devnetProgramConfigured} />
        <CapabilityBadge label="Founder wallet" enabled={capabilities.walletConfigured} />
        <CapabilityBadge label="Token metadata" enabled={capabilities.tokenMetadataAvailable} />
      </div>
      <SetupWarning warnings={status?.warnings} />
    </SectionCard>
  );
}
