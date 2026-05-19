"use client";

import type { ReactNode } from "react";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";
import type { RaidMissionView, RaidPlatform } from "./raid-types";

export type RaidPictogramName =
  | "flag"
  | "room"
  | "proof"
  | "xp"
  | "reward"
  | "target"
  | "like"
  | "repost"
  | "quote"
  | "comment"
  | "follow"
  | "bookmark"
  | "submit-proof"
  | "wallet"
  | "clock";

export function RaidAssetIcon({ asset, className, alt = "" }: { asset: string; className?: string; alt?: string }) {
  return <img src={asset} alt={alt} className={cn("size-5 shrink-0 object-contain", className)} />;
}

export function RaidPictogram({ name, className, title }: { name: RaidPictogramName; className?: string; title?: string }) {
  if (name === "flag") return <RaidAssetIcon asset={brandAssets.raid.flag} className={className} alt={title ?? ""} />;
  if (name === "room") return <RaidAssetIcon asset={brandAssets.raid.room} className={className} alt={title ?? ""} />;
  if (name === "proof") return <RaidAssetIcon asset={brandAssets.raid.proof} className={className} alt={title ?? ""} />;
  if (name === "xp") return <RaidAssetIcon asset={brandAssets.raid.xp} className={className} alt={title ?? ""} />;
  if (name === "reward") return <RaidAssetIcon asset={brandAssets.raid.reward} className={className} alt={title ?? ""} />;
  return (
    <span className={cn("inline-grid size-5 shrink-0 place-items-center text-vault-green", className)} title={title}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-full">
        <RaidGlyph name={name} />
      </svg>
    </span>
  );
}

export function PlatformPictogram({ platform, className }: { platform: RaidPlatform; className?: string }) {
  if (platform === "X") return <PlatformBadge className={className}>X</PlatformBadge>;
  if (platform === "Discord") return <PlatformBadge className={className}>D</PlatformBadge>;
  if (platform === "Telegram") return <PlatformBadge className={className}>T</PlatformBadge>;
  if (platform === "On-chain") return <RaidPictogram name="proof" className={className} />;
  return <RaidPictogram name="target" className={className} />;
}

export function MissionPictogram({ mission, className }: { mission: Pick<RaidMissionView, "type">; className?: string }) {
  const name = mission.type === "custom" ? "target" : mission.type;
  return <RaidPictogram name={name} className={className} />;
}

function PlatformBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border border-vault-green/60 bg-vault-green/10 text-[10px] font-black text-vault-green", className)}>
      {children}
    </span>
  );
}

function RaidGlyph({ name }: { name: Exclude<RaidPictogramName, "flag" | "room" | "proof" | "xp" | "reward"> }) {
  if (name === "target") {
    return (
      <>
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    );
  }
  if (name === "like") return <path d="M7 11 11 4c1-1 4 0 3 3l-1 3h5c2 0 3 2 2 4l-2 5H7v-8ZM4 11h3v8H4v-8Z" fill="currentColor" />;
  if (name === "repost") return <path d="M7 7h9l-2-2 1.5-1.5L20 8l-4.5 4.5L14 11l2-2H8v4H6V9c0-1.1.9-2 1-2Zm10 10H8l2 2-1.5 1.5L4 16l4.5-4.5L10 13l-2 2h8v-4h2v4c0 1.1-.9 2-1 2Z" fill="currentColor" />;
  if (name === "quote") return <path d="M6 6h6v6H9l-2 4H5l2-4H6V6Zm8 0h6v6h-3l-2 4h-2l2-4h-1V6Z" fill="currentColor" />;
  if (name === "comment") return <path d="M4 5h16v11H9l-5 4V5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />;
  if (name === "follow") return <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-7 2-7 5v2h10.5A6 6 0 0 1 9 13Zm8 1v3h3v2h-3v3h-2v-3h-3v-2h3v-3h2Z" fill="currentColor" />;
  if (name === "bookmark") return <path d="M7 3h10v18l-5-4-5 4V3Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />;
  if (name === "submit-proof") return <path d="M12 3 4 7v6c0 5 4 8 8 9 4-1 8-4 8-9V7l-8-4Zm-4 9 3 3 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />;
  if (name === "wallet") return <path d="M3 7h16v12H3V7Zm2-3h12v3H5V4Zm11 8h5v3h-5v-3Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />;
  return <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v6l4 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />;
}
