import Link from "next/link";
import { Heart, LockKeyhole, Sparkles, TrendingUp } from "lucide-react";
import type { VaultCollection, VaultNft } from "@/lib/types";
import { riskAccent } from "@/lib/risk";
import { ProgressBar } from "./ProgressBar";
import { StatusPill } from "./StatusPill";

export function NFTCard({ nft, collection }: { nft: VaultNft; collection: VaultCollection }) {
  const hasBacking = nft.backingSol > 0 && nft.priceSol > 0;
  const premium = hasBacking ? Math.round(((nft.priceSol - nft.backingSol) / nft.backingSol) * 100) : 0;
  const backingPercent = hasBacking ? Math.min(100, Math.round((nft.backingSol / nft.priceSol) * 100)) : 0;

  return (
    <article className="phew-panel phew-card-hover group relative overflow-hidden rounded-lg">
      <Link href={`/nfts/${nft.id}`} className="block">
        <div className="relative aspect-square overflow-hidden">
          <img src={nft.image} alt={nft.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
          <button className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-md border border-white/15 bg-black/45 text-white transition hover:border-vault-green/50 hover:text-vault-green" aria-label="Add to watchlist">
            <Heart className="size-4" />
          </button>
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
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500">List price</p>
            <p className="font-bold">{nft.priceSol.toFixed(2)} SOL</p>
          </div>
          <div>
            <p className="text-slate-500">Vault backing</p>
            <p className="font-semibold text-slate-300">{nft.backingSol.toFixed(2)} SOL</p>
          </div>
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
        <button className="phew-button phew-button-primary flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-black text-black">
          <TrendingUp className="size-4" /> Buy Vault
        </button>
      </div>
    </article>
  );
}
