import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { Connection, PublicKey } from "@solana/web3.js";
import type { Prisma } from "@prisma/client";
import { isDatabaseSetupError } from "../db/database-errors";
import { PrismaService } from "../db/prisma.service";
import type { TokenScan } from "../types";
import {
  heliusGetAssetBody,
  normalizeHeliusConfig,
  setLastHeliusErrorCode,
  type HeliusConfig,
  type HeliusErrorCode
} from "./helius-config";

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

type RpcMint = { decimals?: number; supply?: string; warning?: string };

type FallbackMetadata = {
  provider: "dexscreener" | "jupiter";
  name?: string;
  symbol?: string;
  description?: string;
  imageUri?: string;
  externalUrl?: string;
  socialLinks?: Record<string, string>;
  extensions?: Record<string, unknown>;
  liquidityUsd?: number;
  marketCapUsd?: number;
  volume24hUsd?: number;
  warning?: string;
};

@Injectable()
export class TokenScannerService {
  constructor(private readonly prisma: PrismaService) {}

  async scanToken(mint: string): Promise<TokenScan> {
    const mintAddress = this.assertMint(mint);
    const heliusConfig = normalizeHeliusConfig();
    if (heliusConfig.errorCode) {
      setLastHeliusErrorCode(heliusConfig.errorCode);
      throw new ServiceUnavailableException({
        code: heliusConfig.errorCode,
        message: heliusConfig.errorMessage ?? "Helius configuration is invalid.",
        warnings: heliusConfig.warnings
      });
    }

    const rpcMint = await this.fetchRpcMint(mintAddress);
    const { asset, warning: heliusWarning } = await this.fetchHeliusAssetWithFallback(mintAddress, heliusConfig);
    const offchain = asset?.content?.json_uri ? await this.fetchOffchainJson(asset.content.json_uri) : { data: null, warning: asset ? "Helius did not return a metadata URI." : "Helius metadata unavailable; using fallback providers." };
    let resolved = this.resolveMetadata(mintAddress, asset, offchain.data, rpcMint);
    const needsFallbackIdentity = !resolved.name || !resolved.symbol || !resolved.imageUri || !Object.keys(resolved.socialLinks ?? {}).length;
    const [dexScreener, jupiter] = needsFallbackIdentity ? await Promise.all([this.fetchDexScreenerMetadata(mintAddress), this.fetchJupiterMetadata(mintAddress)]) : [null, null];
    resolved = this.resolveMetadata(mintAddress, asset, offchain.data, rpcMint, dexScreener, jupiter);

    if (!resolved.name || !resolved.symbol) {
      setLastHeliusErrorCode("TOKEN_METADATA_INCOMPLETE");
      throw new BadRequestException({
        code: "TOKEN_METADATA_INCOMPLETE",
        message: "Token metadata providers resolved the mint supply but did not return enough token identity metadata.",
        details: {
          hasName: Boolean(resolved.name),
          hasSymbol: Boolean(resolved.symbol),
          metadataUri: resolved.metadataUri ?? null,
          imageUri: resolved.imageUri ?? null,
          heliusWarning,
          dexScreenerWarning: dexScreener?.warning,
          jupiterWarning: jupiter?.warning
        }
      });
    }

    const riskNotes = this.riskNotes(resolved, offchain.warning, heliusWarning, dexScreener?.warning, jupiter?.warning);
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
      indexed: Boolean(asset),
      riskNotes,
      ageHours: 0,
      liquidityUsd: resolved.liquidityUsd ?? 0,
      marketCapUsd: resolved.marketCapUsd ?? 0,
      holders: 0,
      volume24hUsd: resolved.volume24hUsd ?? 0,
      riskScore: this.metadataRiskScore(resolved, riskNotes),
      activeVolume: false,
      reasons: riskNotes
    };

    scan.persistenceWarning = await this.persist(scan, asset, offchain.data, { dexScreener, jupiter });
    return scan;
  }

  private assertMint(mint: string) {
    try {
      return new PublicKey(mint.trim()).toBase58();
    } catch {
      throw new BadRequestException("Invalid Solana mint address.");
    }
  }

  private async fetchHeliusAssetWithFallback(mint: string, config: HeliusConfig): Promise<{ asset: HeliusAsset | null; warning?: string }> {
    try {
      const asset = await this.fetchHeliusAsset(mint, config);
      setLastHeliusErrorCode(undefined);
      return { asset };
    } catch (error) {
      const code = this.exceptionCode(error);
      if (code === "HELIUS_AUTH_FAILED" || code === "HELIUS_CONFIG_INVALID" || code === "HELIUS_RATE_LIMITED" || code === "NETWORK_MISMATCH_DEVNET_MAINNET") {
        throw error;
      }
      try {
        const asset = await this.fetchHeliusAsset(mint, config);
        setLastHeliusErrorCode(undefined);
        return { asset };
      } catch (retryError) {
        const retryCode = this.exceptionCode(retryError) ?? code ?? "HELIUS_ERROR";
        if (retryCode === "HELIUS_AUTH_FAILED" || retryCode === "HELIUS_CONFIG_INVALID" || retryCode === "HELIUS_RATE_LIMITED" || retryCode === "NETWORK_MISMATCH_DEVNET_MAINNET") {
          throw retryError;
        }
        setLastHeliusErrorCode(retryCode);
        return { asset: null, warning: `${retryCode}: ${this.exceptionMessage(retryError)}` };
      }
    }
  }

  private async fetchHeliusAsset(mint: string, config: HeliusConfig): Promise<HeliusAsset> {
    if (!config.heliusRpcUrl) {
      setLastHeliusErrorCode("HELIUS_CONFIG_INVALID");
      throw new ServiceUnavailableException({ code: "HELIUS_CONFIG_INVALID", message: "Helius RPC URL could not be built from the configured key." });
    }
    const response = await fetch(config.heliusRpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(heliusGetAssetBody(mint))
    }).catch((error) => {
      setLastHeliusErrorCode("HELIUS_UNREACHABLE");
      throw new ServiceUnavailableException({
        code: "HELIUS_UNREACHABLE",
        message: "Helius metadata API could not be reached.",
        details: error instanceof Error ? error.message : String(error)
      });
    });

    if (response.status === 401 || response.status === 403) {
      setLastHeliusErrorCode("HELIUS_AUTH_FAILED");
      throw new ServiceUnavailableException({ code: "HELIUS_AUTH_FAILED", message: "Helius rejected the configured API key." });
    }
    if (response.status === 429) {
      setLastHeliusErrorCode("HELIUS_RATE_LIMITED");
      throw new ServiceUnavailableException({ code: "HELIUS_RATE_LIMITED", message: "Helius rate limit reached. Retry after the provider window resets." });
    }
    if (!response.ok) {
      setLastHeliusErrorCode("HELIUS_ERROR");
      throw new ServiceUnavailableException({ code: "HELIUS_ERROR", message: `Helius metadata lookup failed with status ${response.status}.` });
    }

    const payload = (await response.json()) as { result?: HeliusAsset; error?: { message?: string; code?: number } };
    if (payload.error) {
      const code = this.heliusRpcErrorCode(payload.error.message);
      setLastHeliusErrorCode(code);
      throw new ServiceUnavailableException({
        code,
        message: payload.error.message ?? "Helius returned an RPC error.",
        details: payload.error.code
      });
    }
    if (!payload.result) {
      setLastHeliusErrorCode("TOKEN_NOT_INDEXED");
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

  private async fetchDexScreenerMetadata(mint: string): Promise<FallbackMetadata | null> {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
      if (!response.ok) return { provider: "dexscreener", warning: `DexScreener returned ${response.status}.` };
      const payload = (await response.json()) as {
        pairs?: Array<{
          chainId?: string;
          baseToken?: { name?: string; symbol?: string; address?: string };
          url?: string;
          info?: { imageUrl?: string; websites?: Array<{ label?: string; url?: string }>; socials?: Array<{ type?: string; url?: string }> };
          liquidity?: { usd?: number };
          marketCap?: number;
          fdv?: number;
          volume?: { h24?: number };
        }>;
      };
      const pair = payload.pairs?.find((entry) => entry.chainId === "solana" && entry.baseToken?.address === mint) ?? payload.pairs?.find((entry) => entry.chainId === "solana") ?? payload.pairs?.[0];
      if (!pair) return { provider: "dexscreener", warning: "DexScreener did not return a Solana pair for this mint." };
      const socials = Object.fromEntries([
        ...(pair.info?.websites ?? []).flatMap((site) => site.url ? [[site.label?.toLowerCase() || "website", site.url] as const] : []),
        ...(pair.info?.socials ?? []).flatMap((social) => social.url ? [[social.type?.toLowerCase() || "social", social.url] as const] : [])
      ]);
      return {
        provider: "dexscreener",
        name: pair.baseToken?.name,
        symbol: this.stripNullSymbol(pair.baseToken?.symbol),
        imageUri: pair.info?.imageUrl,
        externalUrl: pair.url,
        socialLinks: socials,
        liquidityUsd: pair.liquidity?.usd,
        marketCapUsd: pair.marketCap ?? pair.fdv,
        volume24hUsd: pair.volume?.h24,
        extensions: { dexScreenerPairUrl: pair.url }
      };
    } catch (error) {
      return { provider: "dexscreener", warning: error instanceof Error ? `DexScreener metadata failed: ${error.message}` : "DexScreener metadata failed." };
    }
  }

  private async fetchJupiterMetadata(mint: string): Promise<FallbackMetadata | null> {
    try {
      const response = await fetch(`https://tokens.jup.ag/token/${mint}`);
      if (!response.ok) return { provider: "jupiter", warning: `Jupiter token metadata returned ${response.status}.` };
      const token = (await response.json()) as { name?: string; symbol?: string; logoURI?: string; extensions?: Record<string, unknown> };
      return {
        provider: "jupiter",
        name: token.name,
        symbol: this.stripNullSymbol(token.symbol),
        imageUri: token.logoURI,
        socialLinks: this.socialLinks(this.record(token.extensions ?? {})),
        extensions: token.extensions
      };
    } catch (error) {
      return { provider: "jupiter", warning: error instanceof Error ? `Jupiter token metadata failed: ${error.message}` : "Jupiter token metadata failed." };
    }
  }

  private resolveMetadata(mint: string, asset: HeliusAsset | null, offchain: OffchainMetadata | null, rpcMint: RpcMint, dexScreener?: FallbackMetadata | null, jupiter?: FallbackMetadata | null) {
    const content = asset?.content;
    const heliusMetadata = content?.metadata ?? {};
    const imageUri = this.firstString(offchain?.image, content?.links?.image, heliusMetadata.image, content?.files?.find((file) => file.uri)?.uri, dexScreener?.imageUri, jupiter?.imageUri);
    const externalUrl = this.firstString(offchain?.external_url, content?.links?.external_url, heliusMetadata.external_url, dexScreener?.externalUrl, jupiter?.externalUrl);
    const extensions = this.record(offchain?.extensions ?? heliusMetadata.properties ?? {});
    const socialLinks = { ...this.socialLinks(extensions), ...(jupiter?.socialLinks ?? {}), ...(dexScreener?.socialLinks ?? {}) };
    return {
      mint,
      name: this.firstString(offchain?.name, heliusMetadata.name, dexScreener?.name, jupiter?.name),
      symbol: this.stripNullSymbol(this.firstString(offchain?.symbol, heliusMetadata.symbol, dexScreener?.symbol, jupiter?.symbol)),
      description: this.firstString(offchain?.description, heliusMetadata.description, dexScreener?.description, jupiter?.description),
      metadataUri: content?.json_uri,
      imageUri,
      externalUrl,
      decimals: rpcMint.decimals ?? asset?.token_info?.decimals ?? 0,
      supply: rpcMint.supply ?? (asset?.token_info?.supply === undefined ? undefined : String(asset.token_info.supply)),
      socialLinks,
      liquidityUsd: dexScreener?.liquidityUsd,
      marketCapUsd: dexScreener?.marketCapUsd,
      volume24hUsd: dexScreener?.volume24hUsd,
      extensions: {
        ...extensions,
        ...(jupiter?.extensions ?? {}),
        ...(dexScreener?.extensions ?? {}),
        metadataFallbackProviders: [dexScreener?.provider, jupiter?.provider].filter(Boolean),
        heliusTokenProgram: asset?.token_info?.token_program,
        rpcWarning: rpcMint.warning,
        royalty: asset?.royalty,
        creators: asset?.creators,
        grouping: asset?.grouping
      }
    };
  }

  private async persist(scan: TokenScan, asset: HeliusAsset | null, offchain: OffchainMetadata | null, fallback: { dexScreener: FallbackMetadata | null; jupiter: FallbackMetadata | null }) {
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
          indexed: scan.indexed,
          verificationStatus: "RESOLVED",
          metadata: this.json({ scan, helius: asset, offchain, fallback })
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
          indexed: scan.indexed,
          verificationStatus: "RESOLVED",
          metadata: this.json({ scan, helius: asset, offchain, fallback })
        }
      });
      return undefined;
    } catch (error) {
      if (isDatabaseSetupError(error) || error instanceof Error) return `Token metadata resolved but could not be persisted: ${error instanceof Error ? error.message : "database unavailable"}`;
      return "Token metadata resolved but could not be persisted.";
    }
  }

  private riskNotes(input: { metadataUri?: string; imageUri?: string; description?: string; socialLinks?: Record<string, string>; supply?: string }, ...warnings: Array<string | undefined>) {
    return [
      "market_data_not_scanned_no_liquidity_holder_or_volume_claims",
      input.metadataUri ? null : "missing_metadata_uri",
      input.imageUri ? null : "missing_logo_or_image",
      input.description ? null : "missing_description",
      input.socialLinks && Object.keys(input.socialLinks).length ? null : "no_social_links_found",
      input.supply ? null : "rpc_supply_unavailable",
      ...warnings.map((warning) => warning ?? null)
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

  private heliusRpcErrorCode(message?: string): HeliusErrorCode {
    if (/not\s+found|not\s+indexed|asset/i.test(message ?? "")) return "TOKEN_NOT_INDEXED";
    if (/mainnet|devnet|network|cluster/i.test(message ?? "")) return "NETWORK_MISMATCH_DEVNET_MAINNET";
    return "HELIUS_RPC_ERROR";
  }

  private exceptionCode(error: unknown): HeliusErrorCode | undefined {
    const response = typeof error === "object" && error && "getResponse" in error && typeof error.getResponse === "function" ? error.getResponse() : undefined;
    const code = typeof response === "object" && response && "code" in response ? response.code : undefined;
    return typeof code === "string" ? (code as HeliusErrorCode) : undefined;
  }

  private exceptionMessage(error: unknown) {
    const response = typeof error === "object" && error && "getResponse" in error && typeof error.getResponse === "function" ? error.getResponse() : undefined;
    const message = typeof response === "object" && response && "message" in response ? response.message : undefined;
    if (typeof message === "string") return message;
    return error instanceof Error ? error.message : String(error);
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
}
