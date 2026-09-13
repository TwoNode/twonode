"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Pagination } from "@/components/ui/pagination";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pushWith = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      onPageChange={(p) => pushWith({ page: String(p) })}
      pageSize={pageSize}
      onPageSizeChange={(size) => pushWith({ page: "1", pageSize: String(size) })}
    />
  );
}
