import { z } from "zod";
import { ValidationError } from "@/lib/api/errors";
import { parsePagination } from "@/lib/api/pagination";
import type { BatchScope } from "@/surfboard/utils/batchScope";

export type BatchSummaryParams = {
  scope: BatchScope;
  search?: string;
  page: number;
  pageSize: number;
};

const querySchema = z.object({
  scope: z.enum(["active", "history"]).default("active"),
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
});

/** Reads and checks the query string of `GET cod/batches/summary`; the page size is capped at 100. */
export function parseBatchSummaryQuery(
  searchParams: URLSearchParams
): BatchSummaryParams {
  const parsed = querySchema.safeParse({
    scope: searchParams.get("scope") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });
  if (!parsed.success) throw new ValidationError(parsed.error.format());
  const { page, pageSize } = parsePagination(searchParams, {
    defaultPageSize: 20,
  });
  return { ...parsed.data, page, pageSize };
}
