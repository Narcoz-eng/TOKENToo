"use client";

import type { ReactNode } from "react";
import { PhewMascot, type PhewMascotMood } from "@/components/PhewMascot";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

export function PhewEmptyState({
  title,
  body,
  action,
  mascotPose = "idle",
  object,
  compact,
  table,
  align = "left",
  className
}: {
  title: ReactNode;
  body: ReactNode;
  action?: ReactNode;
  mascotPose?: PhewMascotMood;
  object?: string;
  compact?: boolean;
  table?: boolean;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("phew-empty-state", compact && "phew-empty-state-compact", table && "phew-empty-state-table", align === "center" && "phew-empty-state-center", className)}>
      <div className="phew-empty-state-visual" aria-hidden="true">
        <span className="phew-empty-state-ring" />
        {object ? (
          <img src={object} alt="" className="phew-empty-state-object" />
        ) : (
          <PhewMascot mood={mascotPose} size={compact ? "sm" : "md"} alt="" className="phew-empty-state-mascot" />
        )}
      </div>
      <div className="phew-empty-state-copy">
        <p className="phew-empty-state-title">{title}</p>
        <p className="phew-empty-state-body">{body}</p>
        {action ? <div className="phew-empty-state-action">{action}</div> : null}
      </div>
    </div>
  );
}

export function PhewObjectEmptyState(props: Omit<Parameters<typeof PhewEmptyState>[0], "object"> & { object?: string }) {
  return <PhewEmptyState {...props} object={props.object ?? brandAssets.nftSlot} />;
}
