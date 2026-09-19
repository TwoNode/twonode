"use client";

import { Pagination } from "@/components/ui/pagination";
import { useSearchParamsUpdater } from "@/hooks/useSearchParamsUpdater";

/** For server-searchParams-driven pages (no client list state) — pushes a new URL instead of calling setState, which re-runs the server component with fresh data. */
export function SearchParamsPagination({
  page,
  totalPages,
  pageSize,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
}) {
  const { update } = useSearchParamsUpdater();

  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      onPageChange={(p) => update({ page: String(p) })}
      pageSize={pageSize}
      onPageSizeChange={(size) => update({ page: "1", pageSize: String(size) })}
    />
  );
}
