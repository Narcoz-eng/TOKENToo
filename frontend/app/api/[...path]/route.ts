import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_DEV_BACKEND = "http://127.0.0.1:4000";

async function proxy(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const startedAt = Date.now();
  const requestId = request.headers.get("x-request-id") ?? `next_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const { path = [] } = await context.params;
  const forwardedPath = `/${path.join("/")}`;
  const trace: ProxyTrace = {
    requestId,
    stage: "received",
    mode: "next_route_proxy",
    forwardedPath,
    startedAt
  };

  let target: URL;
  try {
    trace.stage = "resolve_backend_url";
    target = targetUrl(forwardedPath, request.nextUrl.search);
    trace.target = sanitizeTarget(target);
  } catch (error) {
    logProxyFailure("resolve_backend_url", error, trace, startedAt);
    return jsonError(classify(error), trace, startedAt);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs());
  try {
    trace.stage = "fetch_upstream";
    const upstream = await fetch(target, {
      method: request.method,
      headers: forwardedHeaders(request.headers, requestId),
      body: allowsBody(request.method) ? await request.arrayBuffer() : undefined,
      signal: controller.signal,
      redirect: "manual"
    });
    trace.stage = "upstream_response";
    trace.status = upstream.status;
    trace.contentType = upstream.headers.get("content-type") ?? undefined;
    const raw = await upstream.text();
    if (looksLikeHtml(trace.contentType ?? "", raw)) {
      return jsonError(new ProxyFailure("UPSTREAM_HTML_RESPONSE", "The backend returned HTML instead of API data.", upstream.ok ? 502 : upstream.status), trace, startedAt);
    }
    return new Response(raw, {
      status: upstream.status,
      headers: {
        "content-type": trace.contentType ?? "application/json; charset=utf-8",
        "x-request-id": upstream.headers.get("x-request-id") ?? requestId,
        "x-upstream-target": trace.target ?? "",
        "x-upstream-timing-ms": String(Date.now() - startedAt)
      }
    });
  } catch (error) {
    logProxyFailure("upstream", error, trace, startedAt);
    return jsonError(classify(error), trace, startedAt);
  } finally {
    clearTimeout(timeout);
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

function targetUrl(path: string, search: string) {
  const base = process.env.BACKEND_URL ?? process.env.API_BACKEND_URL ?? (process.env.NODE_ENV !== "production" ? DEFAULT_DEV_BACKEND : "");
  if (!base) throw new ProxyFailure("MISSING_BACKEND_URL", "BACKEND_URL is required for the frontend API proxy.", 500);
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new ProxyFailure("INVALID_BACKEND_URL", "BACKEND_URL is not a valid URL.", 500);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new ProxyFailure("INVALID_BACKEND_PROTOCOL", "BACKEND_URL must use http or https.", 500);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}${path}`.replace(/\/{2,}/g, "/");
  url.search = search;
  return url;
}

function forwardedHeaders(headers: Headers, requestId: string) {
  const forwarded = new Headers(headers);
  forwarded.set("x-request-id", requestId);
  forwarded.delete("host");
  forwarded.delete("content-length");
  return forwarded;
}

function allowsBody(method: string) {
  return !["GET", "HEAD"].includes(method.toUpperCase());
}

function timeoutMs() {
  return Number(process.env.API_PROXY_TIMEOUT_MS ?? process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 12_000);
}

function classify(error: unknown) {
  if (error instanceof ProxyFailure) return error;
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? (error as Error & { cause?: { code?: string } }).cause : undefined;
  const code = cause?.code;
  if (error instanceof DOMException && error.name === "AbortError") return new ProxyFailure("UPSTREAM_TIMEOUT", "The backend request timed out before a controller handled it.", 504, message);
  if (code === "ECONNREFUSED") return new ProxyFailure("BACKEND_CONNECTION_REFUSED", "The backend process is not accepting connections.", 502, message);
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return new ProxyFailure("BACKEND_DNS_FAILURE", "The backend hostname could not be resolved.", 502, message);
  return new ProxyFailure("API_PROXY_FAILED", "The frontend API proxy failed while preparing the backend request.", 500, message);
}

function jsonError(error: ProxyFailure, trace: ProxyTrace, startedAt: number) {
  const elapsedMs = Date.now() - startedAt;
  logStructuredProxyError(error, trace, elapsedMs);
  return Response.json(
    {
      ok: false,
      success: false,
      requestId: trace.requestId,
      error: {
        code: error.code,
        message: error.message,
        details: process.env.NODE_ENV === "production" ? undefined : error.detail
      },
      trace: {
        requestId: trace.requestId,
        mode: trace.mode,
        stage: trace.stage,
        forwardedPath: trace.forwardedPath,
        target: trace.target,
        status: trace.status,
        contentType: trace.contentType,
        elapsedMs
      }
    },
    {
      status: error.status,
      headers: { "x-request-id": trace.requestId }
    }
  );
}

function logProxyFailure(scope: string, error: unknown, trace: ProxyTrace, startedAt: number) {
  const elapsedMs = Date.now() - startedAt;
  const detail = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack?.split("\n").slice(0, 4).join("\n") } : { message: String(error) };
  console.error(
    "[next-api-proxy] failure",
    JSON.stringify({
      scope,
      requestId: trace.requestId,
      stage: trace.stage,
      forwardedPath: trace.forwardedPath,
      target: trace.target,
      status: trace.status,
      elapsedMs,
      error: detail
    })
  );
}

function logStructuredProxyError(error: ProxyFailure, trace: ProxyTrace, elapsedMs: number) {
  console.error(
    "[next-api-proxy] response",
    JSON.stringify({
      requestId: trace.requestId,
      code: error.code,
      status: error.status,
      stage: trace.stage,
      mode: trace.mode,
      forwardedPath: trace.forwardedPath,
      target: trace.target,
      upstreamStatus: trace.status,
      elapsedMs,
      detail: process.env.NODE_ENV === "production" ? undefined : error.detail
    })
  );
}

function looksLikeHtml(contentType: string, raw: string) {
  const lower = contentType.toLowerCase();
  const trimmed = raw.trim().slice(0, 256).toLowerCase();
  return lower.includes("text/html") || trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html") || trimmed.includes("<body");
}

function sanitizeTarget(target: URL) {
  const clone = new URL(target.toString());
  if (clone.search) clone.search = "?...";
  return clone.toString();
}

class ProxyFailure extends Error {
  constructor(readonly code: string, message: string, readonly status: number, readonly detail?: string) {
    super(message);
  }
}

type ProxyTrace = {
  requestId: string;
  stage: string;
  mode: "next_route_proxy";
  forwardedPath: string;
  startedAt: number;
  target?: string;
  status?: number;
  contentType?: string;
};
