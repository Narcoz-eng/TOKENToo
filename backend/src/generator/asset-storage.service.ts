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

  private decodeSvgDataUri(dataUri: string) {
    const prefix = "data:image/svg+xml;utf8,";
    if (!dataUri.startsWith(prefix)) return undefined;
    return decodeURIComponent(dataUri.slice(prefix.length));
  }
}

