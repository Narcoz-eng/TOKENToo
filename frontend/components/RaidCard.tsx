"use client";

import { Shield, Swords } from "lucide-react";
import { useState } from "react";
import type { RaidRoom, VaultCollection } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { StatusPill } from "./StatusPill";
import { brandAssets } from "@/lib/brand-assets";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { backendActionOutcome, type BackendActionResponse } from "@/lib/action-contracts";
import { TransactionStatus, type TxStatus } from "./TransactionStatus";
import { PhewSuccessMomentModal } from "./PhewSuccessMomentModal";

export function RaidCard({ raid, collection }: { raid: RaidRoom; collection?: VaultCollection }) {
  const wallet = useWalletAuth();
  const [state, setState] = useState<TxStatus>("idle");
  const [detail, setDetail] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  async function joinRaid() {
    setDetail(null);
    if (!wallet.connected) {
      setState("failed");
      setDetail("Connect and authenticate your wallet before joining a raid.");
      return;
    }
    setState("validating");
    try {
      setState("pending");
      const response = await wallet.authFetch<BackendActionResponse>(`/raids/${raid.id}/join`, {
        method: "POST",
        body: JSON.stringify({ idempotencyKey: `${wallet.address}:join:${raid.id}` })
      });
      const outcome = backendActionOutcome(response, "Raid join route returned an intent but no completed participant status.");
      setState(outcome.phase === "confirmed" ? "confirmed" : outcome.phase === "failed" ? "failed" : "pending");
      setDetail(outcome.confirmed ? outcome.detail ?? null : outcome.detail ?? "Raid join is pending backend confirmation.");
      if (outcome.confirmed) setSuccessOpen(true);
    } catch (err) {
      setState("failed");
      setDetail(err instanceof Error ? err.message : "Join raid failed");
    }
  }

  return (
    <article className={`phew-panel phew-card-hover relative overflow-hidden rounded-lg ${state === "pending" ? "shadow-green" : ""}`}>
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
        {state !== "idle" ? <TransactionStatus status={state} label={state === "failed" ? "Raid unavailable" : state === "confirmed" ? "Raid joined" : "Raid join pending"} detail={detail} /> : null}
        <button onClick={joinRaid} disabled={state === "validating" || state === "pending"} className="phew-button phew-button-primary flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-black text-black disabled:opacity-60">
          <Shield className="size-4" /> {state === "validating" ? "Validating" : state === "pending" ? "Joining" : state === "confirmed" ? "Raid Joined" : raid.status === "Live" ? "Join Raid" : "View Details"}
        </button>
      </div>
      {successOpen ? (
        <PhewSuccessMomentModal
          action="raid"
          title="Raid joined"
          subtitle={detail ?? "The backend confirmed raid participation."}
          tokenSymbol="XP"
          onClose={() => setSuccessOpen(false)}
        />
      ) : null}
    </article>
  );
}
