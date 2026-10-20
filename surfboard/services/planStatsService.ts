import prisma from "@/lib/prisma";
import type { Prisma } from "@/prisma/generated";
import { ValidationError } from "@/lib/api/errors";
import {
  pillarBucket,
  PROVISIONAL_TYPES,
} from "@/surfboard/services/analyticsService";
import {
  buildSummaryWhere,
  STATUS_FILTER_SCAN_LIMIT,
} from "@/surfboard/services/planSummaryService";
import { userBatchWhere } from "@/surfboard/utils/batchScope";
import {
  computeDisplayStatus,
  DISPLAY_STATUS_CODES,
  PLAN_STATUS_SELECT,
  type DisplayStatusCode,
  type PlanStatusRow,
} from "@/surfboard/utils/planStatus";
import type { PlanStatsParams } from "@/surfboard/utils/planStatsQuery";
import type { PlanSummaryParams } from "@/surfboard/utils/planSummaryQuery";

/**
 * The numbers behind the mobile app's Stats tab (TASK-0015 1F.3, 1F.7). Every
 * figure that the app lets a surveyor tap is counted with the same rules as the
 * list it opens, so the number and the list cannot disagree:
 *
 * - the plans in scope come from `buildSummaryWhere`, the filter `GET
 *   plans/summary` uses (the surveyor's own plans, not deleted, survey date in
 *   range), so `total` is that list's total with `provisional=exclude`;
 * - each status is `computeDisplayStatus`, the one definition of "where is this
 *   plan?" (`surfboard/utils/planStatus.ts`), so a status count is that list's
 *   total with `displayStatus=<code>`;
 * - a place or facilitator row groups values with capitals and surrounding
 *   spaces ignored, exactly as the list matches them (`findColumnMatchIds`);
 * - `activeBatches` is `userBatchWhere(userId, "active")`, the Records tab's
 *   Active scope.
 *
 * The website's dashboard (`getUserDashboardAnalytics`) counts differently (it
 * reads the stored `status` column, and until I-038 is fixed it includes deleted
 * plans), which is why the app does not call it.
 */

export type StatRow = { key: string; count: number };

export type Breakdown = {
  /** Biggest first, then by name; at most `BREAKDOWN_ROW_LIMIT` rows. */
  rows: StatRow[];
  /** How many different values there are, which may be more than `rows` holds. */
  distinct: number;
  /** Plans with no value in this column. They have no row, so the rows add up to less than `total`. */
  missing: number;
};

export type PlanStats = {
  /** Plans in scope that are not provisional: the Stats "Total plans". */
  total: number;
  /** Provisional plan types, counted on their own (they are not in `total`). */
  provisional: number;
  /** Of `total`, the plans with no survey plan date. They are in no month, and only appear when no date range is asked for. */
  undated: number;
  /** Of `total`: one count per display status, every code present. */
  byStatus: Record<DisplayStatusCode, number>;
  /** Pillars (not plans) in the plans of `total`, bucketed as the website does. */
  pillars: { regular: number; special: number };
  /** Plans of `total` per calendar month (UTC) of the survey plan date, oldest first, months with no plan left out. */
  byMonth: { period: string; count: number }[];
  facilitators: Breakdown;
  lgas: Breakdown;
  wards: Breakdown;
  lcdas: Breakdown;
  /** Batches with a plan still to be lodged (not affected by the date range). */
  activeBatches: number;
};

export const BREAKDOWN_ROW_LIMIT = 100;

const STATS_SELECT = {
  planType: true,
  facilitator: true,
  lga: true,
  ward: true,
  lcda: true,
  dateOnSurveyPlan: true,
  pillarType: true,
  pillars: true,
  ...PLAN_STATUS_SELECT,
} as const satisfies Prisma.SurfboardPlanSelect;

type StatsRow = Prisma.SurfboardPlanGetPayload<{
  select: typeof STATS_SELECT;
}>;

/** "Ajah" reads better as a label than "AJAH" or "ajah". */
const isMixedCase = (text: string) =>
  text !== text.toUpperCase() && text !== text.toLowerCase();

/**
 * Groups values ignoring capitals and surrounding spaces. A group is shown under
 * the spelling used most often (on a tie, one with both capitals and small
 * letters, then the first in code point order), trimmed; that is the text to
 * hand back as the list filter.
 */
function breakdown(values: (string | null)[]): Breakdown {
  const groups = new Map<string, Map<string, number>>();
  let missing = 0;
  for (const raw of values) {
    const spelling = raw?.trim() ?? "";
    if (!spelling) {
      missing += 1;
      continue;
    }
    const key = spelling.toLowerCase();
    const spellings = groups.get(key) ?? new Map<string, number>();
    spellings.set(spelling, (spellings.get(spelling) ?? 0) + 1);
    groups.set(key, spellings);
  }

  const rows = [...groups.values()]
    .map((spellings) => {
      const count = [...spellings.values()].reduce((a, b) => a + b, 0);
      const [label] = [...spellings.entries()].sort(
        ([a, na], [b, nb]) =>
          nb - na ||
          Number(isMixedCase(b)) - Number(isMixedCase(a)) ||
          (a < b ? -1 : a > b ? 1 : 0)
      )[0];
      return { key: label, count };
    })
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  return {
    rows: rows.slice(0, BREAKDOWN_ROW_LIMIT),
    distinct: rows.length,
    missing,
  };
}

const monthOf = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

export async function getPlanStats(
  userId: string,
  range: PlanStatsParams
): Promise<PlanStats> {
  const params: PlanSummaryParams = {
    scope: "mine",
    page: 1,
    pageSize: 1,
    displayStatus: [],
    planType: [],
    provisional: "include",
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    sortField: "createdAt",
    sortOrder: "desc",
  };
  const where = await buildSummaryWhere(userId, params);

  const [rows, activeBatches] = await Promise.all([
    prisma.surfboardPlan.findMany({
      where,
      select: STATS_SELECT,
      take: STATUS_FILTER_SCAN_LIMIT + 1,
    }),
    prisma.certificateOfDepositBatch.count({
      where: userBatchWhere(userId, "active"),
    }),
  ]);
  if (rows.length > STATUS_FILTER_SCAN_LIMIT) {
    throw new ValidationError({
      dateFrom: {
        _errors: [
          "Too many plans to summarise at once; choose a shorter period",
        ],
      },
    });
  }

  const counted: StatsRow[] = rows.filter(
    (row) => !PROVISIONAL_TYPES.includes(row.planType)
  );

  const byStatus = Object.fromEntries(
    DISPLAY_STATUS_CODES.map((code) => [code, 0])
  ) as Record<DisplayStatusCode, number>;
  const months = new Map<string, number>();
  const pillars = { regular: 0, special: 0 };
  let undated = 0;

  for (const row of counted) {
    byStatus[computeDisplayStatus(row as unknown as PlanStatusRow).code] += 1;

    if (row.dateOnSurveyPlan) {
      const month = monthOf(row.dateOnSurveyPlan);
      months.set(month, (months.get(month) ?? 0) + 1);
    } else {
      undated += 1;
    }

    if (row.pillarType && Array.isArray(row.pillars)) {
      const bucket =
        pillarBucket(row.pillarType) === "Regular" ? "regular" : "special";
      pillars[bucket] += row.pillars.length;
    }
  }

  return {
    total: counted.length,
    provisional: rows.length - counted.length,
    undated,
    byStatus,
    pillars,
    byMonth: [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, count]) => ({ period, count })),
    facilitators: breakdown(counted.map((row) => row.facilitator)),
    lgas: breakdown(counted.map((row) => row.lga)),
    wards: breakdown(counted.map((row) => row.ward)),
    lcdas: breakdown(counted.map((row) => row.lcda)),
    activeBatches,
  };
}
