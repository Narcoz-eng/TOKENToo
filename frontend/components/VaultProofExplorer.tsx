"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PhewEmptyState } from "@/components/PhewEmptyState";
import { PhewPageHero } from "@/components/PhewPageHero";
import { PhewSuccessMomentModal } from "@/components/PhewSuccessMomentModal";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { ProtocolTrustStrip, proofTrust } from "@/components/protocol-trust";
import { brandAssets } from "@/lib/brand-assets";

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
    redeemedAt?: string | null;
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

export function VaultProofExplorer({ initialMint, allowSearch = true }: { initialMint?: string; allowSearch?: boolean }) {
  const [mint, setMint] = useState(initialMint ?? "");
  const [proof, setProof] = useState<ProofResponse["proof"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMomentOpen, setSuccessMomentOpen] = useState(false);
  const [lastSuccessMomentKey, setLastSuccessMomentKey] = useState<string | null>(null);

  const loadProof = useCallback(async (value: string) => {
    if (!value.trim()) {
      setError("Enter a Vault NFT mint or local vault id.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<ProofResponse>(`/vaults/${encodeURIComponent(value.trim())}/proof`, { cache: "no-store" });
      setProof(unwrapApiData(response)?.proof ?? response.proof ?? null);
    } catch (err) {
      setProof(null);
      setError(err instanceof Error ? err.message : "Proof lookup failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const queryMint = initialMint ?? new URLSearchParams(window.location.search).get("mint") ?? "";
    if (queryMint) {
      setMint(queryMint);
      void loadProof(queryMint);
    }
  }, [initialMint, loadProof]);

  useEffect(() => {
    if (!proof || proof.issues.length) return;
    const key = `${proof.nftMint}:${proof.lastVerifiedAt ?? "verified"}`;
    if (key === lastSuccessMomentKey) return;
    setLastSuccessMomentKey(key);
    setSuccessMomentOpen(true);
  }, [lastSuccessMomentKey, proof]);

  return (
    <AppShell active="proof">
      <div className="space-y-6">
        <PhewPageHero
          title="Proof Explorer"
          subtitle="Verify on-chain ownership, reserve lock, and protocol state for this NFT mint."
          mascotPose="proof"
          visualAsset={brandAssets.pageHeroes.proof}
          backgroundAsset={brandAssets.pageHeroes.proof}
          visualMode="banner"
          heroSize="large"
          eyebrow={<><span className="text-xs font-semibold text-slate-400">Vaults / Mint Details / Proof Explorer</span><StatusPill accent="green">Beta</StatusPill></>}
          sidePanel={
            <div className="flex flex-wrap gap-3">
              <a href="https://explorer.solana.com/?cluster=devnet" className="inline-flex h-11 items-center gap-2 rounded-md border border-vault-line bg-black/25 px-4 text-sm font-bold text-slate-200" target="_blank" rel="noreferrer">
                Open in Explorer <img src={brandAssets.energyBeam} alt="" className="size-5 object-contain" />
              </a>
              <a href="/proof" className="inline-flex h-11 items-center gap-2 rounded-md border border-vault-line bg-black/25 px-4 text-sm font-bold text-slate-200">
                Proof Docs <img src={brandAssets.proofRing} alt="" className="size-5 object-contain" />
              </a>
            </div>
          }
        />
        <section className="rounded-lg border border-vault-line bg-black/24 p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] xl:items-center">
          {allowSearch ? (
            <label className="relative block">
              <span className="mb-3 block text-sm font-black text-white">NFT Mint</span>
              <img src={brandAssets.proofRing} alt="" className="pointer-events-none absolute left-4 top-[3.05rem] size-4 object-contain" />
              <input value={mint} onChange={(event) => setMint(event.target.value)} className="phew-input h-12 w-full rounded-md pl-11 pr-4 text-sm" placeholder="Enter or paste NFT mint address on Solana" />
            </label>
          ) : (
            <div>
              <span className="mb-3 block text-sm font-black text-white">NFT Mint</span>
              <p className="h-12 rounded-md border border-vault-line bg-black/25 px-4 py-3 text-sm text-slate-400">{mint || "N/A"}</p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_148px] sm:items-end">
            <div className="min-w-0">
              <span className="mb-3 block text-sm font-black text-white">Mint Loaded</span>
              <div className="flex items-center gap-3 rounded-md border border-vault-line bg-black/25 p-2">
                <div className="grid size-11 shrink-0 place-items-center rounded-md border border-vault-green/30 bg-vault-green/10">
                  <img src={brandAssets.proofRing} alt="" className="size-7 object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{proof?.collectionName ?? "No mint loaded"}</p>
                  <p className="truncate text-xs text-slate-400">{proof?.tokenSymbol ?? (mint || "Awaiting input")}</p>
                </div>
              </div>
            </div>
            <button onClick={() => void loadProof(mint)} className="phew-button phew-button-primary h-12 rounded-md px-5 text-sm font-black text-black" disabled={loading || !allowSearch}>
              {loading ? "Checking" : "Verify"}
            </button>
          </div>
          {error ? <p className="xl:col-span-2 rounded-md border border-vault-red/35 bg-vault-red/10 p-3 text-sm text-vault-red">{error}</p> : null}
          </div>
        </section>

        {proof ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <SectionCard title="Vault Proof">
              <ProtocolTrustStrip trust={proofTrust(proof)} className="mb-4" />
              <div className="grid gap-3 md:grid-cols-2">
                <ProofRow label="NFT mint" value={proof.nftMint} />
                <ProofRow label="Owner" value={proof.currentOwner ?? proof.dbOwnerSnapshot ?? "N/A"} />
                <ProofRow label="Locked amount" value={`${proof.lockedAmount} ${proof.tokenSymbol}`} />
                <ProofRow label="Reserve PDA" value={proof.reserveVaultPda ?? "N/A"} />
                <ProofRow label="Redeemability" value={proof.redeemable && !proof.staked && proof.status !== "REDEEMED" ? "Redeemable" : "Not redeemable"} />
                <ProofRow label="Stake status" value={proof.staked ? "Staked" : "Not staked"} />
                <ProofRow label="Collection" value={proof.collectionName} />
                <ProofRow label="Collection asset" value={proof.collectionAsset ?? "N/A"} />
                <ProofRow label="Token mint" value={proof.tokenMint} />
                <ProofRow label="Position PDA" value={proof.positionPda} />
                <ProofRow label="Unlocks at" value={proof.unlocksAt} />
                <ProofRow label="Redeemed at" value={proof.redeemedAt ?? "Not redeemed"} />
              </div>
            </SectionCard>

            <SectionCard title="Verification">
              <div className="mb-4 rounded-lg border border-vault-line bg-black/25 p-4">
                <div className="flex items-center gap-3">
                  <img src={proof.issues.length ? brandAssets.errorGlitch : brandAssets.rewardBurst} alt="" className="size-10 object-contain" />
                  <div>
                    <p className="font-black text-white">{proof.issues.length ? "Proof has issues" : "Proof verified"}</p>
                    <p className="mt-1 text-sm text-slate-400">{proof.lastVerifiedAt ?? "Last verified N/A"}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <StatusLine label="Live owner proof" ok={proof.verificationResult.ownerVerificationAvailable} />
                <StatusLine label="Owner matches DB" ok={proof.verificationResult.ownerMatchesDb !== false} />
                <StatusLine label="Collection matches" ok={proof.verificationResult.collectionMatches !== false} />
                <StatusLine label="Reserve active" ok={proof.verificationResult.reserveVaultStatus === "ACTIVE"} />
                <StatusLine label="Production proof" ok={Boolean(proof.verificationResult.productionReady)} />
              </div>
              <div className="mt-4 grid gap-3">
                <ProofRow label="Vault status" value={proof.status} />
                <ProofRow label="Strategy" value={proof.strategy ? `${proof.strategy.type} / ${proof.strategy.status}` : "PASSIVE / DRAFT"} />
                <ProofRow label="Last verified" value={proof.lastVerifiedAt ?? "N/A"} />
              </div>
              {proof.issues.length ? (
                <div className="mt-4 rounded-lg border border-vault-gold/35 bg-vault-gold/10 p-4">
                  <div className="flex gap-3">
                    <img src={brandAssets.errorGlitch} alt="" className="size-5 shrink-0 object-contain" />
                    <div className="space-y-2 text-sm text-slate-300">
                      {proof.issues.map((issue) => <p key={issue}>{issue}</p>)}
                    </div>
                  </div>
                </div>
              ) : null}
            </SectionCard>
          </div>
        ) : (
          <ProofEmptyWorkspace mint={mint} allowSearch={allowSearch} />
        )}
        {successMomentOpen && proof && !proof.issues.length ? (
          <PhewSuccessMomentModal
            action="proof"
            tokenSymbol={proof.tokenSymbol}
            title="Proof verified"
            subtitle="Owner, collection, reserve, and production checks passed according to the proof endpoint."
            proofUrl={`/vaults/${encodeURIComponent(proof.nftMint)}/proof`}
            onClose={() => setSuccessMomentOpen(false)}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

function ProofEmptyWorkspace({ mint, allowSearch }: { mint: string; allowSearch: boolean }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.8fr)_minmax(320px,0.9fr)]">
        <SectionCard title="Proof Verification" className="phew-proof-card">
          <PhewEmptyState
            mascotPose="proof"
            title="Proof not loaded"
            body={allowSearch ? "Enter a confirmed Vault NFT mint to inspect live reserve mapping." : "The requested Vault NFT proof is unavailable from the backend."}
          />
        </SectionCard>

        <SectionCard title="Proof Data" className="phew-proof-card">
          <div className="grid gap-2">
            <ProofRow label="Owner Wallet" value="N/A" />
            <ProofRow label="Locked Amount" value="N/A" />
            <ProofRow label="Reserve PDA" value="N/A" />
            <ProofRow label="Position PDA" value="N/A" />
            <ProofRow label="Collection Asset" value="N/A" />
            <ProofRow label="Token Mint" value={mint || "N/A"} />
            <ProofRow label="Unlock Date" value="N/A" />
            <ProofRow label="Redeemed Date" value="N/A" />
          </div>
          <button className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-vault-line bg-black/25 text-sm font-bold text-slate-400" disabled>
            Raw Proof <img src={brandAssets.proofRing} alt="" className="size-5 object-contain opacity-60" />
          </button>
        </SectionCard>

        <SectionCard title="Verification Checklist" className="phew-proof-card">
          <div className="space-y-2">
            <StatusLine label="Live Owner Proof" ok={false} />
            <StatusLine label="Owner Matches DB" ok={false} />
            <StatusLine label="Collection Matches" ok={false} />
            <StatusLine label="Reserve Lock Active" ok={false} />
            <StatusLine label="Production Proof" ok={false} />
          </div>
          <div className="mt-4 rounded-lg border border-vault-line bg-white/[0.03] p-5 text-center">
            <img src={brandAssets.vaultSafe} alt="" className="mx-auto mb-2 size-7 object-contain opacity-60" />
            <p className="font-black text-slate-300">Proof Not Verified Yet</p>
            <p className="mt-1 text-sm text-slate-500">All checks must pass to enable actions.</p>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)_minmax(320px,0.9fr)]">
        <SectionCard title="Proof Check Details" className="phew-proof-card">
          <div className="grid gap-2">
            {["Owner Proof", "Reserve Proof", "Position Proof", "Metadata Proof"].map((label) => (
              <div key={label} className="grid grid-cols-[1fr_1fr_90px] gap-3 border-b border-vault-line py-2 text-sm last:border-0">
                <span className="text-slate-300">{label}</span>
                <span className="text-slate-500">/api/proof/{label.toLowerCase().split(" ")[0]}</span>
                <span className="text-vault-gold">Pending</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Issues" className="phew-proof-card">
          <div className="rounded-lg border border-dashed border-vault-line bg-black/25 p-6 text-center">
            <img src={brandAssets.errorGlitch} alt="" className="mx-auto mb-3 size-9 object-contain opacity-70" />
            <p className="font-black">No issues detected yet.</p>
            <p className="mt-2 text-sm text-slate-500">Issues will appear here if any check fails.</p>
          </div>
        </SectionCard>

        <SectionCard title="Actions" className="phew-proof-card">
          <div className="grid gap-3">
            <ProofLockedAction asset={brandAssets.redeemParticles} title="Redeem NFT" body="Redeem and unlock your NFT." />
            <ProofLockedAction asset={brandAssets.vaultSafe} title="Stake Vault NFT" body="Stake to earn rewards." />
          </div>
          <div className="mt-4 rounded-lg border border-vault-line bg-white/[0.03] p-4 text-center text-sm text-slate-400">
            Actions locked. Complete verification to enable actions.
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function ProofLockedAction({ asset, title, body }: { asset: string; title: string; body: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-vault-line bg-black/25 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md border border-vault-green/30 bg-vault-green/10 text-vault-green">
          <img src={asset} alt="" className="size-7 object-contain" />
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-sm text-white">{title}</strong>
          <span className="block truncate text-xs text-slate-500">{body}</span>
        </span>
      </div>
      <img src={brandAssets.vaultSafe} alt="" className="size-5 shrink-0 object-contain opacity-55" />
    </div>
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
        <img src={ok ? brandAssets.rewardBurst : brandAssets.proofRing} alt="" className="inline size-4 object-contain align-[-2px]" /> {ok ? "OK" : "Not verified"}
      </span>
    </div>
  );
}
