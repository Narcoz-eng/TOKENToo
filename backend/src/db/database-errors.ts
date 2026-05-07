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
    message.includes("too many authentication failures") ||
    message.includes("Authentication failed against the database server") ||
    message.includes("Can't reach database server") ||
    message.includes("Environment variable not found") ||
    message.includes("does not exist in the current database")
  );
}

export function databaseSetupMessage() {
  return "Database setup required. Check DATABASE_URL and run migrations before using this endpoint.";
}
