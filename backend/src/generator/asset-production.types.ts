import type { GeneratedStyleProfile, ProductionAssetStatus, TraitPackPlan } from "./generator.types";

export type AssetProviderKind = "mock" | "ai" | "curated" | "handmade";

export type ProducedLayerSet = {
  provider: AssetProviderKind;
  productionReady: boolean;
  classification: "concept preview" | "AI-assisted draft" | "approved AI-assisted final asset" | "curated production-ready asset" | "artist-approved final asset";
  count: number;
  examples: string[];
  notes: string;
};

export type AssetProductionManifest = {
  collection: string;
  standard: "METAPLEX_CORE" | "TOKEN_METADATA_FALLBACK";
  productionReady: boolean;
  productionAssetStatus: ProductionAssetStatus;
  qualityTier: "BASIC" | "PREMIUM" | "LEGENDARY_READY";
  baseMascots: ProducedLayerSet;
  backgrounds: ProducedLayerSet;
  premiumTraits: ProducedLayerSet;
  legendaryAssets: ProducedLayerSet;
  productionAssetPolicy: GeneratedStyleProfile["productionAssetPolicy"];
  warnings: string[];
  royaltyPolicy: RoyaltyPolicy;
  readinessReport: AssetProviderReadinessReport;
};

export type RoyaltyPolicy = {
  defaultCreatorRoyaltyBps: number;
  enforceableOnSelectedStandard: boolean;
  selectedStandardSupportsConfiguredRoyalties: boolean;
  distribution: {
    platformTreasuryBps: number;
    communityTreasuryBps: number;
    liquidityReserveBps: number;
    raidRewardsPoolBps: number;
    creatorBps: number;
  };
  note: string;
};

export type AssetProviderReadinessReport = {
  selectedAssetPack: string;
  availableBaseVariants: number;
  availableBackgrounds: number;
  availableTraitLayers: number;
  availableLegendaryOverlays: number;
  canProduce10kPremiumOutputs: boolean;
  reasonIfNo?: string;
};

export type FinalVaultAssetInput = {
  style: GeneratedStyleProfile;
  pack: TraitPackPlan;
  seedKey: string;
  lockedAmount: string;
  lockDurationDays: number;
  ownerWallet: string;
  qualityTier: "BASIC" | "PREMIUM" | "LEGENDARY_READY";
};

export type FinalVaultAsset = {
  imageDataUri?: string;
  imageUri?: string;
  metadata: Record<string, unknown>;
  manifest: AssetProductionManifest;
};
