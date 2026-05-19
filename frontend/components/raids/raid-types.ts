import type { TxStatus } from "@/components/TransactionStatus";

export type RaidPlatform = "X" | "Discord" | "Telegram" | "On-chain" | "N/A";
export type RaidRoomStatus = "Live" | "Scheduled" | "Ended";
export type RaidProofState = "not-started" | "opened-target" | "pending-proof" | "submitted" | "verifying" | "approved" | "rejected";

export type RaidMissionView = {
  id: string;
  label: string;
  type: "like" | "repost" | "quote" | "comment" | "follow" | "bookmark" | "submit-proof" | "custom";
  xp: number | null;
  status: RaidProofState;
  review: string;
};

export type RaidLeaderboardRow = {
  rank: string;
  wallet: string;
  xp: string;
  completed: string;
  streak: string;
  rewards: string;
  role: string;
};

export type RaidRoomView = {
  id: string;
  collectionId: string;
  collectionName: string;
  collectionSymbol: string;
  collectionImage: string | null;
  name: string;
  boss: string;
  platform: RaidPlatform;
  status: RaidRoomStatus;
  targetLink: string | null;
  missionCount: number | null;
  participants: number | null;
  capacity: number | null;
  rewardPool: string;
  rewardSol: number | null;
  xpTarget: number | null;
  currentXp: number | null;
  progress: number;
  timeLabel: string;
  startsAt: string | null;
  endsAt: string | null;
  proofMode: string;
  verificationMode: string;
  missions: RaidMissionView[];
  leaderboard: RaidLeaderboardRow[];
};

export type RaidJoinState = {
  status: TxStatus;
  detail: string | null;
};

export type RaidCommandStats = {
  liveRaids: string;
  participants: string;
  xpAwarded: string;
  rewardsPending: string;
  successRate: string;
};
