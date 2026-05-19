import Link from "next/link";
import { LockKeyhole, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { VaultCollection, VaultNft } from "@/lib/types";
import { riskAccent } from "@/lib/risk";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { ProgressBar } from "./ProgressBar";
import { StatusPill } from "./StatusPill";
import { TransactionStatus, type TxStatus } from "./TransactionStatus";
import { ProtocolTrustStrip, vaultTrust } from "./protocol-trust";
import { backendActionOutcome, type BackendActionResponse } from "@/lib/action-contracts";
import { brandAssets } from "@/lib/brand-assets";

export function NFTCard({ nft, collection, listingId }: { nft: VaultNft; collection: VaultCollection; listingId?: string }) {
  const wallet = useWalletAuth();
  const [purchaseStatus, setPurchaseStatus] = useState<TxStatus>("idle");
  const [purchaseDetail, setPurchaseDetail] = useState<string | null>(null);
  const hasBacking = nft.backingSol > 0 && nft.priceSol > 0;
  const premium = hasBacking ? Math.round(((nft.priceSol - nft.backingSol) / nft.backingSol) * 100) : 0;
  const backingPercent = hasBacking ? Math.min(100, Math.round((nft.backingSol / nft.priceSol) * 100)) : 0;
  const trust = vaultTrust(nft, collection);

  async function purchase() {
    setPurchaseDetail(null);
    if (!listingId) {
      setPurchaseStatus("failed");
      setPurchaseDetail("This vault does not have an active listing id.");
      return;
    }
    if (!wallet.connected) {
      setPurchaseStatus("failed");
      setPurchaseDetail("Connect and authenticate your wallet before purchasing.");
      return;
    }
    setPurchaseStatus("validating");
    try {
      setPurchaseStatus("pending");
      const response = await wallet.authFetch<BackendActionResponse>("/marketplace/purchases/intents", {
        method: "POST",
        body: JSON.stringify({ listingId, idempotencyKey: `${wallet.address}:purchase:${listingId}` })
      });
      const outcome = backendActionOutcome(response, "Purchase route returned an intent but no completed escrow/transfer status.");
      setPurchaseStatus(outcome.phase === "confirmed" ? "confirmed" : outcome.phase === "failed" ? "failed" : "pending");
      setPurchaseDetail(outcome.confirmed ? outcome.detail ?? null : outcome.detail ?? "Purchase is pending backend confirmation.");
    } catch (err) {
      setPurchaseStatus("failed");
      setPurchaseDetail(err instanceof Error ? err.message : "Purchase intent failed");
    }
  }

  return (
    <article className="phew-panel phew-card-hover group relative overflow-hidden rounded-lg">
      <Link href={`/nfts/${nft.id}`} className="block">
        <div className="relative aspect-square overflow-hidden">
          <img src={nft.image} alt={nft.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
          <span className="absolute left-3 top-3 rounded-md border border-vault-green/40 bg-black/55 px-2 py-1 text-xs font-black uppercase text-vault-green">{collection.symbol} Vault</span>
          <span className="absolute bottom-3 left-3">
            <StatusPill accent={riskAccent(collection.riskTier)}>{collection.riskTier}</StatusPill>
          </span>
        </div>
      </Link>
      <div className="relative space-y-3 p-4">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{collection.name}</p>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-white">{nft.name}</h3>
              <p className="text-sm text-slate-400">#{nft.number} / {nft.role}</p>
            </div>
            <StatusPill accent={nft.rarity === "Legendary" ? "gold" : nft.rarity === "Epic" ? "purple" : "cyan"}>{nft.rarity}</StatusPill>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {nft.badges.slice(0, 2).map((badge) => (
              <span key={badge} className="rounded-md border border-vault-cyan/25 bg-vault-cyan/10 px-2 py-1 text-[11px] font-bold text-vault-cyan">{badge}</span>
            ))}
            <span className="rounded-md border border-vault-green/20 bg-vault-green/10 px-2 py-1 text-[11px] font-bold text-vault-green">{nft.rank}</span>
          </div>
          <ProtocolTrustStrip trust={trust} compact className="mt-3" />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <ValueTile icon={brandAssets.tokenObject} label="Tokens locked" value={nft.lockedAmount || "N/A"} />
          <ValueTile icon={brandAssets.vaultSafe} label="Backing value" value={`${nft.backingSol.toFixed(2)} SOL`} tone="green" />
          <ValueTile icon={brandAssets.generatedIcons.marketplace} label="Ask price" value={listingId ? `${nft.priceSol.toFixed(2)} SOL` : "N/A"} tone="gold" />
          <ValueTile icon={brandAssets.proofRing} label="Best offer" value="N/A" tone="cyan" />
        </div>
        <div className="rounded-md border border-vault-line bg-black/30 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Backing ratio</span>
            <span className={premium >= 0 ? "font-bold text-vault-gold" : "font-bold text-vault-green"}>
              {hasBacking ? `${premium >= 0 ? "+" : ""}${premium}% premium` : "Awaiting market"}
            </span>
          </div>
          <ProgressBar value={backingPercent} color={premium > 25 ? "gold" : "green"} />
        </div>
        <div className="flex items-center justify-between rounded-md border border-vault-line bg-black/30 px-3 py-2 text-xs text-slate-300">
          <span className="flex items-center gap-2"><LockKeyhole className="size-4 text-vault-green" /> {nft.status}</span>
          <span className="flex items-center gap-1 text-vault-green"><Sparkles className="size-4" /> {nft.aura}</span>
        </div>
        {purchaseStatus !== "idle" ? <TransactionStatus status={purchaseStatus} label={purchaseStatus === "failed" ? "Purchase unavailable" : purchaseStatus === "confirmed" ? "Purchase confirmed" : "Purchase pending"} detail={purchaseDetail} /> : null}
        <button onClick={purchase} disabled={purchaseStatus === "validating" || purchaseStatus === "pending"} className="phew-button phew-button-primary flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-black text-black disabled:opacity-60">
          <TrendingUp className="size-4" /> {listingId ? "Buy Vault" : "No Active Listing"}
        </button>
      </div>
    </article>
  );
}

function ValueTile({ icon, label, value, tone = "slate" }: { icon: string; label: string; value: string; tone?: "slate" | "green" | "gold" | "cyan" }) {
  const valueClass = tone === "green" ? "text-vault-green" : tone === "gold" ? "text-vault-gold" : tone === "cyan" ? "text-vault-cyan" : "text-white";
  return (
    <div className="rounded-md border border-vault-line bg-black/30 p-3">
      <div className="flex items-center gap-2">
        <img src={icon} alt="" className="size-4 object-contain" />
        <p className="truncate text-xs text-slate-500">{label}</p>
      </div>
      <p className={`mt-2 truncate font-black ${valueClass}`}>{value}</p>
    </div>
  );
}
