import { AlertTriangle, ShieldCheck, ZapOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { collections } from "@/lib/mock-data";

export default function RiskAdminPage() {
  return (
    <AppShell active="risk">
      <div className="space-y-5">
        <div>
          <p className="text-sm font-bold uppercase text-vault-purple">Admin</p>
          <h1 className="mt-2 text-4xl font-black">Risk Dashboard</h1>
          <p className="mt-2 max-w-2xl text-slate-400">Monitor scanner outputs, collection flags, instant-sell eligibility, and emergency kill switches.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <AdminMetric label="Collections scanned" value="128" />
          <AdminMetric label="Instant sell enabled" value="83" />
          <AdminMetric label="Paused collections" value="4" danger />
          <AdminMetric label="Avg risk score" value="71.8" />
        </div>

        <SectionCard title="Collection Risk Matrix">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Collection</th>
                  <th className="px-3 py-3">Risk</th>
                  <th className="px-3 py-3">Liquidity</th>
                  <th className="px-3 py-3">Age</th>
                  <th className="px-3 py-3">Volume</th>
                  <th className="px-3 py-3">Instant Sell</th>
                  <th className="px-3 py-3">Controls</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((collection) => (
                  <tr key={collection.id} className="border-t border-vault-line">
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <img src={collection.image} alt="" className="size-10 rounded-lg object-cover" />
                        <div>
                          <p className="font-bold">{collection.name}</p>
                          <p className="text-xs text-slate-500">{collection.tokenMint.slice(0, 10)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="w-44">
                        <ProgressBar value={collection.riskScore} />
                        <p className="mt-1 text-vault-green">{collection.riskScore} / 100</p>
                      </div>
                    </td>
                    <td className="px-3 py-4">{(collection.volume24hSol * 4).toLocaleString()} SOL</td>
                    <td className="px-3 py-4">6d 14h</td>
                    <td className="px-3 py-4">{collection.volume24hSol.toLocaleString()} SOL</td>
                    <td className="px-3 py-4"><StatusPill accent={collection.instantSellEnabled ? "green" : "red"}>{collection.instantSellEnabled ? "Enabled" : "Disabled"}</StatusPill></td>
                    <td className="px-3 py-4">
                      <div className="flex gap-2">
                        <button className="flex h-9 items-center gap-2 rounded-lg border border-vault-line px-3"><ShieldCheck className="size-4" /> Pause</button>
                        <button className="flex h-9 items-center gap-2 rounded-lg border border-vault-red/50 px-3 text-vault-red"><ZapOff className="size-4" /> Disable Sell</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="grid gap-5 lg:grid-cols-3">
          <SectionCard title="Scanner Inputs">
            {["Token metadata", "Age", "Liquidity", "Market cap", "Holders", "Volume", "Risk score"].map((item) => (
              <div key={item} className="mb-2 flex items-center gap-2 rounded-lg bg-black/20 p-3 text-sm">
                <ShieldCheck className="size-4 text-vault-green" />
                <span>{item}</span>
              </div>
            ))}
          </SectionCard>
          <SectionCard title="Alerts">
            {["Liquidity dropped below threshold", "Wash trading suspicion", "Unverified creator detected", "Emergency disable available"].map((item, index) => (
              <div key={item} className="mb-2 flex items-center gap-2 rounded-lg bg-black/20 p-3 text-sm">
                <AlertTriangle className={index === 3 ? "size-4 text-vault-green" : "size-4 text-vault-gold"} />
                <span>{item}</span>
              </div>
            ))}
          </SectionCard>
          <SectionCard title="Policy">
            <p className="text-sm leading-6 text-slate-300">Instant sell requires age &gt;= 48h, liquidity above threshold, risk score &gt;= 60, active volume, and no emergency flag. Every collection has isolated liquidity and fee vaults.</p>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}

function AdminMetric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="glass rounded-lg p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={danger ? "mt-2 text-3xl font-black text-vault-red" : "mt-2 text-3xl font-black text-white"}>{value}</p>
    </div>
  );
}
