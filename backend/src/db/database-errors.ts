import { databaseUrlDiagnostics } from "./database-url";

export function isDatabaseSetupError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const message = error instanceof Error ? error.message : String(record.message ?? "");
  const code = String(record.code ?? "");
  const name = String(record.name ?? "");

  return (
    code === "P1000" ||
    code === "P1001" ||
    code === "P1003" ||
    code === "P1012" ||
    name.includes("PrismaClientInitializationError") ||
    name.includes("DriverAdapterError") ||
    message.includes("ECIRCUITBREAKER") ||
    message.includes("SASL: SCRAM-SERVER-FIRST-MESSAGE") ||
    message.includes("client password must be a string") ||
    message.includes("self-signed certificate in certificate chain") ||
    message.includes("unable to verify the first certificate") ||
    message.includes("certificate has expired") ||
    message.includes("too many authentication failures") ||
    message.includes("Authentication failed against the database server") ||
    message.includes("Can't reach database server") ||
    message.includes("Environment variable not found") ||
    message.includes("does not exist in the current database")
  );
}

export function databaseSetupMessage() {
  const diagnostics = databaseUrlDiagnostics();
  if (diagnostics.databaseConnectionStatus === "password-missing-or-malformed") return "DATABASE_URL password missing or malformed.";
  if (diagnostics.databaseConnectionStatus === "invalid-url") return "DATABASE_URL is not a valid PostgreSQL connection URL.";
  if (diagnostics.databaseSslVerification === "system-ca") return "Database TLS verification failed or database is unreachable. For Supabase/Neon use sslmode=require on DATABASE_URL and DIRECT_URL; for private self-signed Postgres set DATABASE_SSL_NO_VERIFY=true only in trusted environments or configure sslrootcert.";
  return "Database setup required. Check DATABASE_URL and run migrations before using this endpoint.";
}
