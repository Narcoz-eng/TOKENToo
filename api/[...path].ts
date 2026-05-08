import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { HttpAdapterHost } from "@nestjs/core";
import { AppModule } from "../backend/src/app.module";
import { DatabaseExceptionFilter } from "../backend/src/db/database-exception.filter";
import { loadLocalEnv } from "../backend/src/env/load-local-env";
import { validateStartupEnvironment } from "../backend/src/env/startup-validation";

let server: ((request: unknown, response: unknown) => void) | undefined;

async function getServer() {
  if (server) return server;

  loadLocalEnv();
  validateStartupEnvironment();
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn"] });
  app.useGlobalFilters(new DatabaseExceptionFilter(app.get(HttpAdapterHost)));
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? true
  });
  await app.init();
  server = app.getHttpAdapter().getInstance();
  return server as (request: unknown, response: unknown) => void;
}

export default async function handler(request: { url?: string; headers?: Record<string, string | string[] | undefined> }, response: any) {
  const requestId = requestIdFrom(request);
  try {
    request.url = request.url?.replace(/^\/api/, "") || "/";
    response.setHeader?.("x-request-id", requestId);
    const instance = await withTimeout(getServer(), 10_000);
    return instance(request, response);
  } catch (error) {
    response.status?.(500).json?.({
      ok: false,
      success: false,
      requestId,
      error: {
        code: "API_ROUTE_FAILED",
        message: "The API route failed before the backend could handle the request.",
        details: process.env.NODE_ENV === "production" ? undefined : error instanceof Error ? error.message : String(error)
      }
    });
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("API route bootstrap timed out.")), ms))
  ]);
}

function requestIdFrom(request: { headers?: Record<string, string | string[] | undefined> }) {
  const header = request.headers?.["x-request-id"];
  return (Array.isArray(header) ? header[0] : header) ?? `proxy_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
