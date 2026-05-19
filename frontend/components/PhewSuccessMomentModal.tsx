"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { PhewGameMoment, type PhewGameMomentMode } from "@/components/PhewGameMoments";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

export type PhewSuccessMomentAction =
  | "mint"
  | "stake"
  | "unstake"
  | "redeem"
  | "proof"
  | "community-launch"
  | "layer-pack"
  | "studio-bible";

export function PhewSuccessMomentModal({
  action,
  tokenSymbol,
  nftImage,
  title,
  subtitle,
  txSignature,
  proofUrl,
  onClose,
  autoCloseMs,
  reducedMotion
}: {
  action: PhewSuccessMomentAction;
  tokenSymbol?: string | null;
  nftImage?: string | null;
  title: string;
  subtitle?: string | null;
  txSignature?: string | null;
  proofUrl?: string | null;
  onClose: () => void;
  autoCloseMs?: number;
  reducedMotion?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const txUrl = txSignature ? transactionUrl(txSignature) : null;
  const mode = modeForAction(action);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mounted, onClose]);

  useEffect(() => {
    if (!autoCloseMs) return;
    const timeout = window.setTimeout(onClose, autoCloseMs);
    return () => window.clearTimeout(timeout);
  }, [autoCloseMs, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="phew-success-modal-root">
      <button className="phew-success-modal-backdrop" type="button" aria-label="Close success moment" onClick={onClose} />
      <section className="phew-success-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="phew-success-modal-head">
          <div className="min-w-0">
            <p className="phew-success-modal-kicker">{labelForAction(action)}</p>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button ref={closeRef} type="button" className="phew-success-modal-close" onClick={onClose} aria-label="Skip success animation">
            <X className="size-4" />
          </button>
        </div>
        <PhewGameMoment
          mode={mode}
          state="success"
          title={title}
          description={subtitle}
          tokenSymbol={tokenSymbol}
          image={nftImage}
          detail={txSignature ? `tx ${shortValue(txSignature)}` : proofUrl ? "proof ready" : "confirmed"}
          compact
          reducedMotion={reducedMotion}
          className="phew-success-modal-moment"
        />
        <div className="phew-success-modal-footer">
          <button type="button" className="phew-success-modal-skip" onClick={onClose}>
            Skip
          </button>
          <div className="phew-success-modal-links">
            {txUrl ? (
              <a href={txUrl} target="_blank" rel="noreferrer" className="phew-success-modal-link">
                <img src={brandAssets.energyBeam} alt="" />
                Transaction
              </a>
            ) : null}
            {proofUrl ? (
              <Link href={proofUrl} className="phew-success-modal-link" onClick={onClose}>
                <img src={brandAssets.proofRing} alt="" />
                Proof
              </Link>
            ) : null}
            <button type="button" className={cn("phew-success-modal-continue", !proofUrl && !txUrl && "phew-success-modal-continue-wide")} onClick={onClose}>
              Continue
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}

function modeForAction(action: PhewSuccessMomentAction): PhewGameMomentMode {
  if (action === "community-launch") return "community";
  if (action === "studio-bible") return "studio";
  if (action === "layer-pack") return "layer";
  return action;
}

function labelForAction(action: PhewSuccessMomentAction) {
  const labels: Record<PhewSuccessMomentAction, string> = {
    mint: "Mint confirmed",
    stake: "Stake confirmed",
    unstake: "Unstake confirmed",
    redeem: "Redeem confirmed",
    proof: "Proof verified",
    "community-launch": "Community launched",
    "layer-pack": "Layer pack approved",
    "studio-bible": "Studio Bible completed"
  };
  return labels[action];
}

function transactionUrl(signature: string) {
  if (/^https?:\/\//i.test(signature)) return signature;
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=devnet`;
}

function shortValue(value: string, size = 5) {
  return value.length > size * 2 + 3 ? `${value.slice(0, size)}...${value.slice(-size)}` : value;
}
