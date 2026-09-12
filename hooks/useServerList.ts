"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export interface ServerListPage<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export type ServerListFetcher<T, F> = (params: {
  page: number;
  pageSize: number;
  search: string;
  filters: F;
}) => Promise<{ success: boolean; data?: ServerListPage<T>; error?: string }>;

/**
 * Generic paginated + searched + filtered list — the frontend half of every
 * admin list page (User Management, Notifications, Surf Plans, ...), so
 * each page doesn't re-implement its own page/search/filter state and
 * fetch-on-change effect. Pairs with lib/api/pagination.ts on the backend
 * and the shared <Pagination> component for the page-number UI.
 *
 * `fetcher` is intentionally left out of the refetch dependency array: it's
 * expected to be a stable reference to an apiClient call (closing over page
 * constants, not per-render state), not a value the caller expects the hook
 * to react to changing. Only page/pageSize/search/filters trigger a refetch.
 */
export function useServerList<T, F extends object>(
  fetcher: ServerListFetcher<T, F>,
  opts: { initialFilters: F; pageSize?: number; searchDebounceMs?: number }
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(opts.pageSize ?? 10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<F>(opts.initialFilters);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), opts.searchDebounceMs ?? 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filtersKey = JSON.stringify(filters);

  // Any change to search, filters, or page size invalidates the current page
  // — page 2 of a stale query (or a stale row count) is meaningless once the
  // query itself changed.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filtersKey, pageSize]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetcher({ page, pageSize, search: debouncedSearch, filters });
      if (res.success && res.data) {
        setItems(res.data.data);
        setTotal(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      } else {
        toast.error(res.error || "Failed to load data");
      }
    } catch {
      toast.error("Error loading data");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, filtersKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    items,
    total,
    totalPages,
    loading,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    filters,
    setFilters,
    reload,
  };
}
