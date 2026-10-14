import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated";
import QRCode from "qrcode";
import crypto from "crypto";
import { headers } from "next/headers";
import {
  computeGeometryDetails,
  type GeometryInput,
} from "@/app/(projects)/(surfboard)/utils/dbUtils";
import {
  deleteMultipleSurfboardFilesFromS3WithUrl,
  uploadSurfboardFileToS3,
} from "@/surfboard/services/awsService";
import {
  notifyPlanCreated,
  notifyPlanShared,
  notifyPlanUpdate,
  notifyPlanUpdated,
} from "@/surfboard/services/notificationService";
import {
  getPlanQRAccessState,
  incrementPlanQRScanCount,
} from "@/surfboard/services/qrEarningsService";
import { requireActiveSubscription } from "@/surfboard/services/subscriptionService";
import { PLAN_TYPES } from "@/app/(projects)/(surfboard)/types/surfboardTypes";
import type { SurfboardPlanDTO } from "@/app/(projects)/(surfboard)/types/surfboardTypes";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/api/errors";
import { Platform, SurfboardRole } from "@/utils/platform";
import { paginatedResult } from "@/lib/api/pagination";
import { PROVISIONAL_TYPES } from "@/surfboard/services/analyticsService";
import { emailInUse } from "@/lib/auth/userLookup";
import { sendPlanShareInviteEmail } from "@/utils/email";
import { getSiteUrl } from "@/lib/siteUrl";
import {
  normalizePlanNumber,
  toStoredPlanNumber,
  planNumberSearchClauses,
  samePlanNumber,
} from "@/surfboard/utils/planNumber";

/**
 * Migrated from app/(projects)/(surfboard)/actions/surfboardActions.ts —
 * plan CRUD, QR/public access, sharing, attachments, geo lookups. The
 * largest remaining piece of Phase 2's `codActions.ts`-adjacent work.
 *
 * Three generations of plan-create logic and two of plan-update existed in
 * the source; only `createSurfPlan`/`updateSurfPlan` are migrated here —
 * `_createSurfPlan`/`_createPlan`/`_updatePlan`/`_getAllSurfPlans`/
 * `_deletePlanAttachment`/`addSurfUserToSharedSurfPlan`/
 * `removeSurfUserFromSharedSurfPlan`/`importDbDataFromCsv` were all
 * grep-confirmed dead (zero call sites) during the Phase 2 spec audit and
 * are not carried forward. `__handleIntersect` (exported despite the
 * naming) is a second, functionally-identical copy of `getAdminBoundaries`
 * with zero call sites of its own — also dropped, superseded by
 * `getAdminBoundaries`.
 */

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function isGeometryInput(value: any): value is GeometryInput {
  if (typeof value === "string") return true;
  if (!value || typeof value !== "object") return false;
  return value?.type === "Polygon" || value?.type === "MultiPolygon";
}

/** Every plan list/read function enriches geometry with computed area + centroid the same way. */
function withGeometry<T extends { id: string; geometry: any }>(
  plan: T
): T & { areaSqM: number; centroid: any } {
  if (!plan.geometry || !isGeometryInput(plan.geometry)) {
    return { ...plan, areaSqM: 0, centroid: null };
  }
  try {
    const { areaSqM, centroid } = computeGeometryDetails(plan.geometry);
    return { ...plan, areaSqM, centroid };
  } catch (error) {
    console.error(`Error calculating geometry for plan ${plan.id}:`, error);
    return { ...plan, areaSqM: 0, centroid: null };
  }
}

/**
 * createSurfPlan/updateSurfPlan/updateSurfPlanStatus/sharePlanWithUser all
 * need the caller's display name for notification text (the source read
 * this off the cookie-derived user object) — the native JWT session only
 * carries {sub, role, platform}, so routes resolve it once via this helper.
 */
export async function getUserDisplayName(
  userId: string
): Promise<{ firstName: string; lastName: string }> {
  const user = await prisma.surfboardUser.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  });
  return { firstName: user?.firstName ?? "", lastName: user?.lastName ?? "" };
}

function isValidPlanId(planId: string): boolean {
  return (
    typeof planId === "string" &&
    planId.length >= 20 &&
    planId.length <= 100 &&
    /^[a-f0-9-]+$/i.test(planId)
  );
}

const statusMap: Record<
  string,
  "PENDING" | "LODGED" | "QUERIED" | "UNDER_REVIEW"
> = {
  Draft: "PENDING",
  Pending: "PENDING",
  Lodged: "LODGED",
  Submitted: "LODGED",
  "In Review": "UNDER_REVIEW",
  Approved: "LODGED",
  Rejected: "QUERIED",
  PENDING: "PENDING",
  LODGED: "LODGED",
  UNDER_REVIEW: "UNDER_REVIEW",
  QUERIED: "QUERIED",
  APPROVED: "LODGED",
};

export interface PlanFilters {
  search?: string;
  status?: string[];
  planType?: string[];
  facilitator?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PlanSort {
  field:
    | "createdAt"
    | "updatedAt"
    | "surveyTitle"
    | "planNumber"
    | "status"
    | "dateOnSurveyPlan";
  order: "asc" | "desc";
}

const PLAN_LIST_SELECT = {
  id: true,
  planNumber: true,
  surveyTitle: true,
  planType: true,
  referencePlanNumber: true,
  deededArea: true,
  facilitator: true,
  pillarType: true,
  geometry: true,
  pdfFilePaths: true,
  cadFilePaths: true,
  certificateFilePaths: true,
  ward: true,
  lcda: true,
  lga: true,
  state: true,
  locality: true,
  pillarTypeReferencePlanNumber: true,
  parcels: true,
  pillars: true,
  status: true,
  isLive: true,
  dateOnSurveyPlan: true,
  dateLodged: true,
  reasonForWithdrawalAndResubmission: true,
  createdAt: true,
  updatedAt: true,
  sharedTo: true,
} as const;

/**
 * Prisma's native `Json` filters can only express exact array-element
 * containment, not "any element's field partial-matches X" — needs raw SQL.
 * Unindexed for now (confirmed with user): table is ~2,173 rows, small
 * enough that a full scan isn't a near-term concern; revisit with a
 * pg_trgm index if it grows large enough to matter.
 */
async function findPlanIdsByPillarNumber(search: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "SurfboardPlan"
    WHERE jsonb_typeof(pillars) = 'array'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(pillars) AS pillar
        WHERE pillar->>'pillarNumber' ILIKE ${"%" + search + "%"}
      )
    LIMIT 500
  `;
  return rows.map((r) => r.id);
}

async function buildPlanFilterWhere(
  filters: PlanFilters | undefined,
  base: any
) {
  const where: any = { ...base };
  if (!filters) return where;

  if (filters.search) {
    where.OR = [
      ...planNumberSearchClauses(filters.search),
      { surveyTitle: { contains: filters.search, mode: "insensitive" } },
      { facilitator: { contains: filters.search, mode: "insensitive" } },
    ];
    const pillarMatchIds = await findPlanIdsByPillarNumber(filters.search);
    if (pillarMatchIds.length > 0) {
      where.OR.push({ id: { in: pillarMatchIds } });
    }
  }
  if (filters.status?.length) {
    const dbStatuses = filters.status
      .map((s) => statusMap[s])
      .filter((s): s is NonNullable<typeof s> => s !== undefined);
    if (dbStatuses.length > 0) where.status = { in: dbStatuses };
  }
  if (filters.planType?.length) {
    where.planType = { in: filters.planType };
  }
  if (filters.facilitator) {
    where.facilitator = { contains: filters.facilitator, mode: "insensitive" };
  }
  if (filters.dateFrom || filters.dateTo) {
    where.dateOnSurveyPlan = {};
    if (filters.dateFrom)
      where.dateOnSurveyPlan.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const endOfDay = new Date(filters.dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      where.dateOnSurveyPlan.lte = endOfDay;
    }
  }
  return where;
}

// ---------------------------------------------------------------------------
// QR / public URL
// ---------------------------------------------------------------------------

interface QRCodeOptions {
  darkColor?: string;
  lightColor?: string;
  minLightAlpha?: number;
  margin?: number;
  scale?: number;
  width?: number;
  forceOpaque?: boolean;
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGBA_RE =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(\d*\.?\d+))?\s*\)$/i;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function hexToRgba(
  hex: string
): { r: number; g: number; b: number; a: number } | null {
  if (!HEX_RE.test(hex)) return null;
  const h = hex.replace("#", "");
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
      a: 1,
    };
  }
  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }
  if (h.length === 8) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: parseInt(h.slice(6, 8), 16) / 255,
    };
  }
  return null;
}

function parseColorToRgba(
  color: string
): { r: number; g: number; b: number; a: number } | null {
  if (!color) return null;
  if (color.toLowerCase() === "transparent")
    return { r: 255, g: 255, b: 255, a: 0 };
  const hex = hexToRgba(color);
  if (hex) return hex;
  const m = color.match(RGBA_RE);
  if (m) {
    return {
      r: clamp(parseInt(m[1], 10), 0, 255),
      g: clamp(parseInt(m[2], 10), 0, 255),
      b: clamp(parseInt(m[3], 10), 0, 255),
      a: m[4] !== undefined ? clamp(parseFloat(m[4]), 0, 1) : 1,
    };
  }
  return null;
}

function rgbaToHex({
  r,
  g,
  b,
  a,
}: {
  r: number;
  g: number;
  b: number;
  a: number;
}): string {
  const rr = clamp(Math.round(r), 0, 255).toString(16).padStart(2, "0");
  const gg = clamp(Math.round(g), 0, 255).toString(16).padStart(2, "0");
  const bb = clamp(Math.round(b), 0, 255).toString(16).padStart(2, "0");
  const aa = clamp(Math.round(a * 255), 0, 255)
    .toString(16)
    .padStart(2, "0");
  return aa.toUpperCase() === "FF"
    ? `#${rr}${gg}${bb}`.toUpperCase()
    : `#${rr}${gg}${bb}${aa}`.toUpperCase();
}

function withMinAlpha(
  color: string,
  minAlpha: number,
  fallback = "#ffffff"
): string {
  const parsed = parseColorToRgba(color) || parseColorToRgba(fallback);
  if (!parsed) return fallback.toUpperCase();
  const a = Math.max(parsed.a, clamp(minAlpha, 0, 1));
  return rgbaToHex({ ...parsed, a });
}

export async function getBaseUrl(): Promise<string> {
  if (
    process.env.BASE_URL ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.NODE_ENV === "production"
  )
    return getSiteUrl();

  try {
    const headersList = await headers();
    const host = headersList.get("host");
    const protocol = headersList.get("x-forwarded-proto") || "http";
    if (host) return `${protocol}://${host}`;
  } catch (error) {
    console.error("Error determining base URL from headers:", error);
  }
  return "http://localhost:3000";
}

export async function getPlanPublicUrl(planId: string): Promise<string> {
  if (!isValidPlanId(planId))
    throw new ValidationError({ planId: "Invalid plan ID format" });
  const baseUrl = await getBaseUrl();
  return `${baseUrl}/surfboardplan/${planId}`;
}

export async function generatePlanQRCode(
  userId: string,
  planId: string,
  options: QRCodeOptions = {}
): Promise<{ qrCodeDataUrl: string }> {
  await requireActiveSubscription(userId);
  if (!isValidPlanId(planId))
    throw new ValidationError({ planId: "Invalid plan ID format" });

  const plan = await prisma.surfboardPlan.findUnique({
    where: { id: planId, userId },
    select: { id: true, planNumber: true },
  });
  if (!plan) throw new NotFoundError("Plan (or access denied)");

  const baseUrl = await getBaseUrl();
  const publicUrl = `${baseUrl}/surfboardplan/${planId}`;

  const minLightAlpha = options.minLightAlpha ?? 0.3;
  const lightColor = withMinAlpha(
    options.lightColor ?? "#ffffff",
    minLightAlpha,
    "#ffffff"
  );
  const darkColor = options.darkColor ?? "#000000";
  const margin = Math.max(options.margin ?? 4, 4);
  const width = options.width;
  const scale = width ? undefined : (options.scale ?? 8);
  const type = options.forceOpaque
    ? ("image/jpeg" as const)
    : ("image/png" as const);

  const qrOptions: QRCode.QRCodeToDataURLOptions = {
    errorCorrectionLevel: "H",
    margin,
    ...(width ? { width } : { scale }),
    color: { dark: darkColor, light: lightColor + "70" },
    type,
    rendererOpts: type === "image/jpeg" ? { quality: 0.9 } : undefined,
  } as QRCode.QRCodeToDataURLOptions;

  const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, qrOptions);
  return { qrCodeDataUrl };
}

// ---------------------------------------------------------------------------
// Create / update (production paths only — see file header)
// ---------------------------------------------------------------------------

export async function createSurfPlan(
  userId: string,
  userFirstLastName: { firstName: string; lastName: string },
  dto: SurfboardPlanDTO
) {
  await requireActiveSubscription(userId);
  if (
    !dto.planNumber ||
    !dto.surveyTitle ||
    !dto.deededArea ||
    !dto.facilitator ||
    !dto.pillarType ||
    !dto.dateOnSurveyPlan
  ) {
    throw new ValidationError({ dto: "Missing required fields" });
  }
  if (!dto.geometry)
    throw new ValidationError({ geometry: "Geometry is required" });
  if (!dto.pillars || (Array.isArray(dto.pillars) && dto.pillars.length < 3)) {
    throw new ValidationError({ pillars: "At least 3 pillars are required" });
  }
  if ((dto.cadFilePaths?.length || 0) < 1)
    throw new ValidationError({
      cadFilePaths: "At least one CAD file is required",
    });
  if ((dto.pdfFilePaths?.length || 0) < 1)
    throw new ValidationError({
      pdfFilePaths: "At least one PDF file is required",
    });
  if (dto.certificateFilePaths?.length && !dto.dateLodged) {
    throw new ValidationError({
      dateLodged: "dateLodged is required when certificate files are present",
    });
  }

  let geometry: any = dto.geometry;
  try {
    if (typeof dto.geometry === "string") geometry = JSON.parse(dto.geometry);
    if (typeof geometry === "string") geometry = JSON.parse(geometry);
  } catch {
    geometry = dto.geometry;
  }

  const rec = await prisma.surfboardPlan.create({
    data: {
      planNumber: toStoredPlanNumber(dto.planNumber),
      planNumberKey: normalizePlanNumber(dto.planNumber) || null,
      surveyTitle: dto.surveyTitle,
      planType: dto.planType,
      referencePlanNumber: dto.referencePlanNumber || null,
      deededArea: dto.deededArea,
      facilitator: dto.facilitator,
      pillarType: dto.pillarType,
      geometry,
      pillars: dto.pillars || undefined,
      pdfFilePaths: dto.pdfFilePaths,
      cadFilePaths: dto.cadFilePaths,
      certificateFilePaths: dto.certificateFilePaths,
      dateOnSurveyPlan: new Date(dto.dateOnSurveyPlan),
      dateLodged: dto.dateLodged ? new Date(dto.dateLodged) : null,
      ward: dto.ward || null,
      lcda: dto.lcda || null,
      lga: dto.lga || null,
      state: dto.state || null,
      locality: dto.locality || null,
      isLive: dto.isLive ?? false,
      status: dto.certificateFilePaths?.length ? "LODGED" : "PENDING",
      userId,
      personCount: dto.personCount || 1,
      personCountVerified: false,
      withdrawalAndResubmissionStatus:
        dto.planType === PLAN_TYPES.WITHDRAWAL_AND_RESUBMISSION
          ? "Resubmitted"
          : "No_Action",
      reasonForWithdrawalAndResubmission:
        dto.reasonForWithdrawalAndResubmission || null,
      pillarTypeReferencePlanNumber: dto.pillarTypeReferencePlanNumber || null,
      parcels: (dto.parcels as any) || undefined,
    },
    select: {
      id: true,
      planNumber: true,
      referencePlanNumber: true,
      planType: true,
    },
  });

  if (
    rec.planType === PLAN_TYPES.WITHDRAWAL_AND_RESUBMISSION &&
    rec.referencePlanNumber
  ) {
    try {
      const referencedId = await findPlanIdByNumber(rec.referencePlanNumber);
      if (!referencedId) throw new NotFoundError("Referenced plan");
      await prisma.surfboardPlan.update({
        where: { id: referencedId },
        data: { withdrawalAndResubmissionStatus: "Withdrawn" },
      });
    } catch {
      console.warn(
        "Could not find/update referenced plan for withdrawal status:",
        rec.referencePlanNumber
      );
    }
  }

  try {
    await notifyPlanCreated({
      userId,
      planId: rec.id,
      planNumber: rec.planNumber,
      surveyTitle: dto.surveyTitle,
      sendEmail: true,
    });
    await notifyPlanUpdate({
      planId: rec.id,
      planNumber: rec.planNumber,
      title: "New Plan Created",
      message: `${userFirstLastName.firstName} ${userFirstLastName.lastName} created a new plan: ${rec.planNumber} - ${dto.surveyTitle}`,
      type: "PLAN",
      sendEmail: false,
    });
  } catch (notifError) {
    console.error("Error sending notification:", notifError);
  }

  return { id: rec.id, planNumber: rec.planNumber };
}

export async function updateSurfPlan(
  userId: string,
  userFirstLastName: { firstName: string; lastName: string },
  dto: SurfboardPlanDTO
) {
  await requireActiveSubscription(userId);
  if (!dto.id) throw new ValidationError({ id: "Missing id" });

  const existing = await prisma.surfboardPlan.findUnique({
    where: { id: dto.id },
  });
  if (!existing) throw new NotFoundError("Plan");

  if (existing.redCopyStatus && existing.redCopyStatus !== "NOT_SUBMITTED") {
    throw new ValidationError({
      redCopyStatus:
        "This plan has been submitted and cannot be edited. Please contact support if you need to make changes.",
    });
  }

  let geometry: any = dto.geometry;
  try {
    if (typeof dto.geometry === "string") geometry = JSON.parse(dto.geometry);
    if (typeof geometry === "string") geometry = JSON.parse(geometry);
  } catch (error) {
    console.error("Error parsing geometry:", error);
    geometry = dto.geometry;
  }

  // The 24h edit-lock was force-disabled in the source (`enforceLock = false`,
  // the real check left commented out) — preserved exactly, not re-enabled.
  const data: any = {};
  if (dto.planNumber) {
    data.planNumber = toStoredPlanNumber(dto.planNumber);
    data.planNumberKey = normalizePlanNumber(dto.planNumber) || null;
  }
  if (dto.surveyTitle) data.surveyTitle = dto.surveyTitle;
  if (dto.planType) data.planType = dto.planType;
  data.referencePlanNumber = dto.referencePlanNumber ?? null;
  if (dto.deededArea) data.deededArea = dto.deededArea;
  if (dto.facilitator) data.facilitator = dto.facilitator;
  if (dto.pillarType) data.pillarType = dto.pillarType;
  if (dto.geometry) data.geometry = geometry;
  if (dto.pillars) data.pillars = dto.pillars;
  if (dto.withdrawalAndResubmissionStatus)
    data.withdrawalAndResubmissionStatus = dto.withdrawalAndResubmissionStatus;
  if (dto.reasonForWithdrawalAndResubmission !== undefined)
    data.reasonForWithdrawalAndResubmission =
      dto.reasonForWithdrawalAndResubmission || null;
  if (dto.pillarTypeReferencePlanNumber !== undefined)
    data.pillarTypeReferencePlanNumber = dto.pillarTypeReferencePlanNumber;
  if (dto.parcels) data.parcels = dto.parcels;
  data.ward = dto.ward ?? null;
  data.lcda = dto.lcda ?? null;
  data.lga = dto.lga ?? null;
  if (dto.locality !== undefined) data.locality = dto.locality;
  if (dto.state !== undefined) data.state = dto.state;
  if (dto.dateOnSurveyPlan)
    data.dateOnSurveyPlan = new Date(dto.dateOnSurveyPlan);
  if (dto.personCount !== undefined) {
    data.personCount = dto.personCount;
    if (existing.personCount !== dto.personCount)
      data.personCountVerified = false;
  }
  if (dto.pdfFilePaths) data.pdfFilePaths = dto.pdfFilePaths;
  if (dto.cadFilePaths) data.cadFilePaths = dto.cadFilePaths;
  if (dto.certificateFilePaths)
    data.certificateFilePaths = dto.certificateFilePaths;
  if (dto.dateLodged !== undefined)
    data.dateLodged = dto.dateLodged ? new Date(dto.dateLodged) : null;

  const hasCert =
    (dto.certificateFilePaths?.length ?? existing.certificateFilePaths.length) >
    0;
  const statusChanged = !existing.certificateFilePaths.length && hasCert;
  data.status = hasCert ? "LODGED" : "PENDING";

  await prisma.surfboardPlan.update({ where: { id: dto.id, userId }, data });

  if (
    data.planType === PLAN_TYPES.WITHDRAWAL_AND_RESUBMISSION &&
    data.referencePlanNumber
  ) {
    try {
      const referencedId = await findPlanIdByNumber(data.referencePlanNumber);
      if (!referencedId) throw new NotFoundError("Referenced plan");
      await prisma.surfboardPlan.update({
        where: { id: referencedId },
        data: { withdrawalAndResubmissionStatus: "Withdrawn" },
      });
    } catch {
      console.warn(
        "Could not find/update referenced plan for withdrawal status:",
        data.referencePlanNumber
      );
    }
  }

  try {
    await notifyPlanUpdated({
      userId,
      planId: dto.id,
      planNumber: dto.planNumber || existing.planNumber,
      sendEmail: false,
    });
    if (statusChanged) {
      await notifyPlanUpdate({
        planId: dto.id,
        planNumber: dto.planNumber || existing.planNumber,
        title: "Plan Successfully Lodged",
        message: `Your plan ${dto.planNumber || existing.planNumber} has been successfully lodged with certificate!`,
        type: "SUCCESS",
        userIds: [userId],
        sendEmail: true,
      });
      await notifyPlanUpdate({
        planId: dto.id,
        planNumber: dto.planNumber || existing.planNumber,
        title: "Plan Lodged",
        message: `${userFirstLastName.firstName} ${userFirstLastName.lastName} has lodged plan ${dto.planNumber || existing.planNumber} with certificate.`,
        type: "PLAN",
        sendEmail: false,
      });
    }
  } catch (notifError) {
    console.error("Error sending notification:", notifError);
  }

  return { id: dto.id, planNumber: dto.planNumber };
}

// ---------------------------------------------------------------------------
// Reads / listing
// ---------------------------------------------------------------------------

/**
 * Batch-resolves every plan's `sharedTo` id array into full user objects in
 * one query (not N+1 per plan) — same shape getSurfPlanById already returns
 * as `sharedToUsers`, now also attached to list results so the Plans page
 * can show who a plan is shared with without a trip to the single-plan page.
 */
async function withSharedToUsers<T extends { sharedTo: string[] }>(
  plans: T[]
): Promise<
  (T & {
    sharedToUsers: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      surconRegNumber: string | null;
    }[];
  })[]
> {
  const allIds = Array.from(new Set(plans.flatMap((p) => p.sharedTo)));
  if (!allIds.length) return plans.map((p) => ({ ...p, sharedToUsers: [] }));

  const users = await prisma.surfboardUser.findMany({
    where: { id: { in: allIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      surconRegNumber: true,
    },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return plans.map((p) => ({
    ...p,
    sharedToUsers: p.sharedTo
      .map((id) => byId.get(id))
      .filter((u): u is NonNullable<typeof u> => !!u),
  }));
}

export async function getAllSurfPlans(userId: string) {
  const plans = await prisma.surfboardPlan.findMany({
    where: { userId, deleted: false },
    select: PLAN_LIST_SELECT,
    orderBy: { createdAt: "desc" },
  });
  return plans.map(withGeometry);
}

export async function getPaginatedSurfPlans(
  userId: string,
  {
    page = 1,
    pageSize = 10,
    filters,
    sort,
    noPagination,
  }: {
    page?: number;
    pageSize?: number;
    filters?: PlanFilters;
    sort?: PlanSort;
    noPagination?: boolean;
  } = {}
) {
  const skip = noPagination ? undefined : (page - 1) * pageSize;
  const where = await buildPlanFilterWhere(filters, { userId, deleted: false });
  const orderBy = sort
    ? ({
        [sort.field]: sort.order,
      } as Prisma.SurfboardPlanOrderByWithRelationInput)
    : ({ createdAt: "desc" } as Prisma.SurfboardPlanOrderByWithRelationInput);

  const [plans, total] = await Promise.all([
    prisma.surfboardPlan.findMany({
      where,
      select: {
        ...PLAN_LIST_SELECT,
        redCopyStatus: true,
        redCopyFileUrl: true,
        surconStatus: true,
        surconComment: true,
        recordsIStatus: true,
        recordsIComment: true,
        recordsIIStatus: true,
        recordsIIComment: true,
      },
      skip,
      take: noPagination ? undefined : pageSize,
      orderBy,
    }),
    prisma.surfboardPlan.count({ where }),
  ]);

  const withShared = await withSharedToUsers(plans);
  return {
    plans: withShared.map(withGeometry),
    total,
    totalPages: noPagination ? 1 : Math.ceil(total / pageSize),
  };
}

export async function getAllSharedSurfPlans(
  userId: string,
  page = 1,
  pageSize = 10,
  filters?: PlanFilters,
  sort?: PlanSort
) {
  const skip = (page - 1) * pageSize;
  const where = await buildPlanFilterWhere(filters, {
    userId,
    sharedTo: { isEmpty: false },
    deleted: false,
  });
  const orderBy = sort
    ? ({
        [sort.field]: sort.order,
      } as Prisma.SurfboardPlanOrderByWithRelationInput)
    : ({ createdAt: "desc" } as Prisma.SurfboardPlanOrderByWithRelationInput);

  const [plans, total] = await Promise.all([
    prisma.surfboardPlan.findMany({
      where,
      // The owner's own plans: the record copy state and link show here too.
      select: {
        ...PLAN_LIST_SELECT,
        redCopyStatus: true,
        redCopyFileUrl: true,
      },
      skip,
      take: pageSize,
      orderBy,
    }),
    prisma.surfboardPlan.count({ where }),
  ]);

  const withShared = await withSharedToUsers(plans);
  return {
    plans: withShared.map(withGeometry),
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getSharedWithMeSurfPlans(
  userId: string,
  page = 1,
  pageSize = 10,
  filters?: PlanFilters,
  sort?: PlanSort
) {
  const skip = (page - 1) * pageSize;
  const where = await buildPlanFilterWhere(filters, {
    sharedTo: { has: userId },
    deleted: false,
  });
  const orderBy = sort
    ? ({
        [sort.field]: sort.order,
      } as Prisma.SurfboardPlanOrderByWithRelationInput)
    : ({ createdAt: "desc" } as Prisma.SurfboardPlanOrderByWithRelationInput);

  const [plans, total] = await Promise.all([
    prisma.surfboardPlan.findMany({
      where,
      select: {
        ...PLAN_LIST_SELECT,
        // Read only to say whether a record copy exists: the file itself is not
        // shared with the person the plan was shared to (see below).
        redCopyFileUrl: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyName: true,
          },
        },
      },
      skip,
      take: pageSize,
      orderBy,
    }),
    prisma.surfboardPlan.count({ where }),
  ]);

  return {
    plans: plans.map(({ redCopyFileUrl, ...plan }) => ({
      ...withGeometry(plan),
      // Shown as "uploaded" (green) but the link is never sent.
      hasRecordCopy: !!redCopyFileUrl,
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getSurfPlanById(
  userId: string,
  id: string,
  options?: { forEdit?: boolean }
) {
  const orArray = [
    { userId },
    !options?.forEdit ? { sharedTo: { has: userId } } : {},
  ].filter((c) => Object.keys(c).length > 0);

  const plan = await prisma.surfboardPlan.findUnique({
    where: { id, OR: orArray },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
  if (!plan) throw new NotFoundError("Plan (or access denied)");

  // Resolved for the owner's Share modal / "who has access" display — the
  // plan itself only stores sharedTo as a plain id array (SharedPlanModal
  // needs full user objects, same shape searchUsers returns).
  const sharedToUsers = plan.sharedTo.length
    ? await prisma.surfboardUser.findMany({
        where: { id: { in: plan.sharedTo } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          surconRegNumber: true,
        },
      })
    : [];

  return {
    ...withGeometry(plan),
    isOwner: plan.userId === userId,
    sharedToUsers,
  };
}

export async function getSurfPlanByIdWithSurveyor(userId: string, id: string) {
  const plan = await prisma.surfboardPlan.findUnique({
    where: { id, OR: [{ userId }] },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          surconRegNumber: true,
          surconRegName: true,
          companyName: true,
        },
      },
    },
  });
  if (!plan) throw new NotFoundError("Plan (or access denied)");

  return { ...withGeometry(plan), isOwner: plan.userId === userId };
}

export async function getPublicSurfPlanByIdWithSurveyor(id: string) {
  const plan = await prisma.surfboardPlan.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          surconRegNumber: true,
          surconRegName: true,
          companyName: true,
        },
      },
    },
  });
  if (!plan) throw new NotFoundError("Plan (or access denied)");

  // Fire-and-forget, matches source (scan-count errors never block the read).
  incrementPlanQRScanCount(plan.id).catch(() => {});

  return withGeometry(plan);
}

/**
 * The full plan for a logged-in viewer (route `plans/[planId]/public/full`).
 * Staff and admins read any plan; a surveyor only their own or a shared one.
 * Unlike `getPublicSurfPlanByIdWithSurveyor` this does not count a QR scan.
 */
export async function getFullSurfPlanForViewer(
  userId: string,
  userRole: SurfboardRole,
  id: string
) {
  if (userRole === SurfboardRole.USER) return getSurfPlanById(userId, id);

  const plan = await prisma.surfboardPlan.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          surconRegNumber: true,
          surconRegName: true,
          companyName: true,
        },
      },
    },
  });
  if (!plan) throw new NotFoundError("Plan (or access denied)");
  return withGeometry(plan);
}

export async function getGatedPublicSurfPlan(id: string, token?: string) {
  const plan = await getPublicSurfPlanByIdWithSurveyor(id);

  let accessInfo: any;
  try {
    accessInfo = {
      success: true,
      ...(await getPlanQRAccessState(plan.id, token)),
    };
  } catch {
    accessInfo = { success: false };
  }

  if (
    accessInfo.success &&
    (accessInfo.accessState === "PAID_ACTIVE" ||
      accessInfo.accessState === "FREE")
  ) {
    return { plan, accessInfo };
  }

  const redactedPlan = {
    ...plan,
    pillars: null,
    centroid: null,
    geometry: null,
    areaSqM: 0,
    user: null,
    // File links are a paid or free-scan benefit too (I-027).
    pdfFilePaths: [],
    cadFilePaths: [],
    certificateFilePaths: [],
    redCopyFileUrl: null,
  };
  return { plan: redactedPlan, accessInfo };
}

export async function getDeletedSurfPlans(
  userId: string,
  { page = 1, pageSize = 10 }: { page?: number; pageSize?: number } = {}
) {
  const skip = (page - 1) * pageSize;
  const where = { userId, deleted: true };

  const [plans, total] = await Promise.all([
    prisma.surfboardPlan.findMany({
      where,
      select: {
        ...PLAN_LIST_SELECT,
        deleted: true,
        deletedAt: true,
        deletedBy: true,
      },
      skip,
      take: pageSize,
      orderBy: { deletedAt: "desc" },
    }),
    prisma.surfboardPlan.count({ where }),
  ]);

  return {
    plans: plans.map(withGeometry),
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * The plan a typed plan number refers to: the exact number first, then the
 * canonical key (case, spacing, trailing `_` or `.`), newest live plan first.
 * Used where a number arrives from outside (Red Copy webhook, a reference to an
 * earlier plan).
 */
export async function findPlanIdByNumber(
  planNumber: string
): Promise<string | null> {
  const typed = planNumber.trim();
  if (!typed) return null;
  const exact = await prisma.surfboardPlan.findFirst({
    where: { planNumber: typed },
    select: { id: true },
  });
  if (exact) return exact.id;
  const key = normalizePlanNumber(typed);
  if (!key) return null;
  const byKey = await prisma.surfboardPlan.findFirst({
    where: { planNumberKey: key, deleted: false },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return byKey?.id ?? null;
}

export type PlanNumberMatch = {
  id: string;
  planNumber: string;
  surveyTitle: string;
  status: string;
  createdAt: Date;
};

/**
 * What a typed plan number collides with, for the plan form.
 * - `exact`: the same number (capitals) is already registered. Only the
 *   surveyor's own plan is described (`own`); a plan of someone else is never
 *   shown, only `taken`.
 * - `similar`: other plans of this surveyor whose number differs only by
 *   spacing or a trailing `_` or `.`. Never includes anyone else's plans.
 */
export async function findPlanNumberMatches(
  userId: string,
  planNumber: string,
  excludeId?: string
): Promise<{
  exists: boolean;
  taken: boolean;
  own: PlanNumberMatch | null;
  similar: PlanNumberMatch[];
}> {
  const typed = toStoredPlanNumber(planNumber);
  if (!typed) return { exists: false, taken: false, own: null, similar: [] };

  const select = {
    id: true,
    planNumber: true,
    surveyTitle: true,
    status: true,
    createdAt: true,
    userId: true,
  } as const;
  const exactRow = await prisma.surfboardPlan.findFirst({
    where: { planNumber: typed, ...(excludeId && { id: { not: excludeId } }) },
    select,
  });
  const strip = ({ userId: _owner, ...rest }: NonNullable<typeof exactRow>) =>
    rest as PlanNumberMatch;
  const own = exactRow && exactRow.userId === userId ? strip(exactRow) : null;

  const mine = await prisma.surfboardPlan.findMany({
    where: {
      userId,
      deleted: false,
      ...(excludeId && { id: { not: excludeId } }),
    },
    select,
    orderBy: { createdAt: "desc" },
  });
  const similar = mine
    .filter(
      (p) => p.planNumber !== typed && samePlanNumber(p.planNumber, typed)
    )
    .slice(0, 5)
    .map(strip);

  return {
    exists: !!exactRow,
    taken: !!exactRow && !own,
    own,
    similar,
  };
}

export async function getAllFacilitatorsAndPlanNumbers(userId: string) {
  const plans = await prisma.surfboardPlan.findMany({
    select: { facilitator: true, planNumber: true },
    where: {
      userId,
      OR: [
        {
          AND: [
            { facilitator: { not: undefined } },
            { facilitator: { not: "" } },
          ],
        },
        {
          AND: [
            { planNumber: { not: undefined } },
            { planNumber: { not: "" } },
          ],
        },
      ],
    },
  });

  const facilitators = Array.from(
    new Set(
      plans
        .map((p) => p.facilitator?.trim())
        .filter((f): f is string => Boolean(f))
    )
  ).sort((a, b) => a.localeCompare(b));
  const planNumbers = Array.from(
    new Set(
      plans
        .map((p) => p.planNumber?.trim())
        .filter((p): p is string => Boolean(p))
    )
  ).sort((a, b) => a.localeCompare(b));

  return { facilitators, planNumbers };
}

export async function getAllFacilitators(userId: string): Promise<string[]> {
  const plans = await prisma.surfboardPlan.findMany({
    select: { facilitator: true },
    distinct: ["facilitator"],
    where: {
      userId,
      AND: [{ facilitator: { not: undefined } }, { facilitator: { not: "" } }],
    },
    orderBy: { facilitator: "asc" },
  });

  return plans
    .map((p) => p.facilitator?.trim())
    .filter((f): f is string => Boolean(f))
    .filter(
      (f, i, self) =>
        i === self.findIndex((x) => x.toLowerCase() === f.toLowerCase())
    );
}

export async function searchReferencePlanNumbers(
  userId: string,
  planType: string
): Promise<string[]> {
  const { REFERENCE_FILTERS } =
    await import("@/app/(projects)/(surfboard)/types/surfboardTypes");
  const conf = (REFERENCE_FILTERS as any)[planType];
  const where: any = { userId };
  if (conf?.excludeTypes)
    where.NOT = conf.excludeTypes.map((t: string) => ({ planType: t }));
  if (conf?.mustBeType) where.planType = { in: conf.mustBeType };

  const rows = await prisma.surfboardPlan.findMany({
    select: { planNumber: true },
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  return rows.map((r) => r.planNumber);
}

// ---------------------------------------------------------------------------
// Status / lifecycle
// ---------------------------------------------------------------------------

export async function updateSurfPlanStatus(
  userId: string,
  userRole: SurfboardRole,
  userFirstLastName: { firstName: string; lastName: string },
  id: string,
  status: "PENDING" | "LODGED" | "QUERIED" | "UNDER_REVIEW"
) {
  const plan = await prisma.surfboardPlan.findUnique({
    where: { id },
    select: { userId: true, planNumber: true, surveyTitle: true, status: true },
  });
  if (!plan) throw new NotFoundError("Plan");

  const isOwner = plan.userId === userId;
  const isAdmin =
    userRole === SurfboardRole.ADMIN || userRole === SurfboardRole.SUPERADMIN;
  if (!isOwner && !isAdmin) throw new ForbiddenError();

  const updatedPlan = await prisma.surfboardPlan.update({
    where: { id },
    data: { status },
  });

  if (plan.status !== status) {
    const statusMessages: Record<typeof status, string> = {
      PENDING: "Your plan has been marked as pending review.",
      LODGED: "Your plan has been successfully lodged!",
      QUERIED: "Your plan has been queried and requires attention.",
      UNDER_REVIEW: "Your plan is now under review.",
    };
    const notificationTypes: Record<
      typeof status,
      "INFO" | "SUCCESS" | "WARNING" | "ERROR"
    > = {
      PENDING: "INFO",
      LODGED: "SUCCESS",
      QUERIED: "WARNING",
      UNDER_REVIEW: "INFO",
    };

    if (isAdmin && plan.userId) {
      await notifyPlanUpdate({
        planId: id,
        planNumber: plan.planNumber,
        title: `Plan Status Updated: ${status}`,
        message: statusMessages[status],
        type: notificationTypes[status],
        userIds: [plan.userId],
        sendEmail: true,
      });
    }
    if (isOwner && !isAdmin) {
      await notifyPlanUpdate({
        planId: id,
        planNumber: plan.planNumber,
        title: `Plan Status Changed: ${plan.planNumber}`,
        message: `Plan ${plan.planNumber} (${plan.surveyTitle}) status changed to ${status} by ${userFirstLastName.firstName} ${userFirstLastName.lastName}.`,
        type: "INFO",
        sendEmail: false,
      });
    }
  }

  return updatedPlan;
}

export async function deleteSurfPlan(userId: string, id: string) {
  const plan = await prisma.surfboardPlan.findUnique({
    where: { id, userId },
    select: { deleted: true, redCopyStatus: true },
  });
  if (!plan) throw new NotFoundError("Plan");
  if (plan.deleted) throw new ValidationError({ id: "Plan already deleted" });
  if (plan.redCopyStatus && plan.redCopyStatus !== "NOT_SUBMITTED") {
    throw new ValidationError({
      redCopyStatus:
        "This plan has been submitted and cannot be deleted. Please contact support if you need to make changes.",
    });
  }

  await prisma.surfboardPlan.update({
    where: { id, userId },
    data: { deleted: true, deletedAt: new Date(), deletedBy: userId },
  });
  return { success: true };
}

export async function restoreSurfPlan(userId: string, id: string) {
  const plan = await prisma.surfboardPlan.findUnique({
    where: { id, userId },
    select: { deleted: true },
  });
  if (!plan) throw new NotFoundError("Plan");
  if (!plan.deleted) throw new ValidationError({ id: "Plan is not deleted" });

  await prisma.surfboardPlan.update({
    where: { id, userId },
    data: { deleted: false, deletedAt: null, deletedBy: null },
  });
  return { success: true };
}

export async function permanentlyDeleteSurfPlan(
  userId: string,
  userRole: SurfboardRole,
  id: string
) {
  const isAdmin =
    userRole === SurfboardRole.ADMIN || userRole === SurfboardRole.SUPERADMIN;

  const plan = await prisma.surfboardPlan.findUnique({
    where: { id },
    select: {
      userId: true,
      pdfFilePaths: true,
      cadFilePaths: true,
      certificateFilePaths: true,
      redCopyStatus: true,
    },
  });
  if (!plan) throw new NotFoundError("Plan");
  if (plan.redCopyStatus && plan.redCopyStatus !== "NOT_SUBMITTED") {
    throw new ValidationError({
      redCopyStatus:
        "This plan has been submitted and cannot be deleted. Please contact support if you need to make changes.",
    });
  }
  if (plan.userId !== userId && !isAdmin) throw new ForbiddenError();

  const filesToDeleteUrls = [
    ...(plan.pdfFilePaths || []),
    ...(plan.cadFilePaths || []),
    ...(plan.certificateFilePaths || []),
  ]
    .filter((u): u is string => Boolean(u))
    .map((url) => ({ url }));

  if (filesToDeleteUrls.length > 0) {
    const deleteResult =
      await deleteMultipleSurfboardFilesFromS3WithUrl(filesToDeleteUrls);
    if (!deleteResult.success) {
      throw new ValidationError({
        files: `Failed to delete files from storage: ${deleteResult.error ?? "Unknown error"}`,
      });
    }
  }

  await prisma.surfboardPlan.delete({ where: { id } });
  return { success: true };
}

export async function submitRedCopy(
  userId: string,
  planId: string,
  file: File
) {
  const plan = await prisma.surfboardPlan.findUnique({
    where: { id: planId, userId },
    select: {
      id: true,
      planNumber: true,
      planType: true,
      status: true,
      certificateFilePaths: true,
    },
  });
  if (!plan) throw new NotFoundError("Plan");

  if (
    plan.status !== "PENDING" ||
    ["PROVISIONAL", "PROVISIONAL LAYOUT"].includes(plan.planType) ||
    plan.certificateFilePaths?.length === 0
  ) {
    throw new ValidationError({
      plan: "This plan is not eligible for Red Copy submission",
    });
  }

  const uploadResult = await uploadSurfboardFileToS3(
    file,
    "redcopy",
    userId,
    plan.planNumber
  );
  if (!uploadResult.url)
    throw new ValidationError({ file: "Failed to upload Red Copy file" });

  const response = await fetch("https://api.redcopy.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      planNumber: plan.planNumber,
      fileUrl: uploadResult.url,
      webhookUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/redcopy`,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ValidationError({
      redcopy: error.message || "Failed to submit to Red Copy",
    });
  }

  await prisma.surfboardPlan.update({
    where: { id: planId },
    data: {
      status: "UNDER_REVIEW",
      redCopyStatus: "SUBMITTED",
      redCopySubmittedAt: new Date(),
      redCopyFileUrl: uploadResult.url,
    },
  });

  return { id: planId };
}

export async function verifyPersonCount(
  userRole: SurfboardRole,
  planId: string,
  count: number
) {
  if (userRole === SurfboardRole.USER) throw new ForbiddenError();
  await prisma.surfboardPlan.update({
    where: { id: planId },
    data: { personCount: count, personCountVerified: true },
  });
  return { success: true };
}

export async function queryPlan(userRole: SurfboardRole, planId: string) {
  if (userRole === SurfboardRole.USER) throw new ForbiddenError();
  await prisma.surfboardPlan.update({
    where: { id: planId },
    data: { status: "QUERIED" },
  });
  return { success: true };
}

/** Admin correction of a survey title (e.g. fixing a person-count mismatch) — separate from the surveyor's own updateSurfPlan, which requires the full plan DTO. */
export async function updatePlanSurveyTitle(
  userRole: SurfboardRole,
  planId: string,
  surveyTitle: string
) {
  if (userRole === SurfboardRole.USER) throw new ForbiddenError();
  if (!surveyTitle?.trim())
    throw new ValidationError({ surveyTitle: "Survey title is required" });
  await prisma.surfboardPlan.update({
    where: { id: planId },
    data: { surveyTitle: surveyTitle.trim() },
  });
  return { success: true };
}

// ---------------------------------------------------------------------------
// Sharing / users
// ---------------------------------------------------------------------------

type SearchUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  surconRegNumber: string | null;
};

export async function searchSurfUserByEmailOrSurconRegNumber(
  email: string,
  surconRegNumber: string
) {
  const user = await prisma.surfboardUser.findUnique({
    where: { email, surconRegNumber },
  });
  if (!user) throw new NotFoundError("User");
  return user;
}

export async function searchUsers(
  callerEmail: string,
  query: string
): Promise<SearchUser[]> {
  if (!query.trim()) return [];
  return prisma.surfboardUser.findMany({
    where: {
      OR: [
        { email: { contains: query, mode: "insensitive" } },
        { surconRegNumber: { contains: query, mode: "insensitive" } },
      ],
      email: { not: callerEmail },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      surconRegNumber: true,
    },
    take: 10,
  });
}

export async function sharePlanWithUser(
  userId: string,
  userFirstLastName: { firstName: string; lastName: string },
  planId: string,
  targetUserId: string
) {
  await requireActiveSubscription(userId);
  const plan = await prisma.surfboardPlan.findUnique({
    where: { id: planId, userId },
    select: { sharedTo: true, planNumber: true },
  });
  if (!plan) throw new NotFoundError("Plan");

  const targetUser = await prisma.surfboardUser.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      surconRegNumber: true,
    },
  });
  if (!targetUser) throw new NotFoundError("User");

  const updatedPlan = await prisma.surfboardPlan.update({
    where: { id: planId },
    data: {
      sharedTo: { set: [...new Set([...(plan.sharedTo || []), targetUserId])] },
    },
    select: { id: true, sharedTo: true },
  });

  // Immediate access, no accept step (Shared Access vision): sharedTo above
  // already grants access the instant this runs. This row is now a pure
  // audit trail of who shared what with whom and when — a re-share must NOT
  // reset respondedAt/response, since there's no "awaiting response" state
  // to reset back into.
  await prisma.surfboardPlanShareResponse.upsert({
    where: {
      planId_sharedWithUserId: { planId, sharedWithUserId: targetUserId },
    },
    create: { planId, sharedByUserId: userId, sharedWithUserId: targetUserId },
    update: { sharedByUserId: userId, sharedAt: new Date() },
  });

  await notifyPlanShared({
    planId,
    planNumber: plan.planNumber,
    sharedWithUserId: targetUserId,
    sharedByUser: userFirstLastName,
    sendEmail: true,
  });

  // The caller (SharePlanModal) needs the target's profile, not just their
  // id, to add them to the "Shared with" list without a full refetch —
  // this was previously missing here (present when sharing via search
  // results, since the client already had it from the search response),
  // which left the list stuck showing stale data until the next page load.
  return { ...updatedPlan, sharedUser: targetUser };
}

const PLAN_SHARE_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const hashInviteToken = (raw: string) =>
  crypto.createHash("sha256").update(raw).digest("hex");

/**
 * Shares a plan with an email address that may or may not already have a
 * Surfboard account. An existing account behaves exactly like
 * sharePlanWithUser (immediate access, no accept step). A brand-new email
 * gets a SurfboardPlanShareInvite row + email instead — access is granted
 * automatically the moment a SurfboardUser with that email is created (see
 * the surfboard Kinde auth-success callback), not via a manual accept step,
 * matching the immediate-access decision for existing-user shares.
 */
export async function invitePlanShareByEmail(
  userId: string,
  userFirstLastName: { firstName: string; lastName: string },
  planId: string,
  email: string
) {
  await requireActiveSubscription(userId);
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@"))
    throw new ValidationError({ email: "A valid email is required" });

  const plan = await prisma.surfboardPlan.findUnique({
    where: { id: planId, userId },
    select: { id: true, sharedTo: true, planNumber: true },
  });
  if (!plan) throw new NotFoundError("Plan");

  if (await emailInUse(Platform.SURFBOARD, normalizedEmail)) {
    const existingUser = await prisma.surfboardUser.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      select: { id: true },
    });
    if (!existingUser) throw new NotFoundError("User");
    return sharePlanWithUser(
      userId,
      userFirstLastName,
      planId,
      existingUser.id
    );
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PLAN_SHARE_INVITE_TTL_MS);
  const sharedByName =
    [userFirstLastName.firstName, userFirstLastName.lastName]
      .filter(Boolean)
      .join(" ") || "A surveyor";

  // A newer invite for the same plan+email supersedes any still-open one,
  // same reasoning as AdminInvitation: an older leaked/forwarded link stops
  // being usable to resolve access.
  const invite = await prisma.$transaction(async (tx) => {
    const open = await tx.surfboardPlanShareInvite.findMany({
      where: { planId, email: normalizedEmail, acceptedAt: null },
      select: { id: true },
    });
    if (open.length) {
      await tx.surfboardPlanShareInvite.deleteMany({
        where: { id: { in: open.map((o) => o.id) } },
      });
    }
    return tx.surfboardPlanShareInvite.create({
      data: {
        planId,
        email: normalizedEmail,
        tokenHash: hashInviteToken(rawToken),
        sharedByUserId: userId,
        expiresAt,
      },
    });
  });

  const siteUrl = getSiteUrl();
  const signupUrl = `${siteUrl}/api/auth/register?post_login_redirect_url=${encodeURIComponent("/api/auth/success/surfboard")}&login_hint=${encodeURIComponent(normalizedEmail)}`;
  // sendMail swallows its own errors and returns {success:false} rather
  // than throwing, so this was previously never checked — the invite row
  // was created either way and the caller always reported "Invitation
  // sent" even when the email itself silently failed.
  const emailResult = await sendPlanShareInviteEmail({
    to: normalizedEmail,
    sharedByName,
    planNumber: plan.planNumber,
    signupUrl,
    expiresAt,
  });
  if (!emailResult.success) {
    console.error("Plan share invite email failed to send", {
      planId,
      email: normalizedEmail,
      inviteId: invite.id,
    });
  }

  return {
    invited: true,
    email: normalizedEmail,
    expiresAt,
    inviteId: invite.id,
    emailSent: emailResult.success,
  };
}

/**
 * Resolves any pending plan-share invites for a newly created SurfboardUser
 * — called once, right after `prisma.surfboardUser.create` in the auth
 * flow. Never throws: a resolution failure must not block the user's login.
 */
export async function acceptPendingPlanShareInvites(
  userId: string,
  email: string
): Promise<void> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    const now = new Date();
    const invites = await prisma.surfboardPlanShareInvite.findMany({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
        acceptedAt: null,
        expiresAt: { gt: now },
      },
      select: { id: true, planId: true, sharedByUserId: true },
    });
    if (!invites.length) return;

    for (const invite of invites) {
      const plan = await prisma.surfboardPlan.findUnique({
        where: { id: invite.planId },
        select: { sharedTo: true },
      });
      if (!plan) continue;
      await prisma.$transaction([
        prisma.surfboardPlan.update({
          where: { id: invite.planId },
          data: {
            sharedTo: { set: [...new Set([...(plan.sharedTo || []), userId])] },
          },
        }),
        prisma.surfboardPlanShareInvite.update({
          where: { id: invite.id },
          data: { acceptedByUserId: userId, acceptedAt: now },
        }),
        prisma.surfboardPlanShareResponse.upsert({
          where: {
            planId_sharedWithUserId: {
              planId: invite.planId,
              sharedWithUserId: userId,
            },
          },
          create: {
            planId: invite.planId,
            sharedByUserId: invite.sharedByUserId,
            sharedWithUserId: userId,
          },
          update: { sharedByUserId: invite.sharedByUserId, sharedAt: now },
        }),
      ]);
    }
  } catch (error) {
    console.error("Error resolving pending plan share invites:", error);
  }
}

export async function unsharePlanWithUser(
  userId: string,
  planId: string,
  targetUserId: string
) {
  await requireActiveSubscription(userId);
  const plan = await prisma.surfboardPlan.findUnique({
    where: { id: planId, userId },
    select: { sharedTo: true },
  });
  if (!plan) throw new NotFoundError("Plan");

  const updatedPlan = await prisma.surfboardPlan.update({
    where: { id: planId },
    data: {
      sharedTo: {
        set: (plan.sharedTo || []).filter((id) => id !== targetUserId),
      },
    },
    select: { id: true, sharedTo: true },
  });

  await prisma.surfboardPlanShareResponse.deleteMany({
    where: { planId, sharedWithUserId: targetUserId },
  });

  return updatedPlan;
}

/** Recipient marks a shared plan as reviewed — verifies they're actually a current share target first. */
export async function respondToPlanShare(
  userId: string,
  planId: string,
  response: string = "ACKNOWLEDGED"
) {
  const plan = await prisma.surfboardPlan.findUnique({
    where: { id: planId },
    select: { sharedTo: true, userId: true },
  });
  if (!plan) throw new NotFoundError("Plan");
  if (!(plan.sharedTo || []).includes(userId)) throw new ForbiddenError();

  return prisma.surfboardPlanShareResponse.upsert({
    where: { planId_sharedWithUserId: { planId, sharedWithUserId: userId } },
    create: {
      planId,
      sharedByUserId: plan.userId ?? "",
      sharedWithUserId: userId,
      respondedAt: new Date(),
      response,
    },
    update: { respondedAt: new Date(), response },
  });
}

// ---------------------------------------------------------------------------
// Attachments / geo
// ---------------------------------------------------------------------------

export async function deletePlanAttachment(
  userId: string,
  planId: string,
  fileUrl: string,
  fileType: "pdf" | "cad" | "certificate"
) {
  const fieldName = `${fileType}FilePaths`;
  const plan = await prisma.surfboardPlan.findUnique({
    where: { id: planId, userId },
    select: { id: true, [fieldName]: true } as any,
  });
  if (!plan) throw new NotFoundError("Plan (or access denied)");

  const deleteResult = await deleteMultipleSurfboardFilesFromS3WithUrl([
    fileUrl,
  ]);
  if (!deleteResult.success)
    throw new ValidationError({
      file: deleteResult.error || "Failed to delete file from storage",
    });

  const currentFiles = (plan as any)[fieldName] as string[];
  const updatedFiles = currentFiles.filter((url) => url !== fileUrl);

  const updateData: any = { [fieldName]: updatedFiles };
  if (fileType === "certificate" && updatedFiles.length === 0)
    updateData.status = "PENDING";

  await prisma.surfboardPlan.update({
    where: { id: planId },
    data: updateData,
  });
  return { success: true };
}

export async function updatePlanRecordCopy(
  userId: string,
  planId: string,
  redCopyFileUrl: string
) {
  const plan = await prisma.surfboardPlan.findFirst({
    where: { id: planId, userId },
    select: { id: true },
  });
  if (!plan) throw new NotFoundError("Plan (or access denied)");

  await prisma.surfboardPlan.update({
    where: { id: planId },
    data: { redCopyFileUrl },
  });
  return { success: true };
}

type AdminBoundaryResult = {
  wardname: string;
  lcdaname: string;
  lganame: string;
  statename: string;
};

export async function getAdminBoundaries(
  geometry: object
): Promise<AdminBoundaryResult | null> {
  if (!geometry)
    throw new ValidationError({
      geometry: "getAdminBoundaries called with invalid geometry",
    });

  const geoJsonString =
    typeof geometry === "string" ? geometry : JSON.stringify(geometry);
  const result = await prisma.$queryRaw<AdminBoundaryResult[]>`
    SELECT wardname, lcdaname, lganame, statename
    FROM "nigeria_ward_admin_boundaries"
    WHERE ST_Intersects(
      geom,
      ST_SetSRID(ST_GeomFromGeoJSON(${geoJsonString}), 4326)
    )
    LIMIT 1;
  `;

  return result?.length ? result[0] : null;
}

/** Minimal plan data with geometry for the admin map view — ADMIN/SUPERADMIN only, enforced at the route layer. */
export async function getAllSurfPlansForAdmin(
  params: { skip?: number; take?: number } = {}
) {
  const where = { deleted: false, geometry: { not: Prisma.DbNull as any } };

  const [plans, total] = await Promise.all([
    prisma.surfboardPlan.findMany({
      where,
      select: {
        id: true,
        planNumber: true,
        surveyTitle: true,
        planType: true,
        ward: true,
        lga: true,
        status: true,
        geometry: true,
        pillars: true,
        state: true,
        dateOnSurveyPlan: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    }),
    prisma.surfboardPlan.count({ where }),
  ]);

  return {
    total,
    plans: plans.map((plan) => ({
      id: plan.id,
      planNumber: plan.planNumber,
      surveyTitle: plan.surveyTitle,
      planType: plan.planType,
      location:
        plan.ward && plan.lga
          ? `${plan.ward}, ${plan.lga}`
          : plan.ward || plan.lga,
      status: plan.status,
      geometry: plan.geometry,
      pillars: plan.pillars,
      state: plan.state,
      ward: plan.ward,
      lga: plan.lga,
      // The map popup's own "Survey date" line reads this straight off
      // feature properties — never selected here before, so it always
      // rendered the popup's "N/A" fallback regardless of the plan's
      // actual date (same missing-select pattern as `facilitator` above).
      dateOnSurveyPlan: plan.dateOnSurveyPlan,
      owner: plan.user ?? null,
      // The map popup shows this as "Surveyor" — the registered platform
      // user accountable for the plan, not the plan's own free-text
      // `facilitator` field, which was never selected here and always
      // rendered as the literal string "undefined" in the popup.
      facilitator: plan.user
        ? `${plan.user.firstName} ${plan.user.lastName}`.trim()
        : "Unknown",
    })),
  };
}

export interface AdminPlanListParams {
  page: number;
  pageSize: number;
  search?: string;
  /** A single SurfboardPlanStatus value, or "ALL"/undefined for no filter. */
  status?: string;
  /** "queries" narrows to QUERIED regardless of `status`; "person-count" is a display-only tab, no extra filtering. */
  tab?: "all" | "person-count" | "queries";
}

/** Admin/superadmin-facing Survey Plans table — paginated, searchable, ADMIN/SUPERADMIN only, enforced at the route layer. */
export async function getAdminSurfPlansPaginated(params: AdminPlanListParams) {
  const { page, pageSize, search, status, tab } = params;
  const where: Prisma.SurfboardPlanWhereInput = { deleted: false };

  if (tab === "queries") {
    where.status = "QUERIED";
  } else if (status && status !== "ALL") {
    where.status = status as any;
  }

  if (search) {
    where.OR = [
      ...planNumberSearchClauses(search),
      { surveyTitle: { contains: search, mode: "insensitive" } },
      { ward: { contains: search, mode: "insensitive" } },
      { lga: { contains: search, mode: "insensitive" } },
      { state: { contains: search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.surfboardPlan.findMany({
      where,
      select: {
        id: true,
        planNumber: true,
        surveyTitle: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        ward: true,
        lga: true,
        state: true,
        locality: true,
        pillars: true,
        geometry: true,
        personCount: true,
        personCountVerified: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.surfboardPlan.count({ where }),
  ]);

  const data = rows.map(withGeometry).map((plan) => ({
    id: plan.id,
    planNumber: plan.planNumber,
    surveyTitle: plan.surveyTitle,
    facility: plan.locality,
    location:
      [plan.ward, plan.lga, plan.state].filter(Boolean).join(", ") || "—",
    status: plan.status,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    owner: {
      name: plan.user
        ? `${plan.user.firstName} ${plan.user.lastName}`.trim()
        : "Unknown",
      email: plan.user?.email ?? "",
    },
    pillarsCount: Array.isArray(plan.pillars)
      ? (plan.pillars as unknown[]).length
      : 0,
    area: plan.areaSqM,
    personCount: plan.personCount,
    personCountVerified: plan.personCountVerified,
  }));

  return paginatedResult(data, total, page, pageSize);
}

/** Status-breakdown counts for the admin Survey Plans stat cards — kept separate from the paginated list so the cards reflect the whole table, not just the current page. */
export async function getAdminSurfPlansStats() {
  // Excludes PROVISIONAL/PROVISIONAL LAYOUT plans, matching every other
  // "Total Plans" figure in the app (analyticsService.getStatCards and
  // friends) — this route counted them in, so the same admin would see two
  // different "Total Plans" numbers on the Surf Plans page vs. the
  // Dashboard/Analytics pages for the exact same underlying data.
  const notProvisional = { notIn: PROVISIONAL_TYPES };
  const [total, pending, underReview, lodged, queried] = await Promise.all([
    prisma.surfboardPlan.count({
      where: { deleted: false, planType: notProvisional },
    }),
    prisma.surfboardPlan.count({
      where: { deleted: false, planType: notProvisional, status: "PENDING" },
    }),
    prisma.surfboardPlan.count({
      where: {
        deleted: false,
        planType: notProvisional,
        status: "UNDER_REVIEW",
      },
    }),
    prisma.surfboardPlan.count({
      where: { deleted: false, planType: notProvisional, status: "LODGED" },
    }),
    prisma.surfboardPlan.count({
      where: { deleted: false, planType: notProvisional, status: "QUERIED" },
    }),
  ]);
  return { total, pending, underReview, lodged, queried };
}
