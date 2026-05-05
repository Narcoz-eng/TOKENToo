"use client";

import { AlertTriangle, Loader2, RefreshCcw, Wallet } from "lucide-react";
import { SectionCard } from "./SectionCard";

export function LoadingState({ label = "Loading VaultX data" }: { label?: string }) {
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
            <p className="font-bold text-vault-red">API request failed</p>
            <p className="mt-2 break-words text-sm text-slate-300">{error}</p>
          </div>
        </div>
        {retry ? (
          <button onClick={retry} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-vault-line bg-black/25 px-4 text-sm font-bold">
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
      <div className="rounded-lg border border-dashed border-vault-line bg-black/25 p-8 text-center">
        <p className="text-xl font-black">{title}</p>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">{body}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </SectionCard>
  );
}

export function WalletDisconnectedState({ action }: { action?: React.ReactNode }) {
  return (
    <SectionCard>
      <div className="rounded-lg border border-vault-purple/40 bg-vault-purple/10 p-6">
        <div className="flex items-start gap-3">
          <Wallet className="size-6 text-vault-purple" />
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
