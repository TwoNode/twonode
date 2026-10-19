import prisma from "@/lib/prisma";
import type { Prisma } from "@/prisma/generated";
import { ValidationError } from "@/lib/api/errors";
import {
  paginatedResult,
  paginateQuery,
  type Paginated,
} from "@/lib/api/pagination";
import { PROVISIONAL_TYPES } from "@/surfboard/services/analyticsService";
import { findPillarMatchIds } from "@/surfboard/services/planSearchService";
import { planNumberSearchClauses } from "@/surfboard/utils/planNumber";
import {
  computeDisplayStatus,
  PLAN_QUERY_SELECT,
  PLAN_STATUS_COLUMNS,
  PLAN_STATUS_SELECT,
  planQueries,
  queriedPlanWhere,
  readyPlanWhere,
  stageStates,
  type ApprovalState,
  type DisplayStatus,
  type PlanQueryRow,
  type PlanStatusRow,
  type StageKey,
} from "@/surfboard/utils/planStatus";
import type { PlanSummaryParams } from "@/surfboard/utils/planSummaryQuery";

/**
 * The lean plan list behind the mobile app's Plans tab (TASK-0015 1D.1, 1D.2):
 * a few hundred bytes per plan instead of geometry, pillars, parcels and file
 * arrays, with one `displayStatus` worked out by `surfboard/utils/planStatus.ts`.
 * It never returns a stored file link, another person's email or contact
 * details, or a share list, and a plan seen through a share carries no
 * reviewer comments and no information about the owner's payment.
 */

export type PlanSummaryQuery = {
  stage: StageKey;
  label: string;
  comment: string | null;
  at: string | null;
};

export type PlanSummary = {
  id: string;
  planNumber: string;
  surveyTitle: string;
  planType: string;
  facilitator: string;
  displayStatus: DisplayStatus;
  /** Each review's state, null as PENDING. */
  stages: Record<StageKey, ApprovalState>;
  /** Who queried the plan and why. Only the owner sees these; empty when nothing is queried. */
  queries: PlanSummaryQuery[];
  physicalCopySubmitted: boolean;
  /** Whether a record copy exists. The link is never sent here. */
  hasRecordCopy: boolean;
  lga: string | null;
  ward: string | null;
  lcda: string | null;
  locality: string | null;
  state: string | null;
  dateOnSurveyPlan: string | null;
  dateLodged: string | null;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
  /** How many people the owner shared it with (0 when seen through a share). */
  sharedCount: number;
  /** Who shared it, for a plan seen through a share. */
  ownerName: string | null;
};

export type PlanCounts = {
  mine: number;
  sharedWithMe: number;
  queried: number;
  readyForPhysicalSubmission: number;
};

/** More plans than this cannot be filtered by status in one request. A surveyor has hundreds. */
export const STATUS_FILTER_SCAN_LIMIT = 5000;

const SUMMARY_COLUMNS = {
  id: true,
  planNumber: true,
  surveyTitle: true,
  planType: true,
  facilitator: true,
  lga: true,
  ward: true,
  lcda: true,
  locality: true,
  state: true,
  dateOnSurveyPlan: true,
  dateLodged: true,
  createdAt: true,
  updatedAt: true,
  // Read only to say that a record copy exists and how many people it is shared
  // with; neither value leaves this file.
  redCopyFileUrl: true,
  sharedTo: true,
  ...PLAN_STATUS_COLUMNS,
} as const;

const MINE_SELECT = {
  ...SUMMARY_COLUMNS,
  ...PLAN_QUERY_SELECT,
  batch: PLAN_STATUS_SELECT.batch,
} as const satisfies Prisma.SurfboardPlanSelect;

const SHARED_SELECT = {
  ...SUMMARY_COLUMNS,
  user: { select: { firstName: true, lastName: true } },
} as const satisfies Prisma.SurfboardPlanSelect;

type SummaryRow = PlanStatusRow &
  Partial<PlanQueryRow> & {
    id: string;
    planNumber: string;
    surveyTitle: string;
    planType: string;
    facilitator: string;
    lga: string | null;
    ward: string | null;
    lcda: string | null;
    locality: string | null;
    state: string | null;
    dateOnSurveyPlan: Date | null;
    dateLodged: Date | null;
    createdAt: Date;
    updatedAt: Date;
    redCopyFileUrl: string | null;
    sharedTo: string[];
    user?: { firstName: string; lastName: string } | null;
  };

const NO_QUERY_COLUMNS: PlanQueryRow = {
  accountsComment: null,
  accountsApprovedAt: null,
  chartingComment: null,
  chartingApprovedAt: null,
  surconComment: null,
  surconApprovedAt: null,
  recordsIComment: null,
  recordsIApprovedAt: null,
  intakeComment: null,
  intakeApprovedAt: null,
  recordsIIComment: null,
  recordsIIApprovedAt: null,
};

const iso = (date: Date | null | undefined) =>
  date ? date.toISOString() : null;

export function toPlanSummary(
  row: SummaryRow,
  viewer: "owner" | "shared"
): PlanSummary {
  const owner = viewer === "owner";
  return {
    id: row.id,
    planNumber: row.planNumber,
    surveyTitle: row.surveyTitle,
    planType: row.planType,
    facilitator: row.facilitator,
    displayStatus: computeDisplayStatus(row),
    stages: stageStates(row),
    queries: owner
      ? planQueries({ ...NO_QUERY_COLUMNS, ...row }).map((q) => ({
          ...q,
          at: iso(q.at),
        }))
      : [],
    physicalCopySubmitted: row.physicalCopySubmitted,
    hasRecordCopy: !!row.redCopyFileUrl,
    lga: row.lga,
    ward: row.ward,
    lcda: row.lcda,
    locality: row.locality,
    state: row.state,
    dateOnSurveyPlan: iso(row.dateOnSurveyPlan),
    dateLodged: iso(row.dateLodged),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    isOwner: owner,
    sharedCount: owner ? row.sharedTo.length : 0,
    ownerName: owner
      ? null
      : [row.user?.firstName, row.user?.lastName].filter(Boolean).join(" ") ||
        null,
  };
}

const like = (value: string) => ({
  contains: value,
  mode: "insensitive" as const,
});
const exactly = (value: string) => ({
  equals: value,
  mode: "insensitive" as const,
});

/** The database filter for everything except the status: scope, search, and the exact filters. */
export async function buildSummaryWhere(
  userId: string,
  params: PlanSummaryParams
): Promise<Prisma.SurfboardPlanWhereInput> {
  const base: Prisma.SurfboardPlanWhereInput =
    params.scope === "mine"
      ? { userId, deleted: false }
      : { sharedTo: { has: userId }, deleted: false };
  const all: Prisma.SurfboardPlanWhereInput[] = [];

  if (params.search) {
    const pillarIds = await findPillarMatchIds(
      params.search,
      userId,
      params.scope
    );
    all.push({
      OR: [
        ...(planNumberSearchClauses(
          params.search
        ) as Prisma.SurfboardPlanWhereInput[]),
        { surveyTitle: like(params.search) },
        { facilitator: like(params.search) },
        { lga: like(params.search) },
        { ward: like(params.search) },
        { lcda: like(params.search) },
        { locality: like(params.search) },
        ...(pillarIds.length > 0 ? [{ id: { in: pillarIds } }] : []),
      ],
    });
  }
  if (params.planType.length > 0)
    all.push({ planType: { in: params.planType } });
  if (params.provisional === "exclude") {
    all.push({ planType: { notIn: PROVISIONAL_TYPES } });
  } else if (params.provisional === "only") {
    all.push({ planType: { in: PROVISIONAL_TYPES } });
  }
  if (params.facilitator)
    all.push({ facilitator: exactly(params.facilitator) });
  if (params.lga) all.push({ lga: exactly(params.lga) });
  if (params.ward) all.push({ ward: exactly(params.ward) });
  if (params.lcda) all.push({ lcda: exactly(params.lcda) });
  if (params.dateFrom || params.dateTo) {
    all.push({
      dateOnSurveyPlan: {
        ...(params.dateFrom ? { gte: params.dateFrom } : {}),
        ...(params.dateTo ? { lte: params.dateTo } : {}),
      },
    });
  }

  return all.length > 0 ? { ...base, AND: all } : base;
}

/** The sort the person asked for, then the id, so pages never repeat or skip a plan. */
function orderByFor(
  params: PlanSummaryParams
): Prisma.SurfboardPlanOrderByWithRelationInput[] {
  const primary =
    params.sortField === "dateOnSurveyPlan"
      ? { dateOnSurveyPlan: { sort: params.sortOrder, nulls: "last" as const } }
      : ({
          [params.sortField]: params.sortOrder,
        } as Prisma.SurfboardPlanOrderByWithRelationInput);
  return [primary, { id: "asc" }];
}

export async function getPlanSummaries(
  userId: string,
  params: PlanSummaryParams
): Promise<Paginated<PlanSummary>> {
  const where = await buildSummaryWhere(userId, params);
  const orderBy = orderByFor(params);
  const owner = params.scope === "mine";
  const viewer = owner ? "owner" : "shared";
  const select = owner ? MINE_SELECT : SHARED_SELECT;

  // No status filter: the database pages the list.
  if (params.displayStatus.length === 0) {
    return paginateQuery(
      async (skip, take) => {
        const rows = await prisma.surfboardPlan.findMany({
          where,
          select,
          orderBy,
          skip,
          take,
        });
        return rows.map((row) => toPlanSummary(row as SummaryRow, viewer));
      },
      () => prisma.surfboardPlan.count({ where }),
      params.page,
      params.pageSize
    );
  }

  // A status filter: the status is worked out in code (it depends on nine
  // columns and the batch), so read the cheap columns of every plan in scope in
  // the requested order, keep the ones that match, then load only the page.
  const candidates = await prisma.surfboardPlan.findMany({
    where,
    orderBy,
    select: owner
      ? { id: true, ...PLAN_STATUS_SELECT }
      : { id: true, ...PLAN_STATUS_COLUMNS },
    take: STATUS_FILTER_SCAN_LIMIT + 1,
  });
  if (candidates.length > STATUS_FILTER_SCAN_LIMIT) {
    throw new ValidationError({
      displayStatus: {
        _errors: [
          "Too many plans to filter by status; narrow the search or the dates first",
        ],
      },
    });
  }

  const wanted = new Set<string>(params.displayStatus);
  const matching = candidates.filter((row) =>
    wanted.has(computeDisplayStatus(row as PlanStatusRow).code)
  );
  const lastPage = Math.max(1, Math.ceil(matching.length / params.pageSize));
  const page = Math.min(params.page, lastPage);
  const pageIds = matching
    .slice((page - 1) * params.pageSize, page * params.pageSize)
    .map((row) => row.id);

  const rows =
    pageIds.length > 0
      ? await prisma.surfboardPlan.findMany({
          where: { id: { in: pageIds } },
          select,
        })
      : [];
  const byId = new Map(rows.map((row) => [row.id, row as SummaryRow]));
  const items = pageIds
    .map((id) => byId.get(id))
    .filter((row): row is SummaryRow => !!row)
    .map((row) => toPlanSummary(row, viewer));

  return paginatedResult(items, matching.length, page, params.pageSize);
}

/** The numbers on the Plans tab and its badges, without loading a single plan. */
export async function getPlanCounts(userId: string): Promise<PlanCounts> {
  const own = { userId, deleted: false };
  const [mine, sharedWithMe, queried, ready] = await Promise.all([
    prisma.surfboardPlan.count({ where: own }),
    prisma.surfboardPlan.count({
      where: { sharedTo: { has: userId }, deleted: false },
    }),
    prisma.surfboardPlan.count({ where: { ...own, ...queriedPlanWhere } }),
    prisma.surfboardPlan.count({ where: { ...own, ...readyPlanWhere } }),
  ]);
  return {
    mine,
    sharedWithMe,
    queried,
    readyForPhysicalSubmission: ready,
  };
}
