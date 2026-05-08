export type HeliusNetwork = "devnet" | "mainnet";
export type HeliusKeySource = "key-only" | "extracted-from-url" | "missing";
export type HeliusErrorCode =
  | "HELIUS_AUTH_FAILED"
  | "HELIUS_CONFIG_INVALID"
  | "HELIUS_RATE_LIMITED"
  | "TOKEN_METADATA_INCOMPLETE"
  | "TOKEN_NOT_INDEXED"
  | "NETWORK_MISMATCH_DEVNET_MAINNET"
  | "HELIUS_UNREACHABLE"
  | "HELIUS_RPC_ERROR"
  | "HELIUS_ERROR";

export type HeliusConfig = {
  heliusApiKey?: string;
  heliusRpcUrl?: string;
  network: HeliusNetwork;
  heliusKeySource: HeliusKeySource;
  heliusRpcUrlHost?: string;
  warnings: string[];
  errorCode?: Extract<HeliusErrorCode, "HELIUS_CONFIG_INVALID" | "NETWORK_MISMATCH_DEVNET_MAINNET">;
  errorMessage?: string;
};

export type HeliusDiagnostics = {
  heliusKeyPresent: boolean;
  heliusKeySource: HeliusKeySource;
  heliusRpcUrlHost?: string;
  heliusNetwork: HeliusNetwork;
  heliusReachable: boolean;
  lastHeliusErrorCode?: string;
  warnings: string[];
};

let lastHeliusErrorCode: HeliusErrorCode | undefined;

export function setLastHeliusErrorCode(code?: HeliusErrorCode) {
  lastHeliusErrorCode = code;
}

export function getLastHeliusErrorCode() {
  return lastHeliusErrorCode;
}

export function normalizeHeliusConfig(env: NodeJS.ProcessEnv = process.env): HeliusConfig {
  const warnings: string[] = [];
  const clusterNetwork = networkFromCluster(env.NEXT_PUBLIC_SOLANA_NETWORK ?? env.SOLANA_CLUSTER);
  const rpcNetwork = networkFromUrl(env.SOLANA_RPC_URL ?? env.ANCHOR_PROVIDER_URL ?? env.NEXT_PUBLIC_SOLANA_RPC_URL);
  const explicitNetwork = clusterNetwork ?? rpcNetwork ?? "devnet";
  const candidateUrl = firstString(env.HELIUS_RPC_URL, env.HELIUS_API_KEY?.startsWith("http") ? env.HELIUS_API_KEY : undefined, isHeliusUrl(env.SOLANA_RPC_URL) ? env.SOLANA_RPC_URL : undefined);
  const urlNetwork = networkFromUrl(candidateUrl);
  const network = urlNetwork ?? explicitNetwork;

  let apiKey: string | undefined;
  let keySource: HeliusKeySource = "missing";

  if (env.HELIUS_API_KEY?.trim()) {
    const raw = env.HELIUS_API_KEY.trim();
    if (/^https?:\/\//i.test(raw)) {
      const parsed = parseApiKeyFromUrl(raw);
      if (parsed?.key) {
        apiKey = parsed.key;
        keySource = "extracted-from-url";
        warnings.push("HELIUS_API_KEY should contain key only; extracted api-key from URL");
      }
    } else {
      apiKey = raw;
      keySource = "key-only";
    }
  }

  if (!apiKey) {
    const parsed = parseApiKeyFromUrl(env.HELIUS_RPC_URL) ?? parseApiKeyFromUrl(env.SOLANA_RPC_URL);
    if (parsed?.key) {
      apiKey = parsed.key;
      keySource = "extracted-from-url";
    }
  }

  const heliusRpcUrl = apiKey ? heliusRpcUrlForNetwork(network, apiKey) : undefined;
  const heliusRpcUrlHost = hostFromUrl(heliusRpcUrl ?? candidateUrl);

  if (!apiKey) {
    return {
      network,
      heliusKeySource: keySource,
      heliusRpcUrl,
      heliusRpcUrlHost,
      warnings,
      errorCode: "HELIUS_CONFIG_INVALID",
      errorMessage: "HELIUS_CONFIG_INVALID: no api-key was found in HELIUS_API_KEY, HELIUS_RPC_URL, or SOLANA_RPC_URL."
    };
  }

  const mismatch = urlNetwork && explicitNetwork && urlNetwork !== explicitNetwork;
  if (mismatch) {
    return {
      heliusApiKey: apiKey,
      heliusRpcUrl,
      network,
      heliusKeySource: keySource,
      heliusRpcUrlHost,
      warnings,
      errorCode: "NETWORK_MISMATCH_DEVNET_MAINNET",
      errorMessage: `NETWORK_MISMATCH_DEVNET_MAINNET: Helius URL is ${urlNetwork} but configured Solana network is ${explicitNetwork}.`
    };
  }

  return {
    heliusApiKey: apiKey,
    heliusRpcUrl,
    network,
    heliusKeySource: keySource,
    heliusRpcUrlHost,
    warnings
  };
}

export function heliusRpcUrlForNetwork(network: HeliusNetwork, apiKey: string) {
  const host = network === "mainnet" ? "mainnet" : "devnet";
  const url = new URL(`https://${host}.helius-rpc.com/`);
  url.searchParams.set("api-key", apiKey);
  return url.toString();
}

export function heliusGetAssetBody(mint: string) {
  return {
    jsonrpc: "2.0",
    id: "token-scan",
    method: "getAsset",
    params: {
      id: mint,
      options: { showFungible: true }
    }
  };
}

export function heliusDiagnostics(config = normalizeHeliusConfig(), heliusReachable = false): HeliusDiagnostics {
  return {
    heliusKeyPresent: Boolean(config.heliusApiKey),
    heliusKeySource: config.heliusKeySource,
    heliusRpcUrlHost: config.heliusRpcUrlHost,
    heliusNetwork: config.network,
    heliusReachable,
    lastHeliusErrorCode: getLastHeliusErrorCode() ?? config.errorCode,
    warnings: config.warnings
  };
}

function parseApiKeyFromUrl(value?: string) {
  if (!value?.trim() || !/^https?:\/\//i.test(value.trim())) return undefined;
  try {
    const url = new URL(value.trim());
    const key = url.searchParams.get("api-key") ?? url.searchParams.get("api_key") ?? undefined;
    return { key: key?.trim() || undefined, url };
  } catch {
    return undefined;
  }
}

function networkFromUrl(value?: string): HeliusNetwork | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (/mainnet/i.test(url.hostname)) return "mainnet";
    if (/devnet/i.test(url.hostname)) return "devnet";
    return undefined;
  } catch {
    return /mainnet/i.test(value) ? "mainnet" : /devnet/i.test(value) ? "devnet" : undefined;
  }
}

function networkFromCluster(value?: string): HeliusNetwork | undefined {
  const normalized = value?.toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes("mainnet")) return "mainnet";
  if (normalized.includes("devnet")) return "devnet";
  return undefined;
}

function hostFromUrl(value?: string) {
  if (!value) return undefined;
  try {
    return new URL(value).hostname;
  } catch {
    return undefined;
  }
}

function isHeliusUrl(value?: string) {
  if (!value) return false;
  try {
    return /helius-rpc\.com$/i.test(new URL(value).hostname);
  } catch {
    return false;
  }
}

function firstString(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}
