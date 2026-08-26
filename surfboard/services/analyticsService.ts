import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated";
import { SurfboardRole } from "@/utils/platform";
import { getRoleFieldPrefix } from "@/surfboard/services/planLockService";

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
export type AnalyticsDimension = "facilitator" | "lga";

const PROVISIONAL_TYPES = ["PROVISIONAL", "PROVISIONAL_LAYOUT"];

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
 * COMPLETED) and plan-level (SurfboardPlan.redCopyStatus not yet a terminal
 * state) measure different things for different audiences, so both ship
 * rather than picking one.
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
        where: { ...where, deleted: false, redCopyStatus: { notIn: ["APPROVED", "FAILED"] } },
      }),
    ]);

  return { totalPlansCount, provisionalPlansCount, pendingBatchesCount, pendingCertificatePlansCount };
}

export interface DimensionBreakdownRow {
  key: string;
  count: number;
  totalDeededArea?: number;
}

/**
 * Facilitator-vs-Records / LGA-vs-Records — one function, `dimension`
 * selects the GROUP BY column, matching the source's facilitatorStats/
 * lgaStats (same shape, same exclusion rules), scoped per role.
 */
export async function getDimensionBreakdown(
  scope: AnalyticsScope,
  dimension: AnalyticsDimension
): Promise<DimensionBreakdownRow[]> {
  const where = scopeWhere(scope);
  const column = dimension; // "facilitator" | "lga" — both real SurfboardPlan columns

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
  const userFilter = scope.role === SurfboardRole.USER ? Prisma.sql`AND "userId" = ${scope.userId}` : Prisma.empty;

  const rows = await prisma.$queryRaw<{ days: number; count: bigint }[]>`
    SELECT EXTRACT(DAY FROM ("dateLodged" - "dateOnSurveyPlan"))::integer as days, COUNT(*)::bigint as count
    FROM "SurfboardPlan"
    WHERE deleted = false AND "dateLodged" IS NOT NULL AND "dateOnSurveyPlan" IS NOT NULL
    ${userFilter}
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

/** 12-month creation trend — ported from the source unchanged, scoped per role. */
export async function getTimeTrend(scope: AnalyticsScope): Promise<TimeTrendPoint[]> {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const userFilter = scope.role === SurfboardRole.USER ? Prisma.sql`AND "userId" = ${scope.userId}` : Prisma.empty;

  const rows = await prisma.$queryRaw<{ month: string; count: number }[]>`
    SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month, COUNT(*)::integer as count
    FROM "SurfboardPlan"
    WHERE "planType" NOT IN (${Prisma.join(PROVISIONAL_TYPES)}) AND "createdAt" >= ${twelveMonthsAgo}
    ${userFilter}
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY month ASC
  `;

  return rows.map((r) => ({ period: r.month, count: r.count }));
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
