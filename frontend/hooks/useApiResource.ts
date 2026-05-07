"use client";

import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export type ApiResourceState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useApiResource<T>(path: string): ApiResourceState<T> {
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}${path}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await safeErrorMessage(response));
        return response.json() as Promise<T>;
      })
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "API request failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, version]);

  return { data, loading, error, reload: () => setVersion((value) => value + 1) };
}

async function safeErrorMessage(response: Response) {
  const body = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(body) as { message?: unknown };
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    // Fall back to the raw response text below.
  }
  return body || `Request failed with ${response.status}`;
}
