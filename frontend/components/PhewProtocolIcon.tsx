"use client";

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
  lockTokens: "/icons/phew/native-lock-tokens.svg",
  mintNft: "/icons/phew/native-mint-nft.svg",
  stake: "/icons/phew/native-stake.svg",
  redeem: "/icons/phew/native-redeem.svg",
  proof: "/icons/phew/native-proof.svg",
  reserve: "/icons/phew/native-reserve.svg",
  strategy: "/icons/phew/native-strategy.svg",
  community: "/icons/phew/native-community.svg",
  raid: "/icons/phew/native-raid-flag.svg"
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
