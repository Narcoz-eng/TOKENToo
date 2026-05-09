import { NextRequest } from "next/server";
import {
  ProxyFailure,
  RouteContext,
  allowsBody,
  classify,
  errorClassFrom,
  forwardedHeaders,
  resolveBackendTarget,
  resolveForwardedPath,
  sanitizeTarget,
  targetHost,
  timeoutMs
} from "./proxy-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, context: RouteContext) {
  const startedAt = Date.now();
  const requestId = request.headers.get("x-request-id") ?? `next_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const trace: ProxyTrace = {
    requestId,
    stage: "received",
    mode: "next_route_proxy",
    forwardedPath: "/",
    startedAt
  };

  let target: URL;
  try {
    trace.stage = "resolve_route_params";
    trace.forwardedPath = await resolveForwardedPath(context);
    trace.stage = "resolve_backend_url";
    const resolved = resolveBackendTarget(trace.forwardedPath, request.nextUrl.search);
    target = resolved.target;
    trace.backendUrlSource = resolved.source;
    trace.target = sanitizeTarget(target);
    trace.targetHost = targetHost(target);
  } catch (error) {
    logProxyFailure("resolve_backend_url", error, trace, startedAt);
    return jsonError(classify(error), trace, startedAt);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs());
  try {
    trace.stage = "prepare_headers";
    const headers = forwardedHeaders(request.headers, requestId);
    trace.stage = "read_request_body";
    const body = allowsBody(request.method) ? await request.arrayBuffer() : undefined;
    trace.stage = "fetch_upstream";
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
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

function jsonError(error: ProxyFailure, trace: ProxyTrace, startedAt: number) {
  const elapsedMs = Date.now() - startedAt;
  trace.preparationErrorClass = error.errorClass ?? trace.preparationErrorClass;
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
        targetHost: trace.targetHost,
        backendUrlSource: trace.backendUrlSource,
        preparationErrorClass: trace.preparationErrorClass,
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
  trace.preparationErrorClass = errorClassFrom(error);
  const detail = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack?.split("\n").slice(0, 4).join("\n") } : { message: String(error) };
  console.error(
    "[next-api-proxy] failure",
    JSON.stringify({
      scope,
      requestId: trace.requestId,
      stage: trace.stage,
      forwardedPath: trace.forwardedPath,
      target: trace.target,
      targetHost: trace.targetHost,
      backendUrlSource: trace.backendUrlSource,
      preparationErrorClass: trace.preparationErrorClass,
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
      targetHost: trace.targetHost,
      backendUrlSource: trace.backendUrlSource,
      preparationErrorClass: trace.preparationErrorClass,
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

type ProxyTrace = {
  requestId: string;
  stage: string;
  mode: "next_route_proxy";
  forwardedPath: string;
  startedAt: number;
  target?: string;
  targetHost?: string;
  backendUrlSource?: string;
  preparationErrorClass?: string;
  status?: number;
  contentType?: string;
};
