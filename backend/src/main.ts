import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { HttpAdapterHost } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DatabaseExceptionFilter } from "./db/database-exception.filter";
import { loadLocalEnv } from "./env/load-local-env";
import { validateStartupEnvironment } from "./env/startup-validation";

async function bootstrap() {
  loadLocalEnv();
  validateStartupEnvironment();
  const app = await NestFactory.create(AppModule, {
    logger: process.env.PHEW_SILENT_LOGS === "true" ? false : undefined
  });
  app.useGlobalFilters(new DatabaseExceptionFilter(app.get(HttpAdapterHost)));
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
}

void bootstrap();
