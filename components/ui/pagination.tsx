"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Omit both to hide the page-size dropdown (e.g. a page with a fixed pageSize). */
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

/** Windowed page numbers around the current page, with leading/trailing ellipses — same shape for 5 pages or 500. */
function getPageWindow(page: number, totalPages: number): (number | "…")[] {
  const window = 1;
  const pages = new Set<number>([1, totalPages]);
  for (let p = page - window; p <= page + window; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/** Shared Prev/Next + page-number + page-size control for every paginated admin list — pairs with useServerList. */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: PaginationProps) {
  const showSizePicker = pageSize !== undefined && !!onPageSizeChange;
  if (totalPages <= 1 && !showSizePicker) return null;

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      {showSizePicker ? (
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          Rows per page
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange!(Number(e.target.value))}
            className="rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-surface px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span />
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-300 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {getPageWindow(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="px-1 text-sm text-gray-400 dark:text-gray-500">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  "inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-lg text-sm font-medium transition-colors",
                  p === page
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                )}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-300 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
