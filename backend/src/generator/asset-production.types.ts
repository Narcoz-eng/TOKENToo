import type { GeneratedStyleProfile, TraitPackPlan } from "./generator.types";

export type AssetProviderKind = "mock" | "ai" | "curated" | "handmade";

export type ProducedLayerSet = {
  provider: AssetProviderKind;
  productionReady: boolean;
  count: number;
  examples: string[];
  notes: string;
};

export type AssetProductionManifest = {
  collection: string;
  standard: "METAPLEX_CORE" | "TOKEN_METADATA_FALLBACK";
  productionReady: boolean;
  qualityTier: "BASIC" | "PREMIUM" | "LEGENDARY_READY";
  baseMascots: ProducedLayerSet;
  backgrounds: ProducedLayerSet;
  premiumTraits: ProducedLayerSet;
  legendaryAssets: ProducedLayerSet;
  warnings: string[];
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
  imageDataUri: string;
  metadata: Record<string, unknown>;
  manifest: AssetProductionManifest;
};
