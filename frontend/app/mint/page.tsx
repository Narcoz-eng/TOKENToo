"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, LockKeyhole, ShieldCheck, Sparkles, WalletCards, Zap } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState, WalletDisconnectedState } from "@/components/ApiState";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { useApiResource } from "@/hooks/useApiResource";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { unwrapApiData } from "@/lib/api";
import type { VaultCollection } from "@/lib/types";
import { AnimatedButton } from "@/components/AnimatedButton";
import { MintRevealAnimation, ParticleBurst } from "@/components/animations";
import { brandAssets } from "@/lib/brand-assets";
import { TransactionStatus, type TxStatus } from "@/components/TransactionStatus";
import { cn } from "@/lib/utils";

export default function MintPage() {
  const wallet = useWalletAuth();
  const collectionState = useApiResource<VaultCollection[]>("/product/collections");
  const collections = unwrapApiData(collectionState.data) ?? [];
  const defaultCollection = collections[0] ?? fallbackMintCollection();
  const [amount, setAmount] = useState("50000");
  const [lockDurationDays, setLockDurationDays] = useState(90);
  const [collectionId, setCollectionId] = useState("");
  const [mintState, setMintState] = useState<any>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const collection = collections.find((item) => item.id === collectionId || item.dbId === collectionId) ?? defaultCollection;
  const projectedImage = collection?.image && !isOffBrandImage(collection.image) ? collection.image : brandAssets.nftVaults[0];

  async function createIntent() {
    if (!collection || !wallet.address) {
      setError("Connect a wallet and select a launched collection first.");
      return;
    }
    setLoading(true);
    setTxStatus("validating");
    setError(null);
    try {
      setTxStatus("pending");
      const data = await wallet.authFetch<any>("/vault/mint/intents", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: `${wallet.address}:${collection.dbId ?? collection.id}:${amount}:${lockDurationDays}`,
          collectionId: collection.dbId ?? collection.id,
          tokenMint: collection.tokenMint,
          amount,
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
      setMintState(await wallet.authFetch<any>(`/vault/mint/transactions/${mintState.id}/build`, { method: "POST" }));
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
      setMintState(
        await wallet.authFetch<any>(`/vault/mint/transactions/${mintState.id}/submit`, {
          method: "POST",
          body: JSON.stringify({ signedTransactionBase64 })
        })
      );
      setTxStatus("confirmed");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wallet signing or submission failed";
      setError(message);
      setTxStatus("failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell active="mint">
      {collectionState.error ? <ErrorState error={collectionState.error} retry={collectionState.reload} /> : null}
      {!collectionState.loading && !collectionState.error && !collections.length ? <EmptyState title="No launched collections yet" body="Create and approve a community, then launch it before minting a backed Vault NFT." /> : null}
      {collection ? (
        <div className="space-y-6">
          <section className="phew-panel relative overflow-hidden rounded-lg">
            <img src={brandAssets.mintVault} alt="" className="absolute inset-0 h-full w-full object-cover opacity-62" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#020806] via-[#020806]/90 to-[#020806]/26" />
            <div className="absolute inset-0 grid-mask opacity-20" />
            <div className="relative grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:p-8">
              <div className="max-w-3xl">
                <p className="text-sm font-black uppercase text-vault-green">Mint Vault NFT</p>
                <h1 className="mt-3 text-5xl font-black leading-tight">Seal tokens into a premium vault identity.</h1>
                <p className="mt-4 text-slate-300">Select a launched faction, lock an amount, choose duration, and mint a vault NFT ready for staking, raids, and marketplace liquidity.</p>
                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  <HeroMetric label="Selected faction" value={collection.symbol} />
                  <HeroMetric label="Lock duration" value={lockDurationDays ? `${lockDurationDays}d` : "Flexible"} />
                  <HeroMetric label="Vault state" value={mintState?.status ?? "Draft"} />
                </div>
              </div>
              <ProjectedVaultCard image={projectedImage} collection={collection} amount={amount} lockDurationDays={lockDurationDays} txStatus={txStatus} />
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <main className="space-y-6">
              <SectionCard title="Choose Faction">
                {collectionState.loading ? (
                  <div className="mb-4 rounded-md border border-vault-cyan/20 bg-vault-cyan/8 p-3 text-sm text-slate-300">Syncing launched factions. The preview remains available while live data loads.</div>
                ) : null}
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {(collections.length ? collections : [fallbackMintCollection()]).map((item, index) => {
                    const selected = (collectionId ? item.id === collectionId : item.id === collection.id);
                    return (
                      <button key={item.id} onClick={() => setCollectionId(item.id)} className={cn("group overflow-hidden rounded-lg border bg-black/30 text-left transition", selected ? "border-vault-green/70 shadow-green" : "border-vault-line hover:border-vault-cyan/40")}>
                        <div className="relative aspect-[5/3] overflow-hidden">
                          <img src={isOffBrandImage(item.banner) ? brandAssets.launchHero : item.banner || brandAssets.launchHero} alt="" className="h-full w-full object-cover opacity-80 transition group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                          <div className="absolute bottom-3 left-3 right-3">
                            <p className="font-black">{item.name}</p>
                            <p className="mt-1 text-xs text-vault-green">{item.symbol} vault faction</p>
                          </div>
                          <span className="absolute right-3 top-3"><StatusPill accent={selected ? "green" : index % 2 ? "cyan" : "gold"}>{selected ? "Selected" : item.qualityTier}</StatusPill></span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard title="Vault Terms">
                {!wallet.connected ? <div className="mb-4"><WalletDisconnectedState /></div> : null}
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-5">
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-300">Amount to lock</span>
                      <div className="phew-input mt-2 flex h-14 items-center rounded-md px-4">
                        <input className="min-w-0 flex-1 bg-transparent text-xl font-black outline-none" value={amount} onChange={(event) => setAmount(event.target.value)} />
                        <span className="ml-3 rounded-md border border-vault-green/30 bg-vault-green/10 px-3 py-1 text-sm font-black text-vault-green">{collection.symbol}</span>
                      </div>
                    </label>
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
                      <AnimatedButton type="button" onClick={createIntent} loading={loading && (txStatus === "validating" || txStatus === "pending")} className="h-12" icon={ArrowRight}>
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
                  <div className="rounded-lg border border-vault-line bg-black/30 p-4">
                    <p className="text-sm font-black uppercase text-slate-400">Projected vault NFT</p>
                    <img src={projectedImage} alt="" className="mt-4 aspect-[4/5] w-full rounded-lg border border-vault-green/25 object-cover" />
                    <PreviewRow label="Backing token" value={collection.symbol} />
                    <PreviewRow label="NFT standard" value="Vault identity" />
                    <PreviewRow label="Redeem mode" value="Full position" />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Transaction State">
                <div className="grid gap-3 md:grid-cols-4">
                  {[
                    ["Intent", "Create lock intent", Boolean(mintState?.id)],
                    ["Build", "Prepare devnet tx", Boolean(mintState?.unsignedTransaction)],
                    ["Sign", "Wallet approval", txStatus === "signing" || txStatus === "pending" || txStatus === "confirmed"],
                    ["Confirm", "Vault minted", txStatus === "confirmed" || mintState?.status === "CONFIRMED"]
                  ].map(([title, body, complete]) => (
                    <StateTile key={title as string} title={title as string} body={body as string} complete={Boolean(complete)} />
                  ))}
                </div>
                {mintState?.txSignature ? (
                  <a href={`https://explorer.solana.com/tx/${mintState.txSignature}?cluster=devnet`} className="mt-4 inline-flex h-11 items-center justify-center rounded-md border border-vault-green px-4 text-sm font-bold text-vault-green">
                    View confirmed transaction
                  </a>
                ) : null}
              </SectionCard>
            </main>

            <aside className="space-y-6">
              <SectionCard title="Mint Sequence">
                <div className="relative overflow-hidden rounded-lg">
                  <ParticleBurst active={txStatus === "confirmed"} rarity="Legendary" />
                  <MintRevealAnimation rarity={txStatus === "confirmed" ? "Legendary" : "Epic"} label={txStatus === "confirmed" ? "Vault revealed" : txStatus === "pending" || txStatus === "signing" ? "Sealing vault" : "Ready"} />
                </div>
                <div className="mt-4">
                  <TransactionStatus status={txStatus} label={mintStatusLabel(txStatus)} detail={error} />
                </div>
              </SectionCard>

              <SectionCard title="Selected Collection">
                <h2 className="text-2xl font-black">{collection.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{collection.vibe}</p>
                <div className="mt-4">
                  <ProgressBar value={collection.xp} max={collection.nextXp} />
                  <p className="mt-2 text-sm text-vault-green">Level {collection.level} faction</p>
                </div>
              </SectionCard>

              <SectionCard title="After Mint">
                <Link href="/staking" className="mb-3 flex h-11 items-center justify-center gap-2 rounded-md border border-vault-line bg-black/25 font-bold">
                  <LockKeyhole className="size-4 text-vault-green" /> Stake vault NFT
                </Link>
                <Link href="/marketplace" className="flex h-11 items-center justify-center gap-2 rounded-md border border-vault-line bg-black/25 font-bold">
                  <WalletCards className="size-4 text-vault-cyan" /> Trade on marketplace
                </Link>
              </SectionCard>
            </aside>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function ProjectedVaultCard({ image, collection, amount, lockDurationDays, txStatus }: { image: string; collection: VaultCollection; amount: string; lockDurationDays: number; txStatus: TxStatus }) {
  return (
    <div className="rounded-lg border border-vault-green/30 bg-black/45 p-4 shadow-green">
      <div className="relative overflow-hidden rounded-lg">
        <img src={image} alt="" className="aspect-[4/5] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <StatusPill accent={txStatus === "confirmed" ? "gold" : "green"}>{txStatus === "confirmed" ? "Minted" : "Projected"}</StatusPill>
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
      <p className="mt-1 text-xl font-black">{value}</p>
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
      <span className="min-w-0 truncate text-right font-semibold">{value}</span>
    </div>
  );
}

function isOffBrandImage(src?: string | null) {
  if (!src) return true;
  const value = src.toLowerCase();
  return value.includes("frog") || value.includes("pepe") || value.includes("doge") || value.includes("cat") || value.includes("placeholder") || value.includes("pink") || value.includes("smiley");
}

function mintStatusLabel(status: TxStatus) {
  const labels: Record<TxStatus, string> = {
    idle: "Ready to mint",
    validating: "Validating vault terms",
    pending: "Sealing vault",
    signing: "Waiting for wallet signature",
    confirmed: "Vault NFT minted",
    failed: "Mint failed"
  };
  return labels[status];
}

function fallbackMintCollection(): VaultCollection {
  return {
    id: "phew-preview",
    symbol: "PHEW",
    name: "PHEW Vault Faction",
    subtitle: "Premium vault preview",
    tokenMint: "Connect wallet for live token mint",
    description: "A premium token-backed faction preview for vault minting.",
    image: brandAssets.nftVaults[0],
    banner: brandAssets.launchHero,
    mascot: "Vault Relic",
    theme: "Dark sci-fi vault faction",
    vibe: "Cinematic vault identity with neon lime energy, raid readiness, and staking hooks.",
    chain: "Solana Devnet",
    category: "Vault",
    floorSol: 0,
    volume24hSol: 0,
    volumeSol: 0,
    holders: 0,
    vaults: 0,
    minted: 0,
    supply: 10000,
    level: 1,
    xp: 42,
    nextXp: 100,
    apy: 0,
    online: 0,
    riskScore: 92,
    riskTier: "SAFE",
    qualityTier: "Premium",
    instantSellEnabled: false,
    palette: ["#baff00", "#16d7d2", "#071017", "#f4c542"],
    mascotType: "symbolic subject",
    silhouette: "Vault relic",
    activeUsers24h: 0,
    raidSuccessRate: 0,
    averageHoldDays: 0,
    communityTraits: ["Vault-backed", "Raid-ready", "Stake-enabled"],
    legendaryTrait: "Founder Crown",
    traitLayers: {
      base: ["Obsidian vault"],
      headgear: ["Founder seal"],
      eyes: ["Lime core"],
      aura: ["Cyan charge"],
      accessory: ["Vault key"],
      background: ["Command chamber"]
    },
    styleProfile: {
      artStyle: "Dark premium sci-fi vault",
      shapeLanguage: "Sharp angular relics",
      visualFx: ["Neon lime energy", "Cyan edge light"],
      baseVariantCount: 3,
      microRandomization: "Energy core intensity, frame etching, and relic trim variation"
    },
    nextUnlocks: ["Launch collection to unlock live minting"]
  };
}
