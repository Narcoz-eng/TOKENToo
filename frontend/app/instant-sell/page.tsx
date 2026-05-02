import { AlertTriangle, ShieldCheck, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { collections, getCollection, vaultNfts } from "@/lib/mock-data";

export default function InstantSellPage() {
  const collection = getCollection();
  const nft = vaultNfts[0];
  const discount = collection.riskScore >= 80 ? 5 : collection.riskScore >= 60 ? 12 : 0;
  const quote = nft.priceSol * (1 - discount / 100);

  return (
    <AppShell active="instant-sell">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <div>
            <p className="text-sm font-bold uppercase text-vault-purple">Instant Sell</p>
            <h1 className="mt-2 text-4xl font-black">Sell a Vault NFT against isolated collection liquidity.</h1>
            <p className="mt-2 max-w-2xl text-slate-400">Instant sell is only enabled after risk gates pass. VaultX never uses one global liquidity pool across all tokens.</p>
          </div>

          <SectionCard title="Quote">
            <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
              <img src={nft.image} alt={nft.name} className="aspect-square w-full rounded-lg object-cover" />
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-black">{nft.name} #{nft.number}</h2>
                  <p className="text-slate-400">{collection.name}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <QuoteMetric label="Backing Value" value={`${nft.priceSol.toFixed(2)} SOL`} />
                  <QuoteMetric label="Risk Discount" value={`${discount}%`} />
                  <QuoteMetric label="Instant Quote" value={`${quote.toFixed(2)} SOL`} green />
                </div>
                <button className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-vault-purple font-bold shadow-glow">
                  <Zap className="size-4" /> Accept Quote
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Eligibility">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["Token age", ">= 48h", true],
                ["Liquidity", "Above threshold", true],
                ["Risk score", `${collection.riskScore} / 100`, true],
                ["Emergency flag", "Inactive", true],
                ["Active volume", `${collection.volume24hSol.toLocaleString()} SOL`, true],
                ["Collection pool", "Isolated", true]
              ].map(([label, value, ok]) => (
                <div key={label as string} className="flex items-center justify-between rounded-lg border border-vault-line bg-black/20 p-4">
                  <div>
                    <p className="font-semibold">{label as string}</p>
                    <p className="text-sm text-slate-400">{value as string}</p>
                  </div>
                  {ok ? <ShieldCheck className="size-5 text-vault-green" /> : <AlertTriangle className="size-5 text-vault-red" />}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Risk Tiers">
            <div className="grid gap-3 md:grid-cols-3">
              <Tier label="Low Risk" discount="5%" active />
              <Tier label="Medium Risk" discount="12%" />
              <Tier label="High Risk" discount="Disabled" danger />
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <SectionCard title="Collection Gate">
            <img src={collection.image} alt="" className="aspect-square w-full rounded-lg object-cover" />
            <h2 className="mt-4 text-2xl font-black">{collection.name}</h2>
            <StatusPill accent={collection.instantSellEnabled ? "green" : "red"}>{collection.instantSellEnabled ? "Instant Sell Enabled" : "Disabled"}</StatusPill>
            <div className="mt-5">
              <ProgressBar value={collection.riskScore} max={100} label="Risk score" />
            </div>
          </SectionCard>
          <SectionCard title="Collections">
            <div className="space-y-3">
              {collections.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-black/20 p-3">
                  <span>{item.name}</span>
                  <StatusPill accent={item.instantSellEnabled ? "green" : "red"}>{item.riskScore}</StatusPill>
                </div>
              ))}
            </div>
          </SectionCard>
        </aside>
      </div>
    </AppShell>
  );
}

function QuoteMetric({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="rounded-lg border border-vault-line bg-black/25 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={green ? "text-2xl font-black text-vault-green" : "text-2xl font-black"}>{value}</p>
    </div>
  );
}

function Tier({ label, discount, active, danger }: { label: string; discount: string; active?: boolean; danger?: boolean }) {
  return (
    <div className={active ? "rounded-lg border border-vault-green bg-vault-green/10 p-4" : "rounded-lg border border-vault-line bg-black/25 p-4"}>
      <p className="font-bold">{label}</p>
      <p className={danger ? "mt-2 text-2xl font-black text-vault-red" : "mt-2 text-2xl font-black text-vault-green"}>{discount}</p>
    </div>
  );
}

