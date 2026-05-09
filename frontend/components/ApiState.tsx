"use client";

import { AlertTriangle, CheckCircle2, RefreshCcw, Wallet, XCircle } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { StatusPill } from "./StatusPill";
import { brandAssets } from "@/lib/brand-assets";
import { ApiError, isDevMode } from "@/lib/api";

export function LoadingState() {
  return (
    <SectionCard className="overflow-hidden p-0">
      <div className="phew-loading-stage relative min-h-56 overflow-hidden rounded-lg" aria-busy="true" aria-live="polite" aria-label="Loading">
        <img src={brandAssets.motionCore} alt="" className="phew-motion-image absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(186,255,0,0.2),rgba(2,8,6,0.34)_34%,rgba(2,8,6,0.92)_72%)]" />
        <div className="absolute inset-0 grid-mask opacity-35" />
        <div className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2">
          <span className="phew-loader-ring absolute inset-0 rounded-full border border-vault-green/50" />
          <span className="phew-loader-ring absolute inset-3 rounded-full border border-vault-cyan/45" style={{ animationDelay: "260ms" }} />
          <span className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-md bg-vault-green shadow-green" />
        </div>
      </div>
    </SectionCard>
  );
}

export function ErrorState({ error, retry }: { error: string | ApiError; retry?: () => void }) {
  const apiError = error instanceof ApiError ? error : null;
  const message = apiError?.message ?? sanitizeErrorText(String(error || "The request failed."));
  const title = titleForError(apiError);
  return (
    <SectionCard>
      <div className="rounded-lg border border-vault-red/40 bg-vault-red/10 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 text-vault-red" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-vault-red">{title}</p>
            <p className="mt-2 break-words text-sm text-slate-300">{message}</p>
            {apiError?.requestId ? <p className="mt-2 text-xs text-slate-500">Request ID: {apiError.requestId}</p> : null}
            {apiError && isDevMode() ? (
              <div className="mt-3 rounded-md border border-vault-line bg-black/25 p-3 text-xs text-slate-300">
                <div className="grid gap-2 sm:grid-cols-2">
                  <DiagnosticLine label="Endpoint" value={apiError.diagnostics.endpointPath ?? apiError.diagnostics.url} />
                  <DiagnosticLine label="Proxy stage" value={apiError.diagnostics.proxyStage ?? "n/a"} />
                  <DiagnosticLine label="Error code" value={apiError.code} />
                  <DiagnosticLine label="Target host" value={apiError.diagnostics.targetHost ?? "n/a"} />
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer font-bold text-slate-200">Developer diagnostics</summary>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(apiError.diagnostics, null, 2)}</pre>
                </details>
              </div>
            ) : null}
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

function DiagnosticLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-white/5 bg-black/20 px-3 py-2">
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words font-mono text-[11px] text-slate-200">{value}</p>
    </div>
  );
}

function titleForError(error: ApiError | null) {
  if (!error) return "Data is temporarily unavailable";
  if (error.kind === "network") return "Backend is unreachable";
  if (error.kind === "timeout") return "Request timed out";
  if (error.kind === "html_response") return "API returned an invalid response";
  if (error.kind === "invalid_json") return "API response could not be parsed";
  if (error.kind === "auth") return "Authentication required";
  if (error.kind === "capability_disabled") return "Capability is not configured";
  return "Data is temporarily unavailable";
}

function sanitizeErrorText(value: string) {
  const trimmed = value.trim();
  if (/^\s*<!doctype html/i.test(trimmed) || /^\s*<html/i.test(trimmed) || /<body[\s>]/i.test(trimmed)) {
    return "The backend returned an HTML error page instead of API data.";
  }
  return trimmed.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").slice(0, 500) || "The request failed.";
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
    <SectionCard className="p-4">
      <div className="rounded-md border border-vault-green/25 bg-vault-green/8 p-4">
        <div className="flex items-start gap-3">
          <Wallet className="mt-0.5 size-5 text-vault-green" />
          <div>
            <p className="font-black">Connect your wallet</p>
            <p className="mt-1 text-sm text-slate-400">Required for wallet-specific vaults, staking, listings, claims, and mint intents.</p>
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
        <CapabilityBadge label="Helius" enabled={capabilities.heliusAvailable ?? capabilities.heliusReachable ?? capabilities.heliusConfigured} />
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
