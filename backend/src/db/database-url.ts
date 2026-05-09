const LOCAL_DATABASE_FALLBACK = "postgresql://postgres:postgres@localhost:5432/phew_run";
const SUPPORTED_SSL_MODES = new Set(["disable", "allow", "prefer", "require", "verify-ca", "verify-full", "no-verify"]);

export function runtimeDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const candidates = databaseCandidates(env);
  return firstValidDatabaseUrl(candidates, env)?.value ?? firstPresentDatabaseUrl(candidates, env)?.value ?? LOCAL_DATABASE_FALLBACK;
}

export function runtimeDatabasePoolConfig(env: NodeJS.ProcessEnv = process.env) {
  return databasePoolConfig(runtimeDatabaseUrl(env), env);
}

export function databasePoolConfig(connectionString: string, env: NodeJS.ProcessEnv = process.env) {
  const url = normalizeDatabaseUrl(connectionString, env);
  const parsed = new URL(url);
  const sslMode = effectiveSslMode(parsed, env);
  const ssl = sslConfig(sslMode, env);
  return {
    connectionString: url,
    ...(ssl === undefined ? {} : { ssl }),
    max: numberFromEnv(env.DATABASE_POOL_MAX, 8),
    idleTimeoutMillis: numberFromEnv(env.DATABASE_POOL_IDLE_TIMEOUT_MS, 10_000),
    connectionTimeoutMillis: numberFromEnv(env.DATABASE_CONNECT_TIMEOUT_MS, 8_000),
    application_name: env.PGAPPNAME ?? env.DATABASE_APPLICATION_NAME ?? "phew-run-backend"
  };
}

export function normalizeDatabaseUrl(value: string, env: NodeJS.ProcessEnv = process.env) {
  const url = new URL(value);
  const sslMode = effectiveSslMode(url, env);
  if (sslMode && !url.searchParams.has("sslmode")) url.searchParams.set("sslmode", sslMode);
  if (sslMode === "require" && wantsLibpqNoVerify(env) && !url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  }
  return url.toString();
}

export function migrationDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const direct = directCandidates(env);
  const database = databaseCandidates(env);
  return firstValidDatabaseUrl(direct, env)?.value ?? firstValidDatabaseUrl(database, env)?.value ?? firstPresentDatabaseUrl(direct, env)?.value ?? firstPresentDatabaseUrl(database, env)?.value ?? LOCAL_DATABASE_FALLBACK;
}

export type DatabaseUrlStatus = "valid" | "missing" | "password-missing-or-malformed" | "invalid-url";

export type DatabaseUrlDiagnostics = {
  databaseUrlPresent: boolean;
  directUrlPresent: boolean;
  databasePasswordPresent: boolean;
  directPasswordPresent: boolean;
  databaseConnectionStatus: DatabaseUrlStatus | "unchecked" | "connected" | "unreachable";
  databaseUrlSource?: string;
  directUrlSource?: string;
  databaseSslMode?: string;
  databaseSslVerification?: "disabled" | "system-ca" | "ca-file" | "no-verify";
  message?: string;
};

export function databaseUrlDiagnostics(env: NodeJS.ProcessEnv = process.env): DatabaseUrlDiagnostics {
  const database = inspectCandidates(databaseCandidates(env), "DATABASE_URL", env);
  const direct = inspectCandidates(directCandidates(env), "DIRECT_URL", env);
  const status = database.selected.status === "missing" ? "missing" : database.selected.status;
  return {
    databaseUrlPresent: database.present,
    directUrlPresent: direct.present,
    databasePasswordPresent: database.selected.passwordPresent,
    directPasswordPresent: direct.selected.passwordPresent,
    databaseConnectionStatus: status === "valid" ? "unchecked" : status,
    databaseUrlSource: database.selected.source,
    directUrlSource: direct.selected.source,
    databaseSslMode: database.selected.sslMode,
    databaseSslVerification: database.selected.sslVerification,
    message: database.selected.message ?? (direct.selected.status !== "valid" && direct.selected.status !== "missing" ? direct.selected.message : undefined)
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

function databaseCandidates(env: NodeJS.ProcessEnv) {
  return [
    { source: "DATABASE_URL", value: env.DATABASE_URL },
    { source: "POSTGRES_PRISMA_URL", value: env.POSTGRES_PRISMA_URL },
    { source: "POSTGRES_URL", value: env.POSTGRES_URL },
    { source: "PRISMA_DATABASE_URL", value: env.PRISMA_DATABASE_URL },
    { source: "SUPABASE_DB_URL", value: env.SUPABASE_DB_URL }
  ];
}

function directCandidates(env: NodeJS.ProcessEnv) {
  return [
    { source: "DIRECT_URL", value: env.DIRECT_URL },
    { source: "POSTGRES_URL_NON_POOLING", value: env.POSTGRES_URL_NON_POOLING },
    { source: "POSTGRES_URL", value: env.POSTGRES_URL },
    { source: "DATABASE_URL", value: env.DATABASE_URL }
  ];
}

function firstValidDatabaseUrl(candidates: Array<{ source: string; value?: string }>, env: NodeJS.ProcessEnv = process.env) {
  return candidates.find((candidate) => inspectDatabaseUrl(candidate.value, candidate.source, env).status === "valid");
}

function firstPresentDatabaseUrl(candidates: Array<{ source: string; value?: string }>, env: NodeJS.ProcessEnv = process.env) {
  return candidates.find((candidate) => inspectDatabaseUrl(candidate.value, candidate.source, env).present);
}

function inspectCandidates(candidates: Array<{ source: string; value?: string }>, primaryLabel: "DATABASE_URL" | "DIRECT_URL", env: NodeJS.ProcessEnv) {
  const inspected = candidates.map((candidate) => inspectDatabaseUrl(candidate.value, candidate.source, env));
  const valid = inspected.find((candidate) => candidate.status === "valid");
  const firstPresent = inspected.find((candidate) => candidate.present);
  return {
    present: inspected.some((candidate) => candidate.present),
    selected: valid ?? firstPresent ?? inspectDatabaseUrl(undefined, primaryLabel, env)
  };
}

function inspectDatabaseUrl(value: string | undefined, label: string, env: NodeJS.ProcessEnv) {
  if (!value?.trim()) {
    return { source: label, present: false, passwordPresent: false, status: "missing" as DatabaseUrlStatus, message: `${label} is missing.` };
  }
  try {
    const url = new URL(value);
    const protocolOk = /^postgres(ql)?:$/i.test(url.protocol);
    if (!protocolOk || !url.hostname || !url.username) {
      return { source: label, present: true, passwordPresent: false, status: "invalid-url" as DatabaseUrlStatus, message: `${label} is not a valid PostgreSQL connection URL.` };
    }
    const decodedPassword = decodeURIComponent(url.password);
    const passwordPresent = decodedPassword.length > 0 && !isPlaceholderPassword(decodedPassword);
    if (!passwordPresent) {
      return { source: label, present: true, passwordPresent: false, status: "password-missing-or-malformed" as DatabaseUrlStatus, message: `${label} password missing or malformed.` };
    }
    const sslMode = effectiveSslMode(url, env);
    if (sslMode && !SUPPORTED_SSL_MODES.has(sslMode)) {
      return { source: label, present: true, passwordPresent: true, status: "invalid-url" as DatabaseUrlStatus, message: `${label} has unsupported sslmode '${sslMode}'.` };
    }
    return {
      source: label,
      present: true,
      passwordPresent: true,
      status: "valid" as DatabaseUrlStatus,
      sslMode,
      sslVerification: sslVerification(sslMode, url, env)
    };
  } catch {
    return { source: label, present: true, passwordPresent: false, status: "invalid-url" as DatabaseUrlStatus, message: `${label} is not a valid PostgreSQL connection URL.` };
  }
}

function isPlaceholderPassword(value: string) {
  const normalized = value.trim();
  return (
    /^\[?your[-_ ]?password\]?$/i.test(normalized) ||
    /^(password|password_here|changeme|undefined|null)$/i.test(normalized)
  );
}

function effectiveSslMode(url: URL, env: NodeJS.ProcessEnv) {
  const explicit = url.searchParams.get("sslmode") ?? env.DATABASE_SSL_MODE ?? env.DB_SSL_MODE ?? env.PGSSLMODE;
  if (explicit) return explicit.toLowerCase();
  const host = url.hostname.toLowerCase();
  if (host.includes("supabase.") || host.includes("pooler.supabase.com") || host.includes("neon.tech") || host.includes("prisma.io")) return "require";
  return undefined;
}

function sslConfig(mode: string | undefined, env: NodeJS.ProcessEnv): false | true | { rejectUnauthorized: false } | undefined {
  if (!mode) return undefined;
  if (mode === "disable") return false;
  if (mode === "no-verify") return { rejectUnauthorized: false };
  if (mode === "require" && wantsLibpqNoVerify(env)) return { rejectUnauthorized: false };
  return true;
}

function sslVerification(mode: string | undefined, url: URL, env: NodeJS.ProcessEnv): DatabaseUrlDiagnostics["databaseSslVerification"] {
  if (!mode || mode === "disable") return "disabled";
  if (mode === "no-verify") return "no-verify";
  if (mode === "require" && wantsLibpqNoVerify(env)) return "no-verify";
  if (url.searchParams.has("sslrootcert")) return "ca-file";
  return "system-ca";
}

function wantsLibpqNoVerify(env: NodeJS.ProcessEnv) {
  return /^(1|true|yes)$/i.test(env.DATABASE_SSL_NO_VERIFY ?? env.DB_SSL_NO_VERIFY ?? env.PGSSLNO_VERIFY ?? "");
}

function numberFromEnv(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
