"use client";

import { useCallback, useEffect, useState } from "react";
import { FileSearch, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { apiFetch, unwrapApiData } from "@/lib/api";

type ProofResponse = {
  ok?: boolean;
  proof?: {
    nftMint: string;
    coreAsset: string;
    collectionAsset?: string | null;
    collectionId: string;
    collectionName: string;
    tokenMint: string;
    tokenSymbol: string;
    lockedAmount: string;
    reserveVaultPda?: string | null;
    positionPda: string;
    currentOwner?: string | null;
    dbOwnerSnapshot?: string | null;
    status: string;
    redeemable: boolean;
    staked: boolean;
    lockDurationDays: number;
    unlocksAt: string;
    verificationResult: {
      ownerVerificationAvailable: boolean;
      ownerMatchesDb?: boolean | null;
      collectionMatches?: boolean | null;
      reserveVaultStatus?: string;
      productionReady?: boolean;
    };
    strategy?: {
      enabled: boolean;
      type: string;
      status: string;
      approvedByCreator: boolean;
      automaticExecution: boolean;
    };
    issues: string[];
    lastVerifiedAt?: string | null;
  };
};

export default function ProofExplorerPage() {
  const [mint, setMint] = useState("");
  const [proof, setProof] = useState<ProofResponse["proof"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProof = useCallback(async (value: string) => {
    if (!value.trim()) {
      setError("Enter a Vault NFT mint or local vault id.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<ProofResponse>(`/vaults/${encodeURIComponent(value.trim())}/proof`);
      setProof(unwrapApiData(response)?.proof ?? response.proof ?? null);
    } catch (err) {
      setProof(null);
      setError(err instanceof Error ? err.message : "Proof lookup failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("mint");
    if (query) {
      setMint(query);
      void loadProof(query);
    }
  }, [loadProof]);

  return (
    <AppShell active="proof">
      <div className="space-y-6">
        <section className="phew-panel relative overflow-hidden rounded-lg p-6">
          <div className="absolute inset-0 grid-mask opacity-30" />
          <div className="relative max-w-4xl">
            <StatusPill accent="green">Proof Explorer</StatusPill>
            <h1 className="mt-4 text-5xl font-black leading-tight">Verify token backing, owner, reserve, and redeemability.</h1>
            <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-vault-green" />
                <input value={mint} onChange={(event) => setMint(event.target.value)} className="phew-input h-12 w-full rounded-md pl-11 pr-4 text-sm" placeholder="Vault NFT mint or id" />
              </label>
              <button onClick={() => void loadProof(mint)} className="phew-button phew-button-primary h-12 rounded-md px-5 text-sm font-black text-black" disabled={loading}>
                {loading ? "Checking" : "Verify"}
              </button>
            </div>
            {error ? <p className="mt-3 rounded-md border border-vault-red/35 bg-vault-red/10 p-3 text-sm text-vault-red">{error}</p> : null}
          </div>
        </section>

        {proof ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <SectionCard title="Vault Proof">
              <div className="grid gap-3 md:grid-cols-2">
                <ProofRow label="NFT mint" value={proof.nftMint} />
                <ProofRow label="Collection" value={proof.collectionName} />
                <ProofRow label="Token mint" value={proof.tokenMint} />
                <ProofRow label="Locked amount" value={`${proof.lockedAmount} ${proof.tokenSymbol}`} />
                <ProofRow label="Reserve PDA" value={proof.reserveVaultPda ?? "Unavailable"} />
                <ProofRow label="Position PDA" value={proof.positionPda} />
                <ProofRow label="Current owner" value={proof.currentOwner ?? "Live owner unavailable"} />
                <ProofRow label="DB owner snapshot" value={proof.dbOwnerSnapshot ?? "No snapshot"} />
                <ProofRow label="Strategy" value={proof.strategy ? `${proof.strategy.type} / ${proof.strategy.status}` : "PASSIVE / DRAFT"} />
                <ProofRow label="Strategy approval" value={proof.strategy?.approvedByCreator ? "Approved" : "Not approved"} />
              </div>
            </SectionCard>

            <SectionCard title="Verification">
              <div className="space-y-3">
                <StatusLine label="Live owner proof" ok={proof.verificationResult.ownerVerificationAvailable} />
                <StatusLine label="Collection matches" ok={proof.verificationResult.collectionMatches !== false} />
                <StatusLine label="Production proof" ok={Boolean(proof.verificationResult.productionReady)} />
                <StatusLine label="Redeemable" ok={proof.redeemable && !proof.staked && proof.status !== "REDEEMED"} />
                <StatusLine label="Strategy automatic execution" ok={proof.strategy?.automaticExecution === false} />
              </div>
              {proof.issues.length ? (
                <div className="mt-4 rounded-lg border border-vault-gold/35 bg-vault-gold/10 p-4">
                  <div className="flex gap-3">
                    <TriangleAlert className="size-5 shrink-0 text-vault-gold" />
                    <div className="space-y-2 text-sm text-slate-300">
                      {proof.issues.map((issue) => <p key={issue}>{issue}</p>)}
                    </div>
                  </div>
                </div>
              ) : null}
            </SectionCard>
          </div>
        ) : (
          <SectionCard title="No Proof Loaded">
            <div className="flex items-start gap-3 text-sm text-slate-400">
              <FileSearch className="size-5 text-vault-green" />
              <p>Enter a Vault NFT mint to inspect reserve mapping. Mock/dev responses are clearly marked and are not production solvency proof.</p>
            </div>
          </SectionCard>
        )}
      </div>
    </AppShell>
  );
}

function ProofRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-vault-line bg-black/25 p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function StatusLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-vault-line bg-black/25 p-3 text-sm">
      <span className="text-slate-300">{label}</span>
      <span className={ok ? "text-vault-green" : "text-vault-gold"}>
        <ShieldCheck className="inline size-4" /> {ok ? "OK" : "Not verified"}
      </span>
    </div>
  );
}
