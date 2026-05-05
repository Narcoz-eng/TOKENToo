import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { WalletAddress } from "../auth/wallet-address.decorator";
import { WalletAuthGuard } from "../auth/wallet-auth.guard";
import { RaidEngineService } from "./raid-engine.service";

type ClaimBody = {
  userId: string;
  walletAddress: string;
  walletAgeHours: number;
  holdingHours: number;
  notionalValueUsd: number;
  possibleWashTrade?: boolean;
  proof?: Record<string, unknown>;
};

const claimSchema = z.object({
  userId: z.string().min(1),
  walletAgeHours: z.number().nonnegative(),
  holdingHours: z.number().nonnegative(),
  notionalValueUsd: z.number().nonnegative(),
  possibleWashTrade: z.boolean().optional(),
  proof: z.record(z.string(), z.unknown()).optional()
});

@Controller("raids")
@UseGuards(WalletAuthGuard)
export class RaidController {
  constructor(private readonly raids: RaidEngineService) {}

  @Post(":raidRoomId/missions/:missionId/claims/validate")
  validateClaim(@Param("raidRoomId") raidRoomId: string, @Param("missionId") raidMissionId: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.raids.validateMissionClaim({ raidRoomId, raidMissionId, ...claimSchema.parse(body), walletAddress } as ClaimBody & { raidRoomId: string; raidMissionId: string });
  }

  @Post(":raidRoomId/missions/:missionId/claims")
  claimMission(@Param("raidRoomId") raidRoomId: string, @Param("missionId") raidMissionId: string, @Body() body: unknown, @WalletAddress() walletAddress: string) {
    return this.raids.claimMission({ raidRoomId, raidMissionId, ...claimSchema.parse(body), walletAddress } as ClaimBody & { raidRoomId: string; raidMissionId: string });
  }
}
