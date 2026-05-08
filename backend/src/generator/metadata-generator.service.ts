import { Injectable } from "@nestjs/common";
import type { GeneratedStyleProfile, PreviewAssetPlan, TraitPackPlan } from "./generator.types";
import { pick, seedFrom } from "./generator.util";

@Injectable()
export class MetadataGeneratorService {
  sample(style: GeneratedStyleProfile, pack: TraitPackPlan, preview?: PreviewAssetPlan) {
    const seed = seedFrom(`${style.collection}:metadata:${preview?.label ?? "sample"}`);
    const visual = preview?.metadata ?? {};
    const attributes = [
      { trait_type: "Underlying Token", value: style.collection.replace(" Vaults", "") },
      { trait_type: "Locked Amount", value: "50,000" },
      { trait_type: "Lock Duration", value: "90 Days" },
      { trait_type: "Redeemable", value: "Yes" },
      { trait_type: "Role", value: pick(style.roleNames, seed + 1) },
      { trait_type: "Background", value: this.trait(visual.background, pick(pack.categories.backgrounds, seed + 2)) },
      { trait_type: "Base Character", value: this.trait(visual.base, pick(pack.categories.baseCharacter, seed + 3)) },
      { trait_type: "Headgear", value: this.trait(visual.headgear, pick(pack.categories.headgear, seed + 4)) },
      { trait_type: "Eyes", value: this.trait(visual.eyes, pick(pack.categories.eyes, seed + 5)) },
      { trait_type: "Mouth Expression", value: this.trait(visual.mouthExpression, "Base expression") },
      { trait_type: "Outfit", value: this.trait(visual.outfit, pick(pack.categories.outfitBody, seed + 6)) },
      { trait_type: "Aura", value: this.trait(visual.aura, pick(pack.categories.auraEffect, seed + 7)) },
      { trait_type: "Accessory", value: this.trait(visual.accessory, pick(pack.categories.accessories, seed + 8)) },
      { trait_type: "Neck/Chest Accessory", value: this.trait(visual.neckChestAccessory, "None") },
      { trait_type: "Frame/Border", value: this.trait(visual.frame, "Standard frame") },
      { trait_type: "Pose", value: this.trait(visual.pose, "base pose") },
      { trait_type: "Scene", value: this.trait(visual.scene, "simple background") },
      { trait_type: "Legendary Overlay", value: this.trait(visual.legendaryOverlay, "None") },
      { trait_type: "Animation Overlay", value: this.trait(visual.animationOverlay, "Static Still") },
      { trait_type: "Composition Category", value: this.trait(visual.compositionCategory, "standard-composition") },
      { trait_type: "Special Metadata Flag", value: this.trait(visual.specialMetadataFlag, "NONE") },
      { trait_type: "Trait Count", value: String(visual.traitCount ?? "0") },
      { trait_type: "Rarity", value: this.trait(visual.rarity, pick(["Rare", "Epic", "Legendary"], seed + 9)) }
    ];

    return {
      name: `${attributes[4].value} #${1000 + (seed % 8999)}`,
      collection: style.collection,
      description: `A backed Vault NFT from the ${style.collection} community. ${style.lore}`,
      image: preview?.uri ?? "ipfs://phew/preview.png",
      attributes,
      properties: {
        category: "image",
        renderedTraitKeys: Array.isArray(visual.renderedTraitKeys) ? visual.renderedTraitKeys : [],
        conceptPreviewOnly: true
      }
    };
  }

  private trait(value: unknown, fallback: string) {
    return typeof value === "string" && value.trim() ? value : fallback;
  }
}
