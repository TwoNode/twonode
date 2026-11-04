import { z } from "zod";
import { ValidationError } from "@/lib/api/errors";
import { dateParam } from "@/surfboard/utils/planSummaryQuery";

export type PlanStatsParams = {
  /** On the date printed on the survey plan, inclusive; the same field the plans list filters on. */
  dateFrom?: Date;
  dateTo?: Date;
};

const querySchema = z.object({
  dateFrom: dateParam(false),
  dateTo: dateParam(true),
});

/**
 * Reads and checks the query string of `GET plans/stats`: an optional survey
 * plan date range, read exactly as `GET plans/summary` reads it (a plain date is
 * the whole day in UTC), so the range a figure was counted over and the range
 * its list opens with are the same. A bad value is a 400 naming the field.
 */
export function parsePlanStatsQuery(
  searchParams: URLSearchParams
): PlanStatsParams {
  const parsed = querySchema.safeParse({
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  });
  if (!parsed.success) throw new ValidationError(parsed.error.format());

  const { dateFrom, dateTo } = parsed.data;
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new ValidationError({
      dateFrom: { _errors: ["dateFrom is after dateTo"] },
    });
  }
  return { dateFrom, dateTo };
}
