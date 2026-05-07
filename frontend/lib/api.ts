export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export type ApiEnvelope<T> = {
  ok?: boolean;
  data?: T;
  empty?: boolean;
  capabilities?: Record<string, boolean>;
  warnings?: string[];
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const body = await response.text().catch(() => "");
  const parsed = parseBody(body);
  if (!response.ok) throw new Error(apiErrorMessage(parsed, response.status));
  return parsed as T;
}

export function unwrapApiData<T>(value: T | ApiEnvelope<T> | null): T | null {
  if (!value || typeof value !== "object") return value as T | null;
  if ("ok" in value && "data" in value) return (value as ApiEnvelope<T>).data ?? null;
  return value as T;
}

export function apiWarnings(value: unknown): string[] {
  return value && typeof value === "object" && Array.isArray((value as ApiEnvelope<unknown>).warnings) ? ((value as ApiEnvelope<unknown>).warnings ?? []) : [];
}

export function apiCapabilities(value: unknown): Record<string, boolean> | undefined {
  return value && typeof value === "object" ? ((value as ApiEnvelope<unknown>).capabilities as Record<string, boolean> | undefined) : undefined;
}

export async function safeErrorMessage(response: Response) {
  const body = await response.text().catch(() => "");
  return apiErrorMessage(parseBody(body), response.status);
}

function parseBody(body: string): unknown {
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function apiErrorMessage(body: unknown, status: number) {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const message = Array.isArray(record.message) ? record.message.join("; ") : typeof record.message === "string" ? record.message : undefined;
    const action = typeof record.action === "string" ? record.action : undefined;
    const code = typeof record.code === "string" ? record.code : undefined;
    return [code, message, action].filter(Boolean).join(": ") || `Request failed with ${status}`;
  }
  return typeof body === "string" && body ? body : `Request failed with ${status}`;
}
