import { useCallback, useEffect, useRef, useState } from "react";
import type { PaginatedList } from "@/lib/types";

export interface UsePaginatedListOptions<T> {
  pageNumber: number;
  pageSize?: number;
  fetch: (params: { pageNumber: number; pageSize: number }) => Promise<PaginatedList<T>>;
}

export interface UsePaginatedListResult<T> {
  data: PaginatedList<T> | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
}

export function usePaginatedList<T>({
  pageNumber,
  pageSize = 10,
  fetch: fetchFn,
}: UsePaginatedListOptions<T>): UsePaginatedListResult<T> {
  const [data, setData] = useState<PaginatedList<T> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    return fetchRef.current({ pageNumber, pageSize })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [pageNumber, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load };
}
