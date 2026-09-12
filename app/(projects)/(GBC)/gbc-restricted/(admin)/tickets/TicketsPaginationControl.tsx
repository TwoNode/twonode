"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Pagination } from "@/components/ui/pagination";

/** Server-searchParams-driven pages can't hold client state for the page — this pushes a new URL instead, which re-runs the server component with fresh data. */
export function TicketsPaginationControl({
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
