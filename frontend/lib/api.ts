export type ApiResult<T> = {
  data: T;
  source: "mock" | "api";
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function fetchVaultX<T>(path: string, fallback: T): Promise<ApiResult<T>> {
  if (!API_BASE_URL) {
    return { data: fallback, source: "mock" };
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { next: { revalidate: 30 } });
  if (!response.ok) {
    return { data: fallback, source: "mock" };
  }

  return { data: (await response.json()) as T, source: "api" };
}
