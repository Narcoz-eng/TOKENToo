"use client";

import { cn } from "@/lib/utils";
import type { RaidProofState, RaidRoomView } from "./raid-types";
import { RaidPictogram } from "./RaidPictogram";

const proofStates: RaidProofState[] = ["not-started", "opened-target", "pending-proof", "submitted", "verifying", "approved", "rejected"];

export function RaidProofPanel({
  raid,
  currentState,
  apiVerificationAvailable
}: {
  raid: RaidRoomView | null;
  currentState: RaidProofState;
  apiVerificationAvailable: boolean;
}) {
  return (
    <section className="phew-panel rounded-lg p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase text-white">Mission Proof System</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">No fake verification. If API verification is not configured, proof requires manual/community review.</p>
        </div>
        <RaidPictogram name="proof" className="size-9" />
      </div>

      <div className="mb-4 rounded-md border border-vault-gold/35 bg-vault-gold/10 p-3 text-xs leading-5 text-vault-gold">
        {apiVerificationAvailable ? "API verification configured. Backend approval still gates success states." : "Manual/community review required. API verification is unavailable for this raid."}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {proofStates.map((state) => (
          <div key={state} className={cn("flex items-center gap-2 rounded-md border p-2 text-xs", state === currentState ? "border-vault-green/60 bg-vault-green/10 text-vault-green" : "border-vault-line bg-black/25 text-slate-400")}>
            <span className={cn("size-2 rounded-full", state === currentState ? "bg-vault-green shadow-green" : "bg-slate-600")} />
            <span className="font-black uppercase">{state.replace(/-/g, " ")}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <ProofRow label="Proof mode" value={raid?.proofMode ?? "N/A"} />
        <ProofRow label="Verification mode" value={raid?.verificationMode ?? "N/A"} />
        <ProofRow label="Reward eligibility" value={currentState === "approved" ? "Eligible" : "Pending review"} tone={currentState === "approved" ? "green" : "gold"} />
        <ProofRow label="XP earned" value={currentState === "approved" ? "Backend approved" : "N/A"} />
      </div>
    </section>
  );
}

function ProofRow({ label, value, tone }: { label: string; value: string; tone?: "green" | "gold" }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-vault-line bg-black/25 px-3 py-2">
      <span className="text-xs uppercase text-slate-500">{label}</span>
      <span className={cn("min-w-0 break-words text-right text-xs font-black text-white", tone === "green" && "text-vault-green", tone === "gold" && "text-vault-gold")}>{value}</span>
    </div>
  );
}
