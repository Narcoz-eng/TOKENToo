import { Injectable } from "@nestjs/common";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
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
    if (providers.some((provider) => provider === "mock")) return style.productionAssetStatus === "AI_CONCEPT" ? "AI_CONCEPT" : "WIREFRAME";
    const hasAiAssistedProvider = providers.some((provider) => provider === "ai");
    if (hasAiAssistedProvider && !this.aiAssistedFinalApproved()) return style.productionAssetStatus === "AI_CONCEPT" ? "AI_CONCEPT" : "WIREFRAME";
    if (!this.permanentStorageAvailable() || !this.renderRoot()) return "WIREFRAME";
    if (!this.approvedLayerManifestStatus(pack).approved) return style.productionAssetStatus === "AI_CONCEPT" ? "AI_CONCEPT" : "WIREFRAME";
    if (!this.layerCoverageValid(pack)) return "WIREFRAME";
    if ((process.env.FINAL_PRODUCTION_ASSETS_APPROVED ?? "false") === "true") return "FINAL_PRODUCTION";
    if (providers.every((provider) => provider === "handmade") || (process.env.ARTIST_APPROVED_ASSETS ?? "false") === "true" || this.aiAssistedFinalApproved()) return "ARTIST_APPROVED";
    return "CURATED_LAYER_READY";
  }

  launchIssues(style: GeneratedStyleProfile, pack: TraitPackPlan, qualityTier: "BASIC" | "PREMIUM" | "LEGENDARY_READY") {
    const issues: string[] = [];
    const status = this.status(style, pack, qualityTier);
    const required = this.requiredLaunchStatus();
    if (!this.meetsRequiredStatus(status, required)) issues.push(`Production asset status ${status} does not satisfy required launch status ${required}.`);
    if (status === "WIREFRAME") issues.push("Approved curated layer pack is missing; wireframes cannot launch.");
    if (status === "AI_CONCEPT") issues.push("AI studio previews are art direction only and cannot launch without locked creator approval, curated/layered exports, and final storage.");
    const layerManifest = this.approvedLayerManifestStatus(pack);
    if (!layerManifest.approved) issues.push(layerManifest.reasonIfNo ?? "Approved transparent PNG/WebP layer manifest is required before launch/export.");
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
    return process.env.FINAL_RENDER_STORAGE_ROOT?.replace(/\/$/, "") ?? (this.demoLayerPackAllowed() ? "devnet-demo-layer-pack/rendered" : undefined);
  }

  approvedLayerPackConfigured() {
    return Boolean(process.env.CURATED_LAYER_PACK_MANIFEST_URI || process.env.CURATED_LAYER_PACK_ROOT || process.env.APPROVED_LAYER_PACK_ID || this.demoLayerPackAllowed());
  }

  approvedLayerManifestStatus(pack: TraitPackPlan) {
    const remoteManifest = process.env.CURATED_LAYER_PACK_MANIFEST_URI?.trim();
    if (remoteManifest) {
      return { approved: true, source: remoteManifest, reasonIfNo: undefined };
    }
    const root = process.env.CURATED_LAYER_PACK_ROOT?.trim();
    if (!root) {
      if (this.demoLayerPackAllowed()) {
        return { approved: false, source: "demo-layer-pack", reasonIfNo: "DEMO_CURATED_LAYER_PACK is art direction/devnet-only and does not satisfy final export layer requirements." };
      }
      if (process.env.APPROVED_LAYER_PACK_ID) {
        return { approved: false, source: process.env.APPROVED_LAYER_PACK_ID, reasonIfNo: "APPROVED_LAYER_PACK_ID is set, but final export requires CURATED_LAYER_PACK_ROOT or CURATED_LAYER_PACK_MANIFEST_URI with transparent PNG/WebP layers." };
      }
      return { approved: false, source: "missing", reasonIfNo: "Final export requires an approved layer manifest with transparent PNG/WebP assets." };
    }
    const manifestPath = resolve(root, "layer-manifest.json");
    if (!existsSync(manifestPath)) {
      return { approved: false, source: root, reasonIfNo: `Layer manifest missing at ${manifestPath}.` };
    }
    const parsed = this.safeJson(readFileSync(manifestPath, "utf8"));
    const layers = this.layerEntries(parsed);
    if (!layers.length) return { approved: false, source: manifestPath, reasonIfNo: "Layer manifest has no layer entries." };
    const missing: string[] = [];
    for (const role of ["base", "background", "head", "eyes", "mouth", "body", "prop", "aura"] as const) {
      const categoryId = pack.categoryRoles?.[role];
      const values = categoryId ? pack.categories[categoryId] ?? [] : [];
      if (!categoryId || !values.length) continue;
      const roleLayers = layers.filter((layer) => this.same(layer.role, role) || this.same(layer.category, categoryId));
      if (!roleLayers.length) {
        missing.push(`${role}/${categoryId}`);
        continue;
      }
      const validAssets = roleLayers.filter((layer) => this.layerFileLooksFinal(root, layer));
      if (!validAssets.length) missing.push(`${role}/${categoryId} transparent PNG/WebP`);
    }
    if (missing.length) {
      return { approved: false, source: manifestPath, reasonIfNo: `Layer manifest is missing final layer coverage for: ${missing.join(", ")}.` };
    }
    return { approved: true, source: manifestPath, reasonIfNo: undefined };
  }

  demoLayerPackEnabled() {
    return (process.env.DEMO_CURATED_LAYER_PACK ?? "false") === "true";
  }

  demoLayerPackAllowed() {
    return this.demoLayerPackEnabled() && (process.env.APP_ENV ?? process.env.NODE_ENV ?? "development") !== "production";
  }

  private layerCoverageValid(pack: TraitPackPlan) {
    return ["base", "background", "head", "eyes", "mouth", "body", "prop", "aura"].every((role) => this.roleValues(pack, role as keyof TraitPackPlan["categoryRoles"]).length >= 1);
  }

  private layerEntries(value: unknown): Array<Record<string, unknown>> {
    const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
    const candidates = [record.layers, record.assets, record.traits, record.files];
    const entries = candidates.find(Array.isArray);
    return Array.isArray(entries) ? entries.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];
  }

  private layerFileLooksFinal(root: string, layer: Record<string, unknown>) {
    const assetPath = String(layer.path ?? layer.file ?? layer.uri ?? layer.src ?? "");
    if (!/\.(png|webp)(?:$|\?)/i.test(assetPath)) return false;
    if (layer.transparent === false || layer.hasAlpha === false) return false;
    if (/^https?:|^ipfs:|^ar:/.test(assetPath)) return true;
    const resolved = isAbsolute(assetPath) ? assetPath : resolve(root, assetPath);
    return existsSync(resolved);
  }

  private safeJson(value: string) {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return {};
    }
  }

  private same(left: unknown, right: string) {
    return String(left ?? "").trim().toLowerCase() === right.trim().toLowerCase();
  }

  private permanentStorageAvailable() {
    const provider = process.env.FINAL_ASSET_STORAGE_PROVIDER ?? process.env.ASSET_STORAGE_PROVIDER;
    if (provider === "pinata") return Boolean(process.env.PINATA_JWT);
    if (provider === "arweave" || provider === "irys") return Boolean(process.env.IRYS_PRIVATE_KEY || process.env.ARWEAVE_KEY);
    if (provider === "supabase") return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    return false;
  }

  private aiAssistedFinalApproved() {
    return (process.env.AI_ASSISTED_FINAL_ASSETS_APPROVED ?? "false") === "true";
  }

  private provider(value?: string): AssetProviderKind {
    if (value === "ai" || value === "curated" || value === "handmade") return value;
    if (this.demoLayerPackAllowed()) return "curated";
    return "mock";
  }

  private roleValues(pack: TraitPackPlan, role: keyof TraitPackPlan["categoryRoles"]) {
    const categoryId = pack.categoryRoles?.[role];
    return categoryId ? pack.categories[categoryId] ?? [] : [];
  }
}
