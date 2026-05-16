"use client";

import { useState } from "react";
import { Loader2, RadioTower, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { useWalletAuth } from "@/hooks/useWalletAuth";

type AccessMethod = "CREATION_FEE_SOL" | "WHALE_HOLDER" | "SUBSCRIPTION_STUDIO" | "ADMIN_GRANT";

type CreateCommunityResponse = {
  ok?: boolean;
  reused?: boolean;
  access?: { method: string; status: string };
  collection?: {
    id: string;
    slug: string;
    name: string;
    tokenMint: string;
    launchStatus: string;
    reserveVaultPda?: string | null;
    strategy?: { type: string; status: string; approvedByCreator: boolean };
  };
  message?: string;
};

const accessMethods: Array<{ value: AccessMethod; label: string; help: string }> = [
  { value: "CREATION_FEE_SOL", label: "Pay 1 SOL", help: "Requires a confirmed payment signature to the configured protocol treasury." },
  { value: "WHALE_HOLDER", label: "Whale holder", help: "Verifies live token balance for this mint." },
  { value: "SUBSCRIPTION_STUDIO", label: "Studio subscription", help: "Requires configured subscription access for the connected wallet." },
  { value: "ADMIN_GRANT", label: "Admin grant", help: "Protocol admin wallets only." }
];

export default function CreateCommunityPage() {
  const wallet = useWalletAuth();
  const [tokenMint, setTokenMint] = useState("");
  const [accessMethod, setAccessMethod] = useState<AccessMethod>("CREATION_FEE_SOL");
  const [paymentSignature, setPaymentSignature] = useState("");
  const [result, setResult] = useState<CreateCommunityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createCommunity() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await wallet.authFetch<CreateCommunityResponse>("/communities/from-token", {
        method: "POST",
        body: JSON.stringify({
          tokenMint,
          accessMethod,
          paymentSignature: paymentSignature || undefined,
          idempotencyKey: `community-${tokenMint.slice(0, 8)}-${wallet.address ?? "wallet"}`
        })
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Community creation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell active="create-community">
      <div className="space-y-6">
        <section className="phew-panel rounded-lg p-6">
          <StatusPill accent="green">Token Community</StatusPill>
          <h1 className="mt-4 text-4xl font-black">Create a community from a token CA.</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-300">
            This creates a draft token-backed community, reserve config, and passive strategy. Launch and production minting remain gated by approved assets and real Solana verification.
          </p>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SectionCard title="Access Gate">
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-500">Token CA / mint</span>
                <input value={tokenMint} onChange={(event) => setTokenMint(event.target.value)} className="phew-input mt-2 h-12 w-full rounded-md px-4 text-sm" placeholder="Solana token mint address" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-slate-500">Creation access</span>
                <select value={accessMethod} onChange={(event) => setAccessMethod(event.target.value as AccessMethod)} className="phew-input mt-2 h-12 w-full rounded-md px-4 text-sm">
                  {accessMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
                </select>
              </label>
              {accessMethod === "CREATION_FEE_SOL" ? (
                <label className="block">
                  <span className="text-xs font-bold uppercase text-slate-500">Payment signature</span>
                  <input value={paymentSignature} onChange={(event) => setPaymentSignature(event.target.value)} className="phew-input mt-2 h-12 w-full rounded-md px-4 text-sm" placeholder="Confirmed 1 SOL transfer signature" />
                </label>
              ) : null}
              <button onClick={createCommunity} disabled={loading || !tokenMint.trim()} className="phew-button phew-button-primary inline-flex h-12 items-center gap-2 rounded-md px-5 text-sm font-black text-black">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <RadioTower className="size-4" />}
                Create Draft
              </button>
              {error ? <p className="rounded-md border border-vault-red/35 bg-vault-red/10 p-3 text-sm text-vault-red">{error}</p> : null}
            </div>
          </SectionCard>

          <SectionCard title="Rules">
            <div className="space-y-3 text-sm text-slate-300">
              {accessMethods.map((method) => (
                <div key={method.value} className="rounded-md border border-vault-line bg-black/25 p-3">
                  <p className="font-black text-white">{method.label}</p>
                  <p className="mt-1 text-xs text-slate-400">{method.help}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {result?.collection ? (
          <SectionCard title="Community Draft">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ResultTile label="Collection" value={result.collection.name} />
              <ResultTile label="Launch status" value={result.collection.launchStatus} />
              <ResultTile label="Reserve PDA" value={result.collection.reserveVaultPda ?? "Pending"} />
              <ResultTile label="Strategy" value={`${result.collection.strategy?.type ?? "PASSIVE"} / ${result.collection.strategy?.status ?? "DRAFT"}`} />
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-md border border-vault-green/30 bg-vault-green/10 p-4 text-sm text-slate-300">
              <ShieldCheck className="size-5 shrink-0 text-vault-green" />
              <p>{result.message ?? "Community draft created."}</p>
            </div>
          </SectionCard>
        ) : null}
      </div>
    </AppShell>
  );
}

function ResultTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-vault-line bg-black/25 p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-black text-white">{value}</p>
    </div>
  );
}
