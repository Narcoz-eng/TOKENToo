"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState, WalletDisconnectedState } from "@/components/ApiState";
import { AnimatedButton } from "@/components/AnimatedButton";
import { TransactionFlow, transactionStateFromTxStatus, type TransactionFlowState } from "@/components/TransactionFlow";
import { ProtocolTrustStrip, proofTrust, vaultTrust } from "@/components/protocol-trust";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { TransactionStatus, type TxStatus } from "@/components/TransactionStatus";
import { useApiResource } from "@/hooks/useApiResource";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { brandAssets } from "@/lib/brand-assets";
import type { VaultCollection, VaultNft } from "@/lib/types";
import { cn } from "@/lib/utils";

type ProfileData = {
  nfts?: VaultNft[];
  collections?: VaultCollection[];
};

type VaultProof = {
  nftMint: string;
  collectionName: string;
  tokenSymbol: string;
  lockedAmount: string;
  currentOwner?: string | null;
  dbOwnerSnapshot?: string | null;
  status: string;
  redeemable: boolean;
  staked: boolean;
  unlocksAt: string;
  reserveVaultPda?: string | null;
  verificationResult: {
    ownerVerificationAvailable: boolean;
    ownerMatchesDb?: boolean | null;
    collectionMatches?: boolean | null;
    reserveVaultStatus?: string;
    productionReady?: boolean;
  };
  issues: string[];
  lastVerifiedAt?: string | null;
};

type ProofResponse = {
  ok?: boolean;
  proof?: VaultProof;
};

type RedeemTransaction = {
  id: string;
  status: string;
  txSignature?: string | null;
  errorMessage?: string | null;
  unsignedTransaction?: {
    base64UnsignedTransaction?: string | null;
    warning?: string;
    transactionSummary?: Record<string, unknown>;
  } | null;
};

export default function RedeemPage() {
  const wallet = useWalletAuth();
  const walletPath = wallet.address ? `/product/profile?wallet=${encodeURIComponent(wallet.address)}` : "/product/profile";
  const profileState = useApiResource<ProfileData>(walletPath, { enabled: wallet.connected && Boolean(wallet.address) });
  const profile = unwrapApiData(profileState.data);
  const nfts = profile?.nfts ?? [];
  const collections = profile?.collections ?? [];
  const redeemableNfts = useMemo(() => nfts.filter((nft) => nft.status === "Redeemable" && Boolean(nft.mint)), [nfts]);
  const [selectedVaultId, setSelectedVaultId] = useState("");
  const selectedVault = redeemableNfts.find((nft) => nft.id === selectedVaultId) ?? redeemableNfts[0] ?? null;
  const [proof, setProof] = useState<VaultProof | null>(null);
  const [redeemTx, setRedeemTx] = useState<RedeemTransaction | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [activeAction, setActiveAction] = useState<"proof" | "build" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const proofMatchesSelection = Boolean(proof && selectedVault?.mint && proof.nftMint === selectedVault.mint);
  const proofAllowsRedeem = Boolean(proofMatchesSelection && proof?.redeemable && !proof.staked && proof.status !== "REDEEMED");
  const selectedCollection = selectedVault ? collections.find((collection) => collection.id === selectedVault.collectionId || collection.dbId === selectedVault.collectionId) : null;
  const flowState: TransactionFlowState = !wallet.connected ? "wallet-disconnected" : redeemFlowState(error, activeAction, txStatus, redeemTx?.status);

  async function loadProof(mint = selectedVault?.mint) {
    if (!mint) throw new Error("Select an eligible Vault NFT before checking proof.");
    setActiveAction("proof");
    setTxStatus("validating");
    setError(null);
    try {
      const response = await apiFetch<ProofResponse>(`/vaults/${encodeURIComponent(mint)}/proof`, { cache: "no-store" });
      const nextProof = unwrapApiData(response)?.proof ?? response.proof ?? null;
      if (!nextProof) throw new Error("The proof endpoint returned no proof for this Vault NFT.");
      setProof(nextProof);
      setTxStatus("idle");
      return nextProof;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Proof lookup failed";
      setError(message);
      setTxStatus("failed");
      throw err;
    } finally {
      setActiveAction(null);
    }
  }

  async function buildRedeem() {
    if (!wallet.connected) return setError("Connect and authenticate your wallet before redeeming.");
    if (!selectedVault?.mint) return setError("Select a real redeemable owned Vault NFT first.");
    setActiveAction("build");
    setTxStatus("pending");
    setError(null);
    try {
      const checkedProof = proofMatchesSelection ? proof : await loadProof(selectedVault.mint);
      if (checkedProof && (!checkedProof.redeemable || checkedProof.staked || checkedProof.status === "REDEEMED")) {
        throw new Error("The selected Vault NFT is not redeemable according to the proof endpoint.");
      }
      setActiveAction("build");
      const response = await wallet.authFetch<RedeemTransaction>(`/vaults/${encodeURIComponent(selectedVault.mint)}/redeem/build`, {
        method: "POST",
        body: JSON.stringify({ idempotencyKey: `${wallet.address}:redeem:${selectedVault.mint}` })
      });
      setRedeemTx(response);
      setTxStatus("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Redeem build failed";
      setError(message);
      setTxStatus("failed");
    } finally {
      setActiveAction(null);
    }
  }

  async function signAndSubmit() {
    if (!wallet.connected) return setError("Connect and authenticate your wallet before redeeming.");
    if (!selectedVault?.mint) return setError("Select a real redeemable owned Vault NFT first.");
    if (!redeemTx?.id) return setError("Build a redeem transaction first.");
    const base64 = redeemTx.unsignedTransaction?.base64UnsignedTransaction;
    if (!base64) return setError(redeemTx.unsignedTransaction?.warning ?? "The backend did not return a signable devnet redeem transaction.");
    setActiveAction("submit");
    setTxStatus("signing");
    setError(null);
    try {
      const signedTransactionBase64 = await wallet.signTransactionBase64(base64);
      setTxStatus("pending");
      const response = await wallet.authFetch<RedeemTransaction>(`/vaults/${encodeURIComponent(selectedVault.mint)}/redeem/submit`, {
        method: "POST",
        body: JSON.stringify({ redeemTransactionId: redeemTx.id, signedTransactionBase64 })
      });
      setRedeemTx(response);
      setTxStatus(statusForRedeem(response.status));
      if (response.status === "CONFIRMED") profileState.reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Redeem submission failed";
      setError(message);
      setTxStatus("failed");
    } finally {
      setActiveAction(null);
    }
  }

  function selectVault(vault: VaultNft) {
    setSelectedVaultId(vault.id);
    setProof(null);
    setRedeemTx(null);
    setTxStatus("idle");
    setError(null);
  }

  return (
    <AppShell active="redeem">
      <div className="space-y-6">
        <section className="phew-panel phew-hero-canvas relative overflow-hidden rounded-lg p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(186,255,0,0.2),transparent_28%),linear-gradient(120deg,#020806_0%,#06110f_58%,#020806_100%)]" />
          <div className="absolute inset-0 grid-mask opacity-30" />
          <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-center">
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusPill accent="green">Redeem</StatusPill>
                <StatusPill accent="cyan">Wallet-owned eligible NFTs</StatusPill>
              </div>
              <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">Redeem from an eligible Vault NFT in your wallet.</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-300">
                This page mirrors staking: it only shows Vault NFTs returned by the backend for the connected wallet, checks proof, then uses the real redeem build and submit routes.
              </p>
            </div>
            <TransactionFlow
              state={flowState}
              moment="redeem"
              title="Redeem Vault NFT"
              description="Select a wallet-owned eligible NFT, check proof, build the redeem transaction, then submit through the backend."
              image={selectedVault?.image}
              tokenSymbol={proof?.tokenSymbol ?? selectedCollection?.symbol ?? selectedVault?.tier}
              detail={error ?? redeemTx?.errorMessage ?? redeemTx?.status ?? null}
              compact
            />
          </div>
        </section>

        {!wallet.connected ? <WalletDisconnectedState /> : null}
        {!wallet.connected ? <RedeemEmptyWorkspace /> : null}
        {wallet.connected && profileState.loading ? <LoadingState /> : null}
        {wallet.connected && profileState.error ? <ErrorState error={profileState.error} retry={profileState.reload} /> : null}

        {wallet.connected && !profileState.loading && !profileState.error ? (
          redeemableNfts.length ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <main className="space-y-6">
                <SectionCard title="Eligible Vault NFTs">
                  <div className="grid gap-3">
                    {redeemableNfts.map((vault) => {
                      const selected = selectedVault?.id === vault.id;
                      const vaultCollection = collections.find((collection) => collection.id === vault.collectionId || collection.dbId === vault.collectionId) ?? null;
                      return (
                        <div key={vault.id} className={cn("rounded-lg border p-4 transition", selected ? "border-vault-green bg-vault-green/10 shadow-green" : "border-vault-line bg-black/25 hover:border-vault-cyan/40")}>
                          <div className="grid gap-4 md:grid-cols-[88px_minmax(0,1fr)_auto] md:items-center">
                            <img src={vault.image} alt="" className="aspect-[4/5] w-20 rounded-md border border-vault-green/25 object-cover" />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="break-words font-black">{vault.name}</p>
                                <StatusPill accent={selected ? "green" : "cyan"}>{selected ? "Selected" : vault.status}</StatusPill>
                              </div>
                              <p className="mt-1 break-all text-xs text-slate-500">{vault.mint ?? vault.id}</p>
                              <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                                <MiniMetric label="Locked" value={vault.lockedAmount} />
                                <MiniMetric label="Unlock" value={vault.unlockDate || "N/A"} />
                                <MiniMetric label="Rarity" value={vault.rarity || "N/A"} />
                              </div>
                              <ProtocolTrustStrip trust={vaultTrust(vault, vaultCollection)} compact className="mt-3" />
                            </div>
                            <div className="flex flex-wrap gap-2 md:justify-end">
                              <button type="button" onClick={() => selectVault(vault)} className="inline-flex h-9 items-center rounded-md border border-vault-green/45 bg-vault-green/10 px-3 text-sm font-bold text-vault-green">
                                Select
                              </button>
                              {vault.mint ? <Link href={`/vaults/${encodeURIComponent(vault.mint)}/proof`} className="inline-flex h-9 items-center rounded-md border border-vault-line bg-black/25 px-3 text-sm font-bold text-slate-300">Open proof</Link> : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>

                <SectionCard title="Redeem Checks">
                  <div className="grid gap-3 md:grid-cols-4">
                    <CheckTile label="Wallet connected" ok={wallet.connected} />
                    <CheckTile label="NFT selected" ok={Boolean(selectedVault?.mint)} />
                    <CheckTile label="Proof checked" ok={proofAllowsRedeem} />
                    <CheckTile label="Tx built" ok={Boolean(redeemTx?.unsignedTransaction?.base64UnsignedTransaction)} />
                  </div>
                  {proof?.issues?.length ? (
                    <div className="mt-4 rounded-md border border-vault-gold/35 bg-vault-gold/10 p-3 text-sm text-vault-gold">
                      {proof.issues.join("; ")}
                    </div>
                  ) : null}
                  {error ? <div className="mt-4 rounded-md border border-vault-red/40 bg-vault-red/10 p-3 text-sm text-vault-red">{error}</div> : null}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <AnimatedButton type="button" tone="outline" iconAsset={brandAssets.proofRing} loading={activeAction === "proof"} disabled={!selectedVault?.mint || activeAction !== null} onClick={() => void loadProof()}>
                      Check Proof
                    </AnimatedButton>
                    <AnimatedButton type="button" iconAsset={brandAssets.redeemParticles} loading={activeAction === "build"} disabled={!selectedVault?.mint || activeAction !== null} onClick={buildRedeem}>
                      Build Redeem Tx
                    </AnimatedButton>
                    <AnimatedButton type="button" tone="outline" iconAsset={brandAssets.vaultSafe} loading={activeAction === "submit"} disabled={!redeemTx?.unsignedTransaction?.base64UnsignedTransaction || activeAction !== null} onClick={signAndSubmit}>
                      Sign + Submit
                    </AnimatedButton>
                    <button type="button" onClick={profileState.reload} className="inline-flex h-11 items-center gap-2 rounded-md border border-vault-line bg-black/25 px-4 text-sm font-bold text-slate-300">
                      <img src={brandAssets.proofRing} alt="" className="size-5 object-contain" /> Refresh Wallet NFTs
                    </button>
                  </div>
                </SectionCard>
              </main>

              <aside className="space-y-6">
                <SectionCard title="Redeem Status">
                  <TransactionStatus status={txStatus} label={redeemStatusLabel(txStatus, redeemTx?.status)} detail={error ?? redeemTx?.errorMessage ?? undefined} />
                  <div className="mt-4 space-y-3">
                    <PreviewRow label="Selected mint" value={selectedVault?.mint ?? "N/A"} />
                    <PreviewRow label="Redeem tx id" value={redeemTx?.id ?? "N/A"} />
                    <PreviewRow label="Backend status" value={redeemTx?.status ?? "N/A"} />
                    <PreviewRow label="Signable tx" value={redeemTx?.unsignedTransaction?.base64UnsignedTransaction ? "Ready" : "N/A"} />
                  </div>
                  {redeemTx?.txSignature ? (
                    <a href={`https://explorer.solana.com/tx/${redeemTx.txSignature}?cluster=devnet`} className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-vault-green/45 bg-vault-green/10 px-4 text-sm font-bold text-vault-green">
                      View transaction <img src={brandAssets.energyBeam} alt="" className="size-5 object-contain" />
                    </a>
                  ) : null}
                </SectionCard>

                <SectionCard title="Proof">
                  {proofMatchesSelection && proof ? (
                    <div className="space-y-3">
                      <ProtocolTrustStrip trust={proofTrust(proof)} compact />
                      <PreviewRow label="Collection" value={proof.collectionName} />
                      <PreviewRow label="Locked amount" value={`${proof.lockedAmount} ${proof.tokenSymbol}`} />
                      <PreviewRow label="Owner" value={proof.currentOwner ?? proof.dbOwnerSnapshot ?? "N/A"} />
                      <PreviewRow label="Reserve PDA" value={proof.reserveVaultPda ?? "N/A"} />
                      <PreviewRow label="Unlocks at" value={proof.unlocksAt ?? "N/A"} />
                      <PreviewRow label="Last verified" value={proof.lastVerifiedAt ?? "N/A"} />
                      <div className="grid gap-2">
                        <CheckLine label="Redeemable" ok={proof.redeemable && !proof.staked && proof.status !== "REDEEMED"} />
                        <CheckLine label="Owner proof" ok={proof.verificationResult.ownerVerificationAvailable} />
                        <CheckLine label="Collection match" ok={proof.verificationResult.collectionMatches !== false} />
                        <CheckLine label="Production proof" ok={Boolean(proof.verificationResult.productionReady)} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Select an eligible wallet NFT and run proof check before building the redeem transaction.</p>
                  )}
                </SectionCard>
              </aside>
            </div>
          ) : (
            <EmptyState
              title="No eligible Vault NFTs"
              body="Redeem shows only real wallet-owned Vault NFTs returned by the backend with Redeemable status. Locked, staked, redeemed, missing-mint, and fake entries are excluded."
              action={<Link href="/staking" className="inline-flex h-11 items-center justify-center rounded-md border border-vault-green/45 bg-vault-green/10 px-5 text-sm font-bold text-vault-green">Open staking</Link>}
            />
          )
        ) : null}
      </div>
    </AppShell>
  );
}

function RedeemEmptyWorkspace() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <main className="space-y-5">
        <SectionCard title="Eligible Vault NFTs">
          <div className="rounded-lg border border-dashed border-vault-line bg-black/25 p-5">
            <div className="grid gap-4 md:grid-cols-[88px_minmax(0,1fr)_auto] md:items-center">
              <div className="aspect-[4/5] w-20 rounded-md border border-vault-green/25 bg-vault-green/5" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black">Wallet-owned vault</p>
                  <StatusPill accent="gold">N/A</StatusPill>
                </div>
                <p className="mt-1 text-xs text-slate-500">Connect a wallet to load eligible redeemable Vault NFTs.</p>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                  <MiniMetric label="Locked" value="N/A" />
                  <MiniMetric label="Unlock" value="N/A" />
                  <MiniMetric label="Rarity" value="N/A" />
                </div>
              </div>
              <span className="inline-flex h-9 items-center rounded-md border border-vault-line bg-black/25 px-3 text-sm font-bold text-slate-500">Select N/A</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Redeem Checks">
          <div className="grid gap-3 md:grid-cols-4">
            <CheckTile label="Wallet connected" ok={false} />
            <CheckTile label="NFT selected" ok={false} />
            <CheckTile label="Proof checked" ok={false} />
            <CheckTile label="Tx built" ok={false} />
          </div>
        </SectionCard>
      </main>

      <aside className="space-y-5">
        <SectionCard title="Redeem Status">
          <TransactionStatus status="idle" label="Wallet required" detail="Redeem actions stay disabled until wallet-owned eligible NFTs load from the backend." />
          <div className="mt-4 space-y-3">
            <PreviewRow label="Selected mint" value="N/A" />
            <PreviewRow label="Redeem tx id" value="N/A" />
            <PreviewRow label="Backend status" value="N/A" />
          </div>
        </SectionCard>

        <SectionCard title="Proof">
          <p className="text-sm text-slate-400">Proof rows appear after a wallet NFT is selected and the proof endpoint returns live reserve state.</p>
        </SectionCard>
      </aside>
    </div>
  );
}

function CheckTile({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={cn("rounded-md border p-4", ok ? "border-vault-green/40 bg-vault-green/10" : "border-vault-line bg-black/25")}>
      <img src={ok ? brandAssets.rewardBurst : brandAssets.proofRing} alt="" className={cn("mb-3 size-8 object-contain", ok ? "drop-shadow-[0_0_14px_rgba(186,255,0,0.28)]" : "opacity-55 grayscale")} />
      <p className="text-sm font-black">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{ok ? "Ready" : "N/A"}</p>
    </div>
  );
}

function CheckLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-vault-line bg-black/25 p-3 text-sm">
      <span className="text-slate-300">{label}</span>
      <span className={ok ? "text-vault-green" : "text-vault-gold"}>{ok ? "OK" : "N/A"}</span>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/5 bg-white/[0.03] p-2">
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className="mt-1 truncate font-bold text-white">{value}</p>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-vault-line py-3 text-sm last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold">{value}</span>
    </div>
  );
}

function statusForRedeem(status: string): TxStatus {
  if (status === "CONFIRMED") return "confirmed";
  if (status === "FAILED" || status === "NEEDS_CORE_VERIFY") return "failed";
  return "pending";
}

function redeemFlowState(error: string | null, activeAction: string | null, txStatus: TxStatus, backendStatus?: string | null): TransactionFlowState {
  if (error || txStatus === "failed") return "error";
  if (activeAction === "proof" || activeAction === "build") return "preparing";
  if (activeAction === "submit" && txStatus === "signing") return "signing";
  if (activeAction === "submit") return "submitting";
  if (txStatus !== "idle") return transactionStateFromTxStatus(txStatus);
  return transactionStateFromTxStatus(backendStatus);
}

function redeemStatusLabel(status: TxStatus, backendStatus?: string) {
  if (backendStatus && status === "idle") return backendStatus;
  const labels: Record<TxStatus, string> = {
    idle: "Ready to redeem",
    validating: "Checking proof",
    pending: "Redeem transaction pending",
    signing: "Waiting for wallet signature",
    confirmed: "Redeem confirmed",
    failed: "Redeem failed"
  };
  return labels[status];
}
