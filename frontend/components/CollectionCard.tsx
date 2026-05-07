import Link from "next/link";
import { BadgeCheck, Users } from "lucide-react";
import type { CSSProperties } from "react";
import type { VaultCollection } from "@/lib/types";
import { riskAccent } from "@/lib/risk";
import { ProgressBar } from "./ProgressBar";
import { StatusPill } from "./StatusPill";

export function CollectionCard({ collection }: { collection: VaultCollection }) {
  const [primary = "#baff00", secondary = "#16d7d2"] = collection.palette;
  const collectionStyle = {
    borderColor: `${primary}66`,
    background: `linear-gradient(180deg, ${secondary}14, rgba(7, 12, 21, 0.82))`
  } satisfies CSSProperties;

  return (
    <Link href={`/collections/${collection.id}`} className="group glass block overflow-hidden rounded-lg transition hover:-translate-y-0.5" style={collectionStyle}>
      <div className="relative aspect-square overflow-hidden">
        <img src={collection.image} alt={collection.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        <div className="absolute left-3 top-3 flex gap-2">
          <StatusPill accent={riskAccent(collection.riskTier)}>{collection.riskTier}</StatusPill>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white">{collection.name}</h3>
            <BadgeCheck className="size-4 text-vault-purple" />
          </div>
          <p className="text-sm text-slate-400">{collection.subtitle}</p>
          <p className="mt-2 text-xs text-vault-green">{collection.mascot} / {collection.mascotType}</p>
          <div className="mt-3 flex gap-1" aria-label={`${collection.name} color palette`}>
            {collection.palette.slice(0, 5).map((color) => (
              <span key={color} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500">Floor</p>
            <p className="font-semibold">{collection.floorSol} SOL</p>
          </div>
          <div>
            <p className="text-slate-500">Vol 24h</p>
            <p className="font-semibold">{collection.volume24hSol.toLocaleString()} SOL</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <StatusPill accent={collection.instantSellEnabled ? "green" : "red"}>{collection.instantSellEnabled ? "Instant Sell" : "Gated"}</StatusPill>
          <StatusPill accent={collection.qualityTier === "Basic" ? "gold" : "purple"}>{collection.qualityTier}</StatusPill>
          <span className="flex items-center gap-1 text-slate-400">
            <Users className="size-4" /> {collection.holders.toLocaleString()}
          </span>
        </div>
        <ProgressBar value={collection.xp} max={collection.nextXp} />
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Level {collection.level}</span>
          <span>{collection.xp.toLocaleString()} XP</span>
        </div>
      </div>
    </Link>
  );
}
