export function runtimeDatabaseUrl() {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL ?? "postgresql://postgres:postgres@localhost:5432/phew_run";
}

export function migrationDatabaseUrl() {
  return process.env.DIRECT_URL ?? process.env.POSTGRES_URL_NON_POOLING ?? runtimeDatabaseUrl();
}

export type DatabaseUrlStatus = "valid" | "missing" | "password-missing-or-malformed" | "invalid-url";

export type DatabaseUrlDiagnostics = {
  databaseUrlPresent: boolean;
  directUrlPresent: boolean;
  databasePasswordPresent: boolean;
  directPasswordPresent: boolean;
  databaseConnectionStatus: DatabaseUrlStatus | "unchecked" | "connected" | "unreachable";
  message?: string;
};

export function databaseUrlDiagnostics(env: NodeJS.ProcessEnv = process.env): DatabaseUrlDiagnostics {
  const database = inspectDatabaseUrl(env.DATABASE_URL ?? env.POSTGRES_PRISMA_URL ?? env.POSTGRES_URL, "DATABASE_URL");
  const direct = inspectDatabaseUrl(env.DIRECT_URL ?? env.POSTGRES_URL_NON_POOLING, "DIRECT_URL");
  const status = database.status === "missing" ? "missing" : database.status;
  return {
    databaseUrlPresent: database.present,
    directUrlPresent: direct.present,
    databasePasswordPresent: database.passwordPresent,
    directPasswordPresent: direct.passwordPresent,
    databaseConnectionStatus: status === "valid" ? "unchecked" : status,
    message: database.message ?? (direct.status !== "valid" && direct.status !== "missing" ? direct.message : undefined)
  };
}

export function assertRuntimeDatabaseUrlValid() {
  const diagnostics = databaseUrlDiagnostics();
  if (diagnostics.databaseConnectionStatus === "password-missing-or-malformed") {
    throw new Error("DATABASE_URL password missing or malformed.");
  }
  if (diagnostics.databaseConnectionStatus === "invalid-url") {
    throw new Error("DATABASE_URL is not a valid PostgreSQL connection URL.");
  }
}

function inspectDatabaseUrl(value: string | undefined, label: "DATABASE_URL" | "DIRECT_URL") {
  if (!value?.trim()) {
    return { present: false, passwordPresent: false, status: "missing" as DatabaseUrlStatus, message: `${label} is missing.` };
  }
  try {
    const url = new URL(value);
    const protocolOk = /^postgres(ql)?:$/i.test(url.protocol);
    if (!protocolOk || !url.hostname || !url.username) {
      return { present: true, passwordPresent: false, status: "invalid-url" as DatabaseUrlStatus, message: `${label} is not a valid PostgreSQL connection URL.` };
    }
    const decodedPassword = decodeURIComponent(url.password);
    const passwordPresent = decodedPassword.length > 0 && !/^\[?your[-_ ]?password\]?$/i.test(decodedPassword) && !/password_here|changeme|undefined|null/i.test(decodedPassword);
    if (!passwordPresent) {
      return { present: true, passwordPresent: false, status: "password-missing-or-malformed" as DatabaseUrlStatus, message: `${label} password missing or malformed.` };
    }
    return { present: true, passwordPresent: true, status: "valid" as DatabaseUrlStatus };
  } catch {
    return { present: true, passwordPresent: false, status: "invalid-url" as DatabaseUrlStatus, message: `${label} is not a valid PostgreSQL connection URL.` };
  }
}
