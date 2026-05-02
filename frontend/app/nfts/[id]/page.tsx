import Link from "next/link";
import { BadgeCheck, LockKeyhole, ShoppingCart, Swords } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { collections, getCollection, vaultNfts } from "@/lib/mock-data";

export function generateStaticParams() {
  return vaultNfts.map((nft) => ({ id: nft.id }));
}

export default function NftDetailPage({ params }: { params: { id: string } }) {
  const nft = vaultNfts.find((item) => item.id === params.id) ?? vaultNfts[0];
  const collection = collections.find((item) => item.id === nft.collectionId) ?? getCollection();

  return (
    <AppShell active="marketplace">
      <div className="grid gap-5 xl:grid-cols-[520px_minmax(0,1fr)_360px]">
        <SectionCard>
          <img src={nft.image} alt={nft.name} className="aspect-square w-full rounded-lg object-cover shadow-glow" />
        </SectionCard>

        <div className="space-y-5">
          <SectionCard>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-black">{nft.name} #{nft.number}</h1>
              <BadgeCheck className="size-7 text-vault-purple" />
            </div>
            <Link href={`/collections/${collection.id}`} className="mt-2 inline-block text-vault-purple">{collection.name}</Link>
            <p className="mt-4 text-slate-300">A tradable Vault NFT with real SPL token backing. Buyer inherits unlock date and redeemability.</p>
            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <DetailMetric label="Price" value={`${nft.priceSol} SOL`} />
              <DetailMetric label="Backing" value={nft.lockedAmount} />
              <DetailMetric label="Duration" value={nft.duration} />
              <DetailMetric label="APY" value={`${nft.apy}%`} green />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="flex h-12 items-center gap-2 rounded-lg bg-vault-purple px-6 font-bold shadow-glow"><ShoppingCart className="size-4" /> Buy Now</button>
              <Link href="/instant-sell" className="flex h-12 items-center gap-2 rounded-lg border border-vault-line bg-black/25 px-6 font-bold"><LockKeyhole className="size-4" /> Instant Sell Quote</Link>
              <Link href="/raids" className="flex h-12 items-center gap-2 rounded-lg border border-vault-line bg-black/25 px-6 font-bold"><Swords className="size-4" /> Raid with NFT</Link>
            </div>
          </SectionCard>

          <SectionCard title="Vault Traits">
            <div className="grid gap-3 md:grid-cols-5">
              {[
                ["Locked Amount", nft.lockedAmount],
                ["Lock Duration", nft.duration],
                ["Tier", nft.tier],
                ["Redeemable", nft.status === "Redeemable" ? "Yes" : "After unlock"],
                ["Vault Type", "Community"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-vault-line bg-black/25 p-4">
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-1 font-bold">{value}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Community Traits">
            <div className="grid gap-3 md:grid-cols-3">
              {collection.communityTraits.slice(0, 6).map((trait) => (
                <div key={trait} className="rounded-lg border border-vault-purple/30 bg-vault-purple/10 p-4">
                  <p className="font-bold">{trait}</p>
                  <p className="text-sm text-slate-400">Unique to {collection.symbol}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <SectionCard title="Redeem Status">
            <StatusPill accent={nft.status === "Redeemable" ? "green" : "purple"}>{nft.status}</StatusPill>
            <div className="mt-5">
              <ProgressBar value={nft.status === "Redeemable" ? 100 : 64} />
              <p className="mt-2 text-sm text-slate-400">Unlock date: {nft.unlockDate}</p>
            </div>
            <button className="mt-5 h-11 w-full rounded-lg border border-vault-line bg-black/25 font-bold">Redeem After Unlock</button>
          </SectionCard>
          <SectionCard title="Collection Level">
            <p className="text-3xl font-black text-vault-green">Level {collection.level}</p>
            <ProgressBar value={collection.xp} max={collection.nextXp} />
            <p className="mt-2 text-sm text-slate-400">{collection.xp.toLocaleString()} / {collection.nextXp.toLocaleString()} XP</p>
          </SectionCard>
        </aside>
      </div>
    </AppShell>
  );
}

function DetailMetric({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="rounded-lg border border-vault-line bg-black/25 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={green ? "mt-1 text-xl font-black text-vault-green" : "mt-1 text-xl font-black"}>{value}</p>
    </div>
  );
}
