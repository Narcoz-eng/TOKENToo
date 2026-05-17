"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";

export type ApiResourceState<T> = {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
};

export function useApiResource<T>(path: string, options: { enabled?: boolean } = {}): ApiResourceState<T> {
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(options.enabled !== false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (options.enabled === false) {
      setLoading(false);
      setError(null);
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch<T>(path, { cache: "no-store" })
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err : new ApiError({ kind: "network", message: err instanceof Error ? err.message : "Data request failed", diagnostics: { requestId: "unknown", url: path } }));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, version, options.enabled]);

  return { data, loading, error, reload: () => setVersion((value) => value + 1) };
}
