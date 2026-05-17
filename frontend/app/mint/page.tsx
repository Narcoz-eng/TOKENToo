"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, ExternalLink, LockKeyhole, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ErrorState, WalletDisconnectedState } from "@/components/ApiState";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { useApiResource } from "@/hooks/useApiResource";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { unwrapApiData } from "@/lib/api";
import type { VaultCollection } from "@/lib/types";
import { AnimatedButton } from "@/components/AnimatedButton";
import { brandAssets } from "@/lib/brand-assets";
import { TransactionFlow, transactionStateFromTxStatus, type TransactionFlowState } from "@/components/TransactionFlow";
import { ProtocolTrustStrip, collectionTrust } from "@/components/protocol-trust";
import { TransactionStatus, type TxStatus } from "@/components/TransactionStatus";
import { cn } from "@/lib/utils";

type MintTransaction = {
  id: string;
  status: string;
  txSignature?: string | null;
  assetUri?: string | null;
  metadataUri?: string | null;
  nftMint?: string | null;
  vaultPositionPda?: string | null;
  unsignedTransaction?: {
    base64UnsignedTransaction?: string | null;
    nftAssetAddress?: string | null;
    vaultPositionPda?: string | null;
  } | null;
  vaultNft?: {
    id: string;
    mint: string;
    positionPda?: string | null;
  } | null;
  errorMessage?: string | null;
};

const amountSlider = {
  min: 1,
  max: 1_000_000_000,
  step: 1_000
};

export default function MintPage() {
  const wallet = useWalletAuth();
  const collectionState = useApiResource<VaultCollection[]>("/product/collections");
  const collections = unwrapApiData(collectionState.data) ?? [];
  const mintableCollections = useMemo(() => collections.filter(isMintableCollection), [collections]);
  const [amount, setAmount] = useState("1000000");
  const [lockDurationDays, setLockDurationDays] = useState(90);
  const [collectionId, setCollectionId] = useState("");
  const [mintState, setMintState] = useState<MintTransaction | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const collection = mintableCollections.find((item) => item.id === collectionId || item.dbId === collectionId) ?? mintableCollections[0] ?? null;
  const sliderValue = clampAmount(amount);
  const proofMint = mintState?.vaultNft?.mint ?? mintState?.nftMint ?? null;
  const finalImage = mintState?.assetUri ?? collection?.image ?? null;
  const flowState = mintFlowState(txStatus, mintState, error);

  async function createIntent() {
    if (!collection || !wallet.address) {
      setError("Connect a wallet and select a mint-eligible launched community first.");
      return;
    }
    const normalizedAmount = amount.replace(/,/g, "").trim();
    if (!/^\d+$/.test(normalizedAmount) || BigInt(normalizedAmount) <= 0n) {
      setError("Lock amount must be a positive raw token amount.");
      return;
    }
    setLoading(true);
    setTxStatus("validating");
    setError(null);
    try {
      const data = await wallet.authFetch<MintTransaction>("/vaults/mint/intent", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: `${wallet.address}:${collection.dbId ?? collection.id}:${normalizedAmount}:${lockDurationDays}`,
          collectionId: collection.dbId ?? collection.id,
          tokenMint: collection.tokenMint,
          amount: normalizedAmount,
          lockDurationDays
        })
      });
      setMintState(data);
      setTxStatus("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Mint intent failed";
      setError(message);
      setTxStatus("failed");
    } finally {
      setLoading(false);
    }
  }

  async function buildTransaction() {
    if (!mintState?.id) return setError("Create a mint intent first.");
    setLoading(true);
    setTxStatus("pending");
    setError(null);
    try {
      const data = await wallet.authFetch<MintTransaction>("/vaults/mint/build", {
        method: "POST",
        body: JSON.stringify({ mintTransactionId: mintState.id })
      });
      setMintState(data);
      setTxStatus("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction build failed";
      setError(message);
      setTxStatus("failed");
    } finally {
      setLoading(false);
    }
  }

  async function signAndSubmit() {
    if (!mintState?.id) return setError("Build a transaction first.");
    const base64 = mintState.unsignedTransaction?.base64UnsignedTransaction;
    if (!base64) return setError("The backend did not return a signable devnet transaction.");
    setLoading(true);
    setTxStatus("signing");
    setError(null);
    try {
      const signedTransactionBase64 = await wallet.signTransactionBase64(base64);
      setTxStatus("pending");
      const data = await wallet.authFetch<MintTransaction>("/vaults/mint/submit", {
        method: "POST",
        body: JSON.stringify({ mintTransactionId: mintState.id, signedTransactionBase64 })
      });
      setMintState(data);
      setTxStatus(data.status === "CONFIRMED" ? "confirmed" : "pending");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wallet signing or submission failed";
      setError(message);
      setTxStatus("failed");
    } finally {
      setLoading(false);
    }
  }

  if (collectionState.loading) {
    return (
      <AppShell active="mint">
        <div className="space-y-6">
          <section className="phew-panel phew-hero-canvas relative overflow-hidden rounded-lg">
            <img src={brandAssets.mintVault} alt="" className="absolute inset-0 h-full w-full object-cover opacity-52" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#020806] via-[#020806]/92 to-[#020806]/36" />
            <div className="relative grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_520px]">
              <div className="max-w-3xl">
                <div className="flex flex-wrap gap-2">
                  <StatusPill accent="green">Mint Vault NFT</StatusPill>
                  <StatusPill accent="cyan">Loading live communities</StatusPill>
                </div>
                <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">Lock real community tokens and mint from a verified reserve.</h1>
                <p className="mt-3 text-sm text-slate-300">
                  Mint-eligible communities are loaded from the backend. Missing values stay N/A until a real collection is returned.
                </p>
                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <HeroMetric label="Selected community" value="N/A" />
                  <HeroMetric label="Collection asset" value="N/A" />
                  <HeroMetric label="Reserve PDA" value="N/A" />
                </div>
              </div>
              <TransactionFlow
                state="preparing"
                moment="mint"
                title="Mint Vault NFT"
                description="Loading mint eligibility from the backend before any wallet action is enabled."
                image={null}
                tokenSymbol="PHEW"
                detail="Awaiting live collection data"
                compact
              />
            </div>
          </section>
          <MintEmptyWorkspace />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="mint">
      <div className="space-y-6">
        {collectionState.error ? <ErrorState error={collectionState.error} retry={collectionState.reload} /> : null}
        {!collectionState.error && !mintableCollections.length ? (
          <>
            <section className="phew-panel phew-hero-canvas relative overflow-hidden rounded-lg">
              <img src={brandAssets.mintVault} alt="" className="absolute inset-0 h-full w-full object-cover opacity-46" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#020806] via-[#020806]/92 to-[#020806]/40" />
              <div className="relative grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-center">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap gap-2">
                    <StatusPill accent="green">Mint Vault NFT</StatusPill>
                    <StatusPill accent="gold">No eligible community</StatusPill>
                  </div>
                  <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">No mint-eligible launched communities yet.</h1>
                  <p className="mt-3 text-sm text-slate-300">
                    Minting stays locked until the backend returns a launched collection with a confirmed collection asset, reserve PDA, and Premium production profile.
                  </p>
                  <div className="mt-6">
                    <Link href="/create-community" className="phew-button phew-button-primary inline-flex h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black">
                      Create Community <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
                <TransactionFlow
                  state="idle"
                  moment="mint"
                  title="Mint Vault NFT"
                  description="Input community tokens, transform through reserve validation, output a verified Vault NFT when backend eligibility exists."
                  image={null}
                  tokenSymbol="PHEW"
                  detail="Awaiting eligible launched community"
                  compact
                />
              </div>
            </section>
            <MintEmptyWorkspace />
          </>
        ) : null}

        {collection ? (
          <>
            <section className="phew-panel phew-hero-canvas relative overflow-hidden rounded-lg">
              <img src={brandAssets.mintVault} alt="" className="absolute inset-0 h-full w-full object-cover opacity-52" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#020806] via-[#020806]/92 to-[#020806]/36" />
              <div className="relative grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_520px]">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap gap-2">
                    <StatusPill accent="green">Mint Vault NFT</StatusPill>
                    <StatusPill accent="cyan">Devnet Transaction</StatusPill>
                  </div>
                  <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">Lock real community tokens and mint from a verified reserve.</h1>
                  <p className="mt-3 text-sm text-slate-300">
                    The backend validates token balance, production profile, collection asset, reserve PDA, and vault position PDA before the mint can finalize.
                  </p>
                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    <HeroMetric label="Selected community" value={collection.symbol} />
                    <HeroMetric label="Collection asset" value={collection.collectionAssetAddress ? short(collection.collectionAssetAddress) : "N/A"} />
                    <HeroMetric label="Reserve PDA" value={collection.reserveVaultPda ? short(collection.reserveVaultPda) : "N/A"} />
                  </div>
                  <ProtocolTrustStrip trust={collectionTrust(collection)} className="mt-5 max-w-3xl" />
                </div>
                <div className="space-y-4">
                  <TransactionFlow
                    state={flowState}
                    moment="mint"
                    title="Mint Vault NFT"
                    description="Intent, transaction build, wallet signature, and backend confirmation use the real mint routes."
                    image={finalImage}
                    tokenSymbol={collection.symbol}
                    detail={error ?? mintState?.errorMessage ?? mintState?.status ?? null}
                    compact
                  />
                  <ProjectedVaultCard image={finalImage} collection={collection} amount={amount} lockDurationDays={lockDurationDays} txStatus={txStatus} />
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <main className="space-y-6">
                <SectionCard title="Mint-Eligible Communities">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {mintableCollections.map((item) => {
                      const selected = (collectionId ? item.id === collectionId || item.dbId === collectionId : item.id === collection.id);
                      const trust = collectionTrust(item);
                      return (
                        <button
                          key={item.dbId ?? item.id}
                          onClick={() => {
                            setCollectionId(item.dbId ?? item.id);
                            setMintState(null);
                            setTxStatus("idle");
                          }}
                          className={cn("group overflow-hidden rounded-lg border bg-black/30 text-left transition", selected ? "border-vault-green/70 shadow-green" : "border-vault-line hover:border-vault-cyan/40")}
                        >
                          <div className="relative aspect-[5/3] overflow-hidden">
                            <img src={item.banner || brandAssets.launchHero} alt="" className="h-full w-full object-cover opacity-80 transition group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                            <div className="absolute bottom-3 left-3 right-3">
                              <p className="truncate font-black">{item.name}</p>
                              <p className="mt-1 truncate text-xs text-vault-green">{item.symbol} / {short(item.tokenMint, 6)}</p>
                            </div>
                            <span className="absolute right-3 top-3"><StatusPill accent={selected ? "green" : trust.verified ? "cyan" : "gold"}>{selected ? "Selected" : trust.verified ? "Verified" : "Pending"}</StatusPill></span>
                          </div>
                          <div className="p-3">
                            <ProtocolTrustStrip trust={trust} compact />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </SectionCard>

                <SectionCard title="Vault Terms">
                  {!wallet.connected ? <div className="mb-4"><WalletDisconnectedState /></div> : null}
                  <div className="space-y-5">
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-300">Raw token amount to lock</span>
                      <div className="phew-input mt-2 flex h-14 items-center rounded-md px-4">
                        <input className="min-w-0 flex-1 bg-transparent text-xl font-black outline-none" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" />
                        <span className="ml-3 rounded-md border border-vault-green/30 bg-vault-green/10 px-3 py-1 text-sm font-black text-vault-green">{collection.symbol}</span>
                      </div>
                    </label>
                    <input
                      type="range"
                      min={amountSlider.min}
                      max={amountSlider.max}
                      step={amountSlider.step}
                      value={sliderValue}
                      onChange={(event) => setAmount(event.target.value)}
                      className="w-full accent-vault-green"
                    />
                    <div>
                      <p className="mb-3 text-sm font-semibold text-slate-300">Lock duration</p>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        {[["Flexible", 0], ["30 Days", 30], ["90 Days", 90], ["180 Days", 180]].map(([duration, days]) => (
                          <button type="button" key={duration} onClick={() => setLockDurationDays(Number(days))} className={cn("rounded-md border p-3 text-sm font-black transition", lockDurationDays === Number(days) ? "border-vault-green bg-vault-green/12 text-vault-green shadow-green" : "border-vault-line bg-black/25 text-slate-400 hover:border-vault-cyan/40")}>
                            {duration}
                          </button>
                        ))}
                      </div>
                    </div>
                    {error ? <div className="rounded-md border border-vault-red/40 bg-vault-red/10 p-3 text-sm text-vault-red">{error}</div> : null}
                    <div className="grid gap-3 md:grid-cols-3">
                      <AnimatedButton type="button" onClick={createIntent} loading={loading && txStatus === "validating"} className="h-12" icon={ArrowRight}>
                        Create Intent
                      </AnimatedButton>
                      <AnimatedButton type="button" tone="outline" onClick={buildTransaction} disabled={loading || !mintState?.id} className="h-12">
                        Build Tx
                      </AnimatedButton>
                      <AnimatedButton type="button" tone="outline" onClick={signAndSubmit} disabled={loading || !mintState?.unsignedTransaction?.base64UnsignedTransaction} className="h-12">
                        Sign + Submit
                      </AnimatedButton>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Transaction Checks">
                  <div className="grid gap-3 md:grid-cols-4">
                    <StateTile title="Intent" body="Backend balance and profile checks" complete={Boolean(mintState?.id)} />
                    <StateTile title="Build" body="Devnet transaction built" complete={Boolean(mintState?.unsignedTransaction?.base64UnsignedTransaction)} />
                    <StateTile title="PDA" body="Vault position assigned" complete={Boolean(mintState?.vaultPositionPda ?? mintState?.unsignedTransaction?.vaultPositionPda)} />
                    <StateTile title="Confirm" body="Mint finalized" complete={txStatus === "confirmed" || mintState?.status === "CONFIRMED"} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {mintState?.txSignature ? (
                      <a href={`https://explorer.solana.com/tx/${mintState.txSignature}?cluster=devnet`} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-vault-green px-4 text-sm font-bold text-vault-green">
                        View transaction <ExternalLink className="size-4" />
                      </a>
                    ) : null}
                    {proofMint ? (
                      <Link href={`/vaults/${encodeURIComponent(proofMint)}/proof`} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-vault-cyan/50 bg-vault-cyan/10 px-4 text-sm font-bold text-vault-cyan">
                        Show proof <ShieldCheck className="size-4" />
                      </Link>
                    ) : null}
                  </div>
                </SectionCard>
              </main>

              <aside className="space-y-6">
                <SectionCard title="Mint Status">
                  <TransactionStatus status={txStatus} label={mintStatusLabel(txStatus, mintState?.status)} detail={error ?? mintState?.errorMessage ?? undefined} />
                  <div className="mt-4 space-y-3">
                    <PreviewRow label="Transaction id" value={mintState?.id ?? "Not created"} />
                    <PreviewRow label="NFT mint" value={proofMint ?? "Pending"} />
                    <PreviewRow label="Position PDA" value={mintState?.vaultPositionPda ?? mintState?.unsignedTransaction?.vaultPositionPda ?? "Pending"} />
                    <PreviewRow label="Metadata URI" value={mintState?.metadataUri ?? "Pending"} />
                  </div>
                </SectionCard>

                <SectionCard title="Selected Community">
                  <h2 className="text-2xl font-black">{collection.name}</h2>
                  <p className="mt-2 break-words text-sm text-slate-400">{collection.tokenMint}</p>
                  <ProtocolTrustStrip trust={collectionTrust(collection)} compact className="mt-4" />
                  <div className="mt-4 space-y-3">
                    <PreviewRow label="Launch status" value={collection.launchStatus ?? "N/A"} />
                    <PreviewRow label="Reserve health" value={collection.reserveHealth ?? "N/A"} />
                    <PreviewRow label="Available backing" value={collection.availableBacking ?? "0"} />
                  </div>
                </SectionCard>

                <SectionCard title="After Mint">
                  <Link href={proofMint ? `/vaults/${encodeURIComponent(proofMint)}/proof` : "/proof"} className="mb-3 flex h-11 items-center justify-center gap-2 rounded-md border border-vault-line bg-black/25 font-bold">
                    <ShieldCheck className="size-4 text-vault-green" /> Open proof
                  </Link>
                  <Link href="/staking" className="flex h-11 items-center justify-center gap-2 rounded-md border border-vault-line bg-black/25 font-bold">
                    <LockKeyhole className="size-4 text-vault-cyan" /> Stake eligible vault
                  </Link>
                </SectionCard>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function MintEmptyWorkspace() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <main className="space-y-5">
        <SectionCard title="Mint Configuration">
          <div className="grid gap-3 md:grid-cols-3">
            <HeroMetric label="Selected community" value="N/A" />
            <HeroMetric label="Collection asset" value="N/A" />
            <HeroMetric label="Reserve PDA" value="N/A" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <StateTile title="Intent" body="Waiting for launched community" complete={false} />
            <StateTile title="Build" body="Transaction N/A" complete={false} />
            <StateTile title="Confirm" body="Mint N/A" complete={false} />
          </div>
        </SectionCard>

        <SectionCard title="Mint-Eligible Communities">
          <div className="rounded-lg border border-dashed border-vault-line bg-black/25 p-5 text-sm text-slate-400">
            No eligible launched communities were returned by the backend. The list stays empty instead of showing demo collections.
          </div>
        </SectionCard>
      </main>

      <aside className="space-y-5">
        <SectionCard title="Mint Status">
          <TransactionStatus status="idle" label="Ready when eligible" detail="Create or launch a community before minting." />
          <div className="mt-4 space-y-3">
            <PreviewRow label="Transaction id" value="N/A" />
            <PreviewRow label="NFT mint" value="N/A" />
            <PreviewRow label="Position PDA" value="N/A" />
          </div>
        </SectionCard>

        <SectionCard title="Next Action">
          <Link href="/create-community" className="phew-button phew-button-primary flex h-11 items-center justify-center rounded-md text-sm font-black text-black">
            Create Community
          </Link>
        </SectionCard>
      </aside>
    </div>
  );
}

function ProjectedVaultCard({ image, collection, amount, lockDurationDays, txStatus }: { image?: string | null; collection: VaultCollection; amount: string; lockDurationDays: number; txStatus: TxStatus }) {
  return (
    <div className="rounded-lg border border-vault-green/30 bg-black/45 p-4 shadow-green">
      <div className="relative overflow-hidden rounded-lg">
        {image ? (
          <img src={image} alt="" className="aspect-[4/5] w-full object-cover" />
        ) : (
          <div className="grid aspect-[4/5] w-full place-items-center border border-dashed border-vault-green/35 bg-[radial-gradient(circle_at_50%_28%,rgba(186,255,0,0.2),rgba(0,0,0,0.9)_62%)]">
            <img src={brandAssets.mascot} alt="" className="size-28 object-contain drop-shadow-[0_0_22px_rgba(186,255,0,0.24)]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <StatusPill accent={txStatus === "confirmed" ? "gold" : "green"}>{txStatus === "confirmed" ? "Minted" : "Selected"}</StatusPill>
          <p className="mt-2 text-xl font-black">{collection.symbol} Vault NFT</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        <PreviewRow label="Locked amount" value={`${amount} ${collection.symbol}`} />
        <PreviewRow label="Duration" value={lockDurationDays ? `${lockDurationDays} days` : "Flexible"} />
        <PreviewRow label="Vault status" value={txStatus === "idle" ? "Ready" : txStatus} />
      </div>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-vault-line bg-black/35 p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-black">{value}</p>
    </div>
  );
}

function StateTile({ title, body, complete }: { title: string; body: string; complete: boolean }) {
  return (
    <div className={cn("rounded-md border p-4", complete ? "border-vault-green/40 bg-vault-green/10" : "border-vault-line bg-black/25")}>
      {complete ? <CheckCircle2 className="mb-3 size-5 text-vault-green" /> : <Clock3 className="mb-3 size-5 text-slate-500" />}
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{body}</p>
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

function isMintableCollection(collection: VaultCollection) {
  return collection.mintEligible === true;
}

function mintStatusLabel(status: TxStatus, backendStatus?: string) {
  if (backendStatus && status === "idle") return backendStatus;
  const labels: Record<TxStatus, string> = {
    idle: "Ready to mint",
    validating: "Validating vault terms",
    pending: "Submitting devnet transaction",
    signing: "Waiting for wallet signature",
    confirmed: "Vault NFT minted",
    failed: "Mint failed"
  };
  return labels[status];
}

function mintFlowState(status: TxStatus, transaction: MintTransaction | null, error: string | null): TransactionFlowState {
  if (error || status === "failed") return "error";
  if (status !== "idle") return transactionStateFromTxStatus(status);
  return transactionStateFromTxStatus(transaction?.status);
}

function clampAmount(value: string) {
  const numeric = Number(value.replace(/,/g, "").trim());
  if (!Number.isFinite(numeric)) return amountSlider.min;
  return Math.min(amountSlider.max, Math.max(amountSlider.min, Math.trunc(numeric)));
}

function short(value?: string | null, size = 8) {
  if (!value) return "N/A";
  if (value.length <= size * 2 + 3) return value;
  return `${value.slice(0, size)}...${value.slice(-size)}`;
}
