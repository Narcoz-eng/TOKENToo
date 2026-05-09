import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { HttpAdapterHost } from "@nestjs/core";
import { AppModule } from "../backend/src/app.module";
import { DatabaseExceptionFilter } from "../backend/src/db/database-exception.filter";
import { loadLocalEnv } from "../backend/src/env/load-local-env";
import { validateStartupEnvironment } from "../backend/src/env/startup-validation";
import { recordStartupComplete, recordStartupFailure, recordStartupModules, startupState } from "../backend/src/env/startup-state";
import {
  ProxyFailure,
  buildTargetUrl,
  classifyProxyError,
  errorClassFrom,
  forwardedHeaders,
  methodAllowsBody,
  normalizeIncomingRequest,
  resolveBackendBaseUrl,
  sanitizeTarget,
  targetHost,
  timeoutMs
} from "./proxy-core";

export const config = {
  api: {
    bodyParser: false
  }
};

type ApiRequest = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[]>;
  on?: (event: string, callback: (chunk?: Buffer) => void) => void;
};

type ApiResponse = {
  status?: (status: number) => ApiResponse;
  json?: (body: unknown) => void;
  setHeader?: (name: string, value: string) => void;
  end?: (body?: unknown) => void;
};

let server: ((request: unknown, response: unknown) => void) | undefined;
let bootPromise: Promise<(request: unknown, response: unknown) => void> | undefined;

async function getServer(trace: ProxyTrace) {
  if (server) return server;
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    try {
      trace.stage = "load_env";
      loadLocalEnv();
      trace.stage = "validate_env";
      validateStartupEnvironment();
      recordStartupModules(["AuthModule", "GeneratorModule", "VaultMintModule", "ProductDataModule", "SystemController"]);
      trace.stage = "create_nest_app";
      const app = await NestFactory.create(AppModule, { logger: ["error", "warn"] });
      app.useGlobalFilters(new DatabaseExceptionFilter(app.get(HttpAdapterHost)));
      app.use((request: any, response: any, next: () => void) => {
        const requestId = request.headers?.["x-request-id"] ?? trace.requestId;
        request.headers["x-request-id"] = requestId;
        response.setHeader?.("x-request-id", requestId);
        next();
      });
      app.enableCors({
        origin: process.env.FRONTEND_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? true
      });
      trace.stage = "init_nest_app";
      await app.init();
      recordStartupComplete();
      server = app.getHttpAdapter().getInstance();
      trace.stage = "embedded_ready";
      return server as (request: unknown, response: unknown) => void;
    } catch (error) {
      recordStartupFailure(error);
      bootPromise = undefined;
      logProxyFailure("embedded_boot", error, trace, trace.startedAt);
      throw error;
    }
  })();

  return bootPromise;
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const startedAt = Date.now();
  const requestId = requestIdFrom(request);
  const incoming = normalizeIncomingRequest(request.url, request.query);
  const trace: ProxyTrace = {
    requestId,
    stage: "received",
    incomingUrl: request.url ?? "/api",
    forwardedPath: incoming.forwardedPath,
    mode: "embedded",
    startedAt
  };
  response.setHeader?.("x-request-id", requestId);

  let backendBase: ReturnType<typeof resolveBackendBaseUrl>;
  try {
    trace.stage = "resolve_backend_url";
    backendBase = resolveBackendBaseUrl();
    trace.backendUrlSource = backendBase?.source ?? "embedded";
  } catch (error) {
    logProxyFailure("resolve_backend_url", error, trace, startedAt);
    return writeProxyError(response, classifyProxyError(error), trace, startedAt);
  }

  if (backendBase) {
    trace.mode = "upstream";
    const target = buildTargetUrl(backendBase.url, incoming.forwardedPath, incoming.search);
    trace.target = sanitizeTarget(target);
    trace.targetHost = targetHost(target);
    try {
      await proxyToBackend(request, response, target, requestId, trace);
      return;
    } catch (error) {
      logProxyFailure("upstream", error, trace, startedAt);
      return writeProxyError(response, classifyProxyError(error), trace, startedAt);
    }
  }

  try {
    trace.stage = "rewrite_for_embedded";
    request.url = incoming.forwardedPath || "/";
    const instance = await withTimeout(getServer(trace), timeoutMs(), "embedded_bootstrap_timeout");
    trace.stage = "dispatch_embedded";
    return instance(request, response);
  } catch (error) {
    logProxyFailure("embedded", error, trace, startedAt);
    return writeProxyError(response, classifyProxyError(error), trace, startedAt);
  }
}

async function proxyToBackend(request: ApiRequest, response: ApiResponse, target: URL, requestId: string, trace: ProxyTrace) {
  trace.stage = "read_request_body";
  const body = await requestBody(request);
  trace.stage = "prepare_headers";
  const headers = forwardedHeaders(request.headers, requestId);
  trace.stage = "fetch_upstream";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("upstream_timeout")), timeoutMs());
  try {
    const upstream = await fetch(target, {
      method: request.method ?? "GET",
      headers,
      body: methodAllowsBody(request.method) ? (body as unknown as BodyInit) : undefined,
      signal: controller.signal,
      redirect: "manual"
    });
    trace.stage = "upstream_response";
    trace.status = upstream.status;
    trace.contentType = upstream.headers.get("content-type") ?? undefined;
    response.status?.(upstream.status);
    response.setHeader?.("x-request-id", upstream.headers.get("x-request-id") ?? requestId);
    response.setHeader?.("content-type", trace.contentType ?? "application/json; charset=utf-8");
    response.setHeader?.("x-upstream-target", trace.target ?? "");
    response.setHeader?.("x-upstream-timing-ms", String(Date.now() - trace.startedAt));
    const raw = await upstream.text();
    if (looksLikeHtml(trace.contentType ?? "", raw)) {
      response.status?.(upstream.ok ? 502 : upstream.status);
      response.end?.(JSON.stringify(errorBody("UPSTREAM_HTML_RESPONSE", "The backend returned HTML instead of API data.", trace, Date.now() - trace.startedAt)));
      return;
    }
    response.end?.(raw);
  } finally {
    clearTimeout(timeout);
  }
}

function requestBody(request: ApiRequest) {
  if (!methodAllowsBody(request.method) || !request.on) return undefined;
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on?.("data", (chunk?: Buffer) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on?.("end", () => resolve(Buffer.concat(chunks)));
    request.on?.("error", (error?: unknown) => reject(error));
  });
}

function writeProxyError(response: ApiResponse, error: ProxyFailure, trace: ProxyTrace, startedAt: number) {
  const elapsedMs = Date.now() - startedAt;
  trace.preparationErrorClass = error.errorClass ?? trace.preparationErrorClass;
  logStructuredProxyError(error, trace, elapsedMs);
  response.status?.(error.status);
  response.setHeader?.("content-type", "application/json; charset=utf-8");
  response.setHeader?.("x-request-id", trace.requestId);
  response.end?.(JSON.stringify(errorBody(error.code, error.message, trace, elapsedMs, error.detail)));
}

function errorBody(code: string, message: string, trace: ProxyTrace, elapsedMs: number, detail?: string) {
  return {
    ok: false,
    success: false,
    requestId: trace.requestId,
    error: {
      code,
      message,
      details: process.env.NODE_ENV === "production" ? undefined : detail
    },
    trace: {
      requestId: trace.requestId,
      mode: trace.mode,
      stage: trace.stage,
      incomingUrl: trace.incomingUrl,
      forwardedPath: trace.forwardedPath,
      target: trace.target,
      targetHost: trace.targetHost,
      backendUrlSource: trace.backendUrlSource,
      preparationErrorClass: trace.preparationErrorClass,
      status: trace.status,
      contentType: trace.contentType,
      elapsedMs,
      boot: trace.mode === "embedded" ? startupState() : undefined
    }
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, code: string) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(code)), ms))
  ]);
}

function requestIdFrom(request: ApiRequest) {
  const header = request.headers?.["x-request-id"];
  return (Array.isArray(header) ? header[0] : header) ?? `proxy_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function logProxyFailure(scope: string, error: unknown, trace: ProxyTrace, startedAt: number) {
  const elapsedMs = Date.now() - startedAt;
  trace.preparationErrorClass = errorClassFrom(error);
  const detail = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack?.split("\n").slice(0, 4).join("\n") } : { message: String(error) };
  console.error(
    "[api-proxy] failure",
    JSON.stringify({
      scope,
      requestId: trace.requestId,
      stage: trace.stage,
      incomingUrl: trace.incomingUrl,
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
    "[api-proxy] response",
    JSON.stringify({
      requestId: trace.requestId,
      code: error.code,
      status: error.status,
      stage: trace.stage,
      mode: trace.mode,
      incomingUrl: trace.incomingUrl,
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
  incomingUrl: string;
  forwardedPath: string;
  mode: "embedded" | "upstream";
  startedAt: number;
  target?: string;
  targetHost?: string;
  backendUrlSource?: string;
  preparationErrorClass?: string;
  status?: number;
  contentType?: string;
};
