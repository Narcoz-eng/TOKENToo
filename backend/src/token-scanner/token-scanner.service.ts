import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
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
  provider: "dexscreener" | "dexscreener-profile" | "dexscreener-search" | "jupiter" | "solana-token-metadata";
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
  metadataUri?: string;
  warning?: string;
};

type IdentityConfidence = {
  metadataConfidence: number;
  fallbackConfidence: number;
  inferredIdentityConfidence: number;
  breakdown: Record<string, number | string | boolean>;
};

@Injectable()
export class TokenScannerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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
    const needsFallbackIdentity = !resolved.name || !resolved.symbol || !resolved.imageUri || !resolved.description || !Object.keys(resolved.socialLinks ?? {}).length;
    const [dexScreener, dexProfile, dexSearch, jupiter, solanaMetadata] = needsFallbackIdentity
      ? await Promise.all([
        this.fetchDexScreenerMetadata(mintAddress),
        this.fetchDexScreenerProfile(mintAddress),
        this.fetchDexScreenerSearch(mintAddress),
        this.fetchJupiterMetadata(mintAddress),
        this.fetchSolanaTokenMetadata(mintAddress)
      ])
      : [null, null, null, null, null];
    const discoveredUri = this.firstString(solanaMetadata?.metadataUri, dexProfile?.metadataUri, dexSearch?.metadataUri);
    const discoveredOffchain = !offchain.data && discoveredUri ? await this.fetchOffchainJson(discoveredUri) : { data: null as OffchainMetadata | null, warning: undefined };
    const fallbackSources = { dexScreener, dexProfile, dexSearch, jupiter, solanaMetadata };
    resolved = this.resolveMetadata(mintAddress, asset, offchain.data ?? discoveredOffchain.data, rpcMint, dexScreener, dexProfile, dexSearch, jupiter, solanaMetadata);
    resolved = this.withFallbackIdentityDefaults(resolved, mintAddress);
    const confidence = this.identityConfidence(resolved, Boolean(asset), Boolean(offchain.data ?? discoveredOffchain.data), Object.values(fallbackSources));
    resolved = this.withInferredIdentitySeed(resolved, confidence);

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
          dexProfileWarning: dexProfile?.warning,
          dexSearchWarning: dexSearch?.warning,
          jupiterWarning: jupiter?.warning
        }
      });
    }

    const riskNotes = this.riskNotes(resolved, confidence, offchain.warning, discoveredOffchain.warning, heliusWarning, dexScreener?.warning, dexProfile?.warning, dexSearch?.warning, jupiter?.warning, solanaMetadata?.warning);
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
      metadataConfidence: confidence.metadataConfidence,
      fallbackConfidence: confidence.fallbackConfidence,
      inferredIdentityConfidence: confidence.inferredIdentityConfidence,
      confidenceBreakdown: confidence.breakdown,
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

    scan.persistenceWarning = await this.persist(scan, asset, offchain.data ?? discoveredOffchain.data, fallbackSources);
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
        return { asset: null, warning: this.sanitizedProviderFailure("Helius", retryCode, retryError) };
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

  private async fetchDexScreenerProfile(mint: string): Promise<FallbackMetadata | null> {
    try {
      const response = await fetch("https://api.dexscreener.com/token-profiles/latest/v1");
      if (!response.ok) return { provider: "dexscreener-profile", warning: `DexScreener profiles returned ${response.status}.` };
      const profiles = (await response.json()) as Array<{
        chainId?: string;
        tokenAddress?: string;
        url?: string;
        description?: string;
        icon?: string;
        header?: string;
        links?: Array<{ type?: string; label?: string; url?: string }>;
      }>;
      const profile = profiles.find((item) => item.chainId === "solana" && item.tokenAddress === mint);
      if (!profile) return { provider: "dexscreener-profile", warning: "DexScreener profile list did not include this mint." };
      const links = Object.fromEntries((profile.links ?? []).flatMap((link) => link.url ? [[(link.type ?? link.label ?? "website").toLowerCase(), link.url] as const] : []));
      return {
        provider: "dexscreener-profile",
        description: profile.description,
        imageUri: profile.icon ?? profile.header,
        externalUrl: profile.url,
        socialLinks: links,
        extensions: { dexScreenerProfileUrl: profile.url, dexScreenerProfileDescription: profile.description }
      };
    } catch (error) {
      return { provider: "dexscreener-profile", warning: error instanceof Error ? `DexScreener profile metadata failed: ${error.message}` : "DexScreener profile metadata failed." };
    }
  }

  private async fetchDexScreenerSearch(mint: string): Promise<FallbackMetadata | null> {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(mint)}`);
      if (!response.ok) return { provider: "dexscreener-search", warning: `DexScreener search returned ${response.status}.` };
      const payload = (await response.json()) as {
        pairs?: Array<{
          chainId?: string;
          baseToken?: { name?: string; symbol?: string; address?: string };
          url?: string;
          info?: { imageUrl?: string; websites?: Array<{ label?: string; url?: string }>; socials?: Array<{ type?: string; url?: string }> };
        }>;
      };
      const pair = payload.pairs?.find((entry) => entry.chainId === "solana" && entry.baseToken?.address === mint) ?? payload.pairs?.find((entry) => entry.chainId === "solana");
      if (!pair) return { provider: "dexscreener-search", warning: "DexScreener search did not return this Solana mint." };
      const socials = Object.fromEntries([
        ...(pair.info?.websites ?? []).flatMap((site) => site.url ? [[site.label?.toLowerCase() || "website", site.url] as const] : []),
        ...(pair.info?.socials ?? []).flatMap((social) => social.url ? [[social.type?.toLowerCase() || "social", social.url] as const] : [])
      ]);
      return {
        provider: "dexscreener-search",
        name: pair.baseToken?.name,
        symbol: this.stripNullSymbol(pair.baseToken?.symbol),
        imageUri: pair.info?.imageUrl,
        externalUrl: pair.url,
        socialLinks: socials,
        extensions: { dexScreenerSearchPairUrl: pair.url }
      };
    } catch (error) {
      return { provider: "dexscreener-search", warning: error instanceof Error ? `DexScreener search failed: ${error.message}` : "DexScreener search failed." };
    }
  }

  private async fetchJupiterMetadata(mint: string): Promise<FallbackMetadata | null> {
    try {
      const response = await fetch(`https://tokens.jup.ag/token/${mint}`);
      let token = response.ok ? (await response.json()) as { name?: string; symbol?: string; logoURI?: string; extensions?: Record<string, unknown> } : null;
      if (!token) {
        const listResponse = await fetch("https://tokens.jup.ag/tokens?tags=verified");
        if (!listResponse.ok) return { provider: "jupiter", warning: `Jupiter token metadata returned ${response.status}; token list returned ${listResponse.status}.` };
        const list = (await listResponse.json()) as Array<{ address?: string; name?: string; symbol?: string; logoURI?: string; extensions?: Record<string, unknown> }>;
        token = list.find((item) => item.address === mint) ?? null;
      }
      if (!token) return { provider: "jupiter", warning: "Jupiter token list did not include this mint." };
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

  private async fetchSolanaTokenMetadata(mint: string): Promise<FallbackMetadata | null> {
    try {
      const info = await new Connection(this.rpcUrl(), "confirmed").getParsedAccountInfo(new PublicKey(mint), "confirmed");
      const parsed = this.record(this.record(info.value?.data).parsed);
      const data = this.record(this.record(parsed.info).extensions);
      const metadataUri = this.firstString(data.metadataUri, data.uri);
      return {
        provider: "solana-token-metadata",
        name: this.firstString(data.name),
        symbol: this.stripNullSymbol(this.firstString(data.symbol)),
        description: this.firstString(data.description),
        imageUri: this.firstString(data.image, data.logoUri),
        externalUrl: this.firstString(data.externalUrl, data.website),
        metadataUri,
        socialLinks: this.socialLinks(data),
        extensions: Object.keys(data).length ? data : undefined,
        warning: Object.keys(data).length ? undefined : "Solana parsed mint did not expose token metadata extensions."
      };
    } catch (error) {
      return { provider: "solana-token-metadata", warning: error instanceof Error ? `Solana token metadata failed: ${error.message}` : "Solana token metadata failed." };
    }
  }

  private resolveMetadata(mint: string, asset: HeliusAsset | null, offchain: OffchainMetadata | null, rpcMint: RpcMint, ...fallbackSources: Array<FallbackMetadata | null | undefined>) {
    const content = asset?.content;
    const heliusMetadata = content?.metadata ?? {};
    const imageUri = this.firstString(offchain?.image, content?.links?.image, heliusMetadata.image, content?.files?.find((file) => file.uri)?.uri, ...fallbackSources.map((source) => source?.imageUri));
    const externalUrl = this.firstString(offchain?.external_url, content?.links?.external_url, heliusMetadata.external_url, ...fallbackSources.map((source) => source?.externalUrl));
    const extensions = this.record(offchain?.extensions ?? heliusMetadata.properties ?? {});
    const socialLinks = Object.assign(
      {},
      this.socialLinks(extensions),
      this.socialLinks(this.record(offchain ?? {})),
      this.linksFromText([offchain?.description, offchain?.external_url, heliusMetadata.description, heliusMetadata.external_url].join(" ")),
      ...fallbackSources.map((source) => source?.socialLinks ?? {})
    );
    const fallbackExtensions = Object.assign({}, ...fallbackSources.map((source) => source?.extensions ?? {}));
    const marketSource = fallbackSources.find((source) => source?.liquidityUsd || source?.marketCapUsd || source?.volume24hUsd);
    return {
      mint,
      name: this.firstString(offchain?.name, heliusMetadata.name, ...fallbackSources.map((source) => source?.name)),
      symbol: this.stripNullSymbol(this.firstString(offchain?.symbol, heliusMetadata.symbol, ...fallbackSources.map((source) => source?.symbol))),
      description: this.firstString(offchain?.description, heliusMetadata.description, ...fallbackSources.map((source) => source?.description)),
      metadataUri: this.firstString(content?.json_uri, ...fallbackSources.map((source) => source?.metadataUri)),
      imageUri,
      externalUrl,
      decimals: rpcMint.decimals ?? asset?.token_info?.decimals ?? 0,
      supply: rpcMint.supply ?? (asset?.token_info?.supply === undefined ? undefined : String(asset.token_info.supply)),
      socialLinks,
      liquidityUsd: marketSource?.liquidityUsd,
      marketCapUsd: marketSource?.marketCapUsd,
      volume24hUsd: marketSource?.volume24hUsd,
      extensions: {
        ...extensions,
        ...fallbackExtensions,
        logoSemanticAnalysis: this.logoSemanticAnalysis(imageUri),
        tokenNameMorphology: this.nameMorphology(this.firstString(offchain?.name, heliusMetadata.name, ...fallbackSources.map((source) => source?.name)), this.stripNullSymbol(this.firstString(offchain?.symbol, heliusMetadata.symbol, ...fallbackSources.map((source) => source?.symbol)))),
        metadataFallbackProviders: fallbackSources.map((source) => source?.provider).filter(Boolean),
        heliusTokenProgram: asset?.token_info?.token_program,
        rpcWarning: rpcMint.warning,
        royalty: asset?.royalty,
        creators: asset?.creators,
        grouping: asset?.grouping
      }
    };
  }

  private withFallbackIdentityDefaults<T extends { mint?: string; name?: string; symbol?: string; description?: string; extensions?: Record<string, unknown>; socialLinks?: Record<string, string>; imageUri?: string; metadataUri?: string; supply?: string }>(resolved: T, mint: string): T {
    const morphology = this.nameMorphology(resolved.name, resolved.symbol);
    const logo = this.logoSemanticAnalysis(resolved.imageUri);
    const fallbackSymbol = resolved.symbol ?? morphology.symbolCandidate ?? mint.slice(0, 4).toUpperCase();
    const fallbackName = resolved.name ?? morphology.nameCandidate ?? `Mint ${mint.slice(0, 4)} ${mint.slice(-4)}`;
    return {
      ...resolved,
      name: fallbackName,
      symbol: fallbackSymbol,
      extensions: {
        ...(resolved.extensions ?? {}),
        identityFallbackUsed: !resolved.name || !resolved.symbol,
        logoSemanticAnalysis: logo,
        tokenNameMorphology: morphology
      }
    };
  }

  private withInferredIdentitySeed<T extends { name?: string; symbol?: string; description?: string; extensions?: Record<string, unknown>; socialLinks?: Record<string, string>; imageUri?: string; metadataUri?: string; supply?: string }>(resolved: T, confidence: IdentityConfidence): T {
    const seed = this.identitySeed(resolved, confidence);
    if (resolved.description && confidence.inferredIdentityConfidence < 35) {
      return {
        ...resolved,
        extensions: {
          ...(resolved.extensions ?? {}),
          metadataConfidence: confidence.metadataConfidence,
          fallbackConfidence: confidence.fallbackConfidence,
          inferredIdentityConfidence: confidence.inferredIdentityConfidence,
          confidenceBreakdown: confidence.breakdown
        }
      };
    }
    return {
      ...resolved,
      description: resolved.description ?? seed.description,
      extensions: {
        ...(resolved.extensions ?? {}),
        inferredIdentitySeed: seed,
        inferredIdentitySeedSource: "token name, symbol, logo URI, socials, and fallback market/profile metadata; not official token metadata"
      }
    };
  }

  private identitySeed(input: { name?: string; symbol?: string; imageUri?: string; socialLinks?: Record<string, string> }, confidence?: IdentityConfidence) {
    const morphology = this.nameMorphology(input.name, input.symbol);
    const logo = this.logoSemanticAnalysis(input.imageUri);
    const text = `${input.name ?? ""} ${input.symbol ?? ""} ${input.imageUri ?? ""} ${Object.keys(input.socialLinks ?? {}).join(" ")} ${morphology.signals.join(" ")} ${logo.signals.join(" ")}`.toLowerCase();
    if (/hanta|hantavirus|virus|viral|biohazard|infection|infect|pathogen|lab|quarantine|mutation|toxic/.test(text)) {
      return {
        signalWeights: {
          medical: 0.92,
          contamination: 0.88,
          mutation: 0.72,
          quarantine: 0.7,
          memeParanoia: 0.64,
          fallbackConfidence: (confidence?.fallbackConfidence ?? 0) / 100
        },
        inferredSignals: ["medical", "contamination", "mutation", "quarantine", "lab", "fever", "meme paranoia"],
        confidence: confidence && confidence.inferredIdentityConfidence >= 70 ? "high" : "medium",
        official: false,
        description: `${input.name ?? input.symbol ?? "This token"} has sparse official metadata. Internal identity seed inferred from name, symbol, logo URI, socials, and fallback market/profile text: medical contamination, mutation, quarantine, lab, fever, microscopic, and paranoid meme signals.`
      };
    }
    return {
      signalWeights: {
        tokenNameMorphology: 0.55,
        symbolShape: 0.48,
        logoUriLanguage: input.imageUri ? 0.42 : 0,
        socialPresence: Object.keys(input.socialLinks ?? {}).length ? 0.38 : 0,
        fallbackConfidence: (confidence?.fallbackConfidence ?? 0) / 100
      },
      inferredSignals: [...morphology.signals, ...logo.signals, "token name morphology", "symbol", "social context"],
      confidence: confidence && confidence.inferredIdentityConfidence >= 55 ? "medium" : "low",
      official: false,
      description: `${input.name ?? input.symbol ?? "This token"} has sparse official metadata. Internal identity seed inferred from token name morphology, symbol, image/logo URI, social context, and fallback market/profile text; not official token metadata.`
    };
  }

  private async persist(scan: TokenScan, asset: HeliusAsset | null, offchain: OffchainMetadata | null, fallback: Record<string, FallbackMetadata | null>) {
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
      if (isDatabaseSetupError(error)) return `Token metadata resolved but could not be persisted: ${this.sanitizeErrorMessage(error instanceof Error ? error.message : String(error))}`;
      if (error instanceof Error) return `Token metadata resolved but could not be persisted: ${this.sanitizeErrorMessage(error.message)}`;
      return "Token metadata resolved but could not be persisted.";
    }
  }

  private riskNotes(input: { metadataUri?: string; imageUri?: string; description?: string; socialLinks?: Record<string, string>; supply?: string; liquidityUsd?: number; marketCapUsd?: number; volume24hUsd?: number }, confidence: IdentityConfidence, ...warnings: Array<string | undefined>) {
    const hasMarketData = Boolean(input.liquidityUsd || input.marketCapUsd || input.volume24hUsd);
    return [
      hasMarketData ? "market_data_enriched_by_fallback_provider" : "market_data_unavailable_no_liquidity_holder_or_volume_claims",
      input.metadataUri ? null : confidence.inferredIdentityConfidence >= 55 ? "metadata_uri_absent_identity_inferred_with_confidence" : "missing_metadata_uri",
      input.imageUri ? null : "missing_logo_or_image",
      input.description ? null : "missing_description",
      input.socialLinks && Object.keys(input.socialLinks).length ? null : "no_social_links_found",
      input.supply ? null : "rpc_supply_unavailable_supply_claims_disabled",
      `metadata_confidence_${confidence.metadataConfidence}`,
      `fallback_confidence_${confidence.fallbackConfidence}`,
      `inferred_identity_confidence_${confidence.inferredIdentityConfidence}`,
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
    const keys = ["website", "external_url", "externalUrl", "twitter", "x", "telegram", "discord", "github", "medium", "instagram"];
    return Object.fromEntries(keys.flatMap((key) => {
      const value = extensions[key];
      return typeof value === "string" && value.trim() ? [[key === "external_url" || key === "externalUrl" ? "website" : key, value.trim()]] : [];
    }));
  }

  private identityConfidence(input: { metadataUri?: string; imageUri?: string; description?: string; socialLinks?: Record<string, string>; extensions?: Record<string, unknown>; supply?: string; liquidityUsd?: number; marketCapUsd?: number; volume24hUsd?: number }, heliusIndexed: boolean, offchainResolved: boolean, fallbackSources: Array<FallbackMetadata | null>) {
    const fallbackHits = fallbackSources.filter((source) => source && !source.warning && (source.name || source.symbol || source.imageUri || source.socialLinks || source.liquidityUsd || source.marketCapUsd || source.volume24hUsd)).length;
    const socialCount = Object.keys(input.socialLinks ?? {}).length;
    const metadataConfidence = this.clampConfidence((heliusIndexed ? 35 : 0) + (offchainResolved ? 25 : 0) + (input.metadataUri ? 12 : 0) + (input.imageUri ? 10 : 0) + (input.description ? 10 : 0) + Math.min(8, socialCount * 2));
    const fallbackConfidence = this.clampConfidence(fallbackHits * 18 + (input.liquidityUsd || input.marketCapUsd || input.volume24hUsd ? 18 : 0) + (input.imageUri ? 8 : 0) + Math.min(12, socialCount * 3));
    const inferredIdentityConfidence = this.clampConfidence(Math.round((metadataConfidence * 0.45) + (fallbackConfidence * 0.45) + (this.record(input.extensions?.tokenNameMorphology).signals ? 6 : 0) + (this.record(input.extensions?.logoSemanticAnalysis).signals ? 6 : 0)));
    return {
      metadataConfidence,
      fallbackConfidence,
      inferredIdentityConfidence,
      breakdown: {
        heliusIndexed,
        offchainResolved,
        fallbackProviderHits: fallbackHits,
        socialLinkCount: socialCount,
        hasMetadataUri: Boolean(input.metadataUri),
        hasImage: Boolean(input.imageUri),
        hasDescription: Boolean(input.description),
        hasMarketData: Boolean(input.liquidityUsd || input.marketCapUsd || input.volume24hUsd)
      }
    };
  }

  private nameMorphology(name?: string, symbol?: string) {
    const text = `${name ?? ""} ${symbol ?? ""}`.toLowerCase();
    const signals = [
      /hanta|virus|bio|lab|toxic|mutat|fever/.test(text) ? "medical contamination morphology" : null,
      /dog|doge|shib|inu|paw|bone/.test(text) ? "canine community morphology" : null,
      /cat|meow|claw|kitty/.test(text) ? "feline community morphology" : null,
      /frog|pepe|bog|ribbit|pond/.test(text) ? "amphibian meme morphology" : null,
      /ai|agent|bot|node|reactor|compute/.test(text) ? "machine intelligence morphology" : null,
      /chart|degen|candle|market|pump|index/.test(text) ? "market stress morphology" : null,
      /skull|bone|crypt|dark|ash/.test(text) ? "dark ritual morphology" : null,
      /cute|toy|toast|tiny|soft/.test(text) ? "soft-play morphology" : null,
      /vapor|dream|liminal|mall|pool/.test(text) ? "surreal dream morphology" : null
    ].filter(Boolean) as string[];
    return {
      signals,
      symbolLength: symbol?.length ?? 0,
      nameWordCount: name?.split(/\W+/).filter(Boolean).length ?? 0,
      symbolCandidate: symbol,
      nameCandidate: name
    };
  }

  private logoSemanticAnalysis(imageUri?: string) {
    const text = (imageUri ?? "").toLowerCase();
    const signals = [
      /hanta|virus|bio|lab|toxic|mutat|fever/.test(text) ? "logo uri medical contamination signal" : null,
      /dog|doge|shib|inu|paw|bone/.test(text) ? "logo uri canine signal" : null,
      /cat|meow|claw|kitty/.test(text) ? "logo uri feline signal" : null,
      /frog|pepe|bog|ribbit|pond/.test(text) ? "logo uri amphibian signal" : null,
      /ai|agent|bot|node|reactor|compute/.test(text) ? "logo uri machine signal" : null,
      /chart|degen|candle|market|pump|index/.test(text) ? "logo uri market signal" : null,
      /skull|bone|crypt|dark|ash/.test(text) ? "logo uri dark ritual signal" : null,
      /cute|toy|toast|tiny|soft/.test(text) ? "logo uri soft-play signal" : null,
      /vapor|dream|liminal|mall|pool/.test(text) ? "logo uri surreal signal" : null
    ].filter(Boolean) as string[];
    return { signals, hasLogoUri: Boolean(imageUri), uriHost: imageUri ? this.safeHost(imageUri) : undefined };
  }

  private linksFromText(text: string) {
    const matches = text.match(/https?:\/\/[^\s"'<>),]+/gi) ?? [];
    return Object.fromEntries(matches.slice(0, 8).map((url, index) => [this.linkKey(url, index), url]));
  }

  private linkKey(url: string, index: number) {
    const lower = url.toLowerCase();
    if (lower.includes("twitter.com") || lower.includes("x.com")) return "twitter";
    if (lower.includes("t.me") || lower.includes("telegram")) return "telegram";
    if (lower.includes("discord")) return "discord";
    if (lower.includes("github")) return "github";
    return index === 0 ? "website" : `website${index + 1}`;
  }

  private safeHost(value: string) {
    try {
      return new URL(this.gatewayUrl(value) ?? value).hostname;
    } catch {
      return undefined;
    }
  }

  private clampConfidence(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
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

  private sanitizedProviderFailure(provider: string, code: HeliusErrorCode, error: unknown) {
    return `${provider} ${code}: ${this.sanitizeErrorMessage(this.exceptionMessage(error))}`;
  }

  private sanitizeErrorMessage(message: string) {
    if (/SASL: SCRAM-SERVER-FIRST-MESSAGE|client password must be a string/i.test(message)) return "DATABASE_URL password missing or malformed.";
    if (/self-signed certificate in certificate chain|unable to verify the first certificate/i.test(message)) return "Database TLS certificate could not be verified. Use sslmode=require with DATABASE_SSL_NO_VERIFY=true only for trusted self-signed environments, or configure a valid sslrootcert.";
    if (/Invalid `?prisma\.\w+\.\w+\(\)`? invocation/i.test(message)) return "Database write failed. Check DATABASE_URL, TLS settings, and migration status.";
    return message.replace(/api-key=[^&\s]+/gi, "api-key=...").replace(/password=[^&\s]+/gi, "password=...").slice(0, 240);
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
}
