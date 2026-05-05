import { Injectable } from "@nestjs/common";

const bucket = "generator-previews";

@Injectable()
export class AssetStorageService {
  async storePreviewAsset(path: string, dataUri: string) {
    if (process.env.ASSET_STORAGE_PROVIDER !== "supabase") return dataUri;

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return dataUri;

    const svg = this.decodeSvgDataUri(dataUri);
    if (!svg) return dataUri;

    const objectPath = path.replace(/^\/+/, "");
    const uploadUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${objectPath}`;
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "content-type": "image/svg+xml",
        "x-upsert": "true"
      },
      body: svg
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "unknown storage error");
      throw new Error(`Supabase preview upload failed: ${response.status} ${message}`);
    }

    return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${objectPath}`;
  }

  async storeFinalNftAsset(path: string, dataUri: string) {
    const provider = process.env.FINAL_ASSET_STORAGE_PROVIDER ?? process.env.ASSET_STORAGE_PROVIDER ?? "mock";
    if (provider === "supabase") return this.storePreviewAsset(`final/${path}`, dataUri);
    if (provider === "mock") return dataUri;
    throw new Error(`${provider} final NFT asset storage is not configured. Add an AssetStorageAdapter before production minting.`);
  }

  async storeFinalNftMetadata(path: string, metadata: Record<string, unknown>) {
    const provider = process.env.FINAL_ASSET_STORAGE_PROVIDER ?? process.env.ASSET_STORAGE_PROVIDER ?? "mock";
    const json = JSON.stringify(metadata);
    if (provider === "mock") return `data:application/json;utf8,${encodeURIComponent(json)}`;
    if (provider === "supabase") {
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase final metadata upload requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

      const objectPath = `final/${path}`.replace(/^\/+/, "");
      const uploadUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${objectPath}`;
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "content-type": "application/json",
          "x-upsert": "false"
        },
        body: json
      });
      if (!response.ok) {
        const message = await response.text().catch(() => "unknown storage error");
        throw new Error(`Supabase final metadata upload failed: ${response.status} ${message}`);
      }
      return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${objectPath}`;
    }

    throw new Error(`${provider} final NFT metadata storage is not configured. Add an AssetStorageAdapter before production minting.`);
  }

  private decodeSvgDataUri(dataUri: string) {
    const prefix = "data:image/svg+xml;utf8,";
    if (!dataUri.startsWith(prefix)) return undefined;
    return decodeURIComponent(dataUri.slice(prefix.length));
  }
}
