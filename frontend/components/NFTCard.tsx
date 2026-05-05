import Link from "next/link";
import { Heart, LockKeyhole, Sparkles, TrendingUp } from "lucide-react";
import type { VaultCollection, VaultNft } from "@/lib/types";
import { StatusPill } from "./StatusPill";
import { ProgressBar } from "./ProgressBar";
import { riskAccent } from "@/lib/risk";

export function NFTCard({ nft, collection }: { nft: VaultNft; collection: VaultCollection }) {
  const premium = Math.round(((nft.priceSol - nft.backingSol) / nft.backingSol) * 100);
  const backingPercent = Math.min(100, Math.round((nft.backingSol / nft.priceSol) * 100));

  return (
    <article className="glass group overflow-hidden rounded-lg transition hover:-translate-y-0.5 hover:border-vault-purple/60">
      <Link href={`/nfts/${nft.id}`} className="block">
        <div className="relative aspect-square overflow-hidden">
          <img src={nft.image} alt={nft.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          <button className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg border border-white/15 bg-black/45 text-white" aria-label="Add to watchlist">
            <Heart className="size-4" />
          </button>
          <span className="absolute left-3 top-3 rounded-md border border-vault-green/40 bg-black/55 px-2 py-1 text-xs font-semibold text-vault-green">{collection.symbol} Vault</span>
          <span className="absolute bottom-3 left-3">
            <StatusPill accent={riskAccent(collection.riskTier)}>{collection.riskTier}</StatusPill>
          </span>
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs uppercase text-slate-500">{collection.name}</p>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-white">{nft.name}</h3>
              <p className="text-sm text-slate-400">#{nft.number} · {nft.role}</p>
            </div>
            <StatusPill accent={nft.rarity === "Legendary" ? "gold" : nft.rarity === "Epic" ? "purple" : "cyan"}>{nft.rarity}</StatusPill>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {nft.badges.slice(0, 2).map((badge) => (
              <span key={badge} className="rounded-md bg-vault-purple/20 px-2 py-1 text-[11px] font-semibold text-purple-100">{badge}</span>
            ))}
            <span className="rounded-md bg-vault-green/10 px-2 py-1 text-[11px] font-semibold text-vault-green">{nft.rank}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500">Price</p>
            <p className="font-bold">{nft.priceSol.toFixed(2)} SOL</p>
          </div>
          <div>
            <p className="text-slate-500">Backing</p>
            <p className="font-semibold text-slate-300">{nft.backingSol.toFixed(2)} SOL</p>
          </div>
        </div>
        <div className="rounded-lg border border-vault-line bg-black/25 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Price vs backing</span>
            <span className={premium >= 0 ? "font-bold text-vault-gold" : "font-bold text-vault-green"}>
              {premium >= 0 ? "+" : ""}{premium}% premium
            </span>
          </div>
          <ProgressBar value={backingPercent} color={premium > 25 ? "gold" : "green"} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-vault-line bg-black/25 px-3 py-2 text-xs text-slate-300">
          <span className="flex items-center gap-2"><LockKeyhole className="size-4 text-vault-green" /> {nft.status}</span>
          <span className="flex items-center gap-1 text-vault-green"><Sparkles className="size-4" /> {nft.aura}</span>
        </div>
        <button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-vault-purple text-sm font-bold text-white shadow-glow">
          <TrendingUp className="size-4" /> Buy Now
        </button>
      </div>
    </article>
  );
}
