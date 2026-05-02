import Link from "next/link";
import { Heart, LockKeyhole, Sparkles } from "lucide-react";
import type { VaultCollection, VaultNft } from "@/lib/types";
import { StatusPill } from "./StatusPill";

export function NFTCard({ nft, collection }: { nft: VaultNft; collection: VaultCollection }) {
  return (
    <article className="glass group overflow-hidden rounded-lg transition hover:-translate-y-0.5 hover:border-vault-purple/60">
      <Link href={`/nfts/${nft.id}`} className="block">
        <div className="relative aspect-square overflow-hidden">
          <img src={nft.image} alt={nft.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          <button className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg border border-white/15 bg-black/45 text-white" aria-label="Add to watchlist">
            <Heart className="size-4" />
          </button>
          <span className="absolute left-3 top-3 rounded-md border border-vault-green/40 bg-black/55 px-2 py-1 text-xs font-semibold text-vault-green">{collection.symbol} Vault</span>
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs uppercase text-slate-500">{collection.name}</p>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-white">{nft.name}</h3>
              <p className="text-sm text-slate-400">#{nft.number}</p>
            </div>
            <StatusPill accent={nft.rarity === "Legendary" ? "gold" : nft.rarity === "Epic" ? "purple" : "cyan"}>{nft.rarity}</StatusPill>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500">Price</p>
            <p className="font-bold">{nft.priceSol.toFixed(2)} SOL</p>
          </div>
          <div>
            <p className="text-slate-500">Backing</p>
            <p className="font-semibold text-slate-300">${nft.backingUsd.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-vault-line bg-black/25 px-3 py-2 text-xs text-slate-300">
          <span className="flex items-center gap-2"><LockKeyhole className="size-4 text-vault-green" /> {nft.status}</span>
          <span className="flex items-center gap-1 text-vault-green"><Sparkles className="size-4" /> {nft.apy}% APY</span>
        </div>
        <button className="h-10 w-full rounded-lg bg-vault-purple text-sm font-bold text-white shadow-glow">Buy Now</button>
      </div>
    </article>
  );
}

