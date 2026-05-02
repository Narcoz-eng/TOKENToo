import { Injectable } from "@nestjs/common";
import type { CommunityProfile, TokenScan } from "../types";

const palettes = [
  ["#21f26b", "#7a35ff", "#052617"],
  ["#f4c542", "#21f26b", "#2b1905"],
  ["#9a36ff", "#28d7ff", "#1b042c"],
  ["#df8740", "#7a35ff", "#25110a"]
];

@Injectable()
export class IdentityEngineService {
  createCommunityProfile(token: TokenScan): CommunityProfile {
    const clean = token.symbol.replace(/[^a-z0-9]/gi, "").toLowerCase() || "vault";
    const index = [...clean].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palettes.length;
    const root = this.rootWord(clean);

    return {
      name: `${token.symbol} Vaults`,
      symbol: token.symbol,
      theme: `${root} citadel`,
      mascot: `${this.title(root)} Warden`,
      vibe: `${root} raids, locked yield, collection-first progression`,
      palette: palettes[index],
      communityTraits: {
        background: [`${this.title(root)} Gate`, `${this.title(root)} Treasury`, `${this.title(root)} Moonroom`],
        role: [`${this.title(root)} Raider`, `${this.title(root)} Keeper`, `${this.title(root)} Prophet`],
        aura: [`${this.title(root)} Glow`, `${this.title(root)} Static`, `${this.title(root)} Mist`],
        accessory: [`${this.title(root)} Staff`, `${this.title(root)} Crown`, `${this.title(root)} Sigil`],
        rank: [`${this.title(root)} Initiate`, `${this.title(root)} Marshal`, `${this.title(root)} Mythic`],
        legendaryTrait: `${this.title(root)} Eternal Standard`
      },
      rarityTable: {
        common: 5200,
        uncommon: 2700,
        rare: 1400,
        epic: 560,
        legendary: 130,
        mythic: 10
      }
    };
  }

  private rootWord(symbol: string) {
    if (symbol.includes("frog")) return "swamp";
    if (symbol.includes("dog")) return "kennel";
    if (symbol.includes("cat")) return "neon alley";
    if (symbol.includes("pepe")) return "mire empire";
    return `${symbol} vault`;
  }

  private title(value: string) {
    return value.replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

