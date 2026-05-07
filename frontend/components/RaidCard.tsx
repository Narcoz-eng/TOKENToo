"use client";

import { Shield, Swords } from "lucide-react";
import { useState } from "react";
import type { RaidRoom, VaultCollection } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { StatusPill } from "./StatusPill";
import { ParticleBurst } from "./animations";
import { brandAssets } from "@/lib/brand-assets";
import { useWalletAuth } from "@/hooks/useWalletAuth";

export function RaidCard({ raid, collection }: { raid: RaidRoom; collection?: VaultCollection }) {
  const wallet = useWalletAuth();
  const [state, setState] = useState<"idle" | "validating" | "pending" | "confirmed" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);

  async function joinRaid() {
    setError(null);
    if (!wallet.connected) {
      setState("failed");
      setError("Connect and authenticate your wallet before joining a raid.");
      return;
    }
    setState("validating");
    try {
      setState("pending");
      await wallet.authFetch(`/raids/${raid.id}/join`, {
        method: "POST",
        body: JSON.stringify({ idempotencyKey: `${wallet.address}:join:${raid.id}` })
      });
      setState("confirmed");
    } catch (err) {
      setState("failed");
      setError(err instanceof Error ? err.message : "Join raid failed");
    }
  }

  return (
    <article className={`phew-panel phew-card-hover relative overflow-hidden rounded-lg ${state === "pending" ? "shadow-green" : ""}`}>
      <ParticleBurst active={state === "confirmed"} rarity="Epic" />
      <div className="relative h-36 overflow-hidden">
        <img src={collection?.banner || brandAssets.vaultHero} alt={raid.name} className="h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-vault-ink to-transparent" />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <StatusPill accent={raid.status === "Live" ? "green" : "gold"}>{raid.status}</StatusPill>
        </div>
      </div>
      <div className="relative space-y-4 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-white">{raid.name}</h3>
            <p className="text-sm text-slate-400">{collection?.name ?? "Collection data pending"}</p>
          </div>
          <Swords className="size-5 text-vault-purple" />
        </div>
        <ProgressBar value={raid.progress} />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500">Participants</p>
            <p className="font-semibold">{raid.participants.toLocaleString()} / {raid.capacity.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-slate-500">Reward Pool</p>
            <p className="font-semibold text-vault-green">{raid.rewardSol.toLocaleString()} SOL</p>
          </div>
        </div>
        {error ? <p className="rounded-md border border-vault-red/40 bg-vault-red/10 p-2 text-xs text-vault-red">{error}</p> : null}
        <button onClick={joinRaid} disabled={state === "validating" || state === "pending"} className="phew-button phew-button-primary flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-black text-black disabled:opacity-60">
          <Shield className="size-4" /> {state === "validating" ? "Validating" : state === "pending" ? "Joining" : state === "confirmed" ? "Raid Joined" : raid.status === "Live" ? "Join Raid" : "View Details"}
        </button>
      </div>
    </article>
  );
}
