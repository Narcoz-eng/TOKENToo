import { defineConfig } from "prisma/config";
import { config } from "dotenv";

config({ path: "../.env.local", quiet: true });
config({ path: "../.env", quiet: true });
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url:
      process.env.DIRECT_URL ??
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.DATABASE_URL ??
      process.env.POSTGRES_PRISMA_URL ??
      process.env.POSTGRES_URL ??
      "postgresql://postgres:postgres@localhost:5432/vaultx"
  }
});
