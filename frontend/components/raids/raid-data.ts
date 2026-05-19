import { brandAssets } from "@/lib/brand-assets";
import type { RaidCommandStats, RaidLeaderboardRow, RaidMissionView, RaidPlatform, RaidProofState, RaidRoomStatus, RaidRoomView } from "./raid-types";

const CANONICAL_MISSIONS: Array<Omit<RaidMissionView, "status" | "review">> = [
  { id: "like", label: "Like", type: "like", xp: 10 },
  { id: "repost", label: "Repost", type: "repost", xp: 20 },
  { id: "quote", label: "Quote", type: "quote", xp: 20 },
  { id: "comment", label: "Comment", type: "comment", xp: 10 },
  { id: "follow", label: "Follow", type: "follow", xp: 10 },
  { id: "bookmark", label: "Bookmark", type: "bookmark", xp: 10 },
  { id: "submit-proof", label: "Submit proof", type: "submit-proof", xp: 20 }
];

export function normalizeRaidRooms(input: unknown): RaidRoomView[] {
  const list = Array.isArray(input) ? input : record(input).raids;
  if (!Array.isArray(list)) return [];
  return list.map((item) => normalizeRaidRoom(item)).filter((raid): raid is RaidRoomView => Boolean(raid));
}

export function mergeRaidDetail(raid: RaidRoomView | null, detail: unknown): RaidRoomView | null {
  if (!raid) return null;
  const data = record(detail);
  const detailRaid = data.raid ? normalizeRaidRoom(data.raid) : null;
  const missions = Array.isArray(data.missions) && data.missions.length ? data.missions.map((mission) => missionFromRecord(mission, "not-started")) : raid.missions;
  const leaderboard = Array.isArray(data.participants) ? data.participants.map(participantFromRecord) : raid.leaderboard;
  return {
    ...raid,
    ...detailRaid,
    collectionName: text(record(data.collection).name) ?? raid.collectionName,
    collectionSymbol: text(record(data.collection).symbol) ?? raid.collectionSymbol,
    collectionImage: text(record(data.collection).image) ?? raid.collectionImage,
    missions,
    leaderboard
  };
}

export function computeRaidStats(raids: RaidRoomView[], unavailable: boolean): RaidCommandStats {
  if (unavailable) {
    return { liveRaids: "N/A", participants: "N/A", xpAwarded: "N/A", rewardsPending: "N/A", successRate: "N/A" };
  }
  const live = raids.filter((raid) => raid.status === "Live").length;
  const participants = raids.reduce((sum, raid) => sum + (raid.participants ?? 0), 0);
  const xp = raids.reduce((sum, raid) => sum + (raid.currentXp ?? 0), 0);
  const rewards = raids.reduce((sum, raid) => sum + (raid.rewardSol ?? 0), 0);
  const rated = raids.filter((raid) => raid.progress > 0);
  const successRate = rated.length ? `${Math.round(rated.reduce((sum, raid) => sum + raid.progress, 0) / rated.length)}%` : raids.length ? "0%" : "N/A";
  return {
    liveRaids: String(live),
    participants: participants.toLocaleString(),
    xpAwarded: xp ? xp.toLocaleString() : raids.length ? "0" : "N/A",
    rewardsPending: rewards ? `${formatNumber(rewards)} SOL` : raids.length ? "0 SOL" : "N/A",
    successRate
  };
}

export function missionsForRaid(raid: RaidRoomView | null, openedTarget: boolean, joinConfirmed: boolean): RaidMissionView[] {
  const state: RaidProofState = joinConfirmed ? "submitted" : openedTarget ? "opened-target" : "not-started";
  if (raid?.missions.length) {
    return raid.missions.map((mission) => ({
      ...mission,
      status: mission.type === "submit-proof" && openedTarget && !joinConfirmed ? "pending-proof" : state,
      review: reviewText(mission.type === "submit-proof" && openedTarget && !joinConfirmed ? "pending-proof" : state)
    }));
  }
  return CANONICAL_MISSIONS.map((mission) => ({
    ...mission,
    status: mission.type === "submit-proof" && openedTarget && !joinConfirmed ? "pending-proof" : state,
    review: reviewText(mission.type === "submit-proof" && openedTarget && !joinConfirmed ? "pending-proof" : state)
  }));
}

export function proofStateFor(openedTarget: boolean, joinConfirmed: boolean): RaidProofState {
  if (joinConfirmed) return "approved";
  if (openedTarget) return "pending-proof";
  return "not-started";
}

function normalizeRaidRoom(input: unknown): RaidRoomView | null {
  const value = record(input);
  const id = text(value.id);
  if (!id) return null;
  const collection = record(value.collection);
  const startsAt = text(value.startsAt) ?? text(value.startsIn);
  const endsAt = text(value.endsAt) ?? text(value.endsIn);
  const status = normalizeStatus(text(value.status), startsAt, endsAt);
  const targetLink = text(value.targetLink) ?? text(value.targetUrl) ?? text(value.url);
  const missionCount = number(value.missionCount) ?? (Array.isArray(value.missions) ? value.missions.length : null);
  const rewardSol = number(value.rewardSol) ?? number(value.rewardPoolSol);
  const currentXp = number(value.currentXp);
  const xpTarget = number(value.xpTarget);
  const progress = number(value.progress) ?? (currentXp !== null && xpTarget ? Math.round((currentXp / xpTarget) * 100) : 0);
  const platform = normalizePlatform(text(value.targetPlatform) ?? text(value.platform), targetLink);
  const openedState: RaidProofState = "not-started";
  const missions = Array.isArray(value.missions) ? value.missions.map((mission) => missionFromRecord(mission, openedState)) : [];

  return {
    id,
    collectionId: text(value.collectionId) ?? text(collection.id) ?? "N/A",
    collectionName: text(value.collectionName) ?? text(collection.name) ?? "Community N/A",
    collectionSymbol: text(value.collectionSymbol) ?? text(collection.symbol) ?? "PHEW",
    collectionImage: text(value.collectionImage) ?? text(collection.image) ?? text(collection.logoUri) ?? brandAssets.raid.flag,
    name: text(value.name) ?? "Raid Room",
    boss: text(value.boss) ?? text(value.bossName) ?? "Mission Commander",
    platform,
    status,
    targetLink,
    missionCount,
    participants: number(value.participants),
    capacity: number(value.capacity),
    rewardPool: rewardSol !== null ? `${formatNumber(rewardSol)} SOL` : "N/A",
    rewardSol,
    xpTarget,
    currentXp,
    progress: Math.min(100, Math.max(0, progress)),
    timeLabel: timeLabel(status, startsAt, endsAt, text(value.startsIn), text(value.endsIn)),
    startsAt: startsAt ?? null,
    endsAt: endsAt ?? null,
    proofMode: text(value.proofMode) ?? "Manual/community review required",
    verificationMode: text(value.verificationMode) ?? "API verification unavailable",
    missions,
    leaderboard: Array.isArray(value.leaderboard) ? value.leaderboard.map(participantFromRecord) : []
  };
}

function missionFromRecord(input: unknown, status: RaidProofState): RaidMissionView {
  const value = record(input);
  const label = text(value.title) ?? text(value.label) ?? "Custom mission";
  return {
    id: text(value.id) ?? label.toLowerCase().replace(/\W+/g, "-"),
    label,
    type: missionType(label, text(value.type)),
    xp: number(value.xp) ?? number(value.xpReward),
    status,
    review: reviewText(status)
  };
}

function participantFromRecord(input: unknown, index: number): RaidLeaderboardRow {
  const value = record(input);
  const xp = number(value.xp) ?? number(value.xpEarned);
  const reward = number(value.rewardSol);
  return {
    rank: text(value.rank) ?? `#${index + 1}`,
    wallet: text(value.wallet) ?? text(value.walletAddress) ?? text(value.name) ?? "N/A",
    xp: xp !== null ? `${xp.toLocaleString()} XP` : "N/A",
    completed: text(value.completed) ?? text(value.raidsCompleted) ?? "N/A",
    streak: text(value.streak) ?? "N/A",
    rewards: reward !== null ? `${formatNumber(reward)} SOL` : text(value.rewards) ?? "N/A",
    role: text(value.role) ?? "Raider"
  };
}

function normalizeStatus(status: string | null, startsAt: string | null, endsAt: string | null): RaidRoomStatus {
  const normalized = status?.toLowerCase() ?? "";
  const now = Date.now();
  const start = parseTime(startsAt);
  const end = parseTime(endsAt);
  if (normalized.includes("completed") || normalized.includes("ended") || normalized.includes("cancel")) return "Ended";
  if (end && end < now) return "Ended";
  if (normalized.includes("live") && (!end || end >= now)) return "Live";
  if (start && start > now) return "Scheduled";
  return normalized.includes("upcoming") || normalized.includes("scheduled") || normalized.includes("draft") ? "Scheduled" : "Live";
}

function normalizePlatform(platform: string | null, targetLink: string | null): RaidPlatform {
  const source = `${platform ?? ""} ${targetLink ?? ""}`.toLowerCase();
  if (source.includes("twitter.com") || source.includes("x.com") || source === "x") return "X";
  if (source.includes("discord")) return "Discord";
  if (source.includes("telegram") || source.includes("t.me")) return "Telegram";
  if (source.includes("chain") || source.includes("solana") || source.includes("explorer")) return "On-chain";
  return "N/A";
}

function missionType(label: string, type: string | null): RaidMissionView["type"] {
  const source = `${label} ${type ?? ""}`.toLowerCase();
  if (source.includes("like")) return "like";
  if (source.includes("repost") || source.includes("retweet")) return "repost";
  if (source.includes("quote")) return "quote";
  if (source.includes("comment") || source.includes("reply")) return "comment";
  if (source.includes("follow")) return "follow";
  if (source.includes("bookmark")) return "bookmark";
  if (source.includes("proof") || source.includes("submit")) return "submit-proof";
  return "custom";
}

function timeLabel(status: RaidRoomStatus, startsAt: string | null, endsAt: string | null, startsIn?: string | null, endsIn?: string | null) {
  if (status === "Scheduled") return relativeTime(startsAt) ?? startsIn ?? "N/A";
  if (status === "Live") return relativeTime(endsAt) ?? endsIn ?? "N/A";
  return "Ended";
}

function relativeTime(value: string | null) {
  const time = parseTime(value);
  if (!time) return null;
  const deltaMs = time - Date.now();
  if (deltaMs <= 0) return "Ended";
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 48) return `${hours}h ${mins}m`;
  return `${Math.round(hours / 24)}d`;
}

function reviewText(state: RaidProofState) {
  const labels: Record<RaidProofState, string> = {
    "not-started": "Not started",
    "opened-target": "Target opened",
    "pending-proof": "Manual/community review required",
    submitted: "Proof submitted",
    verifying: "Verifying",
    approved: "Approved by backend",
    rejected: "Rejected"
  };
  return labels[state];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTime(value: string | null) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: value < 10 ? 3 : 1 });
}
