"use client";

import type { ReactNode } from "react";
import { PhewMascot, type PhewMascotMood } from "@/components/PhewMascot";
import { cn } from "@/lib/utils";

export type PhewHeroMascotPose =
  | PhewMascotMood
  | "explorer"
  | "launch"
  | "admin"
  | "strategy"
  | "studio";

export function PhewPageHero({
  eyebrow,
  title,
  subtitle,
  actions,
  mascotPose = "idle",
  mascotClassName,
  sidePanel,
  warning,
  className
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  mascotPose?: PhewHeroMascotPose;
  mascotClassName?: string;
  sidePanel?: ReactNode;
  warning?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("phew-page-hero", className)}>
      <div className="phew-page-hero-bg" aria-hidden="true" />
      <div className={cn("phew-page-hero-grid", Boolean(sidePanel) && "phew-page-hero-grid-with-panel")}>
        <div className="phew-page-hero-copy">
          {eyebrow ? <div className="phew-page-hero-eyebrow">{eyebrow}</div> : null}
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
          {actions ? <div className="phew-page-hero-actions">{actions}</div> : null}
        </div>
        <div className="phew-page-hero-mascot" aria-hidden="true">
          <span className="phew-page-hero-ring" />
          <PhewMascot mood={moodFromHeroPose(mascotPose)} size="hero" alt="" className={cn("phew-page-hero-mascot-img", mascotClassName)} />
        </div>
        {sidePanel ? <div className="phew-page-hero-side">{sidePanel}</div> : null}
      </div>
      {warning ? <div className="phew-page-hero-warning">{warning}</div> : null}
    </section>
  );
}

export function moodFromHeroPose(pose: PhewHeroMascotPose): PhewMascotMood {
  if (pose === "explorer") return "proof";
  if (pose === "launch") return "running";
  if (pose === "admin") return "warning";
  if (pose === "strategy") return "redeem";
  if (pose === "studio") return "loading";
  return pose;
}
