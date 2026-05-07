"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, LockKeyhole, ShieldCheck, WalletCards } from "lucide-react";
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

export default function MintPage() {
  const wallet = useWalletAuth();
  const collectionState = useApiResource<VaultCollection[]>("/product/collections");
  const collections = unwrapApiData(collectionState.data) ?? [];
  const defaultCollection = collections[0];
  const [amount, setAmount] = useState("50000");
  const [lockDurationDays, setLockDurationDays] = useState(90);
  const [collectionId, setCollectionId] = useState("");
  const [mintState, setMintState] = useState<any>(null);
  const [visualState, setVisualState] = useState<"idle" | "pending" | "built" | "success">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const collection = collections.find((item) => item.id === collectionId || item.dbId === collectionId) ?? defaultCollection;

  async function createIntent() {
    if (!collection || !wallet.address) {
      setError("Connect a wallet and select a launched collection first.");
      return;
    }
    setLoading(true);
    setVisualState("pending");
    setError(null);
    try {
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
      setVisualState("built");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mint intent failed");
    } finally {
      setLoading(false);
    }
  }

  async function buildTransaction() {
    if (!mintState?.id) return setError("Create a mint intent first.");
    setLoading(true);
    setVisualState("pending");
    setError(null);
    try {
      setMintState(await wallet.authFetch<any>(`/vault/mint/transactions/${mintState.id}/build`, { method: "POST" }));
      setVisualState("built");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction build failed");
    } finally {
      setLoading(false);
    }
  }

  async function signAndSubmit() {
    if (!mintState?.id) return setError("Build a transaction first.");
    const base64 = mintState.unsignedTransaction?.base64UnsignedTransaction;
    if (!base64) return setError("The backend did not return a signable devnet transaction.");
    setLoading(true);
    setVisualState("pending");
    setError(null);
    try {
      const signedTransactionBase64 = await wallet.signTransactionBase64(base64);
      setMintState(
        await wallet.authFetch<any>(`/vault/mint/transactions/${mintState.id}/submit`, {
          method: "POST",
          body: JSON.stringify({ signedTransactionBase64 })
        })
      );
      setVisualState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet signing or submission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell active="mint">
      {collectionState.loading ? <LoadingState label="Loading launched collections" /> : null}
      {collectionState.error ? <ErrorState error={collectionState.error} retry={collectionState.reload} /> : null}
      {!wallet.connected ? <WalletDisconnectedState /> : null}
      {!collectionState.loading && !collectionState.error && !collections.length ? <EmptyState title="No launched collections yet" body="Create and approve a community, then launch it before minting a backed Vault NFT." /> : null}
      {collection ? (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <section className="phew-panel phew-scanline relative overflow-hidden rounded-lg p-6">
            <img src={brandAssets.vaultHero} alt="" className="absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-35 mix-blend-screen" />
            <div className="relative">
              <p className="text-sm font-black uppercase text-vault-green">Mint Vault</p>
              <h1 className="mt-2 max-w-3xl text-4xl font-black">Lock tokens. Mint vault identity. Activate your faction.</h1>
              <p className="mt-3 max-w-2xl text-slate-300">Choose a faction token, seal a backed position, and reveal a vault NFT that can be staked, raided, or traded.</p>
            </div>
          </section>

          <SectionCard title="Token Select">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {collections.map((item) => (
                <button key={item.id} onClick={() => setCollectionId(item.id)} className={item.id === collectionId ? "rounded-lg border border-vault-purple bg-vault-purple/15 p-4 text-left" : "rounded-lg border border-vault-line bg-black/25 p-4 text-left"}>
                  <img src={item.image} alt="" className="mb-3 aspect-square w-full rounded-lg object-cover" />
                  <p className="font-bold">{item.name}</p>
                  <p className="text-sm text-slate-400">{item.mascot}</p>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Deposit and Lock">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
              <form className="space-y-5">
                <PreviewRow label="Connected wallet" value={wallet.address ?? "Disconnected"} />
                <label className="block">
                  <span className="text-sm text-slate-400">SPL Token Mint</span>
                  <input className="mt-2 h-12 w-full rounded-lg border border-vault-line bg-black/25 px-4 text-sm outline-none focus:border-vault-purple" defaultValue={collection.tokenMint} />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-400">Amount to lock</span>
                  <input className="mt-2 h-12 w-full rounded-lg border border-vault-line bg-black/25 px-4 text-sm outline-none focus:border-vault-purple" value={amount} onChange={(event) => setAmount(event.target.value)} />
                </label>
                <div>
                  <p className="mb-3 text-sm text-slate-400">Lock duration</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[["Flexible", 0], ["30 Days", 30], ["90 Days", 90], ["180 Days", 180]].map(([duration, days]) => (
                      <button type="button" key={duration} onClick={() => setLockDurationDays(Number(days))} className={lockDurationDays === Number(days) ? "rounded-lg border border-vault-green bg-vault-green/10 p-3 text-vault-green" : "rounded-lg border border-vault-line bg-black/25 p-3 text-slate-300"}>
                        {duration}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-vault-gold/40 bg-vault-gold/10 p-4 text-sm text-slate-200">
                  <div className="flex gap-3">
                    <AlertTriangle className="size-5 text-vault-gold" />
                    <p>You are creating a lock intent. On production Solana, wallet signing transfers these tokens into a PDA vault. Buyer inherits the unlock date.</p>
                  </div>
                </div>
                {error ? <div className="rounded-lg border border-vault-red/40 bg-vault-red/10 p-3 text-sm text-vault-red">{error}</div> : null}
                <AnimatedButton type="button" onClick={createIntent} loading={loading && visualState === "pending"} className="h-12 w-full" icon={ArrowRight}>
                  Create Mint Intent
                </AnimatedButton>
                <div className="grid gap-2 md:grid-cols-2">
                  <AnimatedButton type="button" tone="outline" onClick={buildTransaction} disabled={loading || !mintState?.id} className="h-12">
                    Build Devnet Tx
                  </AnimatedButton>
                  <AnimatedButton type="button" tone="outline" onClick={signAndSubmit} disabled={loading || !mintState?.unsignedTransaction?.base64UnsignedTransaction} className="h-12">
                    Wallet Sign + Submit
                  </AnimatedButton>
                </div>
              </form>
              <div className={`relative overflow-hidden rounded-lg border border-vault-line bg-black/25 p-4 ${visualState === "pending" ? "shadow-green" : ""}`}>
                <ParticleBurst active={visualState === "success"} rarity="Legendary" />
                <img src={collection.image} alt="" className="aspect-square w-full rounded-lg object-cover" />
                <div className="mt-4 space-y-3">
                  <PreviewRow label="Collection" value={collection.name} />
                  <PreviewRow label="NFT Standard" value="Standard NFT" />
                  <PreviewRow label="Vault PDA" value="Derived on mint" />
                  <PreviewRow label="Redeem" value="Full position only" />
                  <PreviewRow label="Intent status" value={mintState?.status ?? "Not created"} />
                  <PreviewRow label="NFT asset" value={mintState?.nftMint ?? mintState?.unsignedTransaction?.nftAssetAddress ?? "Built after tx"} />
                  <PreviewRow label="Vault position" value={mintState?.vaultPositionPda ?? mintState?.unsignedTransaction?.vaultPositionPda ?? "Built after tx"} />
                  <StatusPill accent="green">Verified collection required</StatusPill>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Transaction State">
            <div className="grid gap-3 md:grid-cols-4">
              {["PENDING", "ASSET_UPLOADED", "TX_BUILT", "CONFIRMED"].map((status) => (
                <div key={status} className="rounded-lg border border-vault-line bg-black/25 p-4">
                  <StatusPill accent={mintState?.status === status ? "green" : "purple"}>{status}</StatusPill>
                  <p className="mt-2 text-sm text-slate-400">{stateCopy(status)}</p>
                </div>
              ))}
            </div>
            {mintState?.txSignature ? (
              <a href={`https://explorer.solana.com/tx/${mintState.txSignature}?cluster=devnet`} className="mt-4 inline-flex h-11 items-center justify-center rounded-lg border border-vault-green px-4 text-sm font-bold text-vault-green">
                View confirmed transaction
              </a>
            ) : null}
            {mintState?.unsignedTransaction ? (
              <pre className="mt-4 max-h-56 overflow-auto rounded-lg border border-vault-line bg-black/40 p-4 text-xs text-slate-300">{JSON.stringify(mintState.unsignedTransaction, null, 2)}</pre>
            ) : null}
          </SectionCard>

          <SectionCard title="Mint Animation">
            <MintRevealAnimation rarity={visualState === "success" ? "Legendary" : "Epic"} label={visualState === "success" ? "Vault revealed" : visualState === "pending" ? "Sealing vault" : "Ready to mint"} />
          </SectionCard>

          <SectionCard title="Mint Safety Rules">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["PDA custody", "Vault token accounts are program-derived and isolated per collection."],
                ["Strict mint validation", "Mint address and collection profile must match one-to-one."],
                ["Redeem protection", "NFT is burned or marked redeemed before tokens release."]
              ].map(([title, body]) => (
                <div key={title} className="rounded-lg border border-vault-line bg-black/25 p-4">
                  <ShieldCheck className="mb-3 size-6 text-vault-green" />
                  <p className="font-bold">{title}</p>
                  <p className="mt-1 text-sm text-slate-400">{body}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <SectionCard title="Selected Collection">
            <img src={collection.image} alt="" className="aspect-square w-full rounded-lg object-cover" />
            <h2 className="mt-4 text-2xl font-black">{collection.name}</h2>
            <p className="mt-2 text-slate-400">{collection.vibe}</p>
            <div className="mt-4">
              <ProgressBar value={collection.xp} max={collection.nextXp} />
              <p className="mt-2 text-sm text-vault-green">Level {collection.level}</p>
            </div>
          </SectionCard>
          <SectionCard title="Estimated Fees">
            <PreviewRow label="Mint vault fee" value="1.5%" />
            <PreviewRow label="Redeem fee" value="1%" />
            <PreviewRow label="Marketplace fee" value="2.5%" />
            <PreviewRow label="Instant sell" value="5-12%" />
          </SectionCard>
          <SectionCard title="Next Steps">
            <Link href="/staking" className="mb-3 flex h-11 items-center justify-center gap-2 rounded-lg border border-vault-line bg-black/25 font-bold">
              <LockKeyhole className="size-4" /> Stake after mint
            </Link>
            <Link href="/marketplace" className="flex h-11 items-center justify-center gap-2 rounded-lg border border-vault-line bg-black/25 font-bold">
              <WalletCards className="size-4" /> Trade on marketplace
            </Link>
          </SectionCard>
        </aside>
      </div>
      ) : null}
    </AppShell>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-vault-line py-3 text-sm last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function stateCopy(status: string) {
  const copy: Record<string, string> = {
    PENDING: "Intent exists and can be safely retried with the same idempotency key.",
    ASSET_UPLOADED: "Final image and metadata have immutable storage URIs.",
    TX_BUILT: "Wallet can sign the generated Phew.run + Metaplex transaction plan.",
    CONFIRMED: "A Vault NFT row is created only after confirmed chain state."
  };
  return copy[status] ?? status;
}
