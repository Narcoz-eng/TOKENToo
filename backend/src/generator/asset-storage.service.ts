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
    this.assertPermanentStorage(provider);
    if (provider === "supabase") return this.storePreviewAsset(`final/${path}`, dataUri);
    if (provider === "pinata") return this.pinataFile(path, dataUri);
    throw new Error(`${provider} final NFT asset storage is not implemented. Configure pinata or add a permanent storage adapter for ${provider}.`);
  }

  async storeFinalNftMetadata(path: string, metadata: Record<string, unknown>) {
    const provider = process.env.FINAL_ASSET_STORAGE_PROVIDER ?? process.env.ASSET_STORAGE_PROVIDER ?? "mock";
    this.assertPermanentStorage(provider);
    const json = JSON.stringify(metadata);
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

    throw new Error(`${provider} final NFT metadata storage is not implemented. Configure pinata or add a permanent storage adapter for ${provider}.`);
  }

  private async pinataFile(path: string, dataUri: string) {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) throw new Error("PINATA_JWT is required for FINAL_ASSET_STORAGE_PROVIDER=pinata");
    const parsed = this.decodeDataUri(dataUri);
    if (!parsed) throw new Error("Pinata file upload requires a data URI asset output");
    const form = new FormData();
    form.append("file", new Blob([parsed.bytes], { type: parsed.mimeType }), path.split("/").pop() ?? "phew-asset");
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
        pinataMetadata: { name: path.split("/").pop() ?? "phew-metadata.json" },
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

  private decodeDataUri(dataUri: string) {
    const utf8Match = /^data:([^;,]+);utf8,(.*)$/s.exec(dataUri);
    if (utf8Match) return { mimeType: utf8Match[1], bytes: decodeURIComponent(utf8Match[2]) };
    const base64Match = /^data:([^;,]+);base64,(.*)$/s.exec(dataUri);
    if (base64Match) return { mimeType: base64Match[1], bytes: Buffer.from(base64Match[2], "base64") };
    return undefined;
  }

  private assertPermanentStorage(provider: string) {
    if (provider === "mock") {
      throw new Error("FINAL_ASSET_STORAGE_PROVIDER=mock is preview-only. Configure permanent storage before launch.");
    }
    if (provider === "pinata" && !process.env.PINATA_JWT) throw new Error("PINATA_JWT is required for FINAL_ASSET_STORAGE_PROVIDER=pinata.");
    if ((provider === "arweave" || provider === "irys") && !(process.env.IRYS_PRIVATE_KEY || process.env.ARWEAVE_KEY)) {
      throw new Error(`${provider} final storage requires IRYS_PRIVATE_KEY or ARWEAVE_KEY and a storage adapter.`);
    }
    if (provider === "supabase" && !(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      throw new Error("Supabase final storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }
  }
}
