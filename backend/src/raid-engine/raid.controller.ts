import { Body, Controller, Param, Post } from "@nestjs/common";
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

@Controller("raids")
export class RaidController {
  constructor(private readonly raids: RaidEngineService) {}

  @Post(":raidRoomId/missions/:missionId/claims/validate")
  validateClaim(@Param("raidRoomId") raidRoomId: string, @Param("missionId") raidMissionId: string, @Body() body: ClaimBody) {
    return this.raids.validateMissionClaim({ raidRoomId, raidMissionId, ...body });
  }

  @Post(":raidRoomId/missions/:missionId/claims")
  claimMission(@Param("raidRoomId") raidRoomId: string, @Param("missionId") raidMissionId: string, @Body() body: ClaimBody) {
    return this.raids.claimMission({ raidRoomId, raidMissionId, ...body });
  }
}
