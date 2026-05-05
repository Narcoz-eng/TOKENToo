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
    if (provider === "pinata") return this.pinataFile(path, dataUri);
    throw new Error(`${provider} final NFT asset storage is not configured. Add an AssetStorageAdapter before production minting.`);
  }

  async storeFinalNftMetadata(path: string, metadata: Record<string, unknown>) {
    const provider = process.env.FINAL_ASSET_STORAGE_PROVIDER ?? process.env.ASSET_STORAGE_PROVIDER ?? "mock";
    const json = JSON.stringify(metadata);
    if (provider === "mock") return `data:application/json;utf8,${encodeURIComponent(json)}`;
    if (provider === "pinata") return this.pinataJson(path, metadata);
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

  private async pinataFile(path: string, dataUri: string) {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) throw new Error("PINATA_JWT is required for FINAL_ASSET_STORAGE_PROVIDER=pinata");
    const svg = this.decodeSvgDataUri(dataUri);
    if (!svg) throw new Error("Pinata file upload currently expects SVG data URI asset output");
    const form = new FormData();
    form.append("file", new Blob([svg], { type: "image/svg+xml" }), path.split("/").pop() ?? "vaultx.svg");
    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}` },
      body: form
    });
    if (!response.ok) throw new Error(`Pinata file upload failed: ${response.status} ${await response.text()}`);
    const result = (await response.json()) as { IpfsHash: string };
    return `ipfs://${result.IpfsHash}`;
  }

  private async pinataJson(path: string, metadata: Record<string, unknown>) {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) throw new Error("PINATA_JWT is required for FINAL_ASSET_STORAGE_PROVIDER=pinata");
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify({
        pinataMetadata: { name: path.split("/").pop() ?? "vaultx-metadata.json" },
        pinataContent: metadata
      })
    });
    if (!response.ok) throw new Error(`Pinata metadata upload failed: ${response.status} ${await response.text()}`);
    const result = (await response.json()) as { IpfsHash: string };
    return `ipfs://${result.IpfsHash}`;
  }

  private decodeSvgDataUri(dataUri: string) {
    const prefix = "data:image/svg+xml;utf8,";
    if (!dataUri.startsWith(prefix)) return undefined;
    return decodeURIComponent(dataUri.slice(prefix.length));
  }
}
