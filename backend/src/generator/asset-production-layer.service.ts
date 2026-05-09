import { Injectable } from "@nestjs/common";
import type { AssetProductionManifest, FinalVaultAsset, FinalVaultAssetInput, ProducedLayerSet } from "./asset-production.types";
import type { GeneratedStyleProfile, TraitPackPlan } from "./generator.types";
import { DeterministicRenderService } from "./deterministic-render.service";
import { ProductionLayerPackService } from "./production-layer-pack.service";

@Injectable()
export class AssetProductionLayerService {
  constructor(
    private readonly productionLayers: ProductionLayerPackService,
    private readonly deterministicRender: DeterministicRenderService
  ) {}

  manifest(style: GeneratedStyleProfile, pack: TraitPackPlan, qualityTier: AssetProductionManifest["qualityTier"]): AssetProductionManifest {
    const designProvider = this.provider(process.env.DESIGN_MODEL_PROVIDER);
    const layerProvider = this.provider(process.env.LAYER_PACK_PROVIDER ?? process.env.DESIGN_MODEL_PROVIDER);
    const legendaryProvider = this.provider(process.env.LEGENDARY_ASSET_PROVIDER ?? process.env.DESIGN_MODEL_PROVIDER);
    const storageIssue = this.storageIssue();
    const providerIssue = this.providerIssue(designProvider, layerProvider, legendaryProvider);
    const layerPackIssue = this.productionLayers.approvedLayerPackConfigured() ? undefined : "Approved curated layer pack missing: set CURATED_LAYER_PACK_MANIFEST_URI, CURATED_LAYER_PACK_ROOT, or APPROVED_LAYER_PACK_ID.";
    const productionAssetStatus = this.productionLayers.status(style, pack, qualityTier);
    const productionReady = this.productionLayers.meetsRequiredStatus(productionAssetStatus, "CURATED_LAYER_READY");
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
      reasonIfNo: productionReady && style.tenKReadiness.pass ? undefined : [providerIssue, storageIssue, layerPackIssue, style.tenKReadiness.pass ? undefined : "10k readiness failed."].filter(Boolean).join(" ")
    };

    return {
      collection: style.collection,
      standard: (process.env.METAPLEX_NFT_STANDARD as "METAPLEX_CORE" | "TOKEN_METADATA_FALLBACK" | undefined) ?? "METAPLEX_CORE",
      productionReady,
      productionAssetStatus,
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
      productionAssetPolicy: { ...style.productionAssetPolicy, defaultAssetStatus: productionAssetStatus },
      royaltyPolicy: this.royaltyPolicy(),
      readinessReport,
      warnings: productionReady
        ? [this.royaltyPolicy().note]
        : [
            "Concept preview only. Wireframe SVG direction art must not be sold as final production art.",
            "Wireframes and AI concepts are review assets only; launch requires curated or artist-approved deterministic layer assets.",
            providerIssue ?? "Asset providers are configured.",
            storageIssue ?? "Permanent storage is configured.",
            layerPackIssue ?? "Approved curated layer pack is configured.",
            this.royaltyPolicy().note
          ].filter(Boolean)
    };
  }

  produceFinalVaultAsset(input: FinalVaultAssetInput): FinalVaultAsset {
    const manifest = this.manifest(input.style, input.pack, input.qualityTier);
    return this.deterministicRender.renderFinalVaultAsset(input, manifest);
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
    if (!this.productionLayers.renderRoot()) return "FINAL_RENDER_STORAGE_ROOT is missing; minting must reference cached or pre-generated final render outputs.";
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
