import { Injectable } from "@nestjs/common";
import { ArtPreviewGeneratorService } from "./art-preview-generator.service";
import type { AssetProductionManifest, FinalVaultAsset, FinalVaultAssetInput, ProducedLayerSet } from "./asset-production.types";
import type { GeneratedStyleProfile, TraitPackPlan } from "./generator.types";
import { pick, seedFrom } from "./generator.util";

@Injectable()
export class AssetProductionLayerService {
  constructor(private readonly fallbackPreviews: ArtPreviewGeneratorService) {}

  manifest(style: GeneratedStyleProfile, pack: TraitPackPlan, qualityTier: AssetProductionManifest["qualityTier"]): AssetProductionManifest {
    const designProvider = this.provider(process.env.DESIGN_MODEL_PROVIDER);
    const layerProvider = this.provider(process.env.LAYER_PACK_PROVIDER ?? process.env.DESIGN_MODEL_PROVIDER);
    const legendaryProvider = this.provider(process.env.LEGENDARY_ASSET_PROVIDER ?? process.env.DESIGN_MODEL_PROVIDER);
    const productionReady = [designProvider, layerProvider, legendaryProvider].every((provider) => provider !== "mock") && qualityTier !== "BASIC";
    const availableTraitLayers =
      pack.categories.headgear.length +
      pack.categories.eyes.length +
      pack.categories.mouthExpression.length +
      pack.categories.outfitBody.length +
      pack.categories.accessories.length +
      (pack.categories.neckChestAccessory?.length ?? 0) +
      pack.categories.auraEffect.length +
      pack.categories.borderFrame.length +
      (pack.categories.animationOverlay?.length ?? 0);
    const readinessReport = {
      selectedAssetPack: style.assetPackId,
      availableBaseVariants: pack.categories.baseCharacter.length,
      availableBackgrounds: pack.categories.backgrounds.length,
      availableTraitLayers,
      availableLegendaryOverlays: pack.categories.legendaryOverlay.length,
      canProduce10kPremiumOutputs: productionReady && style.tenKReadiness.pass,
      reasonIfNo: productionReady && style.tenKReadiness.pass ? undefined : "Production asset providers are mock/procedural or 10k readiness failed."
    };

    return {
      collection: style.collection,
      standard: (process.env.METAPLEX_NFT_STANDARD as "METAPLEX_CORE" | "TOKEN_METADATA_FALLBACK" | undefined) ?? "METAPLEX_CORE",
      productionReady,
      qualityTier,
      baseMascots: this.layerSet(designProvider, pack.categories.baseCharacter, "Base mascots must provide 30-50 distinct silhouettes."),
      backgrounds: this.layerSet(designProvider, pack.categories.backgrounds, "Backgrounds define the collection world and must not be simple color swaps."),
      premiumTraits: this.layerSet(layerProvider, [
        ...pack.categories.headgear,
        ...pack.categories.eyes,
        ...pack.categories.mouthExpression,
        ...pack.categories.outfitBody,
        ...pack.categories.accessories,
        ...(pack.categories.neckChestAccessory ?? []),
        ...pack.categories.auraEffect,
        ...pack.categories.borderFrame
      ], "Premium trait layers must be handmade, curated, or generated from the approved art direction."),
      legendaryAssets: this.layerSet(legendaryProvider, [...pack.categories.legendaryOverlay, ...(pack.categories.animationOverlay ?? [])], "Legendary and mythic traits require visibly premium composition and optional animation."),
      royaltyPolicy: this.royaltyPolicy(),
      readinessReport,
      warnings: productionReady
        ? [this.royaltyPolicy().note]
        : ["Production mint art is not enabled. Current asset output uses the deterministic SVG fallback and must not be used for public launch.", this.royaltyPolicy().note]
    };
  }

  produceFinalVaultAsset(input: FinalVaultAssetInput): FinalVaultAsset {
    const manifest = this.manifest(input.style, input.pack, input.qualityTier);
    const seed = seedFrom(`${input.seedKey}:${input.ownerWallet}:${input.lockedAmount}:${input.lockDurationDays}`);
    const preview = this.fallbackPreviews.generate(input.style, input.pack, input.seedKey, seed).find((asset) => asset.type === "SAMPLE_NFT");
    const imageDataUri = preview?.uri ?? "";
    const metadata = this.metadata(input, preview?.metadata ?? {});

    return { imageDataUri, metadata, manifest };
  }

  private metadata(input: FinalVaultAssetInput, visualTraits: Record<string, unknown>) {
    const seed = seedFrom(`${input.style.collection}:final:${input.seedKey}`);
    const role = pick(input.style.roleNames, seed + 1);
    const rarity = String(visualTraits.rarity ?? pick(["Rare", "Epic", "Legendary"], seed + 2));
    return {
      name: `${role} #${1000 + (seed % 9000)}`,
      collection: input.style.collection,
      description: `A backed Vault NFT from the ${input.style.collection} community. ${input.style.lore}`,
      image: "",
      properties: {
        category: "image",
        phew: {
          metadataSchemaVersion: "phew-v1",
          nftStandard: "Metaplex Core",
          assetProductionReady: this.manifest(input.style, input.pack, input.qualityTier).productionReady,
          royaltyPolicy: this.royaltyPolicy()
        }
      },
      attributes: [
        { trait_type: "Underlying Token", value: input.style.collection.replace(" Vaults", "") },
        { trait_type: "Locked Amount", value: input.lockedAmount },
        { trait_type: "Lock Duration", value: `${input.lockDurationDays} Days` },
        { trait_type: "Redeemable", value: "No" },
        { trait_type: "Role", value: role },
        { trait_type: "Rank", value: rarity === "Legendary" || rarity === "Mythic" ? "Legendary Raider" : "Vault Raider" },
        { trait_type: "Background", value: visualTraits.background ?? pick(input.pack.categories.backgrounds, seed + 3) },
        { trait_type: "Base Character", value: visualTraits.base ?? pick(input.pack.categories.baseCharacter, seed + 4) },
        { trait_type: "Headgear", value: visualTraits.headgear ?? pick(input.pack.categories.headgear, seed + 5) },
        { trait_type: "Eyes", value: visualTraits.eyes ?? pick(input.pack.categories.eyes, seed + 6) },
        { trait_type: "Outfit", value: visualTraits.outfit ?? pick(input.pack.categories.outfitBody, seed + 7) },
        { trait_type: "Aura", value: visualTraits.aura ?? pick(input.pack.categories.auraEffect, seed + 8) },
        { trait_type: "Accessory", value: visualTraits.accessory ?? pick(input.pack.categories.accessories, seed + 9) },
        { trait_type: "Neck/Chest Accessory", value: visualTraits.neckChestAccessory ?? pick(input.pack.categories.neckChestAccessory ?? ["Vault Sigil"], seed + 10) },
        { trait_type: "Frame/Border", value: visualTraits.frame ?? pick(input.pack.categories.borderFrame, seed + 11) },
        { trait_type: "Animation Overlay", value: visualTraits.animationOverlay ?? pick(input.pack.categories.animationOverlay ?? ["Static Still"], seed + 12) },
        { trait_type: "Rarity", value: rarity }
      ]
    };
  }

  private layerSet(provider: ProducedLayerSet["provider"], values: string[], notes: string): ProducedLayerSet {
    return {
      provider,
      productionReady: provider !== "mock",
      count: values.length,
      examples: values.slice(0, 6),
      notes
    };
  }

  private provider(value?: string): ProducedLayerSet["provider"] {
    if (value === "ai" || value === "curated" || value === "handmade") return value;
    return "mock";
  }

  private royaltyPolicy() {
    const standard = (process.env.METAPLEX_NFT_STANDARD ?? "METAPLEX_CORE").toUpperCase();
    return {
      defaultCreatorRoyaltyBps: 500,
      enforceableOnSelectedStandard: false,
      selectedStandardSupportsConfiguredRoyalties: false,
      distribution: {
        platformTreasuryBps: 1000,
        communityTreasuryBps: 3000,
        liquidityReserveBps: 1500,
        raidRewardsPoolBps: 3000,
        creatorBps: 1500
      },
      note:
        standard === "METAPLEX_CORE"
          ? "Current Metaplex Core adapter creates assets without a royalty plugin; marketplace royalty enforcement is not claimed."
          : "Token Metadata/pNFT royalty path is not implemented in this build; royalty claims are blocked."
    };
  }
}
