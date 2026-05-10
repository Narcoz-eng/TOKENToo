import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, extname, isAbsolute, join, resolve } from "node:path";
import { PrismaService } from "../db/prisma.service";
import type { GeneratedStyleProfile, TraitCategoryRole, TraitPackPlan } from "./generator.types";
import { seedFrom } from "./generator.util";

type LayerManifestAsset = {
  category?: string;
  role?: string;
  name?: string;
  trait?: string;
  path?: string;
  file?: string;
  uri?: string;
  dataUri?: string;
  rarity?: string;
  weight?: number;
  weightBps?: number;
  zIndex?: number;
  offset?: { x?: number; y?: number };
  offsetX?: number;
  offsetY?: number;
  blendMode?: string;
  aliases?: string[];
  incompatibleWith?: string[];
};

export type CuratedLayerPackImportInput = {
  name?: string;
  version?: string;
  rootPath?: string;
  manifestPath?: string;
  manifest?: Record<string, unknown>;
  assets?: LayerManifestAsset[];
};

type NormalizedLayerAsset = {
  category: string;
  traitName: string;
  rarity?: string;
  weightBps: number;
  zIndex: number;
  offsetX: number;
  offsetY: number;
  blendMode: string;
  aliases: string[];
  incompatibleWith: string[];
  uri: string;
  sourcePath?: string;
  dataUri?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  hasAlpha: boolean;
  contentHash?: string;
  metadata: Record<string, unknown>;
};

type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  requiredCategories: string[];
  presentCategories: string[];
  duplicateTraits: string[];
  dimensions?: { width: number; height: number };
  previewRenderPassed: boolean;
  metadataExportPassed: boolean;
};

type SharpFactory = (input?: Buffer | { create: { width: number; height: number; channels: number; background: string } }) => any;

@Injectable()
export class CuratedLayerPackService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async importForStyle(input: {
    generationRunId: string;
    styleProfileId: string;
    style: GeneratedStyleProfile;
    pack: TraitPackPlan;
    layerPack: CuratedLayerPackImportInput;
  }) {
    const normalized = this.normalizeInput(input.layerPack, input.pack);
    const validation = await this.validateAssets(normalized.assets, input.pack);
    let previewUri: string | undefined;
    if (validation.valid) {
      previewUri = await this.renderPreviewDataUri(normalized.assets, `${input.style.collection}:layer-pack-preview`);
      validation.previewRenderPassed = Boolean(previewUri);
      validation.metadataExportPassed = this.sampleMetadata(input.style, normalized.assets).attributes.length > 0;
      validation.valid = validation.valid && validation.previewRenderPassed && validation.metadataExportPassed;
    }
    const status = validation.valid ? "VALID" : "INVALID";
    const provenanceHash = this.hash({ manifest: normalized.manifest, assets: normalized.assets.map((asset) => [asset.category, asset.traitName, asset.contentHash]) });

    const record = await this.prisma.$transaction(async (tx) => {
      const layerPack = await tx.curatedLayerPack.create({
        data: {
          generationRunId: input.generationRunId,
          styleProfileId: input.styleProfileId,
          name: normalized.name,
          version: normalized.version,
          rootUri: normalized.rootUri,
          manifest: normalized.manifest as any,
          validation: validation as any,
          status,
          width: validation.dimensions?.width,
          height: validation.dimensions?.height,
          provenanceHash,
          previewUri
        }
      });
      if (normalized.assets.length) {
        await tx.curatedLayerAsset.createMany({
          data: normalized.assets.map((asset) => ({
            layerPackId: layerPack.id,
            category: asset.category,
            traitName: asset.traitName,
            rarity: asset.rarity,
            weightBps: asset.weightBps,
            zIndex: asset.zIndex,
            offsetX: asset.offsetX,
            offsetY: asset.offsetY,
            blendMode: asset.blendMode,
            aliases: asset.aliases as any,
            incompatibleWith: asset.incompatibleWith as any,
            uri: asset.uri,
            mimeType: asset.mimeType,
            width: asset.width,
            height: asset.height,
            hasAlpha: asset.hasAlpha,
            contentHash: asset.contentHash,
            metadata: asset.metadata as any
          }))
        });
      }
      return tx.curatedLayerPack.findUnique({
        where: { id: layerPack.id },
        include: { assets: { orderBy: [{ zIndex: "asc" }, { category: "asc" }, { traitName: "asc" }] } }
      });
    });

    if (validation.valid) {
      await this.prisma.styleProfile.update({
        where: { id: input.styleProfileId },
        data: {
          assetPackId: record?.id,
          artSource: "CURATED_PACK",
          productionAssetStatus: "CURATED_LAYER_READY"
        }
      });
    }
    return record;
  }

  async readinessForStyle(styleProfileId: string) {
    const pack = await this.latestPack(styleProfileId);
    if (!pack) {
      return {
        status: "MISSING",
        approvalReady: false,
        exportReady: false,
        errors: ["No curated layer pack has been imported."],
        warnings: []
      };
    }
    const validation = this.record<ValidationResult>(pack.validation);
    return {
      id: pack.id,
      name: pack.name,
      status: pack.status,
      approvalReady: pack.status === "VALID" || pack.status === "EXPORT_READY",
      exportReady: pack.status === "EXPORT_READY",
      previewUri: pack.previewUri,
      provenanceHash: pack.provenanceHash,
      width: pack.width,
      height: pack.height,
      assetCount: pack.assets.length,
      categories: this.categoryCounts(pack.assets),
      errors: Array.isArray(validation.errors) ? validation.errors : [],
      warnings: Array.isArray(validation.warnings) ? validation.warnings : [],
      validation
    };
  }

  async exportForStyle(input: { styleProfileId: string; style: GeneratedStyleProfile; pack: TraitPackPlan; count?: number }) {
    const layerPack = await this.latestPack(input.styleProfileId);
    if (!layerPack) throw new BadRequestException("Import and validate a curated layer pack before deterministic export.");
    const validation = this.record<ValidationResult>(layerPack.validation);
    if (!(layerPack.status === "VALID" || layerPack.status === "EXPORT_READY") || !validation.previewRenderPassed || !validation.metadataExportPassed) {
      throw new BadRequestException(`Curated layer pack is not export-ready: ${(validation.errors ?? ["validation failed"]).join(" ")}`);
    }
    const count = Math.max(1, Math.min(10_000, Math.floor(input.count ?? 10_000)));
    const rendered: Array<{ index: number; imagePath: string; metadataPath: string; metadata: Record<string, unknown>; traits: Record<string, string>; imageDataUri: string }> = [];
    const assets = layerPack.assets.map((asset) => ({
      category: asset.category,
      traitName: asset.traitName,
      rarity: asset.rarity ?? undefined,
      weightBps: asset.weightBps,
      zIndex: asset.zIndex,
      offsetX: asset.offsetX,
      offsetY: asset.offsetY,
      blendMode: asset.blendMode,
      aliases: this.array(asset.aliases),
      incompatibleWith: this.array(asset.incompatibleWith),
      uri: asset.uri,
      sourcePath: String(this.record(asset.metadata).sourcePath ?? ""),
      dataUri: String(this.record(asset.metadata).dataUri ?? ""),
      mimeType: asset.mimeType ?? undefined,
      width: asset.width ?? layerPack.width ?? undefined,
      height: asset.height ?? layerPack.height ?? undefined,
      hasAlpha: asset.hasAlpha,
      contentHash: asset.contentHash ?? undefined,
      metadata: this.record(asset.metadata)
    }));
    for (let index = 0; index < count; index += 1) {
      const seedKey = `${input.style.collection}:export:${index}`;
      const selected = this.selectTraits(assets, seedKey);
      const imageDataUri = await this.composeDataUri(selected, seedKey);
      const traits = Object.fromEntries(selected.map((asset) => [asset.category, asset.traitName]));
      const imagePath = `images/${index + 1}.png`;
      const metadataPath = `metadata/${index + 1}.json`;
      const metadata = this.nftMetadata(input.style, traits, imagePath, index + 1);
      rendered.push({ index: index + 1, imagePath, metadataPath, metadata, traits, imageDataUri });
    }

    const frequency = this.frequency(rendered.map((item) => item.traits));
    const provenanceHash = this.hash(rendered.map((item) => ({ image: this.hash(item.imageDataUri), metadata: this.hash(item.metadata) })));
    const contactSheet = await this.contactSheet(rendered.slice(0, Math.min(24, rendered.length)).map((item) => item.imageDataUri));
    const zipEntries = [
      ...rendered.flatMap((item) => [
        { path: item.imagePath, data: this.dataUriBytes(item.imageDataUri).bytes },
        { path: item.metadataPath, data: Buffer.from(JSON.stringify(item.metadata, null, 2)) }
      ]),
      { path: "rarity/trait-frequency.json", data: Buffer.from(JSON.stringify(frequency, null, 2)) },
      { path: "manifest/layer-manifest.json", data: Buffer.from(JSON.stringify(layerPack.manifest, null, 2)) },
      { path: "manifest/provenance.json", data: Buffer.from(JSON.stringify({ provenanceHash, count, generatedAt: new Date().toISOString() }, null, 2)) },
      { path: "manifest/candy-machine-config.json", data: Buffer.from(JSON.stringify(this.candyMachineConfig(input.style), null, 2)) },
      { path: "manifest/erc721-sample.json", data: Buffer.from(JSON.stringify(rendered[0]?.metadata ?? {}, null, 2)) },
      { path: "previews/contact-sheet.png", data: this.dataUriBytes(contactSheet).bytes }
    ];
    const zip = this.zip(zipEntries);
    const outputRoot = process.env.DETERMINISTIC_EXPORT_ROOT?.trim();
    let zipPath: string | undefined;
    if (outputRoot) {
      mkdirSync(outputRoot, { recursive: true });
      zipPath = join(outputRoot, `${this.slug(input.style.collection)}-${Date.now()}-deterministic-export.zip`);
      writeFileSync(zipPath, zip);
    }
    await this.prisma.curatedLayerPack.update({
      where: { id: layerPack.id },
      data: {
        status: "EXPORT_READY",
        provenanceHash,
        validation: {
          ...validation,
          deterministicExport: {
            count,
            zipPath,
            zipBytes: zip.byteLength,
            provenanceHash,
            generatedAt: new Date().toISOString(),
            contains: ["images", "metadata", "rarity tables", "manifest", "provenance", "preview contact sheet"]
          }
        } as any
      }
    });
    return { count, zipPath, zipBytes: zip.byteLength, provenanceHash, contactSheet, frequency };
  }

  private normalizeInput(input: CuratedLayerPackImportInput, pack: TraitPackPlan) {
    const manifest = input.manifestPath ? this.readJson(input.manifestPath) : input.manifest ?? {};
    const rootUri = input.rootPath ?? this.string((manifest as Record<string, unknown>).rootUri);
    const manifestRecord = manifest as Record<string, unknown>;
    const explicitAssets = input.assets ?? this.objectArray(manifestRecord.assets);
    const manifestAssets = explicitAssets.length ? explicitAssets : this.objectArray(manifestRecord.layers);
    const scannedAssets = manifestAssets.length ? [] : this.scanRoot(rootUri, pack);
    const assets = (manifestAssets.length ? manifestAssets : scannedAssets).map((asset, index) => this.normalizeAsset(asset, index, rootUri));
    return {
      name: input.name ?? this.string((manifest as Record<string, unknown>).name) ?? "Curated Layer Pack",
      version: input.version ?? this.string((manifest as Record<string, unknown>).version) ?? "v1",
      rootUri,
      manifest: {
        ...manifest,
        name: input.name ?? this.string((manifest as Record<string, unknown>).name) ?? "Curated Layer Pack",
        version: input.version ?? this.string((manifest as Record<string, unknown>).version) ?? "v1",
        assets: assets.map((asset) => ({
          category: asset.category,
          trait: asset.traitName,
          uri: asset.uri,
          rarity: asset.rarity,
          weightBps: asset.weightBps,
          zIndex: asset.zIndex,
          offset: { x: asset.offsetX, y: asset.offsetY },
          blendMode: asset.blendMode,
          aliases: asset.aliases,
          incompatibleWith: asset.incompatibleWith
        }))
      },
      assets
    };
  }

  private async validateAssets(assets: NormalizedLayerAsset[], pack: TraitPackPlan): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!assets.length) errors.push("Layer manifest contains no PNG/WebP assets.");
    const requiredCategories = this.requiredCategories(pack);
    const presentCategories = [...new Set(assets.map((asset) => asset.category))];
    for (const category of requiredCategories) {
      if (!presentCategories.includes(category)) errors.push(`Missing required trait category: ${category}.`);
    }
    const seen = new Set<string>();
    const duplicateTraits: string[] = [];
    for (const asset of assets) {
      const key = `${asset.category}:${asset.traitName}`.toLowerCase();
      if (seen.has(key)) duplicateTraits.push(key);
      seen.add(key);
      if (!asset.uri) errors.push(`${asset.category}/${asset.traitName} is missing a file uri/path.`);
      if (asset.weightBps <= 0) errors.push(`${asset.category}/${asset.traitName} has invalid rarity weight.`);
      if (!/\.(png|webp)(?:$|\?)/i.test(asset.uri) && !/^data:image\/(?:png|webp);/i.test(asset.uri)) errors.push(`${asset.category}/${asset.traitName} must be PNG or WebP.`);
    }
    if (duplicateTraits.length) errors.push(`Duplicate traits found: ${duplicateTraits.slice(0, 12).join(", ")}.`);

    let dimensions: { width: number; height: number } | undefined;
    for (const asset of assets) {
      const inspection = await this.inspectAsset(asset);
      Object.assign(asset, inspection);
      if (!inspection.width || !inspection.height) {
        errors.push(`${asset.category}/${asset.traitName} could not be image-validated. Sharp and readable local/data URI assets are required.`);
        continue;
      }
      if (!inspection.hasAlpha) errors.push(`${asset.category}/${asset.traitName} is not transparent; final layers must have alpha.`);
      if (!dimensions) dimensions = { width: inspection.width, height: inspection.height };
      if (dimensions.width !== inspection.width || dimensions.height !== inspection.height) errors.push(`${asset.category}/${asset.traitName} dimensions ${inspection.width}x${inspection.height} do not match ${dimensions.width}x${dimensions.height}.`);
    }
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      requiredCategories,
      presentCategories,
      duplicateTraits,
      dimensions,
      previewRenderPassed: false,
      metadataExportPassed: false
    };
  }

  private async inspectAsset(asset: NormalizedLayerAsset) {
    const bytes = this.assetBytes(asset);
    if (!bytes) return {};
    const sharp = await this.sharp();
    const metadata = await sharp(bytes).metadata();
    return {
      mimeType: metadata.format === "webp" ? "image/webp" : "image/png",
      width: Number(metadata.width),
      height: Number(metadata.height),
      hasAlpha: metadata.hasAlpha === true || Number(metadata.channels) === 4,
      contentHash: createHash("sha256").update(bytes).digest("hex")
    };
  }

  private async renderPreviewDataUri(assets: NormalizedLayerAsset[], seedKey: string) {
    return this.composeDataUri(this.selectTraits(assets, seedKey), seedKey);
  }

  private async composeDataUri(assets: NormalizedLayerAsset[], seedKey: string) {
    const width = assets.find((asset) => asset.width)?.width ?? 1024;
    const height = assets.find((asset) => asset.height)?.height ?? 1024;
    const sharp = await this.sharp();
    const base = sharp({ create: { width, height, channels: 4, background: "#00000000" } });
    const composites = assets
      .slice()
      .sort((left, right) => left.zIndex - right.zIndex)
      .map((asset) => ({
        input: this.assetBytes(asset),
        left: asset.offsetX,
        top: asset.offsetY,
        blend: asset.blendMode === "multiply" || asset.blendMode === "screen" || asset.blendMode === "overlay" ? asset.blendMode : "over"
      }))
      .filter((item) => item.input);
    const buffer = await base.composite(composites).png().toBuffer();
    void seedKey;
    return `data:image/png;base64,${buffer.toString("base64")}`;
  }

  private selectTraits(assets: NormalizedLayerAsset[], seedKey: string) {
    const byCategory = new Map<string, NormalizedLayerAsset[]>();
    for (const asset of assets) byCategory.set(asset.category, [...(byCategory.get(asset.category) ?? []), asset]);
    const selected: NormalizedLayerAsset[] = [];
    for (const [category, categoryAssets] of [...byCategory.entries()].sort((left, right) => Math.min(...left[1].map((asset) => asset.zIndex)) - Math.min(...right[1].map((asset) => asset.zIndex)))) {
      const seed = seedFrom(`${seedKey}:${category}`);
      const ordered = categoryAssets.slice().sort((left, right) => left.traitName.localeCompare(right.traitName));
      const compatible = ordered.filter((asset) => !this.conflicts(asset, selected));
      selected.push(this.weightedPick(compatible.length ? compatible : ordered, seed));
    }
    return selected;
  }

  private weightedPick(assets: NormalizedLayerAsset[], seed: number) {
    const total = assets.reduce((sum, asset) => sum + Math.max(1, asset.weightBps), 0);
    let cursor = Math.abs(seed) % total;
    for (const asset of assets) {
      cursor -= Math.max(1, asset.weightBps);
      if (cursor < 0) return asset;
    }
    return assets[0];
  }

  private conflicts(asset: NormalizedLayerAsset, selected: NormalizedLayerAsset[]) {
    const selectedKeys = new Set(selected.flatMap((item) => [`${item.category}:${item.traitName}`, item.traitName, ...item.aliases].map((value) => value.toLowerCase())));
    return asset.incompatibleWith.some((value) => selectedKeys.has(value.toLowerCase()));
  }

  private async contactSheet(images: string[]) {
    if (!images.length) return "data:image/png;base64,";
    const sharp = await this.sharp();
    const thumbs = await Promise.all(images.map((image) => sharp(this.dataUriBytes(image).bytes).resize(180, 180, { fit: "cover" }).png().toBuffer()));
    const columns = 6;
    const rows = Math.ceil(thumbs.length / columns);
    const canvas = sharp({ create: { width: columns * 180, height: rows * 180, channels: 4, background: "#111111ff" } });
    const buffer = await canvas.composite(thumbs.map((input, index) => ({ input, left: (index % columns) * 180, top: Math.floor(index / columns) * 180 }))).png().toBuffer();
    return `data:image/png;base64,${buffer.toString("base64")}`;
  }

  private sampleMetadata(style: GeneratedStyleProfile, assets: NormalizedLayerAsset[]) {
    const traits = Object.fromEntries(this.selectTraits(assets, `${style.collection}:sample-metadata`).map((asset) => [asset.category, asset.traitName]));
    return this.nftMetadata(style, traits, "images/1.png", 1);
  }

  private nftMetadata(style: GeneratedStyleProfile, traits: Record<string, string>, image: string, edition: number) {
    return {
      name: `${style.collection} #${edition}`,
      description: style.lore,
      image,
      attributes: Object.entries(traits).map(([trait_type, value]) => ({ trait_type, value })),
      properties: {
        category: "image",
        files: [{ uri: image, type: "image/png" }],
        phew: {
          deterministicRender: true,
          aiGeneratedFinalArt: false,
          productionAssetStatus: "CURATED_LAYER_READY"
        }
      }
    };
  }

  private frequency(items: Array<Record<string, string>>) {
    const table: Record<string, Record<string, number>> = {};
    for (const item of items) {
      for (const [category, trait] of Object.entries(item)) {
        table[category] ??= {};
        table[category][trait] = (table[category][trait] ?? 0) + 1;
      }
    }
    return table;
  }

  private candyMachineConfig(style: GeneratedStyleProfile) {
    return {
      name: style.collection,
      symbol: style.brandDna?.tokenSymbol ?? style.collection.slice(0, 6).toUpperCase(),
      sellerFeeBasisPoints: 500,
      isMutable: true,
      creators: []
    };
  }

  private scanRoot(rootPath: string | undefined, pack: TraitPackPlan): LayerManifestAsset[] {
    if (!rootPath) return [];
    const root = resolve(rootPath);
    if (!existsSync(root)) return [];
    const categories = Object.values(pack.categoryRoles ?? {});
    return categories.flatMap((category, categoryIndex) => {
      const categoryPath = join(root, category);
      if (!existsSync(categoryPath)) return [];
      return readdirSync(categoryPath, { withFileTypes: true })
        .filter((entry) => entry.isFile() && /\.(png|webp)$/i.test(entry.name))
        .map((entry, index) => ({
          category,
          name: basename(entry.name, extname(entry.name)),
          path: join(categoryPath, entry.name),
          zIndex: categoryIndex * 10 + index
        }));
    });
  }

  private normalizeAsset(asset: LayerManifestAsset, index: number, rootUri?: string): NormalizedLayerAsset {
    const rawPath = asset.path ?? asset.file ?? asset.uri ?? asset.dataUri ?? "";
    const sourcePath = rawPath && rootUri && !/^data:|^https?:|^ipfs:|^ar:/i.test(rawPath) ? resolve(rootUri, rawPath) : rawPath;
    return {
      category: String(asset.category ?? asset.role ?? "uncategorized").trim(),
      traitName: String(asset.name ?? asset.trait ?? basename(rawPath, extname(rawPath)) ?? `Trait ${index + 1}`).trim(),
      rarity: asset.rarity,
      weightBps: this.weightBps(asset.weightBps ?? asset.weight),
      zIndex: Number.isFinite(Number(asset.zIndex)) ? Number(asset.zIndex) : index,
      offsetX: Number(asset.offsetX ?? asset.offset?.x ?? 0),
      offsetY: Number(asset.offsetY ?? asset.offset?.y ?? 0),
      blendMode: String(asset.blendMode ?? "over"),
      aliases: Array.isArray(asset.aliases) ? asset.aliases.map(String) : [],
      incompatibleWith: Array.isArray(asset.incompatibleWith) ? asset.incompatibleWith.map(String) : [],
      uri: sourcePath,
      sourcePath: sourcePath && !sourcePath.startsWith("data:") ? sourcePath : undefined,
      dataUri: sourcePath?.startsWith("data:") ? sourcePath : undefined,
      hasAlpha: false,
      metadata: { sourcePath, dataUri: sourcePath?.startsWith("data:") ? sourcePath : undefined }
    };
  }

  private requiredCategories(pack: TraitPackPlan) {
    return [...new Set((["base", "background", "head", "eyes", "mouth", "body", "prop", "aura"] as TraitCategoryRole[]).map((role) => pack.categoryRoles?.[role]).filter((category): category is string => Boolean(category && pack.categories[category]?.length)))];
  }

  private assetBytes(asset: NormalizedLayerAsset) {
    if (asset.dataUri || asset.uri.startsWith("data:")) return this.dataUriBytes(asset.dataUri ?? asset.uri).bytes;
    if (/^https?:|^ipfs:|^ar:/i.test(asset.uri)) return undefined;
    const path = isAbsolute(asset.uri) ? asset.uri : resolve(asset.uri);
    if (!existsSync(path)) return undefined;
    return readFileSync(path);
  }

  private dataUriBytes(uri: string) {
    const match = /^data:([^;,]+);base64,(.*)$/s.exec(uri);
    if (!match) throw new BadRequestException("Expected base64 data URI.");
    return { mimeType: match[1], bytes: Buffer.from(match[2], "base64") };
  }

  private async latestPack(styleProfileId: string) {
    return this.prisma.curatedLayerPack.findFirst({
      where: { styleProfileId },
      orderBy: { createdAt: "desc" },
      include: { assets: { orderBy: [{ zIndex: "asc" }, { category: "asc" }, { traitName: "asc" }] } }
    });
  }

  private async sharp(): Promise<SharpFactory> {
    try {
      const loader = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<{ default?: SharpFactory } & SharpFactory>;
      const mod = await loader("sharp");
      return (mod.default ?? mod) as SharpFactory;
    } catch {
      throw new BadRequestException("Sharp is required for curated layer validation and deterministic composition. Install sharp before importing production layer packs.");
    }
  }

  private zip(entries: Array<{ path: string; data: Buffer }>) {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let offset = 0;
    for (const entry of entries) {
      const name = Buffer.from(entry.path.replace(/\\/g, "/"));
      const crc = crc32(entry.data);
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4);
      local.writeUInt16LE(0, 6);
      local.writeUInt16LE(0, 8);
      local.writeUInt16LE(0, 10);
      local.writeUInt16LE(0, 12);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(entry.data.length, 18);
      local.writeUInt32LE(entry.data.length, 22);
      local.writeUInt16LE(name.length, 26);
      local.writeUInt16LE(0, 28);
      localParts.push(local, name, entry.data);
      const central = Buffer.alloc(46);
      central.writeUInt32LE(0x02014b50, 0);
      central.writeUInt16LE(20, 4);
      central.writeUInt16LE(20, 6);
      central.writeUInt16LE(0, 8);
      central.writeUInt16LE(0, 10);
      central.writeUInt16LE(0, 12);
      central.writeUInt16LE(0, 14);
      central.writeUInt32LE(crc, 16);
      central.writeUInt32LE(entry.data.length, 20);
      central.writeUInt32LE(entry.data.length, 24);
      central.writeUInt16LE(name.length, 28);
      central.writeUInt16LE(0, 30);
      central.writeUInt16LE(0, 32);
      central.writeUInt16LE(0, 34);
      central.writeUInt16LE(0, 36);
      central.writeUInt32LE(0, 38);
      central.writeUInt32LE(offset, 42);
      centralParts.push(central, name);
      offset += local.length + name.length + entry.data.length;
    }
    const centralOffset = offset;
    const central = Buffer.concat(centralParts);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(central.length, 12);
    end.writeUInt32LE(centralOffset, 16);
    end.writeUInt16LE(0, 20);
    return Buffer.concat([...localParts, central, end]);
  }

  private readJson(path: string) {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  }

  private categoryCounts(assets: Array<{ category: string }>) {
    return assets.reduce<Record<string, number>>((acc, asset) => {
      acc[asset.category] = (acc[asset.category] ?? 0) + 1;
      return acc;
    }, {});
  }

  private weightBps(value: unknown) {
    const number = Number(value ?? 100);
    if (!Number.isFinite(number) || number <= 0) return 100;
    if (number <= 1) return Math.round(number * 10_000);
    if (number <= 100) return Math.round(number * 100);
    return Math.round(number);
  }

  private array(value: unknown) {
    return Array.isArray(value) ? value.map(String) : [];
  }

  private objectArray(value: unknown): LayerManifestAsset[] {
    return Array.isArray(value) ? value.filter((item): item is LayerManifestAsset => Boolean(item && typeof item === "object")) : [];
  }

  private string(value: unknown) {
    return typeof value === "string" && value.trim() ? value : undefined;
  }

  private record<T = Record<string, unknown>>(value: unknown): T {
    return (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as T;
  }

  private hash(value: unknown) {
    return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
  }

  private slug(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
  }
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
