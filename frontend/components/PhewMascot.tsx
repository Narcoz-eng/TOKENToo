"use client";

import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

export type PhewMascotMood =
  | "idle"
  | "running"
  | "success"
  | "loading"
  | "warning"
  | "error"
  | "mint"
  | "stake"
  | "redeem"
  | "proof";

type MascotSize = "sm" | "md" | "lg" | "hero";

const moodAssets: Record<PhewMascotMood, string> = {
  idle: brandAssets.mascotPoses.idle,
  running: brandAssets.mascotPoses.running,
  success: brandAssets.mascotPoses.success,
  loading: brandAssets.mascotPoses.loading,
  warning: brandAssets.mascotPoses.warning,
  error: brandAssets.mascotPoses.error,
  mint: brandAssets.mascotPoses.mint,
  stake: brandAssets.mascotPoses.stake,
  redeem: brandAssets.mascotPoses.redeem,
  proof: brandAssets.mascotPoses.proof
};

export function PhewMascot({
  mood = "idle",
  size = "md",
  className,
  alt = "Phew mascot"
}: {
  mood?: PhewMascotMood;
  size?: MascotSize;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={moodAssets[mood]}
      alt={alt}
      data-mood={mood}
      className={cn("phew-mascot-img", `phew-mascot-${size}`, `phew-mascot-mood-${mood}`, className)}
    />
  );
}

export function PhewMascotHero({ className }: { className?: string }) {
  return <img src={brandAssets.heroMascot} alt="Phew mascot" className={cn("phew-mascot-img phew-mascot-hero-img", className)} />;
}

export function PhewMascotActor({
  mood = "running",
  className,
  aura = true
}: {
  mood?: PhewMascotMood;
  className?: string;
  aura?: boolean;
}) {
  return (
    <div className={cn("phew-mascot-actor", className)} data-mood={mood}>
      {aura ? <span className="phew-mascot-aura" /> : null}
      <PhewMascot mood={mood} size="lg" alt="" />
    </div>
  );
}
