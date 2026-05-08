import { HttpException, HttpStatus } from "@nestjs/common";
import { databaseSetupMessage, isDatabaseSetupError } from "./database-errors";
import { databaseUrlDiagnostics } from "./database-url";
import type { PrismaService } from "./prisma.service";

export type ApiErrorCode = "DB_UNAVAILABLE" | "PROVIDER_NOT_CONFIGURED" | "MISSING_ENV" | "VALIDATION_ERROR" | "WALLET_REQUIRED" | "REQUEST_FAILED";

export async function safeOptionalRead<T>(read: () => Promise<T>, fallback: T): Promise<{ data: T; warnings: string[] }> {
  try {
    return { data: await read(), warnings: [] };
  } catch (error) {
    if (!isDatabaseSetupError(error)) throw error;
    return { data: fallback, warnings: [databaseSetupMessage()] };
  }
}

export function mapPrismaErrorToApiError(error: unknown) {
  if (!isDatabaseSetupError(error)) return null;
  return {
    ok: false,
    code: "DB_UNAVAILABLE" as ApiErrorCode,
    message: databaseSetupMessage(),
    action: "Configure DATABASE_URL and run database migrations before retrying this write."
  };
}

export function publicEndpointFallback<T>(data: T, warnings: string[] = []) {
  return {
    ok: true,
    data,
    empty: isEmptyPayload(data),
    warnings
  };
}

export async function requireDbForWrite(prisma: PrismaService) {
  const diagnostics = databaseUrlDiagnostics();
  if (diagnostics.databaseConnectionStatus === "password-missing-or-malformed" || diagnostics.databaseConnectionStatus === "invalid-url") {
    throw new HttpException({
      ok: false,
      code: "DB_UNAVAILABLE",
      message: databaseSetupMessage(),
      action: "Fix DATABASE_URL/DIRECT_URL credentials before retrying this write."
    }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    const mapped = mapPrismaErrorToApiError(error);
    if (mapped) throw new HttpException(mapped, HttpStatus.UNPROCESSABLE_ENTITY);
    throw error;
  }
}

function isEmptyPayload(data: unknown): boolean {
  if (Array.isArray(data)) return data.length === 0;
  if (!data || typeof data !== "object") return data == null;
  const record = data as Record<string, unknown>;
  const listKeys = ["collections", "nfts", "raids", "listings", "positions", "activity", "quotes", "snapshots"];
  return listKeys.every((key) => !Array.isArray(record[key]) || (record[key] as unknown[]).length === 0);
}
