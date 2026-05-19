"use client";

import { PhewSuccessMomentModal } from "@/components/PhewSuccessMomentModal";

export function RaidSuccessMoment({
  open,
  raidName,
  rewardLabel,
  onClose
}: {
  open: boolean;
  raidName: string;
  rewardLabel?: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <PhewSuccessMomentModal
      action="raid"
      title="Raid success"
      subtitle={`${raidName} participation was confirmed by the backend.${rewardLabel ? ` ${rewardLabel}` : ""}`}
      tokenSymbol="XP"
      onClose={onClose}
    />
  );
}
