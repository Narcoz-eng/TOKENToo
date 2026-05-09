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

const artStyles = ["pixel medium", "comic medium", "cinematic medium", "painterly medium", "clay medium", "surreal medium", "poster medium", "arcade medium", "low-poly medium"] as const;
const shapeLanguages = ["rounded", "sharp", "glitch", "organic", "geometric"] as const;
const textures = ["clean", "grain", "scanlines", "painted", "posterized"] as const;
const subjectRoles = ["signal citizen", "myth carrier", "relic witness", "culture avatar", "world actor", "meme envoy"] as const;

@Injectable()
export class IdentityEngineService {
  createCommunityProfile(token: TokenScan): CommunityProfile {
    const clean = token.symbol.replace(/[^a-z0-9]/gi, "").toLowerCase() || "vault";
    const index = [...clean].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palettes.length;
    const root = this.identityRoot(token);
    const titleRoot = this.title(root);
    const subjectRole = subjectRoles[index % subjectRoles.length];

    return {
      name: `${token.symbol} Vaults`,
      symbol: token.symbol,
      theme: `${root} civilization`,
      mascot: `${titleRoot} ${this.title(subjectRole)}`,
      vibe: `${root} culture, token-backed rituals, collection-first progression`,
      palette: palettes[index],
      communityTraits: {
        background: [`${titleRoot} District`, `${titleRoot} Ritual Room`, `${titleRoot} Origin Site`],
        role: [`${titleRoot} Witness`, `${titleRoot} Operator`, `${titleRoot} Mythkeeper`],
        aura: [`${titleRoot} Pressure`, `${titleRoot} Static`, `${titleRoot} Weather`],
        accessory: [`${titleRoot} Relic`, `${titleRoot} Signal`, `${titleRoot} Mark`],
        rank: [`${titleRoot} Initiate`, `${titleRoot} Keeper`, `${titleRoot} Mythic`],
        legendaryTrait: `${titleRoot} Origin Incident`
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
        base: [`${titleRoot} Common Subject`, `${titleRoot} Altered Subject`, `${titleRoot} Mythic Subject`],
        headgear: [`${titleRoot} Head Mark`, `${titleRoot} Signal Hood`, `${titleRoot} Origin Helm`],
        eyes: [`${titleRoot} Glow`, `${titleRoot} Focus`, `${titleRoot} Scan`],
        aura: [`${titleRoot} Weather`, `${titleRoot} Pulse`, `${titleRoot} Static`],
        accessory: [`${titleRoot} Relic`, `${titleRoot} Banner`, `${titleRoot} Key`],
        background: [`${titleRoot} District`, `${titleRoot} Vault`, `${titleRoot} Raid Room`]
      },
      styleProfile: {
        artStyle: artStyles[index % artStyles.length],
        colorPalette: palettes[index],
        shapeLanguage: shapeLanguages[index % shapeLanguages.length],
        mascotType: this.subjectType(index),
        visualFx: this.visualFx(index),
        texture: textures[index % textures.length],
        silhouetteRules: [
          `Use a ${shapeLanguages[index % shapeLanguages.length]} silhouette language`,
          `Anchor the subject around ${root} culture and token metadata`,
          "Do not reuse base pose across the first 20 generated NFTs"
        ]
      }
    };
  }

  private identityRoot(token: TokenScan) {
    const stop = new Set(["the", "and", "for", "with", "token", "coin", "official", "community", "vault", "nft", "solana"]);
    const words = [token.symbol, token.name, token.description ?? ""]
      .join(" ")
      .split(/[^a-z0-9]+/i)
      .map((word) => word.toLowerCase())
      .filter((word) => word.length > 2 && !stop.has(word))
      .slice(0, 3);
    return words.length ? words.join(" ") : "origin culture";
  }

  private subjectType(index: number) {
    return ["dynamic subject", "symbolic character", "culture avatar", "myth witness", "ritual actor"][index % 5];
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
