import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../backend/src/app.module";
import { loadLocalEnv } from "../backend/src/env/load-local-env";
import { validateStartupEnvironment } from "../backend/src/env/startup-validation";

let server: ((request: unknown, response: unknown) => void) | undefined;

async function getServer() {
  if (server) return server;

  loadLocalEnv();
  validateStartupEnvironment();
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn"] });
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? true
  });
  await app.init();
  server = app.getHttpAdapter().getInstance();
  return server as (request: unknown, response: unknown) => void;
}

export default async function handler(request: { url?: string }, response: unknown) {
  request.url = request.url?.replace(/^\/api/, "") || "/";
  const instance = await getServer();
  return instance(request, response);
}
