"use client";

import { CheckCircle2, CircleAlert, Flame, LockKeyhole, PackageCheck, RadioTower, ShieldCheck, Sparkles, Vault, WalletCards, Zap } from "lucide-react";
import type { CSSProperties } from "react";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

export type TransactionFlowState = "idle" | "preparing" | "signing" | "sending" | "confirming" | "success" | "error";
export type TransactionFlowMoment = "mint" | "stake" | "unstake" | "redeem" | "proof" | "community" | "community-launch" | "studio" | "studio-bible" | "reward" | "scan";

export type TransactionFlowStep = {
  state: TransactionFlowState;
  label: string;
  detail: string;
};

type FlowScene = "INIT" | "TRANSFER" | "VALIDATE" | "LOCK" | "SUCCESS" | "ERROR";

const sceneOrder: FlowScene[] = ["INIT", "TRANSFER", "VALIDATE", "LOCK", "SUCCESS"];

export function TransactionFlow({
  state,
  title,
  description,
  tokenSymbol,
  image,
  detail,
  className,
  compact = false,
  moment
}: {
  state: TransactionFlowState;
  title: string;
  description?: string;
  tokenSymbol?: string | null;
  image?: string | null;
  steps?: TransactionFlowStep[];
  detail?: string | null;
  className?: string;
  compact?: boolean;
  moment?: TransactionFlowMoment;
}) {
  const visualMoment = normalizeMoment(moment ?? inferMoment(title));
  const scene = sceneForState(state);
  const activeIndex = sceneOrder.indexOf(scene === "ERROR" ? "INIT" : scene);
  const TargetIcon = targetIcon(visualMoment);
  const telemetry = telemetryRows(visualMoment, state);

  return (
    <section className={cn("transaction-flow phew-flow-scene", compact && "phew-flow-scene-compact", className)} data-state={state} data-scene={scene} data-moment={visualMoment}>
      <div className="phew-flow-copy">
        <div>
          <p className="text-[10px] font-black uppercase text-vault-green">{tokenSymbol || "PHEW"} / {scene}</p>
          <h2 className="mt-1 text-sm font-black uppercase text-white">{title}</h2>
          {description ? <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">{description}</p> : null}
        </div>
        <span className={cn("inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-[10px] font-black uppercase", badgeClass(state))}>
          {stateIcon(state)}
          {flowStatusLabel(state)}
        </span>
      </div>

      <div className="phew-flow-canvas" aria-label={`${title} ${scene.toLowerCase()} scene`}>
        <div className="phew-flow-mode-label" aria-hidden="true">
          <span>{modeKicker(visualMoment)}</span>
          <strong>{modeHeadline(visualMoment)}</strong>
        </div>
        <span className="phew-flow-gradient phew-flow-gradient-a" />
        <span className="phew-flow-gradient phew-flow-gradient-b" />
        <span className="phew-flow-grid" />
        <span className="phew-flow-floor" />
        <span className="phew-flow-orbit phew-flow-orbit-a" />
        <span className="phew-flow-orbit phew-flow-orbit-b" />
        <span className="phew-flow-orbit phew-flow-orbit-c" />
        <span className="phew-flow-beam phew-flow-beam-input" />
        <span className="phew-flow-beam phew-flow-beam-output" />
        <span className="phew-flow-impact" />
        <span className="phew-flow-scan-rail phew-flow-scan-rail-a" />
        <span className="phew-flow-scan-rail phew-flow-scan-rail-b" />
        <span className="phew-flow-success-burst" />
        <span className="phew-flow-error-shard phew-flow-error-shard-a" />
        <span className="phew-flow-error-shard phew-flow-error-shard-b" />
        <span className="phew-flow-error-shard phew-flow-error-shard-c" />

        <div className="phew-flow-actor" aria-hidden="true">
          <span className="phew-flow-actor-aura" />
          <img src={brandAssets.mascot} alt="" className="phew-flow-mascot" />
        </div>

        <div className="phew-flow-nft" aria-hidden="true">
          <span className="phew-flow-nft-light" />
          {image ? (
            <img src={image} alt="" className="h-full w-full rounded-md object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center rounded-md bg-[radial-gradient(circle_at_50%_25%,rgba(186,255,0,0.22),rgba(0,0,0,0.86)_62%)]">
              <div className="text-center">
                <WalletCards className="mx-auto size-7 text-vault-green" />
                <p className="mt-2 text-[10px] font-black uppercase text-vault-green">NFT</p>
              </div>
            </div>
          )}
          <span>{tokenSymbol || "PHEW"}</span>
        </div>

        <div className="phew-flow-target" aria-hidden="true">
          <span className="phew-flow-target-core" />
          <TargetIcon className="size-12" />
          <span>{targetLabel(visualMoment)}</span>
        </div>

        <div className="phew-flow-telemetry" aria-hidden="true">
          {telemetry.map((row) => (
            <div key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>

        <div className="phew-flow-particles" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => <span key={index} style={{ "--i": index } as CSSProperties} />)}
        </div>
      </div>

      <div className="phew-flow-scenes" aria-hidden="true">
        {sceneOrder.map((item, index) => (
          <span key={item} className={cn(index <= activeIndex && scene !== "ERROR" && "is-active", scene === item && "is-current")}>
            {item}
          </span>
        ))}
        <span className={cn(scene === "ERROR" && "is-error")}>ERROR</span>
      </div>

      {detail ? (
        <p className={cn("phew-flow-detail", state === "error" ? "border-vault-red/35 bg-vault-red/10 text-vault-red" : "border-vault-line bg-black/25 text-slate-300")}>
          {detail}
        </p>
      ) : null}
    </section>
  );
}

function targetIcon(moment: ReturnType<typeof normalizeMoment>) {
  if (moment === "stake" || moment === "mint") return Vault;
  if (moment === "redeem") return Vault;
  if (moment === "unstake") return Flame;
  if (moment === "proof") return ShieldCheck;
  if (moment === "reward") return Sparkles;
  if (moment === "community" || moment === "scan") return RadioTower;
  if (moment === "studio") return PackageCheck;
  return Vault;
}

function targetLabel(moment: ReturnType<typeof normalizeMoment>) {
  const labels: Record<ReturnType<typeof normalizeMoment>, string> = {
    mint: "mint",
    stake: "lock",
    unstake: "release",
    redeem: "unlock",
    proof: "proof",
    community: "launch",
    studio: "studio",
    reward: "reward",
    scan: "scan"
  };
  return labels[moment];
}

function modeKicker(moment: ReturnType<typeof normalizeMoment>) {
  const labels: Record<ReturnType<typeof normalizeMoment>, string> = {
    mint: "Creation field",
    stake: "Vault transfer",
    unstake: "Release route",
    redeem: "Redeem moment",
    proof: "Verification scan",
    community: "Launch uplink",
    studio: "Studio compile",
    reward: "Reward route",
    scan: "Token scan"
  };
  return labels[moment];
}

function modeHeadline(moment: ReturnType<typeof normalizeMoment>) {
  const labels: Record<ReturnType<typeof normalizeMoment>, string> = {
    mint: "Mint storyboard",
    stake: "Stake storyboard",
    unstake: "Unstake storyboard",
    redeem: "Redeem storyboard",
    proof: "Proof storyboard",
    community: "Community launch",
    studio: "Setup engine",
    reward: "Reward activation",
    scan: "Risk scan"
  };
  return labels[moment];
}

function telemetryRows(moment: ReturnType<typeof normalizeMoment>, state: TransactionFlowState) {
  const status = flowStatusLabel(state).toUpperCase();
  const rows: Record<ReturnType<typeof normalizeMoment>, Array<{ label: string; value: string }>> = {
    mint: [
      { label: "Collection", value: "N/A" },
      { label: "Reserve", value: "N/A" },
      { label: "Status", value: status }
    ],
    stake: [
      { label: "Owner", value: "N/A" },
      { label: "Stake vault", value: "N/A" },
      { label: "Status", value: status }
    ],
    unstake: [
      { label: "Position", value: "N/A" },
      { label: "Release", value: "N/A" },
      { label: "Status", value: status }
    ],
    redeem: [
      { label: "Owner proof", value: "N/A" },
      { label: "Reserve vault", value: "N/A" },
      { label: "Status", value: status }
    ],
    proof: [
      { label: "Owner check", value: "N/A" },
      { label: "Reserve check", value: "N/A" },
      { label: "Status", value: status }
    ],
    community: [
      { label: "Token scan", value: "N/A" },
      { label: "Launch PDA", value: "N/A" },
      { label: "Status", value: status }
    ],
    studio: [
      { label: "Provider", value: "N/A" },
      { label: "Layer pack", value: "N/A" },
      { label: "Status", value: status }
    ],
    reward: [
      { label: "Reward token", value: "N/A" },
      { label: "Engine", value: "N/A" },
      { label: "Status", value: status }
    ],
    scan: [
      { label: "Token", value: "N/A" },
      { label: "Risk", value: "N/A" },
      { label: "Status", value: status }
    ]
  };
  return rows[moment];
}

function normalizeMoment(moment: TransactionFlowMoment) {
  if (moment === "community-launch") return "community";
  if (moment === "studio-bible") return "studio";
  return moment;
}

function inferMoment(title: string): TransactionFlowMoment {
  const normalized = title.toLowerCase();
  if (normalized.includes("unstake")) return "unstake";
  if (normalized.includes("stake")) return "stake";
  if (normalized.includes("redeem")) return "redeem";
  if (normalized.includes("proof")) return "proof";
  if (normalized.includes("community") || normalized.includes("launch")) return "community";
  if (normalized.includes("studio") || normalized.includes("setup")) return "studio";
  if (normalized.includes("reward") || normalized.includes("claim")) return "reward";
  if (normalized.includes("scan")) return "scan";
  return "mint";
}

function sceneForState(state: TransactionFlowState): FlowScene {
  if (state === "success") return "SUCCESS";
  if (state === "error") return "ERROR";
  if (state === "confirming") return "LOCK";
  if (state === "preparing") return "VALIDATE";
  if (state === "signing" || state === "sending") return "TRANSFER";
  return "INIT";
}

export function transactionStateFromTxStatus(status: string | null | undefined): TransactionFlowState {
  if (!status) return "idle";
  const normalized = status.toLowerCase();
  if (["confirmed", "success", "complete", "completed", "redeemed", "staked", "unstaked"].some((item) => normalized.includes(item))) return "success";
  if (["fail", "error", "rejected", "skipped", "needs", "not_implemented", "unavailable", "no_adapter", "not_paid", "accounted_not_paid"].some((item) => normalized.includes(item))) return "error";
  if (["signing", "signature"].some((item) => normalized.includes(item))) return "signing";
  if (["sending", "submitting", "submitted"].some((item) => normalized.includes(item))) return "sending";
  if (["confirming", "pending"].some((item) => normalized.includes(item))) return "confirming";
  if (["validating", "building", "preparing", "processing", "loading"].some((item) => normalized.includes(item))) return "preparing";
  return "idle";
}

function flowStatusLabel(state: TransactionFlowState) {
  const labels: Record<TransactionFlowState, string> = {
    idle: "Init",
    preparing: "Validate",
    signing: "Transfer",
    sending: "Transfer",
    confirming: "Lock",
    success: "Success",
    error: "Error"
  };
  return labels[state];
}

function badgeClass(state: TransactionFlowState) {
  if (state === "success") return "border-vault-green/70 bg-vault-green/15 text-vault-green shadow-green";
  if (state === "error") return "border-vault-red/70 bg-vault-red/15 text-vault-red";
  if (state === "idle") return "border-vault-line bg-black/30 text-slate-300";
  return "border-vault-cyan/55 bg-vault-cyan/12 text-vault-cyan";
}

function stateIcon(state: TransactionFlowState) {
  if (state === "success") return <CheckCircle2 className="size-3.5" />;
  if (state === "error") return <CircleAlert className="size-3.5" />;
  if (state === "confirming") return <LockKeyhole className="size-3.5" />;
  if (state === "preparing") return <ShieldCheck className="size-3.5" />;
  if (state === "signing" || state === "sending") return <Zap className="size-3.5" />;
  return <RadioTower className="size-3.5" />;
}
