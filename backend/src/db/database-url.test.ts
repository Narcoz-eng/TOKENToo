import assert from "node:assert/strict";
import { databasePoolConfig, databaseUrlDiagnostics, migrationDatabaseUrl, normalizeDatabaseUrl, runtimeDatabaseUrl } from "./database-url";

function run() {
  usesValidVercelFallbackWhenDatabaseUrlIsPlaceholder();
  keepsDatabaseUrlWhenItIsValid();
  reportsPasswordProblemWhenNoValidFallbackExists();
  reportsSslModeEvenWhenPasswordIsPlaceholder();
  usesDirectUrlFallbacksForMigrations();
  normalizesSupabaseSslRequire();
  normalizesDirectSupabaseSslRequire();
  supportsNoVerifyForTrustedSelfSignedDatabases();
  keepsVerifyFullOnSystemCaByDefault();
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

function reportsSslModeEvenWhenPasswordIsPlaceholder() {
  const env = {
    DATABASE_URL: "postgresql://postgres.project:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require",
    DIRECT_URL: "postgresql://postgres.project:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
  } as NodeJS.ProcessEnv;
  const diagnostics = databaseUrlDiagnostics(env);
  assert.equal(diagnostics.databaseConnectionStatus, "password-missing-or-malformed");
  assert.equal(diagnostics.databaseSslMode, "require");
  assert.equal(diagnostics.directSslMode, "require");
  assert.equal(diagnostics.databaseSslVerification, "require-no-ca");
  assert.equal(diagnostics.directSslVerification, "require-no-ca");
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

function normalizesSupabaseSslRequire() {
  const databaseUrl = "postgresql://postgres.project:primary-pass@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";
  const env = {
    DATABASE_URL: databaseUrl
  } as NodeJS.ProcessEnv;
  const normalized = normalizeDatabaseUrl(databaseUrl, env);
  const diagnostics = databaseUrlDiagnostics(env);
  assert.match(normalized, /sslmode=require/);
  assert.match(normalized, /uselibpqcompat=true/);
  assert.equal(diagnostics.databaseSslMode, "require");
  assert.equal(diagnostics.databaseSslVerification, "require-no-ca");
  const config = databasePoolConfig(databaseUrl, env);
  assert.equal((config.ssl as { rejectUnauthorized?: boolean }).rejectUnauthorized, false);
}

function normalizesDirectSupabaseSslRequire() {
  const env = {
    DATABASE_URL: "postgresql://postgres.project:primary-pass@aws-0-eu-west-1.pooler.supabase.com:6543/postgres",
    DIRECT_URL: "postgresql://postgres.project:primary-pass@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
  } as NodeJS.ProcessEnv;
  const diagnostics = databaseUrlDiagnostics(env);
  assert.equal(diagnostics.databaseSslMode, "require");
  assert.equal(diagnostics.directSslMode, "require");
  assert.equal(diagnostics.directSslVerification, "require-no-ca");
}

function supportsNoVerifyForTrustedSelfSignedDatabases() {
  const databaseUrl = "postgresql://postgres:primary-pass@selfsigned.internal:5432/app?sslmode=require";
  const env = {
    DATABASE_URL: databaseUrl,
    DATABASE_SSL_NO_VERIFY: "true"
  } as NodeJS.ProcessEnv;
  const config = databasePoolConfig(databaseUrl, env);
  assert.equal((config.ssl as { rejectUnauthorized?: boolean }).rejectUnauthorized, false);
  assert.match(config.connectionString, /uselibpqcompat=true/);
  assert.equal(databaseUrlDiagnostics(env).databaseSslVerification, "no-verify");
}

function keepsVerifyFullOnSystemCaByDefault() {
  const databaseUrl = "postgresql://postgres:primary-pass@db.example.com:5432/app?sslmode=verify-full";
  const config = databasePoolConfig(databaseUrl, { DATABASE_URL: databaseUrl } as NodeJS.ProcessEnv);
  assert.equal(config.ssl, true);
  assert.equal(databaseUrlDiagnostics({ DATABASE_URL: databaseUrl } as NodeJS.ProcessEnv).databaseSslVerification, "system-ca");
}

run();
