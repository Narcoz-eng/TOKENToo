import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../db/prisma.service";
import type { RaidScoreInput } from "../types";

@Injectable()
export class RaidEngineService {
  constructor(private readonly prisma: PrismaService) {}

  createRaidRoom(collectionId: string, name: string) {
    return {
      collectionId,
      name,
      status: "DRAFT",
      antiAbuseRules: {
        dailyXpCap: 800,
        minimumWalletAgeHours: 24,
        minimumHoldingHours: 6,
        washTradeRewards: false,
        scoreByValue: true
      }
    };
  }

  scoreMission(input: RaidScoreInput) {
    if (input.walletAgeHours < 24) return { xp: 0, blocked: true, reason: "wallet_age" };
    if (input.holdingHours < 6) return { xp: 0, blocked: true, reason: "holding_time" };
    if (input.possibleWashTrade) return { xp: 0, blocked: true, reason: "wash_trade" };

    const valueScore = Math.min(400, Math.round(input.notionalValueUsd / 25));
    const activityScore = Math.min(200, input.actionsToday * 25);
    const xp = Math.min(800, valueScore + activityScore);
    return { xp, blocked: false };
  }

  async validateMissionClaim(input: {
    raidRoomId: string;
    raidMissionId: string;
    userId: string;
    walletAddress: string;
    walletAgeHours: number;
    holdingHours: number;
    notionalValueUsd: number;
    possibleWashTrade?: boolean;
  }) {
    const mission = await this.prisma.raidMission.findUnique({ where: { id: input.raidMissionId }, include: { raidRoom: true } });
    if (!mission || mission.raidRoomId !== input.raidRoomId) throw new NotFoundException("Raid mission not found");
    const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!user || user.walletAddress !== input.walletAddress) throw new BadRequestException("Wallet does not own this user profile.");
    if (mission.raidRoom.status !== "LIVE") throw new BadRequestException("Raid room is not live");
    const now = new Date();
    if (mission.startsAt > now || mission.endsAt < now) throw new BadRequestException("Mission is outside its active window");

    const windowKey = `${now.toISOString().slice(0, 10)}:${mission.id}`;
    const cooldown = await this.prisma.missionCooldown.findUnique({
      where: { raidMissionId_walletAddress_windowKey: { raidMissionId: mission.id, walletAddress: input.walletAddress, windowKey } }
    });
    if (cooldown && mission.dailyXpCap && cooldown.xpEarned >= mission.dailyXpCap) {
      return { blocked: true, reason: "daily_xp_cap", xpApproved: 0, abuseScore: 25 };
    }

    const score = this.scoreMission({
      walletAgeHours: input.walletAgeHours,
      holdingHours: input.holdingHours,
      notionalValueUsd: input.notionalValueUsd,
      possibleWashTrade: Boolean(input.possibleWashTrade),
      actionsToday: cooldown?.attempts ?? 0
    });
    const cappedXp = Math.min(score.xp, mission.xpReward, Math.max(0, (mission.dailyXpCap ?? mission.xpReward) - (cooldown?.xpEarned ?? 0)));
    return {
      blocked: score.blocked,
      reason: score.reason,
      xpApproved: score.blocked ? 0 : cappedXp,
      abuseScore: score.blocked ? 75 : input.possibleWashTrade ? 90 : 0
    };
  }

  async claimMission(input: {
    raidRoomId: string;
    raidMissionId: string;
    userId: string;
    walletAddress: string;
    walletAgeHours: number;
    holdingHours: number;
    notionalValueUsd: number;
    possibleWashTrade?: boolean;
    proof?: Record<string, unknown>;
  }) {
    const validation = await this.validateMissionClaim(input);
    const claim = await this.prisma.raidClaim.create({
      data: {
        raidRoomId: input.raidRoomId,
        raidMissionId: input.raidMissionId,
        userId: input.userId,
        walletAddress: input.walletAddress,
        status: validation.blocked ? "REJECTED" : "APPROVED",
        proof: this.json(input.proof ?? {}),
        xpRequested: Math.round(input.notionalValueUsd),
        xpApproved: validation.xpApproved,
        abuseScore: validation.abuseScore,
        rejectionReason: validation.blocked ? validation.reason : undefined,
        reviewedAt: new Date()
      }
    });

    await this.prisma.walletReputation.upsert({
      where: { walletAddress: input.walletAddress },
      update: {
        walletAgeHours: input.walletAgeHours,
        abuseScore: { increment: validation.abuseScore },
        rejectedClaims: validation.blocked ? { increment: 1 } : undefined,
        completedRaids: validation.blocked ? undefined : { increment: 1 },
        lastActivityAt: new Date()
      },
      create: {
        walletAddress: input.walletAddress,
        walletAgeHours: input.walletAgeHours,
        abuseScore: validation.abuseScore,
        rejectedClaims: validation.blocked ? 1 : 0,
        completedRaids: validation.blocked ? 0 : 1,
        lastActivityAt: new Date()
      }
    });

    if (validation.abuseScore > 0) {
      await this.prisma.raidAbuseSignal.create({
        data: {
          raidRoomId: input.raidRoomId,
          walletAddress: input.walletAddress,
          signalType: validation.reason ?? "abuse_score",
          severity: validation.abuseScore,
          reason: validation.reason ?? "Claim failed anti-abuse checks",
          evidence: this.json(input.proof ?? {})
        }
      });
    }

    const resetsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const windowKey = `${new Date().toISOString().slice(0, 10)}:${input.raidMissionId}`;
    await this.prisma.missionCooldown.upsert({
      where: { raidMissionId_walletAddress_windowKey: { raidMissionId: input.raidMissionId, walletAddress: input.walletAddress, windowKey } },
      update: { attempts: { increment: 1 }, xpEarned: { increment: validation.xpApproved }, resetsAt },
      create: {
        raidMissionId: input.raidMissionId,
        userId: input.userId,
        walletAddress: input.walletAddress,
        windowKey,
        attempts: 1,
        xpEarned: validation.xpApproved,
        resetsAt
      }
    });

    return claim;
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
}
