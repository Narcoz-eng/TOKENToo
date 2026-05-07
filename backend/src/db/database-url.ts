export function runtimeDatabaseUrl() {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL ?? "postgresql://postgres:postgres@localhost:5432/vaultx";
}

export function migrationDatabaseUrl() {
  return process.env.DIRECT_URL ?? process.env.POSTGRES_URL_NON_POOLING ?? runtimeDatabaseUrl();
}
