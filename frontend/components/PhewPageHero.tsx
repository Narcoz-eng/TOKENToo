"use client";

import type { CSSProperties, ReactNode } from "react";
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
  heroType = "dashboard",
  mascotPose = "idle",
  mascotLayer,
  mascotClassName,
  backgroundAsset,
  visualAsset,
  visualAlt = "",
  visualMode = "mascot",
  heroSize = "standard",
  sidePanel,
  warning,
  className
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  heroType?: "dashboard" | "product" | "detail";
  mascotPose?: PhewHeroMascotPose;
  mascotLayer?: ReactNode;
  mascotClassName?: string;
  visualAsset?: string | null;
  backgroundAsset?: string | null;
  visualAlt?: string;
  visualMode?: "mascot" | "banner" | "object";
  heroSize?: "standard" | "large";
  sidePanel?: ReactNode;
  warning?: ReactNode;
  className?: string;
}) {
  const backgroundStyle = backgroundAsset
    ? ({ "--phew-page-hero-bg-image": `url(${backgroundAsset})` } as CSSProperties)
    : undefined;

  return (
    <section className={cn("phew-page-hero", `phew-page-hero-${heroType}`, heroSize === "large" && "phew-page-hero-large", backgroundAsset && "phew-page-hero-with-bg-art", visualAsset && `phew-page-hero-visual-${visualMode}`, className)}>
      <div className="phew-page-hero-bg" aria-hidden="true" style={backgroundStyle} />
      <div className={cn("phew-page-hero-grid", Boolean(sidePanel) && "phew-page-hero-grid-with-panel")}>
        <div className="phew-page-hero-copy">
          {eyebrow ? <div className="phew-page-hero-eyebrow">{eyebrow}</div> : null}
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
          {actions ? <div className="phew-page-hero-actions">{actions}</div> : null}
        </div>
        <div className="phew-page-hero-mascot" aria-hidden="true">
          <span className="phew-page-hero-ring" />
          {visualAsset ? (
            <img src={visualAsset} alt={visualAlt} className={cn("phew-page-hero-mascot-img phew-page-hero-art", mascotClassName)} />
          ) : (
            <PhewMascot mood={moodFromHeroPose(mascotPose)} size="hero" alt="" className={cn("phew-page-hero-mascot-img", mascotClassName)} />
          )}
          {mascotLayer ? <div className="phew-page-hero-mascot-layer">{mascotLayer}</div> : null}
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
