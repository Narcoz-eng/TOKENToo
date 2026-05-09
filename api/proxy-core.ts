export type ApiQuery = Record<string, string | string[] | undefined>;

export type BackendResolution = {
  url: URL;
  source: string;
};

export type IncomingApiRequest = {
  forwardedPath: string;
  search: string;
};

const BACKEND_URL_ENV_KEYS = ["BACKEND_URL", "API_BACKEND_URL", "NEXT_PRIVATE_BACKEND_URL"] as const;
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

export function resolveBackendBaseUrl(env: Record<string, string | undefined> = process.env): BackendResolution | null {
  const selected = firstConfiguredBackendUrl(env);
  if (!selected) return null;

  let url: URL;
  try {
    url = new URL(selected.value);
  } catch {
    throw new ProxyFailure("INVALID_BACKEND_URL", `${selected.source} is not a valid URL.`, 500, undefined, "TypeError");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ProxyFailure("INVALID_BACKEND_PROTOCOL", `${selected.source} must use http or https.`, 500, undefined, "TypeError");
  }

  url.pathname = normalizeBasePath(url.pathname);
  return { url, source: selected.source };
}

export function normalizeIncomingRequest(url?: string, query?: ApiQuery): IncomingApiRequest {
  const parsed = new URL(url ?? "/", "http://localhost");
  const routeFileRequest = parsed.pathname.includes("[...path].ts") || parsed.pathname.toLowerCase().includes("%5b...path%5d.ts");
  const queryPath = catchAllPathValue(query?.path);
  const forwardedPath = routeFileRequest && queryPath ? queryPath : normalizeForwardedPath(parsed.pathname.replace(/^\/api(?=\/|$)/, ""));
  const searchParams = new URLSearchParams(parsed.search);

  if (routeFileRequest) searchParams.delete("path");
  return {
    forwardedPath,
    search: searchParams.toString() ? `?${searchParams.toString()}` : ""
  };
}

export function buildTargetUrl(base: URL, forwardedPath: string, search = "") {
  const target = new URL(base.toString());
  target.pathname = joinUrlPath(base.pathname, forwardedPath);
  target.search = search ? (search.startsWith("?") ? search : `?${search}`) : "";
  return target;
}

export function forwardedHeaders(headers: Record<string, string | string[] | undefined> | undefined, requestId: string) {
  const forwarded = new Headers();
  for (const [key, value] of Object.entries(headers ?? {})) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) continue;
    if (Array.isArray(value)) forwarded.set(key, value.join(","));
    else if (value !== undefined) forwarded.set(key, value);
  }
  forwarded.set("x-request-id", requestId);
  return forwarded;
}

export function methodAllowsBody(method?: string) {
  return !["GET", "HEAD"].includes((method ?? "GET").toUpperCase());
}

export function classifyProxyError(error: unknown) {
  if (error instanceof ProxyFailure) return error;
  const message = error instanceof Error ? error.message : String(error);
  const errorClass = errorClassFrom(error);
  const cause = error instanceof Error ? (error as Error & { cause?: { code?: string } }).cause : undefined;
  const code = cause?.code ?? (error instanceof Error ? (error as Error & { code?: string }).code : undefined);

  if (message.includes("embedded_bootstrap_timeout")) return new ProxyFailure("EMBEDDED_BOOT_TIMEOUT", "The embedded backend bootstrap timed out.", 504, message, errorClass);
  if (/startup validation failed/i.test(message)) return new ProxyFailure("BACKEND_STARTUP_VALIDATION_FAILED", "The embedded backend failed startup validation.", 503, message, errorClass);
  if (message.includes("upstream_timeout") || (error instanceof DOMException && error.name === "AbortError")) return new ProxyFailure("UPSTREAM_TIMEOUT", "The backend request timed out before a controller handled it.", 504, message, errorClass);
  if (/body is unusable|body stream/i.test(message)) return new ProxyFailure("REQUEST_BODY_UNAVAILABLE", "The request body could not be forwarded because it was already read.", 400, message, errorClass);
  if (/invalid header|invalid character|headers/i.test(message)) return new ProxyFailure("INVALID_PROXY_HEADERS", "The API proxy received headers that cannot be forwarded upstream.", 400, message, errorClass);
  if (code === "ECONNREFUSED") return new ProxyFailure("BACKEND_CONNECTION_REFUSED", "The backend process is not accepting connections.", 502, message, errorClass);
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return new ProxyFailure("BACKEND_DNS_FAILURE", "The backend hostname could not be resolved.", 502, message, errorClass);
  return new ProxyFailure("API_ROUTE_PREPARATION_FAILED", "The API proxy could not prepare the backend request.", 500, message, errorClass);
}

export function timeoutMs(env: Record<string, string | undefined> = process.env) {
  const value = Number(env.API_PROXY_TIMEOUT_MS ?? env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 12_000);
  return Number.isFinite(value) && value > 0 ? value : 12_000;
}

export function sanitizeTarget(target: URL) {
  const clone = new URL(target.toString());
  if (clone.search) clone.search = "?...";
  return clone.toString();
}

export function targetHost(target: URL) {
  return target.host;
}

export function errorClassFrom(error: unknown) {
  return error instanceof Error ? error.name : typeof error;
}

export class ProxyFailure extends Error {
  constructor(readonly code: string, message: string, readonly status: number, readonly detail?: string, readonly errorClass?: string) {
    super(message);
    this.name = "ProxyFailure";
  }
}

function firstConfiguredBackendUrl(env: Record<string, string | undefined>) {
  for (const key of BACKEND_URL_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value) return { source: key, value };
  }
  return null;
}

function catchAllPathValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return normalizeForwardedPath(value.join("/"));
  if (typeof value === "string" && value.trim()) return normalizeForwardedPath(value);
  return null;
}

function normalizeBasePath(pathname: string) {
  const normalized = pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  return normalized || "/";
}

function normalizeForwardedPath(path: string) {
  const withoutQuery = path.split("?")[0] ?? "";
  const normalized = withoutQuery.replace(/^\/+/, "").replace(/\/{2,}/g, "/");
  return normalized ? `/${normalized}` : "/";
}

function joinUrlPath(basePath: string, forwardedPath: string) {
  const base = normalizeBasePath(basePath);
  const forwarded = normalizeForwardedPath(forwardedPath);
  return `${base === "/" ? "" : base}${forwarded}`.replace(/\/{2,}/g, "/") || "/";
}
