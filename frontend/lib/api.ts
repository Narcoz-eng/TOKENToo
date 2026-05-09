export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 1_000_000;

export type ApiEnvelope<T> = {
  ok?: boolean;
  success?: boolean;
  data?: T;
  empty?: boolean;
  capabilities?: Record<string, boolean>;
  warnings?: string[];
};

export type ApiErrorKind = "network" | "backend_unavailable" | "invalid_json" | "html_response" | "auth" | "capability_disabled" | "timeout" | "http" | "too_large";

export type ApiErrorDiagnostics = {
  requestId: string;
  url: string;
  status?: number;
  contentType?: string;
  bodyPreview?: string;
  code?: string;
  endpointPath?: string;
  proxyStage?: string;
  targetHost?: string;
  backendUrlSource?: string;
  preparationErrorClass?: string;
  details?: unknown;
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly code: string;
  readonly requestId: string;
  readonly diagnostics: ApiErrorDiagnostics;

  constructor(input: { kind: ApiErrorKind; message: string; status?: number; code?: string; diagnostics: ApiErrorDiagnostics }) {
    super(sanitizeMessage(input.message));
    this.name = "ApiError";
    this.kind = input.kind;
    this.status = input.status;
    this.code = input.code ?? codeForKind(input.kind, input.status);
    this.requestId = input.diagnostics.requestId;
    this.diagnostics = input.diagnostics;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const requestId = requestIdFor(init.headers);
  const headers = new Headers(init.headers);
  headers.set("x-request-id", requestId);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");

  const response = await fetchWithTimeout(url, { ...init, headers }, requestId);
  const parsed = await parseApiResponse<T>(response, url, requestId);
  if (!response.ok) throw apiErrorFromParsed(response, url, requestId, parsed);
  return parsed.value as T;
}

export function unwrapApiData<T>(value: T | ApiEnvelope<T> | null): T | null {
  if (!value || typeof value !== "object") return value as T | null;
  if (("ok" in value || "success" in value) && "data" in value) return (value as ApiEnvelope<T>).data ?? null;
  return value as T;
}

export function apiWarnings(value: unknown): string[] {
  return value && typeof value === "object" && Array.isArray((value as ApiEnvelope<unknown>).warnings) ? ((value as ApiEnvelope<unknown>).warnings ?? []) : [];
}

export function apiCapabilities(value: unknown): Record<string, boolean> | undefined {
  return value && typeof value === "object" ? ((value as ApiEnvelope<unknown>).capabilities as Record<string, boolean> | undefined) : undefined;
}

export async function safeErrorMessage(response: Response) {
  const requestId = response.headers.get("x-request-id") ?? createRequestId();
  try {
    const parsed = await parseApiResponse(response, response.url || "api request", requestId);
    return apiErrorFromParsed(response, response.url || "api request", requestId, parsed).message;
  } catch (error) {
    return error instanceof ApiError ? error.message : "The service returned an unreadable error response.";
  }
}

export function isDevMode() {
  return process.env.NODE_ENV !== "production";
}

async function fetchWithTimeout(url: string, init: RequestInit, requestId: string) {
  const controller = new AbortController();
  const timeoutMs = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: init.signal ?? controller.signal });
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    throw new ApiError({
      kind: aborted ? "timeout" : "network",
      message: aborted ? "The request timed out. Retry in a moment." : "The backend could not be reached.",
      diagnostics: { requestId, url, details: error instanceof Error ? error.message : String(error) }
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function parseApiResponse<T>(response: Response, url: string, requestId: string): Promise<{ value: T | unknown; raw: string; contentType: string }> {
  const contentType = response.headers.get("content-type") ?? "";
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new ApiError({
      kind: "too_large",
      status: response.status,
      message: "The backend returned a response that is too large to display safely.",
      diagnostics: { requestId, url, status: response.status, contentType }
    });
  }

  const raw = await response.text().catch(() => "");
  const preview = previewBody(raw);
  if (looksLikeHtml(contentType, raw)) {
    throw new ApiError({
      kind: "html_response",
      status: response.status,
      message: response.ok ? "The backend returned HTML instead of API data." : friendlyMessageForStatus(response.status, "The backend returned an HTML error page."),
      diagnostics: { requestId, url, status: response.status, contentType, bodyPreview: preview }
    });
  }
  if (!raw) return { value: null, raw, contentType };

  if (contentType && !contentType.toLowerCase().includes("json")) {
    if (!response.ok) {
      throw new ApiError({
        kind: "backend_unavailable",
        status: response.status,
        message: friendlyMessageForStatus(response.status, "The backend returned a non-JSON error response."),
        diagnostics: { requestId, url, status: response.status, contentType, bodyPreview: preview }
      });
    }
  }

  try {
    return { value: JSON.parse(raw), raw, contentType };
  } catch {
    throw new ApiError({
      kind: "invalid_json",
      status: response.status,
      message: response.ok ? "The backend returned malformed JSON." : friendlyMessageForStatus(response.status, "The backend returned an unreadable error response."),
      diagnostics: { requestId, url, status: response.status, contentType, bodyPreview: preview }
    });
  }
}

function apiErrorFromParsed(response: Response, url: string, requestId: string, parsed: { value: unknown; raw: string; contentType: string }) {
  const body = parsed.value;
  const errorRecord = extractErrorRecord(body);
  const code = errorRecord.code ?? codeForStatus(response.status);
  const kind = kindForStatus(response.status, code);
  return new ApiError({
    kind,
    status: response.status,
    code,
    message: errorRecord.message ?? friendlyMessageForStatus(response.status, "The request failed."),
    diagnostics: {
      requestId: response.headers.get("x-request-id") ?? requestId,
      url,
      status: response.status,
      contentType: parsed.contentType,
      code,
      endpointPath: endpointPathFrom(body, url),
      proxyStage: proxyStageFrom(body),
      targetHost: targetHostFrom(body, response.headers.get("x-upstream-target")),
      backendUrlSource: backendUrlSourceFrom(body),
      preparationErrorClass: preparationErrorClassFrom(body),
      details: errorRecord.details,
      bodyPreview: isDevMode() ? previewBody(parsed.raw) : undefined
    }
  });
}

function extractErrorRecord(body: unknown) {
  if (!body || typeof body !== "object") return {};
  const record = body as Record<string, unknown>;
  const nested = record.error && typeof record.error === "object" ? (record.error as Record<string, unknown>) : record;
  const messageValue = nested.message ?? record.message;
  return {
    code: typeof nested.code === "string" ? nested.code : typeof record.code === "string" ? record.code : undefined,
    message: Array.isArray(messageValue) ? messageValue.join("; ") : typeof messageValue === "string" ? messageValue : undefined,
    details: nested.details ?? record.details ?? nested.issues ?? record.issues
  };
}

function looksLikeHtml(contentType: string, raw: string) {
  const lower = contentType.toLowerCase();
  const trimmed = raw.trim().slice(0, 256).toLowerCase();
  return lower.includes("text/html") || trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html") || trimmed.includes("<body");
}

function sanitizeMessage(message: string) {
  if (/failed (?:before the backend could handle the request|while preparing the backend request)/i.test(message)) return "The API proxy returned a structured setup error.";
  if (looksLikeHtml("text/plain", message)) return "The backend returned an HTML error page instead of API data.";
  return message.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 500) || "The request failed.";
}

function traceRecord(body: unknown) {
  if (!body || typeof body !== "object") return {};
  const trace = (body as Record<string, unknown>).trace;
  return trace && typeof trace === "object" ? (trace as Record<string, unknown>) : {};
}

function endpointPathFrom(body: unknown, url: string) {
  const forwardedPath = traceRecord(body).forwardedPath;
  if (typeof forwardedPath === "string" && forwardedPath) return forwardedPath;
  try {
    const parsed = new URL(url, typeof window === "undefined" ? "http://localhost" : window.location.origin);
    return parsed.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  } catch {
    return url;
  }
}

function proxyStageFrom(body: unknown) {
  const stage = traceRecord(body).stage;
  return typeof stage === "string" ? stage : undefined;
}

function targetHostFrom(body: unknown, upstreamTarget?: string | null) {
  const target = traceRecord(body).target;
  const value = typeof target === "string" && target ? target : upstreamTarget ?? undefined;
  if (!value) return undefined;
  try {
    return new URL(value).host;
  } catch {
    return undefined;
  }
}

function backendUrlSourceFrom(body: unknown) {
  const source = traceRecord(body).backendUrlSource;
  return typeof source === "string" ? source : undefined;
}

function preparationErrorClassFrom(body: unknown) {
  const errorClass = traceRecord(body).preparationErrorClass;
  return typeof errorClass === "string" ? errorClass : undefined;
}

function previewBody(raw: string) {
  return raw.replace(/<script[\s\S]*?<\/script>/gi, "<script>...</script>").replace(/\s+/g, " ").trim().slice(0, 800);
}

function friendlyMessageForStatus(status: number, fallback: string) {
  if (status === 0) return "The backend could not be reached.";
  if (status === 401 || status === 403) return "Authentication is required for this request.";
  if (status === 404) return "The requested API endpoint was not found.";
  if (status === 408 || status === 504) return "The backend request timed out.";
  if (status >= 500) return "The backend is temporarily unavailable.";
  return fallback;
}

function kindForStatus(status: number, code?: string): ApiErrorKind {
  if (status === 401 || status === 403) return "auth";
  if (code === "CAPABILITY_DISABLED" || code === "PROVIDER_NOT_CONFIGURED" || code === "MISSING_ENV") return "capability_disabled";
  if (status === 404) return "http";
  if (status >= 500) return "backend_unavailable";
  return "http";
}

function codeForStatus(status: number) {
  if (status === 401 || status === 403) return "AUTH_REQUIRED";
  if (status === 404) return "NOT_FOUND";
  if (status === 408 || status === 504) return "TIMEOUT";
  if (status >= 500) return "BACKEND_UNAVAILABLE";
  return "REQUEST_FAILED";
}

function codeForKind(kind: ApiErrorKind, status?: number) {
  if (kind === "html_response") return "UPSTREAM_HTML_RESPONSE";
  if (kind === "invalid_json") return "INVALID_JSON";
  if (kind === "network") return "NETWORK_FAILURE";
  if (kind === "timeout") return "REQUEST_TIMEOUT";
  if (kind === "too_large") return "RESPONSE_TOO_LARGE";
  return status ? codeForStatus(status) : "REQUEST_FAILED";
}

function requestIdFor(headers?: HeadersInit) {
  const existing = headers ? new Headers(headers).get("x-request-id") : null;
  return existing ?? createRequestId();
}

function createRequestId() {
  return `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
