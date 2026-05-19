"use client";

import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

export type PhewProtocolIconName =
  | "lockTokens"
  | "mintNft"
  | "stake"
  | "redeem"
  | "proof"
  | "reserve"
  | "strategy"
  | "community"
  | "raid";

export const phewProtocolIconAssets: Record<PhewProtocolIconName, string> = {
  lockTokens: brandAssets.pictograms.lockTokens,
  mintNft: brandAssets.pictograms.mintNft,
  stake: brandAssets.pictograms.stake,
  redeem: brandAssets.pictograms.redeem,
  proof: brandAssets.pictograms.proof,
  reserve: brandAssets.pictograms.reserve,
  strategy: brandAssets.pictograms.strategy,
  community: brandAssets.pictograms.community,
  raid: brandAssets.pictograms.raid
};

export function PhewProtocolIcon({
  name,
  className,
  alt = ""
}: {
  name: PhewProtocolIconName;
  className?: string;
  alt?: string;
}) {
  return <img src={phewProtocolIconAssets[name]} alt={alt} className={cn("phew-protocol-icon", className)} />;
}
