import { defineConfig } from "prisma/config";
import { config } from "dotenv";
import { migrationDatabaseUrl } from "./src/db/database-url";

config({ path: "../.env.local", quiet: true });
config({ path: "../.env", quiet: true });
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Prisma CLI and migrations use the same sanitized URL selection/TLS
    // normalization as runtime code, preferring direct/non-pooled URLs.
    url: migrationDatabaseUrl()
  }
});
