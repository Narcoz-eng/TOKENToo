import { Injectable } from "@nestjs/common";
import type { CommunityProfile, GeneratedArt } from "../types";

@Injectable()
export class ArtGeneratorService {
  async generateVaultArt(profile: CommunityProfile, positionId: string): Promise<GeneratedArt> {
    const layers = [
      profile.communityTraits.background[0],
      profile.communityTraits.role[0],
      profile.communityTraits.aura[0],
      profile.communityTraits.accessory[0]
    ];

    return {
      imageUri: `ipfs://vaultx/${profile.symbol.toLowerCase().replace("$", "")}/${positionId}.png`,
      metadataUri: `ipfs://vaultx/${profile.symbol.toLowerCase().replace("$", "")}/${positionId}.json`,
      layers
    };
  }

  async uploadMetadata(metadata: Record<string, unknown>) {
    const symbol = String(metadata.symbol ?? "vaultx").toLowerCase().replace("$", "");
    return `arweave://vaultx/${symbol}/${Date.now()}.json`;
  }
}

