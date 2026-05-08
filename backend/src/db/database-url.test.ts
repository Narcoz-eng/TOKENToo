import assert from "node:assert/strict";
import { databaseUrlDiagnostics, migrationDatabaseUrl, runtimeDatabaseUrl } from "./database-url";

function run() {
  usesValidVercelFallbackWhenDatabaseUrlIsPlaceholder();
  keepsDatabaseUrlWhenItIsValid();
  reportsPasswordProblemWhenNoValidFallbackExists();
  usesDirectUrlFallbacksForMigrations();
  console.log("database-url tests passed");
}

function usesValidVercelFallbackWhenDatabaseUrlIsPlaceholder() {
  const env = {
    DATABASE_URL: "postgresql://postgres:password@placeholder.invalid:5432/app",
    POSTGRES_PRISMA_URL: "postgresql://postgres:real-pass@db.example.com:5432/app?sslmode=require"
  } as NodeJS.ProcessEnv;
  const diagnostics = databaseUrlDiagnostics(env);
  assert.equal(runtimeDatabaseUrl(env), env.POSTGRES_PRISMA_URL);
  assert.equal(diagnostics.databaseConnectionStatus, "unchecked");
  assert.equal(diagnostics.databasePasswordPresent, true);
  assert.equal(diagnostics.databaseUrlSource, "POSTGRES_PRISMA_URL");
}

function keepsDatabaseUrlWhenItIsValid() {
  const env = {
    DATABASE_URL: "postgresql://postgres:primary-pass@primary.example.com:5432/app",
    POSTGRES_PRISMA_URL: "postgresql://postgres:fallback-pass@fallback.example.com:5432/app"
  } as NodeJS.ProcessEnv;
  assert.equal(runtimeDatabaseUrl(env), env.DATABASE_URL);
  assert.equal(databaseUrlDiagnostics(env).databaseUrlSource, "DATABASE_URL");
}

function reportsPasswordProblemWhenNoValidFallbackExists() {
  const env = {
    DATABASE_URL: "postgresql://postgres:password@placeholder.invalid:5432/app",
    POSTGRES_PRISMA_URL: "postgresql://postgres:changeme@placeholder.invalid:5432/app"
  } as NodeJS.ProcessEnv;
  const diagnostics = databaseUrlDiagnostics(env);
  assert.equal(runtimeDatabaseUrl(env), env.DATABASE_URL);
  assert.equal(diagnostics.databaseConnectionStatus, "password-missing-or-malformed");
  assert.equal(diagnostics.databasePasswordPresent, false);
}

function usesDirectUrlFallbacksForMigrations() {
  const env = {
    DATABASE_URL: "postgresql://postgres:primary-pass@primary.example.com:5432/app",
    POSTGRES_URL_NON_POOLING: "postgresql://postgres:direct-pass@direct.example.com:5432/app"
  } as NodeJS.ProcessEnv;
  const diagnostics = databaseUrlDiagnostics(env);
  assert.equal(migrationDatabaseUrl(env), env.POSTGRES_URL_NON_POOLING);
  assert.equal(diagnostics.directUrlSource, "POSTGRES_URL_NON_POOLING");
}

run();
