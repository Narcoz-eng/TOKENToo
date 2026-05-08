const LOCAL_DATABASE_FALLBACK = "postgresql://postgres:postgres@localhost:5432/phew_run";

export function runtimeDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const candidates = databaseCandidates(env);
  return firstValidDatabaseUrl(candidates)?.value ?? firstPresentDatabaseUrl(candidates)?.value ?? LOCAL_DATABASE_FALLBACK;
}

export function migrationDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const direct = directCandidates(env);
  const database = databaseCandidates(env);
  return firstValidDatabaseUrl(direct)?.value ?? firstValidDatabaseUrl(database)?.value ?? firstPresentDatabaseUrl(direct)?.value ?? firstPresentDatabaseUrl(database)?.value ?? LOCAL_DATABASE_FALLBACK;
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
  message?: string;
};

export function databaseUrlDiagnostics(env: NodeJS.ProcessEnv = process.env): DatabaseUrlDiagnostics {
  const database = inspectCandidates(databaseCandidates(env), "DATABASE_URL");
  const direct = inspectCandidates(directCandidates(env), "DIRECT_URL");
  const status = database.selected.status === "missing" ? "missing" : database.selected.status;
  return {
    databaseUrlPresent: database.present,
    directUrlPresent: direct.present,
    databasePasswordPresent: database.selected.passwordPresent,
    directPasswordPresent: direct.selected.passwordPresent,
    databaseConnectionStatus: status === "valid" ? "unchecked" : status,
    databaseUrlSource: database.selected.source,
    directUrlSource: direct.selected.source,
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

function firstValidDatabaseUrl(candidates: Array<{ source: string; value?: string }>) {
  return candidates.find((candidate) => inspectDatabaseUrl(candidate.value, candidate.source).status === "valid");
}

function firstPresentDatabaseUrl(candidates: Array<{ source: string; value?: string }>) {
  return candidates.find((candidate) => inspectDatabaseUrl(candidate.value, candidate.source).present);
}

function inspectCandidates(candidates: Array<{ source: string; value?: string }>, primaryLabel: "DATABASE_URL" | "DIRECT_URL") {
  const inspected = candidates.map((candidate) => inspectDatabaseUrl(candidate.value, candidate.source));
  const valid = inspected.find((candidate) => candidate.status === "valid");
  const firstPresent = inspected.find((candidate) => candidate.present);
  return {
    present: inspected.some((candidate) => candidate.present),
    selected: valid ?? firstPresent ?? inspectDatabaseUrl(undefined, primaryLabel)
  };
}

function inspectDatabaseUrl(value: string | undefined, label: string) {
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
    return { source: label, present: true, passwordPresent: true, status: "valid" as DatabaseUrlStatus };
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
