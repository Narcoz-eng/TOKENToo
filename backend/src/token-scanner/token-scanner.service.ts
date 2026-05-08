import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { Connection, PublicKey } from "@solana/web3.js";
import type { Prisma } from "@prisma/client";
import { isDatabaseSetupError } from "../db/database-errors";
import { PrismaService } from "../db/prisma.service";
import type { TokenScan } from "../types";

type HeliusAsset = {
  id?: string;
  content?: {
    json_uri?: string;
    files?: Array<{ uri?: string; mime?: string }>;
    links?: { image?: string; external_url?: string };
    metadata?: {
      name?: string;
      symbol?: string;
      description?: string;
      image?: string;
      external_url?: string;
      attributes?: unknown;
      properties?: Record<string, unknown>;
    };
  };
  token_info?: {
    decimals?: number;
    supply?: number | string;
    token_program?: string;
    associated_token_address?: string;
    price_info?: Record<string, unknown>;
  };
  authorities?: unknown;
  grouping?: unknown;
  royalty?: unknown;
  ownership?: unknown;
  creators?: unknown;
  compression?: unknown;
};

type OffchainMetadata = {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  external_url?: string;
  extensions?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
};

@Injectable()
export class TokenScannerService {
  constructor(private readonly prisma: PrismaService) {}

  async scanToken(mint: string): Promise<TokenScan> {
    const mintAddress = this.assertMint(mint);
    const heliusKey = process.env.HELIUS_API_KEY;
    if (!heliusKey) {
      throw new ServiceUnavailableException({
        code: "HELIUS_API_KEY_MISSING",
        message: "HELIUS_API_KEY is required to scan Solana token metadata.",
        action: "Add HELIUS_API_KEY to root .env, .env.local, backend/.env, or backend/.env.local."
      });
    }

    const [asset, rpcMint] = await Promise.all([this.fetchHeliusAsset(mintAddress, heliusKey), this.fetchRpcMint(mintAddress)]);
    const offchain = asset.content?.json_uri ? await this.fetchOffchainJson(asset.content.json_uri) : { data: null, warning: "Helius did not return a metadata URI." };
    const resolved = this.resolveMetadata(mintAddress, asset, offchain.data, rpcMint);

    if (!resolved.name || !resolved.symbol) {
      throw new BadRequestException({
        code: "TOKEN_METADATA_INCOMPLETE",
        message: "Helius resolved the mint but did not return enough token identity metadata.",
        details: {
          hasName: Boolean(resolved.name),
          hasSymbol: Boolean(resolved.symbol),
          metadataUri: resolved.metadataUri ?? null,
          imageUri: resolved.imageUri ?? null
        }
      });
    }

    const riskNotes = this.riskNotes(resolved, offchain.warning);
    const scan: TokenScan = {
      mint: mintAddress,
      symbol: resolved.symbol,
      name: resolved.name,
      description: resolved.description,
      metadataUri: resolved.metadataUri,
      imageUri: resolved.imageUri,
      logoUri: resolved.imageUri,
      externalUrl: resolved.externalUrl,
      decimals: resolved.decimals,
      supply: resolved.supply,
      socialLinks: resolved.socialLinks,
      extensions: resolved.extensions,
      provider: "helius",
      indexed: true,
      riskNotes,
      ageHours: 0,
      liquidityUsd: 0,
      marketCapUsd: 0,
      holders: 0,
      volume24hUsd: 0,
      riskScore: this.metadataRiskScore(resolved, riskNotes),
      activeVolume: false,
      reasons: riskNotes
    };

    scan.persistenceWarning = await this.persist(scan, asset, offchain.data);
    return scan;
  }

  private assertMint(mint: string) {
    try {
      return new PublicKey(mint.trim()).toBase58();
    } catch {
      throw new BadRequestException("Invalid Solana mint address.");
    }
  }

  private async fetchHeliusAsset(mint: string, apiKey: string): Promise<HeliusAsset> {
    const endpoint = this.heliusRpcUrl(apiKey);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "phew-token-scan",
        method: "getAsset",
        params: { id: mint, displayOptions: { showFungible: true } }
      })
    }).catch((error) => {
      throw new ServiceUnavailableException({
        code: "HELIUS_UNREACHABLE",
        message: "Helius metadata API could not be reached.",
        details: error instanceof Error ? error.message : String(error)
      });
    });

    if (response.status === 401 || response.status === 403) {
      throw new ServiceUnavailableException({ code: "HELIUS_AUTH_FAILED", message: "Helius rejected the configured API key." });
    }
    if (response.status === 429) {
      throw new ServiceUnavailableException({ code: "HELIUS_RATE_LIMITED", message: "Helius rate limit reached. Retry after the provider window resets." });
    }
    if (!response.ok) {
      throw new ServiceUnavailableException({ code: "HELIUS_ERROR", message: `Helius metadata lookup failed with status ${response.status}.` });
    }

    const payload = (await response.json()) as { result?: HeliusAsset; error?: { message?: string; code?: number } };
    if (payload.error) {
      throw new ServiceUnavailableException({
        code: "HELIUS_RPC_ERROR",
        message: payload.error.message ?? "Helius returned an RPC error.",
        details: payload.error.code
      });
    }
    if (!payload.result) {
      throw new BadRequestException({ code: "TOKEN_NOT_INDEXED", message: "Helius did not return an indexed asset for this mint." });
    }
    return payload.result;
  }

  private async fetchRpcMint(mint: string) {
    const connection = new Connection(this.rpcUrl(), "confirmed");
    try {
      const supply = await connection.getTokenSupply(new PublicKey(mint), "confirmed");
      return {
        decimals: supply.value.decimals,
        supply: supply.value.amount
      };
    } catch (error) {
      return {
        decimals: undefined,
        supply: undefined,
        warning: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async fetchOffchainJson(uri: string): Promise<{ data: OffchainMetadata | null; warning?: string }> {
    const url = this.gatewayUrl(uri);
    if (!url) return { data: null, warning: `Unsupported metadata URI scheme: ${uri}` };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return { data: null, warning: `Metadata URI returned ${response.status}.` };
      return { data: (await response.json()) as OffchainMetadata };
    } catch (error) {
      return { data: null, warning: error instanceof Error ? `Metadata URI fetch failed: ${error.message}` : "Metadata URI fetch failed." };
    } finally {
      clearTimeout(timeout);
    }
  }

  private resolveMetadata(mint: string, asset: HeliusAsset, offchain: OffchainMetadata | null, rpcMint: { decimals?: number; supply?: string; warning?: string }) {
    const content = asset.content;
    const heliusMetadata = content?.metadata ?? {};
    const imageUri = this.firstString(offchain?.image, content?.links?.image, heliusMetadata.image, content?.files?.find((file) => file.uri)?.uri);
    const externalUrl = this.firstString(offchain?.external_url, content?.links?.external_url, heliusMetadata.external_url);
    const extensions = this.record(offchain?.extensions ?? heliusMetadata.properties ?? {});
    return {
      mint,
      name: this.firstString(offchain?.name, heliusMetadata.name),
      symbol: this.stripNullSymbol(this.firstString(offchain?.symbol, heliusMetadata.symbol)),
      description: this.firstString(offchain?.description, heliusMetadata.description),
      metadataUri: content?.json_uri,
      imageUri,
      externalUrl,
      decimals: rpcMint.decimals ?? asset.token_info?.decimals ?? 0,
      supply: rpcMint.supply ?? (asset.token_info?.supply === undefined ? undefined : String(asset.token_info.supply)),
      socialLinks: this.socialLinks(extensions),
      extensions: {
        ...extensions,
        heliusTokenProgram: asset.token_info?.token_program,
        rpcWarning: rpcMint.warning,
        royalty: asset.royalty,
        creators: asset.creators,
        grouping: asset.grouping
      }
    };
  }

  private async persist(scan: TokenScan, asset: HeliusAsset, offchain: OffchainMetadata | null) {
    try {
      const token = await this.prisma.token.upsert({
        where: { mint: scan.mint },
        update: {
          symbol: scan.symbol,
          name: scan.name,
          decimals: scan.decimals,
          metadataUri: scan.metadataUri,
          imageUri: scan.imageUri,
          riskScore: scan.riskScore
        },
        create: {
          mint: scan.mint,
          symbol: scan.symbol,
          name: scan.name,
          decimals: scan.decimals,
          metadataUri: scan.metadataUri,
          imageUri: scan.imageUri,
          riskScore: scan.riskScore
        }
      });
      await this.prisma.tokenMetadataRecord.upsert({
        where: { mint: scan.mint },
        update: {
          tokenId: token.id,
          name: scan.name,
          symbol: scan.symbol,
          description: scan.description,
          logoUri: scan.imageUri,
          metadataUri: scan.metadataUri,
          provider: "helius",
          indexed: true,
          verificationStatus: "RESOLVED",
          metadata: this.json({ scan, helius: asset, offchain })
        },
        create: {
          tokenId: token.id,
          mint: scan.mint,
          name: scan.name,
          symbol: scan.symbol,
          description: scan.description,
          logoUri: scan.imageUri,
          metadataUri: scan.metadataUri,
          provider: "helius",
          indexed: true,
          verificationStatus: "RESOLVED",
          metadata: this.json({ scan, helius: asset, offchain })
        }
      });
      return undefined;
    } catch (error) {
      if (isDatabaseSetupError(error) || error instanceof Error) return `Token metadata resolved but could not be persisted: ${error instanceof Error ? error.message : "database unavailable"}`;
      return "Token metadata resolved but could not be persisted.";
    }
  }

  private riskNotes(input: { metadataUri?: string; imageUri?: string; description?: string; socialLinks?: Record<string, string>; supply?: string }, offchainWarning?: string) {
    return [
      "market_data_not_scanned_no_liquidity_holder_or_volume_claims",
      input.metadataUri ? null : "missing_metadata_uri",
      input.imageUri ? null : "missing_logo_or_image",
      input.description ? null : "missing_description",
      input.socialLinks && Object.keys(input.socialLinks).length ? null : "no_social_links_found",
      input.supply ? null : "rpc_supply_unavailable",
      offchainWarning ?? null
    ].filter(Boolean) as string[];
  }

  private metadataRiskScore(input: { metadataUri?: string; imageUri?: string; description?: string; socialLinks?: Record<string, string> }, notes: string[]) {
    let score = 45;
    if (input.metadataUri) score += 15;
    if (input.imageUri) score += 15;
    if (input.description) score += 10;
    if (input.socialLinks && Object.keys(input.socialLinks).length) score += 10;
    if (notes.some((note) => /failed|missing|unavailable/i.test(note))) score -= 10;
    return Math.max(0, Math.min(100, score));
  }

  private socialLinks(extensions: Record<string, unknown>) {
    const keys = ["website", "twitter", "x", "telegram", "discord", "github", "medium", "instagram"];
    return Object.fromEntries(keys.flatMap((key) => {
      const value = extensions[key];
      return typeof value === "string" && value.trim() ? [[key, value.trim()]] : [];
    }));
  }

  private gatewayUrl(uri: string) {
    if (/^https?:\/\//i.test(uri)) return uri;
    if (uri.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${uri.slice("ipfs://".length)}`;
    if (uri.startsWith("ar://")) return `https://arweave.net/${uri.slice("ar://".length)}`;
    return null;
  }

  private heliusRpcUrl(apiKey: string) {
    const cluster = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? process.env.SOLANA_CLUSTER ?? "").toLowerCase();
    const rpcUrl = this.rpcUrl().toLowerCase();
    const host = cluster === "mainnet-beta" || rpcUrl.includes("mainnet") ? "mainnet" : "devnet";
    return `https://${host}.helius-rpc.com/?api-key=${encodeURIComponent(apiKey)}`;
  }

  private rpcUrl() {
    return process.env.SOLANA_RPC_URL ?? process.env.ANCHOR_PROVIDER_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  }

  private firstString(...values: Array<unknown>) {
    return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
  }

  private stripNullSymbol(value?: string) {
    return value && value !== "\u0000" ? value : undefined;
  }

  private record(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
}
