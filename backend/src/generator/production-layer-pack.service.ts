import { Injectable } from "@nestjs/common";
import type { AssetProviderKind } from "./asset-production.types";
import type { GeneratedStyleProfile, ProductionAssetStatus, TraitPackPlan } from "./generator.types";

const statusRank: Record<ProductionAssetStatus, number> = {
  WIREFRAME: 0,
  AI_CONCEPT: 1,
  CURATED_LAYER_READY: 2,
  ARTIST_APPROVED: 3,
  FINAL_PRODUCTION: 4
};

@Injectable()
export class ProductionLayerPackService {
  status(style: GeneratedStyleProfile, pack: TraitPackPlan, qualityTier: "BASIC" | "PREMIUM" | "LEGENDARY_READY"): ProductionAssetStatus {
    if (qualityTier === "BASIC" || !style.tenKReadiness.pass) return "WIREFRAME";
    const providers = [this.provider(process.env.DESIGN_MODEL_PROVIDER), this.provider(process.env.LAYER_PACK_PROVIDER), this.provider(process.env.LEGENDARY_ASSET_PROVIDER)];
    if (providers.some((provider) => provider === "mock" || provider === "ai")) return style.productionAssetStatus === "AI_CONCEPT" ? "AI_CONCEPT" : "WIREFRAME";
    if (!this.permanentStorageAvailable() || !this.renderRoot()) return "WIREFRAME";
    if (!this.approvedLayerPackConfigured()) return "WIREFRAME";
    if (!this.layerCoverageValid(pack)) return "WIREFRAME";
    if ((process.env.FINAL_PRODUCTION_ASSETS_APPROVED ?? "false") === "true") return "FINAL_PRODUCTION";
    if (providers.every((provider) => provider === "handmade") || (process.env.ARTIST_APPROVED_ASSETS ?? "false") === "true") return "ARTIST_APPROVED";
    return "CURATED_LAYER_READY";
  }

  launchIssues(style: GeneratedStyleProfile, pack: TraitPackPlan, qualityTier: "BASIC" | "PREMIUM" | "LEGENDARY_READY") {
    const issues: string[] = [];
    const status = this.status(style, pack, qualityTier);
    const required = this.requiredLaunchStatus();
    if (!this.meetsRequiredStatus(status, required)) issues.push(`Production asset status ${status} does not satisfy required launch status ${required}.`);
    if (status === "WIREFRAME") issues.push("Approved curated layer pack is missing; wireframes cannot launch.");
    if (status === "AI_CONCEPT") issues.push("AI concepts are art direction only and cannot launch without a curated layer pack.");
    if (!this.approvedLayerPackConfigured()) issues.push("Approved curated layer pack manifest/root is required before launch.");
    if (!this.renderRoot()) issues.push("FINAL_RENDER_STORAGE_ROOT is required so minting can reference cached or pre-generated render outputs.");
    if (!this.permanentStorageAvailable()) issues.push("Permanent storage is required for production NFT assets.");
    if (!this.layerCoverageValid(pack)) issues.push("Curated layer pack does not cover the required deterministic trait categories.");
    return [...new Set(issues)];
  }

  requiredLaunchStatus(): ProductionAssetStatus {
    const configured = process.env.REQUIRED_LAUNCH_ASSET_STATUS as ProductionAssetStatus | undefined;
    if (configured && configured in statusRank) return configured;
    return (process.env.APP_ENV ?? process.env.NODE_ENV) === "production" ? "ARTIST_APPROVED" : "CURATED_LAYER_READY";
  }

  meetsRequiredStatus(status: ProductionAssetStatus, required = this.requiredLaunchStatus()) {
    return statusRank[status] >= statusRank[required];
  }

  renderRoot() {
    return process.env.FINAL_RENDER_STORAGE_ROOT?.replace(/\/$/, "");
  }

  approvedLayerPackConfigured() {
    return Boolean(process.env.CURATED_LAYER_PACK_MANIFEST_URI || process.env.CURATED_LAYER_PACK_ROOT || process.env.APPROVED_LAYER_PACK_ID);
  }

  private layerCoverageValid(pack: TraitPackPlan) {
    return ["base", "background", "head", "eyes", "mouth", "body", "prop", "aura"].every((role) => this.roleValues(pack, role as keyof TraitPackPlan["categoryRoles"]).length >= 1);
  }

  private permanentStorageAvailable() {
    const provider = process.env.FINAL_ASSET_STORAGE_PROVIDER ?? process.env.ASSET_STORAGE_PROVIDER;
    if (provider === "pinata") return Boolean(process.env.PINATA_JWT);
    if (provider === "arweave" || provider === "irys") return Boolean(process.env.IRYS_PRIVATE_KEY || process.env.ARWEAVE_KEY);
    if (provider === "supabase") return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    return false;
  }

  private provider(value?: string): AssetProviderKind {
    if (value === "ai" || value === "curated" || value === "handmade") return value;
    return "mock";
  }

  private roleValues(pack: TraitPackPlan, role: keyof TraitPackPlan["categoryRoles"]) {
    const categoryId = pack.categoryRoles?.[role];
    return categoryId ? pack.categories[categoryId] ?? [] : [];
  }
}
