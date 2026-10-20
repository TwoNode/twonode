import { z } from "zod";
import { ValidationError } from "@/lib/api/errors";
import { parsePagination } from "@/lib/api/pagination";
import {
  DISPLAY_STATUS_CODES,
  type DisplayStatusCode,
} from "@/surfboard/utils/planStatus";

/** The columns a summary list can be ordered by. Anything else is refused, not passed to the database. */
export const SUMMARY_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "dateOnSurveyPlan",
  "planNumber",
  "surveyTitle",
] as const;
export type SummarySortField = (typeof SUMMARY_SORT_FIELDS)[number];

export type PlanSummaryParams = {
  scope: "mine" | "shared-with-me";
  page: number;
  pageSize: number;
  search?: string;
  displayStatus: DisplayStatusCode[];
  planType: string[];
  facilitator?: string;
  lga?: string;
  ward?: string;
  lcda?: string;
  /** Whether provisional plan types are in the list ("exclude" matches the Stats "Total plans" figure). */
  provisional: "include" | "exclude" | "only";
  /** On the date printed on the survey plan, inclusive. */
  dateFrom?: Date;
  dateTo?: Date;
  sortField: SummarySortField;
  sortOrder: "asc" | "desc";
};

const DEFAULT_PAGE_SIZE = 20;

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

const list = <T extends z.ZodTypeAny>(item: T, max: number) =>
  z
    .string()
    .optional()
    .transform((value) =>
      value
        ? Array.from(
            new Set(
              value
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean)
            )
          )
        : []
    )
    .pipe(z.array(item).max(max));

/** `2026-10-19` means that whole day (UTC); a full date and time is used as given. */
function toDate(value: string, endOfDay: boolean): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // `new Date` rolls 2026-02-31 over to March 3rd, so check the day round-trips.
    const start = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) return null;
    if (start.toISOString().slice(0, 10) !== value) return null;
    return endOfDay ? new Date(`${value}T23:59:59.999Z`) : start;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** A `YYYY-MM-DD` date or a full date and time; shared by the list and the stats query. */
export const dateParam = (endOfDay: boolean) =>
  z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value, ctx) => {
      if (!value) return undefined;
      const parsed = toDate(value, endOfDay);
      if (!parsed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Not a valid date",
        });
        return z.NEVER;
      }
      return parsed;
    });

const querySchema = z.object({
  scope: z.enum(["mine", "shared-with-me"]).default("mine"),
  search: text(100),
  displayStatus: list(
    z.enum(DISPLAY_STATUS_CODES),
    DISPLAY_STATUS_CODES.length
  ),
  planType: list(z.string().max(100), 20),
  facilitator: text(200),
  lga: text(200),
  ward: text(200),
  lcda: text(200),
  provisional: z.enum(["include", "exclude", "only"]).default("include"),
  dateFrom: dateParam(false),
  dateTo: dateParam(true),
  sortField: z.enum(SUMMARY_SORT_FIELDS).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Reads and checks the query string of `GET plans/summary`. A bad value is a
 * 400 naming the field; `page` and `pageSize` are clamped like every other
 * list (page size at most 100).
 */
export function parsePlanSummaryQuery(
  searchParams: URLSearchParams
): PlanSummaryParams {
  const raw: Record<string, string> = {};
  for (const [key, value] of searchParams) raw[key] = value;

  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) throw new ValidationError(parsed.error.format());

  const { dateFrom, dateTo } = parsed.data;
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new ValidationError({
      dateFrom: { _errors: ["dateFrom is after dateTo"] },
    });
  }

  const { page, pageSize } = parsePagination(searchParams, {
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });
  return { ...parsed.data, page, pageSize };
}
