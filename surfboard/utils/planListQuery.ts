import { z } from "zod";
import { ValidationError } from "@/lib/api/errors";
import { parsePagination } from "@/lib/api/pagination";
import { dateParam } from "@/surfboard/utils/planSummaryQuery";
import type { PlanFilters, PlanSort } from "@/surfboard/services/planService";

/**
 * The columns the website's plan lists (`plans`, `plans/shared`,
 * `plans/shared-with-me`) can be ordered by. The field goes into Prisma's
 * `orderBy`, so anything else is refused: an unknown column is a 500, and a JSON
 * column such as `pillars` or `geometry` is an expensive sort (I-044).
 */
export const PLAN_LIST_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "surveyTitle",
  "planNumber",
  "status",
  "dateOnSurveyPlan",
] as const satisfies readonly PlanSort["field"][];

const csv = (value: string | undefined) =>
  value?.split(",").filter(Boolean) ?? undefined;

const querySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional().transform(csv),
  planType: z.string().optional().transform(csv),
  facilitator: z.string().optional(),
  dateFrom: dateParam(false),
  dateTo: dateParam(false),
  sortField: z.enum(PLAN_LIST_SORT_FIELDS).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type PlanListQuery = {
  page: number;
  pageSize: number;
  /** `plans` only: the dashboard and the map ask for every plan at once. The shared lists ignore it. */
  noPagination: boolean;
  filters: PlanFilters;
  /** Set only when both `sortField` and `sortOrder` were sent, as before. */
  sort: PlanSort | undefined;
};

/**
 * Reads and checks the query string of the website's three plan lists. A bad
 * sort field, sort order or date is a 400 naming the field (it used to reach the
 * database and come back as a 500); `page` and `pageSize` are clamped like every
 * other list (a page size of at most 100, a bad number falls back to the default).
 */
export function parsePlanListQuery(
  searchParams: URLSearchParams
): PlanListQuery {
  const raw: Record<string, string> = {};
  for (const [key, value] of searchParams) raw[key] = value;

  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) throw new ValidationError(parsed.error.format());

  const { sortField, sortOrder, ...filters } = parsed.data;
  const { page, pageSize } = parsePagination(searchParams);
  return {
    page,
    pageSize,
    noPagination: searchParams.get("noPagination") === "true",
    filters,
    sort:
      sortField && sortOrder
        ? { field: sortField, order: sortOrder }
        : undefined,
  };
}
