import { Injectable } from "@nestjs/common";
import type { GeneratedStyleProfile, PreviewAssetPlan, TraitPackPlan } from "./generator.types";
import { pick, seedFrom } from "./generator.util";

@Injectable()
export class MetadataGeneratorService {
  sample(style: GeneratedStyleProfile, pack: TraitPackPlan, preview?: PreviewAssetPlan) {
    const seed = seedFrom(`${style.collection}:metadata:${preview?.label ?? "sample"}`);
    const attributes = [
      { trait_type: "Underlying Token", value: style.collection.replace(" Vaults", "") },
      { trait_type: "Locked Amount", value: "50,000" },
      { trait_type: "Lock Duration", value: "90 Days" },
      { trait_type: "Redeemable", value: "Yes" },
      { trait_type: "Role", value: pick(style.roleNames, seed + 1) },
      { trait_type: "Background", value: pick(pack.categories.backgrounds, seed + 2) },
      { trait_type: "Base Character", value: pick(pack.categories.baseCharacter, seed + 3) },
      { trait_type: "Headgear", value: pick(pack.categories.headgear, seed + 4) },
      { trait_type: "Eyes", value: pick(pack.categories.eyes, seed + 5) },
      { trait_type: "Outfit", value: pick(pack.categories.outfitBody, seed + 6) },
      { trait_type: "Aura", value: pick(pack.categories.auraEffect, seed + 7) },
      { trait_type: "Accessory", value: pick(pack.categories.accessories, seed + 8) },
      { trait_type: "Rarity", value: pick(["Rare", "Epic", "Legendary"], seed + 9) }
    ];

    return {
      name: `${attributes[4].value} #${1000 + (seed % 8999)}`,
      collection: style.collection,
      description: `A backed Vault NFT from the ${style.collection} community. ${style.lore}`,
      image: preview?.uri ?? "ipfs://vaultx/preview.png",
      attributes
    };
  }
}

