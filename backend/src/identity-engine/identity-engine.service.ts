import { Injectable } from "@nestjs/common";
import type { CommunityProfile, TokenScan } from "../types";

const palettes = [
  ["#21f26b", "#7a35ff", "#052617"],
  ["#f4c542", "#21f26b", "#2b1905"],
  ["#9a36ff", "#28d7ff", "#1b042c"],
  ["#df8740", "#7a35ff", "#25110a"],
  ["#28d7ff", "#e8f7ff", "#07121f"],
  ["#ff4f70", "#f4c542", "#23070d"]
];

const artStyles = ["pixel", "cartoon", "cyberpunk", "abstract", "meme", "anime", "low-poly"] as const;
const shapeLanguages = ["rounded", "sharp", "glitch", "organic", "geometric"] as const;
const textures = ["clean", "grain", "scanlines", "painted", "posterized"] as const;

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
      },
      traitLayers: {
        base: [`${this.title(root)} Base`, `${this.title(root)} Veteran`, `${this.title(root)} Mythic`],
        headgear: [`${this.title(root)} Crown`, `${this.title(root)} Hood`, `${this.title(root)} Helm`],
        eyes: [`${this.title(root)} Glow`, `${this.title(root)} Focus`, `${this.title(root)} Scan`],
        aura: [`${this.title(root)} Mist`, `${this.title(root)} Pulse`, `${this.title(root)} Static`],
        accessory: [`${this.title(root)} Staff`, `${this.title(root)} Banner`, `${this.title(root)} Key`],
        background: [`${this.title(root)} Gate`, `${this.title(root)} Vault`, `${this.title(root)} Raid Room`]
      },
      styleProfile: {
        artStyle: artStyles[index % artStyles.length],
        colorPalette: palettes[index],
        shapeLanguage: shapeLanguages[index % shapeLanguages.length],
        mascotType: this.mascotType(clean),
        visualFx: this.visualFx(index),
        texture: textures[index % textures.length],
        silhouetteRules: [
          `Use a ${shapeLanguages[index % shapeLanguages.length]} silhouette language`,
          `Anchor the mascot around ${this.rootWord(clean)} identity`,
          "Do not reuse base pose across the first 20 generated NFTs"
        ]
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

  private mascotType(symbol: string) {
    if (symbol.includes("frog")) return "frog" as const;
    if (symbol.includes("dog")) return "dog" as const;
    if (symbol.includes("cat")) return "cat" as const;
    if (symbol.includes("pepe")) return "alien" as const;
    if (symbol.includes("shib")) return "samurai" as const;
    return "robot" as const;
  }

  private visualFx(index: number) {
    const fx = [
      ["toxic particles", "soft glow", "mist noise"],
      ["gold sparks", "banner shimmer", "moon glow"],
      ["glitch trails", "scanline noise", "neon rim light"],
      ["moss haze", "embers", "vault shine"],
      ["plasma shards", "electric pulse", "abstract gradients"]
    ];
    return fx[index % fx.length];
  }

  private title(value: string) {
    return value.replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
