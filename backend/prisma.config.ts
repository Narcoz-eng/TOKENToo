import { defineConfig } from "prisma/config";
import { config } from "dotenv";

config({ path: "../.env.local", quiet: true });
config({ path: "../.env", quiet: true });
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Prisma CLI and migrations should prefer a direct/non-pooled URL.
    // Local founder mode may fall back to DATABASE_URL when DIRECT_URL is absent.
    url:
      process.env.DIRECT_URL ??
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.DATABASE_URL ??
      process.env.POSTGRES_PRISMA_URL ??
      process.env.POSTGRES_URL ??
      "postgresql://postgres:postgres@localhost:5432/phew_run"
  }
});
