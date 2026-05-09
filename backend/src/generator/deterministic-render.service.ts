import { BadRequestException, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { AssetProductionManifest, FinalVaultAsset, FinalVaultAssetInput } from "./asset-production.types";
import { ProductionLayerPackService } from "./production-layer-pack.service";
import { pick, seedFrom } from "./generator.util";

@Injectable()
export class DeterministicRenderService {
  constructor(private readonly productionLayers: ProductionLayerPackService) {}

  renderFinalVaultAsset(input: FinalVaultAssetInput, manifest: AssetProductionManifest): FinalVaultAsset {
    if (!this.productionLayers.meetsRequiredStatus(manifest.productionAssetStatus, "CURATED_LAYER_READY")) {
      throw new BadRequestException("Final NFT rendering requires CURATED_LAYER_READY or better production assets.");
    }
    const renderRoot = this.productionLayers.renderRoot();
    if (!renderRoot) throw new BadRequestException("FINAL_RENDER_STORAGE_ROOT is required for deterministic final NFT rendering.");

    const traits = this.assignTraits(input);
    const traitHash = this.hash({ collection: input.style.collection, traits, rendererVersion: process.env.FINAL_RENDERER_VERSION ?? "v1" });
    const imageUri = `${renderRoot}/${this.slug(input.style.collection)}/${traitHash}.png`;
    const role = pick(input.style.roleNames, seedFrom(`${input.style.collection}:${input.seedKey}:role`));
    const rarity = String(traits.Rarity);
    const metadata = {
      name: `${role} #${1000 + (seedFrom(input.seedKey) % 9000)}`,
      collection: input.style.collection,
      description: `A backed Vault NFT from the ${input.style.collection} community. ${input.style.lore}`,
      image: imageUri,
      properties: {
        category: "image",
        phew: {
          metadataSchemaVersion: "phew-v1",
          nftStandard: "Metaplex Core",
          productionAssetStatus: manifest.productionAssetStatus,
          deterministicRender: true,
          renderCacheKey: traitHash,
          rendererVersion: process.env.FINAL_RENDERER_VERSION ?? "v1",
          layerPackId: input.style.assetPackId
        }
      },
      attributes: [
        { trait_type: "Underlying Token", value: input.style.collection.replace(" Vaults", "") },
        { trait_type: "Locked Amount", value: input.lockedAmount },
        { trait_type: "Lock Duration", value: `${input.lockDurationDays} Days` },
        { trait_type: "Redeemable", value: "No" },
        { trait_type: "Role", value: role },
        { trait_type: "Rank", value: rarity === "Legendary" || rarity === "Mythic" ? "Legendary Raider" : "Vault Raider" },
        ...Object.entries(traits).map(([trait_type, value]) => ({ trait_type, value }))
      ]
    };
    return { imageUri, metadata, manifest };
  }

  private assignTraits(input: FinalVaultAssetInput) {
    const seed = seedFrom(`${input.style.collection}:final:${input.seedKey}:${input.ownerWallet}:${input.lockedAmount}:${input.lockDurationDays}`);
    const roleValue = (role: keyof typeof input.pack.categoryRoles, salt: number) => {
      const categoryId = input.pack.categoryRoles?.[role];
      const values = categoryId ? input.pack.categories[categoryId] ?? [] : [];
      return pick(values.length ? values : ["Curated Layer Missing"], seed + salt);
    };
    const rarity = this.weightedRarity(input.pack.rarityWeights, seed + 97);
    return {
      Background: roleValue("background", 3),
      "Base Character": roleValue("base", 4),
      Headgear: roleValue("head", 5),
      Eyes: roleValue("eyes", 6),
      "Mouth Expression": roleValue("mouth", 7),
      Outfit: roleValue("body", 8),
      Aura: roleValue("aura", 9),
      Accessory: roleValue("prop", 10),
      "Neck/Chest Accessory": roleValue("neck", 11),
      "Frame/Border": roleValue("frame", 12),
      "Animation Overlay": roleValue("animation", 13),
      Rarity: rarity
    };
  }

  private weightedRarity(weights: Record<string, number>, seed: number) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, weight]) => sum + Number(weight), 0);
    let cursor = Math.abs(seed) % Math.max(1, total);
    for (const [rarity, weight] of entries) {
      cursor -= Number(weight);
      if (cursor < 0) return rarity;
    }
    return "Common";
  }

  private hash(value: unknown) {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 32);
  }

  private slug(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
  }
}
