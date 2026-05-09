export const DEFAULT_DEV_BACKEND = "http://127.0.0.1:4000";

export type RouteParams = {
  path?: string[] | string;
};

export type RouteContext = {
  params?: Promise<RouteParams> | RouteParams;
};

export type BackendTarget = {
  target: URL;
  source: string;
};

const SERVER_BACKEND_ENV_KEYS = ["BACKEND_URL", "API_BACKEND_URL", "NEXT_PRIVATE_BACKEND_URL"] as const;
const PUBLIC_BACKEND_ENV_KEYS = ["NEXT_PUBLIC_API_BASE_URL", "NEXT_PUBLIC_API_URL"] as const;
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

export async function resolveForwardedPath(context: RouteContext) {
  const params = await context.params;
  const rawPath = params?.path ?? [];
  if (Array.isArray(rawPath)) return normalizeForwardedPath(rawPath.join("/"));
  if (typeof rawPath === "string") return normalizeForwardedPath(rawPath);
  throw new ProxyFailure("INVALID_ROUTE_PARAMS", "The API route received invalid path params.", 500, undefined, "TypeError");
}

export function resolveBackendTarget(path: string, search: string, env: Record<string, string | undefined> = process.env, nodeEnv = process.env.NODE_ENV): BackendTarget {
  const selected = firstConfiguredBackendUrl(env, nodeEnv);
  if (!selected) throw new ProxyFailure("MISSING_BACKEND_URL", "A backend URL is required for the frontend API proxy.", 500, undefined, "TypeError");

  let target: URL;
  try {
    target = new URL(selected.value);
  } catch {
    throw new ProxyFailure("INVALID_BACKEND_URL", `${selected.source} is not a valid URL.`, 500, undefined, "TypeError");
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new ProxyFailure("INVALID_BACKEND_PROTOCOL", `${selected.source} must use http or https.`, 500, undefined, "TypeError");
  }

  target.pathname = joinUrlPath(target.pathname, path);
  target.search = search;
  return { target, source: selected.source };
}

export function forwardedHeaders(headers: Headers, requestId: string) {
  const forwarded = new Headers();
  for (const [key, value] of headers.entries()) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue;
    forwarded.set(key, value);
  }
  forwarded.set("x-request-id", requestId);
  return forwarded;
}

export function allowsBody(method: string) {
  return !["GET", "HEAD"].includes(method.toUpperCase());
}

export function classify(error: unknown) {
  if (error instanceof ProxyFailure) return error;
  const message = error instanceof Error ? error.message : String(error);
  const errorClass = errorClassFrom(error);
  const cause = error instanceof Error ? (error as Error & { cause?: { code?: string } }).cause : undefined;
  const code = cause?.code ?? (error instanceof Error ? (error as Error & { code?: string }).code : undefined);

  if (/startup validation failed/i.test(message)) return new ProxyFailure("BACKEND_STARTUP_VALIDATION_FAILED", "The embedded backend failed startup validation.", 503, message, errorClass);
  if (error instanceof DOMException && error.name === "AbortError") return new ProxyFailure("UPSTREAM_TIMEOUT", "The backend request timed out before a controller handled it.", 504, message, errorClass);
  if (/body is unusable|body stream/i.test(message)) return new ProxyFailure("REQUEST_BODY_UNAVAILABLE", "The request body could not be forwarded because it was already read.", 400, message, errorClass);
  if (/invalid header|invalid character|headers/i.test(message)) return new ProxyFailure("INVALID_PROXY_HEADERS", "The API proxy received headers that cannot be forwarded upstream.", 400, message, errorClass);
  if (code === "ECONNREFUSED") return new ProxyFailure("BACKEND_CONNECTION_REFUSED", "The backend process is not accepting connections.", 502, message, errorClass);
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return new ProxyFailure("BACKEND_DNS_FAILURE", "The backend hostname could not be resolved.", 502, message, errorClass);
  return new ProxyFailure("API_PROXY_PREPARATION_FAILED", "The API proxy could not prepare the backend request.", 500, message, errorClass);
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

function firstConfiguredBackendUrl(env: Record<string, string | undefined>, nodeEnv: string | undefined) {
  for (const key of SERVER_BACKEND_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value) return { source: key, value };
  }

  for (const key of PUBLIC_BACKEND_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value && /^[a-z][a-z\d+\-.]*:\/\//i.test(value)) return { source: key, value };
  }

  if (nodeEnv !== "production") return { source: "dev-default", value: DEFAULT_DEV_BACKEND };
  return null;
}

function normalizeForwardedPath(path: string) {
  const withoutQuery = path.split("?")[0] ?? "";
  const normalized = withoutQuery.replace(/^\/+/, "").replace(/\/{2,}/g, "/");
  return normalized ? `/${normalized}` : "/";
}

function normalizeBasePath(pathname: string) {
  const normalized = pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  return normalized || "/";
}

function joinUrlPath(basePath: string, forwardedPath: string) {
  const base = normalizeBasePath(basePath);
  const forwarded = normalizeForwardedPath(forwardedPath);
  return `${base === "/" ? "" : base}${forwarded}`.replace(/\/{2,}/g, "/") || "/";
}
