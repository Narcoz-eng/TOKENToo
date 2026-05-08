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
    const storageIssue = this.storageIssue();
    const providerIssue = this.providerIssue(designProvider, layerProvider, legendaryProvider);
    const productionReady = !providerIssue && !storageIssue && qualityTier !== "BASIC";
    const availableTraitLayers =
      this.roleValues(pack, "head").length +
      this.roleValues(pack, "eyes").length +
      this.roleValues(pack, "mouth").length +
      this.roleValues(pack, "body").length +
      this.roleValues(pack, "prop").length +
      this.roleValues(pack, "neck").length +
      this.roleValues(pack, "aura").length +
      this.roleValues(pack, "frame").length +
      this.roleValues(pack, "animation").length;
    const readinessReport = {
      selectedAssetPack: style.assetPackId,
      availableBaseVariants: this.roleValues(pack, "base").length,
      availableBackgrounds: this.roleValues(pack, "background").length,
      availableTraitLayers,
      availableLegendaryOverlays: this.roleValues(pack, "legendary").length,
      canProduce10kPremiumOutputs: productionReady && style.tenKReadiness.pass,
      reasonIfNo: productionReady && style.tenKReadiness.pass ? undefined : [providerIssue, storageIssue, style.tenKReadiness.pass ? undefined : "10k readiness failed."].filter(Boolean).join(" ")
    };

    return {
      collection: style.collection,
      standard: (process.env.METAPLEX_NFT_STANDARD as "METAPLEX_CORE" | "TOKEN_METADATA_FALLBACK" | undefined) ?? "METAPLEX_CORE",
      productionReady,
      qualityTier,
      baseMascots: this.layerSet(designProvider, this.roleValues(pack, "base"), "Base mascots must be human-designed pack variants with distinct silhouettes."),
      backgrounds: this.layerSet(designProvider, this.roleValues(pack, "background"), "Backgrounds define the collection world and must not be simple color swaps."),
      premiumTraits: this.layerSet(layerProvider, [
        ...this.roleValues(pack, "head"),
        ...this.roleValues(pack, "eyes"),
        ...this.roleValues(pack, "mouth"),
        ...this.roleValues(pack, "body"),
        ...this.roleValues(pack, "prop"),
        ...this.roleValues(pack, "neck"),
        ...this.roleValues(pack, "aura"),
        ...this.roleValues(pack, "frame")
      ], "Common/uncommon/rare NFTs must assemble from approved curated or handmade layer packs."),
      legendaryAssets: this.layerSet(legendaryProvider, [...this.roleValues(pack, "legendary"), ...this.roleValues(pack, "animation")], "Epic, legendary, and mythic assets require curated composition rules and optional artist review."),
      productionAssetPolicy: style.productionAssetPolicy,
      royaltyPolicy: this.royaltyPolicy(),
      readinessReport,
      warnings: productionReady
        ? [this.royaltyPolicy().note]
        : [
            "Concept preview only. Current preview output is deterministic SVG direction art and must not be sold as final production art.",
            "AI-assisted outputs are drafts only unless reviewed and replaced by curated or artist-approved final layer assets.",
            providerIssue ?? "Asset providers are configured.",
            storageIssue ?? "Permanent storage is configured.",
            this.royaltyPolicy().note
          ].filter(Boolean)
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
        { trait_type: "Background", value: visualTraits.background ?? pick(this.roleValues(input.pack, "background"), seed + 3) },
        { trait_type: "Base Character", value: visualTraits.base ?? pick(this.roleValues(input.pack, "base"), seed + 4) },
        { trait_type: "Headgear", value: visualTraits.headgear ?? pick(this.roleValues(input.pack, "head"), seed + 5) },
        { trait_type: "Eyes", value: visualTraits.eyes ?? pick(this.roleValues(input.pack, "eyes"), seed + 6) },
        { trait_type: "Outfit", value: visualTraits.outfit ?? pick(this.roleValues(input.pack, "body"), seed + 7) },
        { trait_type: "Aura", value: visualTraits.aura ?? pick(this.roleValues(input.pack, "aura"), seed + 8) },
        { trait_type: "Accessory", value: visualTraits.accessory ?? pick(this.roleValues(input.pack, "prop"), seed + 9) },
        { trait_type: "Neck/Chest Accessory", value: visualTraits.neckChestAccessory ?? pick(this.roleValues(input.pack, "neck"), seed + 10) },
        { trait_type: "Frame/Border", value: visualTraits.frame ?? pick(this.roleValues(input.pack, "frame"), seed + 11) },
        { trait_type: "Animation Overlay", value: visualTraits.animationOverlay ?? pick(this.roleValues(input.pack, "animation"), seed + 12) },
        { trait_type: "Rarity", value: rarity }
      ]
    };
  }

  private layerSet(provider: ProducedLayerSet["provider"], values: string[], notes: string): ProducedLayerSet {
    return {
      provider,
      productionReady: provider === "curated" || provider === "handmade",
      classification: provider === "handmade" ? "artist-approved final asset" : provider === "curated" ? "curated production-ready asset" : provider === "ai" ? "AI-assisted draft" : "concept preview",
      count: values.length,
      examples: values.slice(0, 6),
      notes
    };
  }

  private provider(value?: string): ProducedLayerSet["provider"] {
    if (value === "ai" || value === "curated" || value === "handmade") return value;
    return "mock";
  }

  private providerIssue(design: ProducedLayerSet["provider"], layer: ProducedLayerSet["provider"], legendary: ProducedLayerSet["provider"]) {
    const missing: string[] = [];
    const draftOnly: string[] = [];
    if (design === "mock") missing.push("DESIGN_MODEL_PROVIDER");
    if (layer === "mock") missing.push("LAYER_PACK_PROVIDER");
    if (legendary === "mock") missing.push("LEGENDARY_ASSET_PROVIDER");
    if (design === "ai") draftOnly.push("DESIGN_MODEL_PROVIDER");
    if (layer === "ai") draftOnly.push("LAYER_PACK_PROVIDER");
    if (legendary === "ai") draftOnly.push("LEGENDARY_ASSET_PROVIDER");
    if (missing.length) return `Real asset provider missing: configure ${missing.join(", ")} as curated or handmade.`;
    if (draftOnly.length) return `AI provider configured for ${draftOnly.join(", ")}; AI-assisted assets are draft-only and cannot mark final production ready.`;
    return undefined;
  }

  private storageIssue() {
    const provider = process.env.FINAL_ASSET_STORAGE_PROVIDER ?? process.env.ASSET_STORAGE_PROVIDER ?? "mock";
    if (provider === "mock") return "Permanent storage missing: set FINAL_ASSET_STORAGE_PROVIDER to pinata, arweave, or irys.";
    if (provider === "pinata" && !process.env.PINATA_JWT) return "PINATA_JWT is required for FINAL_ASSET_STORAGE_PROVIDER=pinata.";
    if ((provider === "arweave" || provider === "irys") && !(process.env.IRYS_PRIVATE_KEY || process.env.ARWEAVE_KEY)) {
      return `${provider} final storage requires IRYS_PRIVATE_KEY or ARWEAVE_KEY.`;
    }
    return undefined;
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

  private roleValues(pack: TraitPackPlan, role: keyof TraitPackPlan["categoryRoles"]) {
    const categoryId = pack.categoryRoles?.[role];
    const values = categoryId ? pack.categories[categoryId] ?? [] : [];
    return values.length ? values : ["None"];
  }
}
