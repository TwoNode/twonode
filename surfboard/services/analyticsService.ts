import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated";
import { SurfboardRole } from "@/utils/platform";
import { getRoleFieldPrefix } from "@/surfboard/services/planLockService";
import { ForbiddenError } from "@/lib/api/errors";

/**
 * New for Phase 2 (2026-08-24 request) — role/platform-scoped analytics.
 * `getStatCards`/`getDimensionBreakdown`/`getLodgementTrend`/`getTimeTrend`
 * extend `getDashboardAnalytics` (the source, in surfboardActions.ts, only
 * ever scoped to one surveyor's own plans) to also serve ADMIN/SUPERADMIN's
 * full-population view — same queries, an optional userId scope. MDA stage
 * roles get their own `getMdaStageStats` instead (queue depth + time-in-
 * stage, not the global stats — per the spec, optimizing the whole
 * platform's lodgement trend isn't an MDA officer's job). Route layer
 * decides which function a given role can call, same convention
 * batchApprovalService.ts established.
 */

export type AnalyticsScope = { role: SurfboardRole; userId: string };
export type AnalyticsDimension = "facilitator" | "lga" | "ward" | "lcda";
/** Dashboard-wide date filter, applied against `dateOnSurveyPlan` (not createdAt) — matches the same field the plans list/shared endpoints already filter on. */
export type AnalyticsDateRange = { from?: Date; to?: Date };

export const PROVISIONAL_TYPES = ["PROVISIONAL", "PROVISIONAL LAYOUT"];

/** "REGULAR"/"REGULAR + ADJOINING" bucket as Regular; everything else (SPECIAL, SPECIAL + ADJOINING, RE-ESTABLISHMENT) buckets as Special. */
const REGULAR_PILLAR_TYPES = new Set(["REGULAR", "REGULAR + ADJOINING"]);
function pillarBucket(pillarType: string): "Regular" | "Special" {
  return REGULAR_PILLAR_TYPES.has(pillarType) ? "Regular" : "Special";
}

function dateRangeWhere(range?: AnalyticsDateRange) {
  if (!range || (!range.from && !range.to)) return {};
  const dateOnSurveyPlan: Prisma.DateTimeFilter = {};
  if (range.from) dateOnSurveyPlan.gte = range.from;
  if (range.to) dateOnSurveyPlan.lte = range.to;
  return { dateOnSurveyPlan };
}

/** ADMIN/SUPERADMIN see the full population; USER is scoped to their own plans. */
function scopeWhere(scope: AnalyticsScope) {
  return scope.role === SurfboardRole.USER ? { userId: scope.userId } : {};
}

export interface StatCards {
  totalPlansCount: number;
  provisionalPlansCount: number;
  pendingBatchesCount: number;
  pendingCertificatePlansCount: number;
}

/**
 * Two separate pending-certificate stat cards (resolved 2026-08-26, per the
 * spec's open question) — batch-level (CertificateOfDepositBatch not yet
 * COMPLETED) and plan-level (SurfboardPlan.redCopyStatus actively SUBMITTED
 * or QUERIED — excludes NOT_SUBMITTED, which hasn't entered the certificate
 * pipeline at all) measure different things for different audiences, so
 * both ship rather than picking one.
 */
export async function getStatCards(scope: AnalyticsScope): Promise<StatCards> {
  const where = scopeWhere(scope);

  const [totalPlansCount, provisionalPlansCount, pendingBatchesCount, pendingCertificatePlansCount] =
    await Promise.all([
      prisma.surfboardPlan.count({
        where: { ...where, deleted: false, planType: { notIn: PROVISIONAL_TYPES } },
      }),
      prisma.surfboardPlan.count({
        where: { ...where, deleted: false, planType: { in: PROVISIONAL_TYPES } },
      }),
      prisma.certificateOfDepositBatch.count({
        where: {
          paymentStatus: { not: "COMPLETED" },
          ...(scope.role === SurfboardRole.USER ? { submittedBy: scope.userId } : {}),
        },
      }),
      prisma.surfboardPlan.count({
        where: {
          ...where,
          deleted: false,
          planType: { notIn: PROVISIONAL_TYPES },
          redCopyStatus: { in: ["SUBMITTED", "QUERIED"] },
        },
      }),
    ]);

  return { totalPlansCount, provisionalPlansCount, pendingBatchesCount, pendingCertificatePlansCount };
}

export interface DimensionBreakdownRow {
  key: string;
  count: number;
  totalDeededArea?: number;
  // Multi-variable breakdown support
  subBreakdowns?: Array<{ key: string; count: number }>;
}

/**
 * Facilitator/LGA/Ward/LCDA-vs-Records — one function, `dimension` selects
 * the GROUP BY column, matching the source's facilitatorStats/lgaStats (same
 * shape, same exclusion rules), scoped per role. Ward and LCDA follow the
 * lga path (plain count, no deeded-area sum).
 */
export async function getDimensionBreakdown(
  scope: AnalyticsScope,
  dimension: AnalyticsDimension,
  range?: AnalyticsDateRange
): Promise<DimensionBreakdownRow[]> {
  const where = { ...scopeWhere(scope), ...dateRangeWhere(range) };
  const column = dimension; // "facilitator" | "lga" | "ward" | "lcda" — all real SurfboardPlan columns

  const grouped = await prisma.surfboardPlan.groupBy({
    by: [column],
    where: { ...where, planType: { notIn: PROVISIONAL_TYPES }, [column]: { not: "" } } as any,
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  if (dimension !== "facilitator") {
    return grouped.map((row: any) => ({ key: row[column] || "Unknown", count: row._count.id }));
  }

  // Facilitator breakdown also sums deededArea (matches the source's
  // processedFacilitatorStats) — a second query rather than trying to sum a
  // free-text field in the groupBy itself.
  const plansWithArea = await prisma.surfboardPlan.findMany({
    where: { ...where, planType: { notIn: PROVISIONAL_TYPES }, facilitator: { not: "" }, deededArea: { not: "" } },
    select: { facilitator: true, deededArea: true },
  });

  return grouped.map((row: any) => {
    const facilitator = row.facilitator || "Unknown";
    const totalDeededArea = plansWithArea
      .filter((p) => p.facilitator === facilitator)
      .reduce((sum, p) => {
        const value = parseFloat(p.deededArea.replace(/[^0-9.]/g, ""));
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
    return { key: facilitator, count: row._count.id, totalDeededArea };
  });
}

export interface TopSurveyorRow {
  userId: string;
  name: string;
  companyName: string | null;
  count: number;
}

/**
 * Surveyors ranked by how many plans they have on the platform — counted the
 * same way as the Total Plans stat card (deleted plans and provisional types
 * are left out), optionally within a survey-plan date range. Ties break by
 * name so the order is stable between loads. A whole-platform ranking, so
 * ADMIN/SUPERADMIN only; a surveyor asking for it is refused rather than
 * handed a list of one.
 */
export async function getTopSurveyors(
  scope: AnalyticsScope,
  limit = 5,
  range?: AnalyticsDateRange
): Promise<TopSurveyorRow[]> {
  if (scope.role === SurfboardRole.USER) throw new ForbiddenError();

  const grouped = await prisma.surfboardPlan.groupBy({
    by: ["userId"],
    where: { ...dateRangeWhere(range), deleted: false, userId: { not: null }, planType: { notIn: PROVISIONAL_TYPES } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  if (grouped.length === 0) return [];

  const users = await prisma.surfboardUser.findMany({
    where: { id: { in: grouped.flatMap((g) => (g.userId ? [g.userId] : [])) } },
    select: { id: true, firstName: true, lastName: true, companyName: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return grouped
    .flatMap((g) => (g.userId ? [{ userId: g.userId, count: g._count.id }] : []))
    .map((g) => {
      const u = byId.get(g.userId);
      return {
        userId: g.userId,
        name: u ? `${u.firstName} ${u.lastName}`.trim() : "Unknown surveyor",
        companyName: u?.companyName ?? null,
        count: g.count,
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export interface LodgementTrendPoint {
  days: number;
  count: number;
}

export interface LodgementTrend {
  points: LodgementTrendPoint[];
  excludedCount: number;
}

/**
 * Days from dateOnSurveyPlan to dateLodged, histogrammed. New (2026-08-24
 * request) — has no equivalent in the source. Plans missing either date are
 * excluded from the histogram (a diff against null is meaningless) and
 * counted separately so the exclusion is visible, not silently dropped.
 */
export async function getLodgementTrend(scope: AnalyticsScope): Promise<LodgementTrend> {
  const conditions = [
    Prisma.sql`deleted = false`,
    Prisma.sql`"dateLodged" IS NOT NULL`,
    Prisma.sql`"dateOnSurveyPlan" IS NOT NULL`,
  ];
  if (scope.role === SurfboardRole.USER) {
    conditions.push(Prisma.sql`"userId" = ${scope.userId}`);
  }

  const rows = await prisma.$queryRaw<{ days: number; count: bigint }[]>`
    SELECT EXTRACT(DAY FROM ("dateLodged" - "dateOnSurveyPlan"))::integer as days, COUNT(*)::bigint as count
    FROM "SurfboardPlan"
    WHERE ${Prisma.join(conditions, " AND ")}
    GROUP BY days
    ORDER BY days ASC
  `;

  const excludedCount = await prisma.surfboardPlan.count({
    where: {
      ...scopeWhere(scope),
      deleted: false,
      OR: [{ dateLodged: null }, { dateOnSurveyPlan: null }],
    },
  });

  return {
    points: rows.map((r) => ({ days: r.days, count: Number(r.count) })),
    excludedCount,
  };
}

export interface TimeTrendPoint {
  period: string;
  count: number;
}

/**
 * 12-month creation trend, scoped per role. Uses a type-safe Prisma query
 * (not $queryRaw) — the original raw-SQL version intermittently threw
 * `argument of WHERE must be type boolean, not type jsonb` under concurrent
 * load (part of the same Promise.all batch as several other queries in
 * `getUserDashboardAnalytics`); reproduced only under that concurrency, never
 * in isolation, pointing at a prepared-statement/connection-pool collision
 * between concurrent $queryRaw calls rather than a logic bug. Bucketing in
 * JS instead of via DATE_TRUNC/TO_CHAR removes the raw query — and that
 * collision surface — entirely.
 */
/**
 * Buckets by `dateOnSurveyPlan` (matching the dashboard's own date-range
 * filter, which is explicitly scoped to that field — see
 * DateRangeFilter's "Survey plan date" label) whenever a range is given,
 * so this chart's counts move in step with every other filtered stat
 * instead of quietly staying on an all-time "last 12 months by createdAt"
 * view while the rest of the dashboard reads zero. With no range (the
 * unfiltered admin time-trend section), falls back to the original
 * createdAt/12-months window.
 */
export async function getTimeTrend(scope: AnalyticsScope, range?: AnalyticsDateRange): Promise<TimeTrendPoint[]> {
  const where: Prisma.SurfboardPlanWhereInput = {
    planType: { notIn: PROVISIONAL_TYPES },
  };
  if (scope.role === SurfboardRole.USER) {
    where.userId = scope.userId;
  }

  const filteringByRange = !!(range?.from || range?.to);
  if (filteringByRange) {
    Object.assign(where, dateRangeWhere(range));
  } else {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    where.createdAt = { gte: twelveMonthsAgo };
  }

  const plans = await prisma.surfboardPlan.findMany({ where, select: { createdAt: true, dateOnSurveyPlan: true } });

  const counts = new Map<string, number>();
  for (const plan of plans) {
    const date = filteringByRange ? plan.dateOnSurveyPlan : plan.createdAt;
    if (!date) continue;
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, count]) => ({ period, count }));
}

export interface UserDashboardAnalytics {
  totalPlansCount: number;
  provisionalPlansCount: number;
  facilitatorStats: { facilitator: string; count: number; totalArea: number }[];
  lgaStats: { lga: string; count: number }[];
  pendingCertificates: {
    id: string;
    planNumber: string;
    surveyTitle: string;
    facilitator: string;
    updatedAt: Date;
    planType: string;
    status: string;
  }[];
  pendingCertificatesCount: number;
  pillarStats: { type: string; count: number; isRegular: boolean }[];
  timeTrends: TimeTrendPoint[];
  pendingCount: number;
  lodgedCount: number;
  queriedCount: number;
}

/** Own-plans-only dashboard analytics for a single surveyor — ported unchanged from surfboardActions.ts's getDashboardAnalytics. */
export async function getUserDashboardAnalytics(
  userId: string,
  range?: AnalyticsDateRange
): Promise<UserDashboardAnalytics> {
  const excludeProvisional = { notIn: PROVISIONAL_TYPES };
  const dateWhere = dateRangeWhere(range);
  const pendingCertificateWhere = {
    userId,
    surveyTitle: { not: "" },
    ...dateWhere,
    certificateFilePaths: { isEmpty: true },
  };

  const [
    totalPlansCount,
    provisionalPlansCount,
    facilitatorStats,
    plansWithDeededArea,
    lgaStats,
    pendingCertificates,
    pendingCertificatesCount,
    pillarPlans,
    timeTrends,
    pendingCount,
    lodgedCount,
    queriedCount,
  ] = await Promise.all([
      prisma.surfboardPlan.count({ where: { userId, planType: excludeProvisional, ...dateWhere } }),
      prisma.surfboardPlan.count({ where: { userId, planType: { in: PROVISIONAL_TYPES }, ...dateWhere } }),
      prisma.surfboardPlan.groupBy({
        by: ["facilitator"],
        where: { userId, planType: excludeProvisional, facilitator: { not: "" }, ...dateWhere },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.surfboardPlan.findMany({
        where: { userId, planType: excludeProvisional, facilitator: { not: "" }, deededArea: { not: "" }, ...dateWhere },
        select: { facilitator: true, deededArea: true },
      }),
      prisma.surfboardPlan.groupBy({
        by: ["lga"],
        where: { userId, planType: excludeProvisional, lga: { not: "" }, ...dateWhere },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.surfboardPlan.findMany({
        where: pendingCertificateWhere,
        select: { id: true, planNumber: true, surveyTitle: true, facilitator: true, updatedAt: true, planType: true, status: true },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.surfboardPlan.count({ where: pendingCertificateWhere }),
      prisma.surfboardPlan.findMany({
        where: { userId, planType: excludeProvisional, pillarType: { not: "" }, ...dateWhere },
        select: { pillarType: true, pillars: true },
      }),
      getTimeTrend({ role: SurfboardRole.USER, userId }, range),
      prisma.surfboardPlan.count({ where: { userId, status: "PENDING", ...dateWhere } }),
      prisma.surfboardPlan.count({ where: { userId, status: "LODGED", ...dateWhere } }),
      prisma.surfboardPlan.count({ where: { userId, status: "QUERIED", ...dateWhere } }),
  ]);

  const pillarBuckets = { Regular: 0, Special: 0 };
  for (const plan of pillarPlans) {
    const bucket = pillarBucket(plan.pillarType);
    pillarBuckets[bucket] += Array.isArray(plan.pillars) ? plan.pillars.length : 0;
  }
  const pillarStats = [
    { type: "Regular", count: pillarBuckets.Regular, isRegular: true },
    { type: "Special", count: pillarBuckets.Special, isRegular: false },
  ];

  const processedFacilitatorStats = facilitatorStats.map((stat) => {
    const totalDeededArea = plansWithDeededArea
      .filter((plan) => plan.facilitator === stat.facilitator)
      .reduce((sum, plan) => {
        const areaValue = parseFloat(plan.deededArea.replace(/[^0-9.]/g, ""));
        return sum + (isNaN(areaValue) ? 0 : areaValue);
      }, 0);
    return { facilitator: stat.facilitator || "Unknown", count: stat._count.id, totalArea: totalDeededArea };
  });

  return {
    totalPlansCount,
    provisionalPlansCount,
    facilitatorStats: processedFacilitatorStats,
    lgaStats: lgaStats.map((stat) => ({ lga: stat.lga || "Unknown", count: stat._count.id })),
    pendingCertificates: pendingCertificates.map((cert) => ({
      id: cert.id,
      planNumber: cert.planNumber,
      surveyTitle: cert.surveyTitle || "Untitled Survey",
      facilitator: cert.facilitator || "Unknown",
      updatedAt: cert.updatedAt,
      planType: cert.planType,
      status: cert.status,
    })),
    pendingCertificatesCount,
    pillarStats,
    timeTrends,
    pendingCount,
    lodgedCount,
    queriedCount,
  };
}

// --- MDA stage-scoped analytics ---

export type MdaStageRole = Exclude<SurfboardRole, "USER" | "ADMIN" | "SUPERADMIN" | "MDA_SUPERADMIN">;

interface StageConfig {
  statusField: string;
  approvedAtField: string;
  /** Column marking when this stage's clock starts. */
  startAtField: string;
}

/**
 * Field names are derived from planLockService.ts's ROLE_FIELD_PREFIX (the
 * same role -> "accounts"/"charting"/... table it uses to build lock field
 * names) rather than a second hand-written copy of the same mapping.
 *
 * ACCOUNTS/CHARTING/SURCON/RECORDS_I run in parallel and all start at
 * redCopySubmittedAt (confirmed — batchApprovalService's chain runs these
 * four independently before Intake). RECORDS_II starts once Intake clears.
 * INTAKE's true start is "once all 4 parallel stages clear," which needs a
 * GREATEST() over 4 nullable columns — approximated here as
 * redCopySubmittedAt too rather than adding that complexity for one stage;
 * this means Intake's avgTimeInStageDays reads slightly high (it includes
 * the parallel stages' own time), documented rather than hidden.
 */
const STAGE_START_OVERRIDE: Partial<Record<Exclude<MdaStageRole, "ARCHIVE">, string>> = {
  RECORDS_II: "intakeApprovedAt",
};

function stageConfigFor(role: Exclude<MdaStageRole, "ARCHIVE">): StageConfig {
  const prefix = getRoleFieldPrefix(role);
  return {
    statusField: `${prefix}Status`,
    approvedAtField: `${prefix}ApprovedAt`,
    startAtField: STAGE_START_OVERRIDE[role] ?? "redCopySubmittedAt",
  };
}

export interface MdaStageStats {
  queueDepth: number;
  avgTimeInStageDays: number | null;
}

export async function getMdaStageStats(role: MdaStageRole): Promise<MdaStageStats> {
  if (role === "ARCHIVE") {
    // No archiveStatus enum exists — markPlanArchived's own gate (all 6
    // upstream statuses APPROVED) is the real "ready for archive" queue.
    const [queueDepth, rows] = await Promise.all([
      prisma.surfboardPlan.count({
        where: {
          deleted: false,
          archiveReceivedAt: null,
          accountsStatus: "APPROVED",
          chartingStatus: "APPROVED",
          surconStatus: "APPROVED",
          recordsIStatus: "APPROVED",
          intakeStatus: "APPROVED",
          recordsIIStatus: "APPROVED",
        },
      }),
      prisma.$queryRaw<{ avgDays: number | null }[]>`
        SELECT (AVG(EXTRACT(EPOCH FROM ("archiveReceivedAt" - "recordsIIApprovedAt")) / 86400))::float8 as "avgDays"
        FROM "SurfboardPlan"
        WHERE "archiveReceivedAt" IS NOT NULL AND "recordsIIApprovedAt" IS NOT NULL AND deleted = false
      `,
    ]);
    return { queueDepth, avgTimeInStageDays: rows[0]?.avgDays ?? null };
  }

  const cfg = stageConfigFor(role);
  const [queueDepth, rows] = await Promise.all([
    prisma.surfboardPlan.count({ where: { deleted: false, [cfg.statusField]: "PENDING" } as any }),
    prisma.$queryRaw<{ avgDays: number | null }[]>`
      SELECT (AVG(EXTRACT(EPOCH FROM (${Prisma.raw(`"${cfg.approvedAtField}"`)} - ${Prisma.raw(`"${cfg.startAtField}"`)})) / 86400))::float8 as "avgDays"
      FROM "SurfboardPlan"
      WHERE ${Prisma.raw(`"${cfg.approvedAtField}"`)} IS NOT NULL AND ${Prisma.raw(`"${cfg.startAtField}"`)} IS NOT NULL AND deleted = false
    `,
  ]);

  return { queueDepth, avgTimeInStageDays: rows[0]?.avgDays ?? null };
}
