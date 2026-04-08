"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";
import type { ApiResult } from "../types/surfboardTypes";
import { handlePrismaError } from "../utils/prismaErrorHandler";
import { checkPaymentStatus, fetchRemitaReceiptPdf } from "../utils/remita";
// pdf-parse will be dynamically imported where needed
import { uploadFile } from "./awsActions";
import {
  notifyLASGReceiptUploaded,
  notifyPaymentReceived,
  notifyAccountsDisapproval,
  notifyPlanQueried,
  notifyPlanApproved,
  notifyReadyForPhysicalSubmission,
} from "./notificationActions";
import { logAuditAction, createChangeLog } from "../utils/auditLogger";
import { fetchAndExtractTextFromUrl } from "../utils/pdfUtils";
import {
  extractPaymentDetailsFromText,
  extractEBSReceiptFields,
  extractLASGReceiptFromHtml,
  extractRemitaReceiptFromHtml,
} from "./aiExtractionActions";
import { transmitToOSSG } from "./ossgActions";



// Lock duration in minutes
const LOCK_DURATION_MINUTES = 6;

type MDARole =
  | "ACCOUNTS"
  | "CHARTING"
  | "SURCON"
  | "RECORDS_I"
  | "RECORDS_II"
  | "ARCHIVE"
  | "MDA_SUPERADMIN";

// Properly map role names to camelCase field prefixes
// This is needed because RECORDS_I -> recordsI and RECORDS_II -> recordsII (not recordsi/recordsii)
function getRoleFieldPrefix(role: MDARole): string {
  const mapping: Record<MDARole, string> = {
    ACCOUNTS: "accounts",
    CHARTING: "charting",
    SURCON: "surcon",
    RECORDS_I: "recordsI",
    RECORDS_II: "recordsII",
    ARCHIVE: "archive",
    MDA_SUPERADMIN: "mdaSuperadmin",
  };
  return mapping[role];
}

/**
 * Fetches certificate batches filtered by payment status
 * Requires ADMIN or SUPERADMIN role
 * @param status - Optional payment status filter (e.g., "USER_PAID")
 */
export async function getBatchesByStatus(status?: string): Promise<
  ApiResult<{
    batches: Array<{
      id: string;
      batchCode: string;
      submittedBy: string;
      planCount: number;
      totalFees: number;
      systemCharges: number;
      totalAmount: number;
      paymentStatus: string;
      userPaymentRef: string | null;
      userPaymentDate: Date | null;
      lasgReceiptUrl: string | null;
      createdAt: Date;
      submitter: {
        firstName: string;
        lastName: string;
        email: string;
      } | null;
    }>;
  }>
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const whereClause: any = {};

    if (status) {
      whereClause.paymentStatus = status;
    }

    const batches = await prisma.certificateOfDepositBatch.findMany({
      where: whereClause,
      include: {
        submitter: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            plans: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Map to include planCount
    const mappedBatches = batches.map((batch) => ({
      ...batch,
      planCount: batch._count.plans,
      _count: undefined,
    }));

    return { success: true, data: { batches: mappedBatches } };
  } catch (error) {
    console.error("Error fetching batches:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getBatchesByStatus"),
    };
  }
}

/**
 * Acquire lock on a plan for a specific role
 */
export async function acquirePlanLock(
  planId: string,
  role: MDARole,
  userId: string,
): Promise<ApiResult<{ locked: boolean; lockedBy?: string }>> {
  try {
    const now = new Date();
    const lockExpiry = new Date(now.getTime() + LOCK_DURATION_MINUTES * 60000);

    const rolePrefix = getRoleFieldPrefix(role);
    const lockedByField = `${rolePrefix}LockedBy` as any;
    const lockedAtField = `${rolePrefix}LockedAt` as any;
    const lockExpiresAtField = `${rolePrefix}LockExpiresAt` as any;

    // Check if plan is already locked by someone else
    const plan = await prisma.surfboardPlan.findUnique({
      where: { id: planId },
      select: {
        [lockedByField]: true,
        [lockExpiresAtField]: true,
        batchId: true,
      },
    });

    if (!plan) {
      return { success: false, error: "Plan not found" };
    }

    const currentLock = (plan as any)[lockedByField];
    const currentExpiry = (plan as any)[lockExpiresAtField];

    // Check if locked by another user and lock hasn't expired
    if (
      currentLock &&
      currentLock !== userId &&
      currentExpiry &&
      new Date(currentExpiry) > now
    ) {
      return {
        success: false,
        error: "Plan is currently being reviewed by another user",
        data: { locked: false, lockedBy: currentLock },
      };
    }

    // Batch-level locking for RECORDS_II
    if (role === "RECORDS_II" && plan.batchId) {
      const batchPlans = await prisma.surfboardPlan.findMany({
        where: { batchId: plan.batchId, deleted: false },
        select: { id: true, [lockedByField]: true, [lockExpiresAtField]: true }
      });

      // Ensure no other plan in the batch is locked by someone else
      for (const bp of batchPlans) {
        const bpLock = (bp as any)[lockedByField];
        const bpExpiry = (bp as any)[lockExpiresAtField];
        if (bpLock && bpLock !== userId && bpExpiry && new Date(bpExpiry) > now) {
          return {
            success: false,
            error: "Another plan in this batch is being reviewed by another user",
            data: { locked: false, lockedBy: bpLock },
          };
        }
      }

      // Calculate dynamic batch lock expiry: 3 minutes per plan
      const batchLockExpiry = new Date(now.getTime() + (3 * batchPlans.length * 60000));

      await prisma.surfboardPlan.updateMany({
        where: { batchId: plan.batchId, deleted: false },
        data: {
          [lockedByField]: userId,
          [lockedAtField]: now,
          [lockExpiresAtField]: batchLockExpiry,
        },
      });

      return { success: true, data: { locked: true } };
    }

    // Acquire or refresh lock
    await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        [lockedByField]: userId,
        [lockedAtField]: now,
        [lockExpiresAtField]: lockExpiry,
      },
    });

    return { success: true, data: { locked: true } };
  } catch (error) {
    console.error("Error acquiring lock:", error);
    return {
      success: false,
      error: handlePrismaError(error, "acquirePlanLock"),
    };
  }
}

/**
 * Release lock on a plan for a specific role
 */
export async function releasePlanLock(
  planId: string,
  role: MDARole,
  userId: string,
): Promise<ApiResult<{ released: boolean }>> {
  try {
    const rolePrefix = getRoleFieldPrefix(role);
    const lockedByField = `${rolePrefix}LockedBy` as any;
    const lockedAtField = `${rolePrefix}LockedAt` as any;
    const lockExpiresAtField = `${rolePrefix}LockExpiresAt` as any;

    // Batch-level unlocking for RECORDS_II
    if (role === "RECORDS_II") {
      const plan = await prisma.surfboardPlan.findUnique({
        where: { id: planId },
        select: { batchId: true }
      });
      if (plan?.batchId) {
        await prisma.surfboardPlan.updateMany({
          where: { batchId: plan.batchId, [lockedByField]: userId },
          data: {
            [lockedByField]: null,
            [lockedAtField]: null,
            [lockExpiresAtField]: null,
          },
        });
        return { success: true, data: { released: true } };
      }
    }

    // Only release if locked by this user
    await prisma.surfboardPlan.updateMany({
      where: {
        id: planId,
        [lockedByField]: userId,
      },
      data: {
        [lockedByField]: null,
        [lockedAtField]: null,
        [lockExpiresAtField]: null,
      },
    });

    return { success: true, data: { released: true } };
  } catch (error) {
    console.error("Error releasing lock:", error);
    return {
      success: false,
      error: handlePrismaError(error, "releasePlanLock"),
    };
  }
}

/**
 * Get and lock the oldest available plan for a specific MDA role
 * This atomically finds and locks the oldest pending plan that is not locked by another user
 */
export async function getAndLockOldestAvailablePlan(role: MDARole): Promise<
  ApiResult<{
    planId: string | null;
    planNumber: string | null;
    locked: boolean;
    lockExpiresAt: Date | null;
  }>
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const now = new Date();
    const lockExpiry = new Date(now.getTime() + LOCK_DURATION_MINUTES * 60000);

    const rolePrefix = getRoleFieldPrefix(role);
    const statusField = `${rolePrefix}Status` as any;
    const lockedByField = `${rolePrefix}LockedBy` as any;
    const lockedAtField = `${rolePrefix}LockedAt` as any;
    const lockExpiresAtField = `${rolePrefix}LockExpiresAt` as any;

    // First, check if user already has a plan locked for this role
    const existingLock = await prisma.surfboardPlan.findFirst({
      where: {
        [lockedByField]: user.id,
        [lockExpiresAtField]: { gt: now },
        deleted: false,
      },
      select: {
        id: true,
        planNumber: true,
        [lockExpiresAtField]: true,
      },
    });

    if (existingLock) {
      // User already has a lock, return it
      return {
        success: true,
        data: {
          planId: existingLock.id,
          planNumber: existingLock.planNumber,
          locked: true,
          lockExpiresAt: (existingLock as any)[lockExpiresAtField],
        },
      };
    }

    // Build role-specific where clause to match what's displayed on each role's page
    const getRoleSpecificCriteria = (): any => {
      switch (role) {
        case "RECORDS_II":
          // Records II: All 4 other approvals + intake must be complete
          return {
            accountsStatus: "APPROVED" as const,
            chartingStatus: "APPROVED" as const,
            surconStatus: "APPROVED" as const,
            recordsIStatus: "APPROVED" as const,
            intakeStatus: "APPROVED" as const,
            batch: {
              paymentStatus: {
                in: [
                  "LASG_PAID",
                  "ACCOUNTS_APPROVED",
                  "ACCOUNTS_DISAPPROVED",
                  "COMPLETED",
                ] as const,
              },
            },
          };
        case "RECORDS_I":
          // Records I: First 3 approvals must be complete
          return {
            // accountsStatus: "APPROVED" as const,
            // chartingStatus: "APPROVED" as const,
            // surconStatus: "APPROVED" as const,
            batch: {
              paymentStatus: {
                in: [
                  "LASG_PAID",
                  "ACCOUNTS_APPROVED",
                  "ACCOUNTS_DISAPPROVED",
                  "COMPLETED",
                ] as const,
              },
            },
          };
        case "SURCON":
          // SURCON: First 2 approvals must be complete
          return {
            // accountsStatus: "APPROVED" as const,
            // chartingStatus: "APPROVED" as const,
            batch: {
              paymentStatus: {
                in: [
                  "LASG_PAID",
                  "ACCOUNTS_APPROVED",
                  "ACCOUNTS_DISAPPROVED",
                  "COMPLETED",
                ] as const,
              },
            },
          };
        case "CHARTING":
          // Charting: Accounts must be approved
          return {
            // accountsStatus: "APPROVED" as const,
            batch: {
              paymentStatus: {
                in: [
                  "LASG_PAID",
                  "ACCOUNTS_APPROVED",
                  "ACCOUNTS_DISAPPROVED",
                  "COMPLETED",
                ] as const,
              },
            },
          };
        default:
          return {};
      }
    };

    // Find the oldest available plan that is not locked by another user
    const availablePlan = await prisma.surfboardPlan.findFirst({
      where: {
        redCopyStatus: "SUBMITTED",
        [statusField]: "PENDING",
        deleted: false,
        ...getRoleSpecificCriteria(),
        OR: [
          { [lockedByField]: null },
          { [lockExpiresAtField]: { lt: now } }, // Lock expired
        ],
      },
      select: {
        id: true,
        planNumber: true,
      },
      orderBy: { redCopySubmittedAt: "asc" },
    });

    if (!availablePlan) {
      return {
        success: true,
        data: {
          planId: null,
          planNumber: null,
          locked: false,
          lockExpiresAt: null,
        },
      };
    }

    // Try to acquire the lock atomically (using updateMany with conditions)
    const lockResult = await prisma.surfboardPlan.updateMany({
      where: {
        id: availablePlan.id,
        OR: [
          { [lockedByField]: null },
          { [lockedByField]: user.id },
          { [lockExpiresAtField]: { lt: now } },
        ],
      },
      data: {
        [lockedByField]: user.id,
        [lockedAtField]: now,
        [lockExpiresAtField]: lockExpiry,
      },
    });

    if (lockResult.count === 0) {
      // Another user grabbed the lock, try to find the next available plan
      return getAndLockOldestAvailablePlan(role);
    }

    return {
      success: true,
      data: {
        planId: availablePlan.id,
        planNumber: availablePlan.planNumber,
        locked: true,
        lockExpiresAt: lockExpiry,
      },
    };
  } catch (error) {
    console.error("Error getting and locking plan:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getAndLockOldestAvailablePlan"),
    };
  }
}

/**
 * Release all locks held by the current user for a specific role
 * Called when leaving the MDA admin page
 */
export async function releaseAllLocksForUser(
  role: MDARole,
): Promise<ApiResult<{ releasedCount: number }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const rolePrefix = getRoleFieldPrefix(role);
    const lockedByField = `${rolePrefix}LockedBy` as any;
    const lockedAtField = `${rolePrefix}LockedAt` as any;
    const lockExpiresAtField = `${rolePrefix}LockExpiresAt` as any;

    const result = await prisma.surfboardPlan.updateMany({
      where: {
        [lockedByField]: user.id,
      },
      data: {
        [lockedByField]: null,
        [lockedAtField]: null,
        [lockExpiresAtField]: null,
      },
    });

    return { success: true, data: { releasedCount: result.count } };
  } catch (error) {
    console.error("Error releasing all locks:", error);
    return {
      success: false,
      error: handlePrismaError(error, "releaseAllLocksForUser"),
    };
  }
}

/**
 * Get the current lock status for a plan and role
 */
export async function getPlanLockStatus(
  planId: string,
  role: MDARole,
): Promise<
  ApiResult<{
    isLocked: boolean;
    lockedByMe: boolean;
    lockedBy: string | null;
    lockExpiresAt: Date | null;
  }>
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const now = new Date();
    const rolePrefix = getRoleFieldPrefix(role);
    const lockedByField = `${rolePrefix}LockedBy` as any;
    const lockExpiresAtField = `${rolePrefix}LockExpiresAt` as any;

    const plan = await prisma.surfboardPlan.findUnique({
      where: { id: planId },
      select: {
        [lockedByField]: true,
        [lockExpiresAtField]: true,
      },
    });

    if (!plan) {
      return { success: false, error: "Plan not found" };
    }

    const lockedBy = (plan as any)[lockedByField];
    const lockExpiresAt = (plan as any)[lockExpiresAtField];
    const isLockValid = lockExpiresAt && new Date(lockExpiresAt) > now;

    return {
      success: true,
      data: {
        isLocked: Boolean(lockedBy && isLockValid),
        lockedByMe: lockedBy === user.id && isLockValid,
        lockedBy: isLockValid ? lockedBy : null,
        lockExpiresAt: isLockValid ? lockExpiresAt : null,
      },
    };
  } catch (error) {
    console.error("Error getting plan lock status:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getPlanLockStatus"),
    };
  }
}

/**
 * Check if user can work on this plan (chronological enforcement)
 * Returns the oldest available plan if this one is not allowed
 */
export async function canWorkOnPlan(
  planId: string,
  role: MDARole,
  userId: string,
): Promise<
  ApiResult<{
    allowed: boolean;
    reason?: string;
    oldestAvailablePlanId?: string;
    oldestAvailablePlanNumber?: string;
    oldestAvailableSubmittedAt?: Date;
  }>
> {
  try {
    const rolePrefix = getRoleFieldPrefix(role);
    const statusField = `${rolePrefix}Status` as any;
    const lockedByField = `${rolePrefix}LockedBy` as any;
    const lockExpiresAtField = `${rolePrefix}LockExpiresAt` as any;

    // Get the target plan
    const targetPlan = await prisma.surfboardPlan.findUnique({
      where: { id: planId },
      select: {
        redCopySubmittedAt: true,
        planNumber: true,
      },
    });

    if (!targetPlan || !targetPlan.redCopySubmittedAt) {
      return { success: false, error: "Plan not found or not submitted" };
    }

    const now = new Date();

    // Find the oldest pending plan for this role
    const oldestPlan = await prisma.surfboardPlan.findFirst({
      where: {
        redCopyStatus: "SUBMITTED",
        [statusField]: "PENDING",
        deleted: false,
        OR: [
          { [lockedByField]: null },
          { [lockedByField]: userId },
          { [lockExpiresAtField]: { lt: now } }, // Lock expired
        ],
      },
      select: {
        id: true,
        planNumber: true,
        redCopySubmittedAt: true,
      },
      orderBy: { redCopySubmittedAt: "asc" },
    });

    if (!oldestPlan) {
      return {
        success: false,
        error: "No plans available for processing",
      };
    }

    // Check if the target plan is the oldest available
    if (oldestPlan.id === planId) {
      return { success: true, data: { allowed: true } };
    }

    // Target plan is not the oldest
    return {
      success: true,
      data: {
        allowed: false,
        reason: "Please complete older submissions first",
        oldestAvailablePlanId: oldestPlan.id,
        oldestAvailablePlanNumber: oldestPlan.planNumber,
        oldestAvailableSubmittedAt: oldestPlan.redCopySubmittedAt || undefined,
      },
    };
  } catch (error) {
    console.error("Error checking chronological order:", error);
    return {
      success: false,
      error: handlePrismaError(error, "canWorkOnPlan"),
    };
  }
}

/**
 * Get charting interpretation by intersecting survey plan geometry with LASG dataset
 */
export async function getChartingInterpretation(
  geometry: any,
): Promise<string | null> {
  try {
    const geometryString =
      typeof geometry === "string" ? geometry : JSON.stringify(geometry);

    const result = await prisma.$queryRaw<Array<{ interpretation: string }>>`
      SELECT interpretation
      FROM "LASG_charting_interpretation"
      WHERE ST_Intersects(
        geom,
        ST_SetSRID(ST_GeomFromGeoJSON(${geometryString}), 4326)
      )
      LIMIT 1;
    `;

    if (result?.length && result[0].interpretation) {
      return result[0].interpretation;
    }
    return null;
  } catch (err) {
    console.error("Charting interpretation error:", err);
    return null;
  }
}

/**
 * Get zone from geometry by intersecting with Scale_of_fees dataset
 * Returns the zone (e.g., "lagosZoneA", "lagosZoneB", etc.) or null if not found
 */
export async function getZoneFromGeometry(
  geometry: any,
): Promise<string | null> {
  try {
    const geometryString =
      typeof geometry === "string" ? geometry : JSON.stringify(geometry);

    const result = await prisma.$queryRaw<Array<{ Zone: string }>>`
      SELECT "Zone"
      FROM "Scale_of_fees"
      WHERE ST_Intersects(
        geom,
        ST_SetSRID(ST_GeomFromGeoJSON(${geometryString}), 4326)
      )
      LIMIT 1;
    `;

    if (result?.length && result[0].Zone) {
      return result[0].Zone;
    }
    return null;
  } catch (err) {
    console.error("Zone intersection error:", err);
    return null;
  }
}

/**
 * Check if survey title should be charged double fee
 * Returns true if:
 * - More than 2 names detected (names separated by newlines or AI detection)
 * - Ethnicity is "corporate"
 */
function shouldChargeDoubleFee(
  surveyTitle: string,
  ethnicity?: string | null,
): boolean {
  // Check if ethnicity indicates corporate ownership
  if (ethnicity?.toLowerCase() === "corporate") {
    return true;
  }

  // Count names by splitting on newlines
  const names = surveyTitle
    .split("\n")
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  if (names.length > 2) {
    return true;
  }

  // Additional heuristics for corporate detection
  const corporateKeywords = [
    "limited",
    "ltd",
    "corporation",
    "inc",
    "plc",
    "company",
    "co.",
    "enterprises",
    "ventures",
    "holdings",
    "group",
    "associates",
  ];

  const lowerTitle = surveyTitle.toLowerCase();
  for (const keyword of corporateKeywords) {
    if (lowerTitle.includes(keyword)) {
      return true;
    }
  }

  // Check for multiple names using "and", "&" separators
  const andSeparators = surveyTitle
    .split(/\s+and\s+|\s*&\s*/i)
    .filter((n) => n.trim().length > 0);
  if (andSeparators.length > 2) {
    return true;
  }

  return false;
}

/**
 * Calculate fee for a single plan based on zone and area
 */
export async function calculatePlanFeeByZone(
  zone: string,
  areaSqM: number,
  surveyTitle: string,
  zoneFees: Array<{
    range: string;
    start: number;
    end: number;
    lagosZoneA: number;
    lagosZoneB: number;
    lagosZoneC: number;
    lagosZoneD: number;
  }>,
  ethnicity?: string | null,
): Promise<{ fee: number; isDoubleFee: boolean }> {
  // Find the fee row that matches the area range
  const feeRow = zoneFees.find(
    (row) => areaSqM >= row.start && areaSqM <= row.end,
  );

  if (!feeRow) {
    // If area is larger than max range, use the last row
    const lastRow = zoneFees[zoneFees.length - 1];
    if (areaSqM > lastRow.end) {
      return calculateFeeFromRow(lastRow, zone, surveyTitle, ethnicity);
    }
    console.error(`No fee range found for area: ${areaSqM} sqm`);
    return { fee: 0, isDoubleFee: false };
  }

  return calculateFeeFromRow(feeRow, zone, surveyTitle, ethnicity);
}

function calculateFeeFromRow(
  feeRow: {
    lagosZoneA: number;
    lagosZoneB: number;
    lagosZoneC: number;
    lagosZoneD: number;
  },
  zone: string,
  surveyTitle: string,
  ethnicity?: string | null,
): { fee: number; isDoubleFee: boolean } {
  // Map zone to fee amount
  let baseFee = 0;
  switch (zone) {
    case "lagosZoneA":
      baseFee = feeRow.lagosZoneA;
      break;
    case "lagosZoneB":
      baseFee = feeRow.lagosZoneB;
      break;
    case "lagosZoneC":
      baseFee = feeRow.lagosZoneC;
      break;
    case "lagosZoneD":
      baseFee = feeRow.lagosZoneD;
      break;
    default:
      console.error(`Unknown zone: ${zone}`);
      return { fee: 0, isDoubleFee: false };
  }

  // Check for double fee
  const isDoubleFee = shouldChargeDoubleFee(surveyTitle, ethnicity);
  const fee = isDoubleFee ? baseFee * 2 : baseFee;

  return { fee, isDoubleFee };
}

/**
 * Submit batch of plans for Certificate of Deposit
 * This handles:
 * - Spatial intersection for charting remarks
 * - Fee calculation
 * - Batch creation
 * - Status updates
 */
export async function submitRedCopyBatch(
  planIds: string[],
  acceptanceAcknowledged: boolean = false
): Promise<
  ApiResult<{
    batchId: string;
    batchCode: string;
    totalAmount: number;
    planCount: number;
    reference: string | null;
    email?: string;
    submitter: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string | null;
      payerID?: number | null;
      payerIDType?: string | null;
    };
  }>
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    if (!acceptanceAcknowledged) {
      return { success: false, error: "Submission policy must be acknowledged" };
    }

    // Get fresh user details for current info
    const userDetails = await prisma.surfboardUser.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        payerID: true,
        payerIDType: true,
      },
    });

    if (!userDetails)
      return { success: false, error: "User details not found" };

    // Validate that all plans exist and belong to the user
    const plans = await prisma.surfboardPlan.findMany({
      where: {
        id: { in: planIds },
        userId: user.id,
        status: "PENDING",
        redCopyStatus: "NOT_SUBMITTED",
        deleted: false,
      },
      select: {
        id: true,
        planNumber: true,
        geometry: true,
        surveyTitle: true,
        ethnicity: true,
        lga: true,
        deededArea: true,
        redCopyFileUrl: true,
      },
    });

    if (plans.length !== planIds.length) {
      return {
        success: false,
        error: "Some plans are not eligible for submission or do not exist",
      };
    }

    // Verify all plans have record copy uploaded
    const missingRecordCopy = plans.filter((p) => !p.redCopyFileUrl);
    if (missingRecordCopy.length > 0) {
      return {
        success: false,
        error: `Please upload record copy for all selected plans. Missing: ${missingRecordCopy
          .map((p) => p.planNumber)
          .join(", ")}`,
      };
    }

    // Import needed utilities
    const { computeGeometryDetails } = await import("../utils/dbUtils");
    const { getZoneFees, getSystemChargePercent } =
      await import("./settingsActions");

    // Get zone fees and system charge
    const zoneFees = await getZoneFees();
    const systemChargePercent = await getSystemChargePercent();

    // Calculate fees for all plans using zone-based approach
    let totalFees = 0;
    const planFeeData: Map<
      string,
      { fee: number; zone: string; isDoubleFee: boolean }
    > = new Map();
    const plansWithNoZone: string[] = [];

    for (const plan of plans) {
      // Get zone from geometry via spatial intersection
      const zone = await getZoneFromGeometry(plan.geometry);

      if (!zone) {
        plansWithNoZone.push(plan.planNumber);
        continue;
      }

      // Compute area from geometry
      let areaSqM = 0;
      try {
        const details = computeGeometryDetails(plan.geometry as any);
        areaSqM = details.areaSqM;
      } catch (error) {
        console.error("Error computing area for plan:", plan.planNumber, error);
      }

      // Calculate fee using zone and area
      const { fee, isDoubleFee } = await calculatePlanFeeByZone(
        zone,
        areaSqM,
        plan.surveyTitle,
        zoneFees,
        plan.ethnicity,
      );

      planFeeData.set(plan.id, { fee, zone, isDoubleFee });
      totalFees += fee;
    }

    // Block submission if any plan has no zone
    if (plansWithNoZone.length > 0) {
      return {
        success: false,
        error: `The following plans are outside Lagos fee zones and cannot be submitted: ${plansWithNoZone.join(
          ", ",
        )}. Please ensure the survey geometry falls within Lagos State.`,
      };
    }

    // Round to 2 decimal places for currency precision
    const systemCharges = totalFees * (systemChargePercent / 100);
    // NOTE: All amounts are stored in NAIRA in the database
    // Paystack requires amounts in KOBO (1 naira = 100 kobo)
    const totalAmount = Math.trunc((totalFees + systemCharges) * 100) / 100; // Amount in NAIRA (stored in DB)

    // Validate amount before creating batch
    if (totalAmount <= 0) {
      return {
        success: false,
        error:
          "Unable to calculate fees. Please ensure zone fees are configured and plan area is valid.",
      };
    }

    // Create batch
    const batch = await prisma.certificateOfDepositBatch.create({
      data: {
        submittedBy: user.id,
        planCount: plans.length,
        totalFees: Math.trunc(totalFees * 100) / 100, // Amount in NAIRA (2 decimal places)
        systemCharges: Math.trunc(systemCharges * 100) / 100, // Amount in NAIRA (2 decimal places)
        totalAmount, // Amount in NAIRA - will be converted to kobo (*100) for Paystack
        paymentStatus: "PENDING_USER_PAYMENT",
      },
      select: {
        id: true,
        batchCode: true,
        userPaymentRef: true,
      },
    });

    // Update plans with batch ID, zone data, and perform spatial intersection
    for (const plan of plans) {
      // Get charting interpretation
      const chartingInterpretation = await getChartingInterpretation(
        plan.geometry,
      );

      // Get fee data for this plan
      const feeData = planFeeData.get(plan.id);

      await prisma.surfboardPlan.update({
        where: { id: plan.id },
        data: {
          batchId: batch.id,
          possibleChartingRemarks: chartingInterpretation,
          redCopyStatus: "SUBMITTED",
          redCopySubmittedAt: new Date(),
          accountsStatus: "PENDING",
          chartingStatus: "PENDING",
          surconStatus: "PENDING",
          recordsIStatus: "PENDING",
          recordsIIStatus: "PENDING",
          // Store zone-based fee data
          zone: feeData?.zone,
          codFee: feeData?.fee,
          isDoubleFee: feeData?.isDoubleFee ?? false,
        },
      });
    }

    // (userDetails already fetched at the top of this function)

    // Log audit action
    await logAuditAction({
      userId: user.id,
      action: "SUBMIT_BATCH",
      entity: "CertificateOfDepositBatch",
      entityId: batch.id,
      changes: createChangeLog({
        batchCode: batch.batchCode,
        planCount: plans.length,
        planIds: planIds,
        totalAmount,
        totalFees,
        systemCharges,
      }),
    });

    // Notify user about their batch submission
    try {
      const { notifyRecordCopySubmitted } =
        await import("./notificationActions");
      await notifyRecordCopySubmitted({
        userId: user.id,
        batchId: batch.id,
        batchCode: batch.batchCode,
        planCount: plans.length,
        totalAmount,
        sendEmail: true,
      });
    } catch (notifError) {
      console.error("Error sending batch submission notification:", notifError);
      // Don't fail the batch submission if notification fails
    }

    revalidatePath("/surf-restricted/dashboard/surf-plans");
    revalidatePath("/surfboard/dashboard/plans");

    return {
      success: true,
      data: {
        batchId: batch.id,
        batchCode: batch.batchCode,
        totalAmount, // Amount in NAIRA
        planCount: plans.length,
        reference: batch.userPaymentRef,
        email: userDetails.email,
        submitter: {
          id: userDetails.id,
          email: userDetails.email,
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
          phoneNumber: userDetails.phoneNumber,
          payerID: userDetails.payerID,
          payerIDType: userDetails.payerIDType, // Enum or string
        },
      },
    };
  } catch (error) {
    console.error("Error submitting batch:", error);
    return {
      success: false,
      error: handlePrismaError(error, "submitRedCopyBatch"),
    };
  }
}

/**
 * Verify Remita payment status and update batch
 * Checks with Remita API to confirm payment before updating status
 */
export async function verifyBatchPayment(
  reference: string,
): Promise<ApiResult<{ batchId: string; status: string }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Find batch by payment reference (RRR)
    const batch = await prisma.certificateOfDepositBatch.findFirst({
      where: {
        userPaymentRef: reference,
        submittedBy: user.id,
      },
    });

    if (!batch) {
      return { success: false, error: "Batch not found" };
    }

    // Check if already paid
    if (
      batch.paymentStatus === "USER_PAID" ||
      batch.paymentStatus === "LASG_PAID"
    ) {
      return {
        success: true,
        data: { batchId: batch.id, status: batch.paymentStatus },
      };
    }

    // Verify payment with Remita
    const remitaStatus = await checkPaymentStatus(reference);

    if (remitaStatus.status === "paid") {
      // Update batch payment status directly to LASG_PAID
      // This triggers MDA workflow since payment goes directly to MDA Remita account
      await prisma.certificateOfDepositBatch.update({
        where: { id: batch.id },
        data: {
          paymentStatus: "LASG_PAID",
          userPaymentDate: remitaStatus.paymentDate || new Date(),
          lasgPaymentDate: remitaStatus.paymentDate || new Date(),
        },
      });

      // Send notification to all Surfboard Admins
      const submitter = await prisma.surfboardUser.findUnique({
        where: { id: user.id },
        select: { firstName: true, lastName: true },
      });

      if (submitter) {
        await notifyPaymentReceived({
          batchId: batch.id,
          batchCode: batch.batchCode,
          amount: batch.totalAmount,
          paidBy: submitter,
          sendEmail: true,
        });
      }

      // Notify MDA roles that batch is ready for review
      await notifyLASGReceiptUploaded({
        batchId: batch.id,
        batchCode: batch.batchCode,
        planCount: batch.planCount,
        sendEmail: true,
      });

      // Log audit action
      await logAuditAction({
        userId: user.id,
        action: "VERIFY_PAYMENT",
        entity: "CertificateOfDepositBatch",
        entityId: batch.id,
        changes: createChangeLog({
          batchCode: batch.batchCode,
          reference,
          amount: batch.totalAmount,
          paymentStatus: "LASG_PAID",
          note: "Direct MDA Remita payment verified",
        }),
      });

      revalidatePath("/surf-restricted/dashboard/surf-plans");
      revalidatePath("/surfboard/dashboard/plans");
      revalidatePath("/surf-mda/dashboard");

      return {
        success: true,
        data: { batchId: batch.id, status: "LASG_PAID" },
      };
    } else if (remitaStatus.status === "pending") {
      return {
        success: true,
        data: { batchId: batch.id, status: "PENDING" },
      };
    } else {
      return {
        success: false,
        error: remitaStatus.message || "Payment verification failed",
      };
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    return {
      success: false,
      error: handlePrismaError(error, "verifyBatchPayment"),
    };
  }
}

/**
 * Verify Batch Payment using Two Receipt Links (LASG + Remita)
 *
 * New workflow replacing the old PDF-fetch approach:
 * 1. Parses LASG URL for transId, transCode, payerId, payerType
 * 2. Cross-checks payerId + payerType against user profile
 * 3. Fetches HTML from both receipt URLs
 * 4. AI extracts: anchor + amount (LASG), RRR + amount + status + anchor (Remita)
 * 5. Cross-validates anchor match, amount match, Remita status, RRR uniqueness
 * 6. Stores URLs directly (no S3 upload)
 */
export async function verifyBatchPaymentWithLinks(
  batchId: string,
  lasgReceiptUrl: string,
  remitaReceiptUrl: string,
): Promise<ApiResult<{ success: boolean; ebsUrl: string; status: string }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // 1. Find the batch
    const batch = await prisma.certificateOfDepositBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return {
        success: false,
        error:
          "[Step 1: Batch Lookup] Batch not found. Please refresh and try again.",
      };
    }

    if (batch.submittedBy !== user.id && user.role !== "SUPERADMIN") {
      return {
        success: false,
        error:
          "[Step 1: Authorization] You are not authorized to pay for this batch. Only the batch submitter or a Super Admin can verify payment.",
      };
    }

    // 2. Initial Status Check
    if (
      batch.paymentStatus === "LASG_PAID" ||
      batch.paymentStatus === "USER_PAID"
    ) {
      return {
        success: true,
        data: {
          success: true,
          status: batch.paymentStatus,
          ebsUrl: batch.lasgReceiptUrl || "",
        },
      };
    }

    // 3. Parse LASG URL parameters (deterministic — no AI needed)
    let transId: string, transCode: string, payerId: string, payerType: string;
    try {
      const lasgUrl = new URL(lasgReceiptUrl);
      transId = lasgUrl.searchParams.get("transid") || "";
      transCode = lasgUrl.searchParams.get("transcode") || "";
      payerId = lasgUrl.searchParams.get("payerid") || "";
      payerType = lasgUrl.searchParams.get("payertype") || "n";

      if (!transId || !transCode || !payerId) {
        return {
          success: false,
          error:
            "[Step 2: LASG URL Parsing] Invalid LASG receipt URL: missing required parameters (transid, transcode, or payerid). Please paste the full LASG receipt URL from your email.",
        };
      }
    } catch {
      return {
        success: false,
        error:
          "[Step 2: LASG URL Parsing] Invalid LASG receipt URL format. Please paste a valid URL starting with https://printreceipt.ebs-rcm.com/...",
      };
    }

    // 4. Cross-check PayerID + PayerType against user profile
    const fullUser = await prisma.surfboardUser.findUnique({
      where: { id: user.id },
      select: {
        payerID: true,
        payerIDType: true,
        firstName: true,
        lastName: true,
      },
    });

    if (fullUser?.payerID) {
      const urlPayerIdNum = parseInt(payerId, 10);
      if (urlPayerIdNum !== fullUser.payerID) {
        return {
          success: false,
          error: `[Step 3: Payer ID Check] Payer ID mismatch: The LASG receipt has Payer ID "${payerId}" but your profile has Payer ID "${fullUser.payerID}". Please ensure you are using a receipt linked to your account.`,
        };
      }

      // Cross-check payer type
      const expectedType = fullUser.payerIDType === "Commercial" ? "c" : "n";
      if (payerType.toLowerCase() !== expectedType) {
        return {
          success: false,
          error: `[Step 3: Payer Type Check] Payer Type mismatch: The LASG receipt has Payer Type "${payerType.toUpperCase()}" but your profile has Payer Type "${fullUser.payerIDType || "Individual"}". Please check your profile settings.`,
        };
      }
    }
    // If user has no payerID stored, skip this check (first-time user)

    // 5. Fetch both receipt pages (server-side)
    // LASG receipt URL returns a PDF, not HTML — use fetchAndExtractTextFromUrl
    // Remita receipt URL is a JS SPA — fetch JSON API directly
    let lasgContent: string;
    let remitaData: {
      rrr: string;
      amount: number;
      status: string;
      transactionAnchor: string;
      payerName: string;
      payerEmail: string;
    };

    try {
      const lasgExtracted = await fetchAndExtractTextFromUrl(lasgReceiptUrl);
      lasgContent = lasgExtracted.text;
      console.log(
        `LASG receipt fetched. Content-Type: ${lasgExtracted.contentType}, Text length: ${lasgContent.length}`,
      );
      if (!lasgContent || lasgContent.trim().length < 50) {
        return {
          success: false,
          error: `[Step 4: Fetch LASG Receipt] LASG receipt page returned insufficient content. Please check the URL is correct and accessible.`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: `[Step 4: Fetch LASG Receipt] Failed to access LASG receipt URL: ${err.message}`,
      };
    }

    try {
      // The Remita receipt URL (login.remita.net/remita/rrr/view-rrr/details.json?x-id=...)
      // is a JS-rendered SPA — fetch returns an empty HTML shell.
      // The actual data is at the JSON API: /remita/rrr/details.json?x-id=...
      // We derive it by removing "view-rrr/" from the path.
      const remitaApiUrl = remitaReceiptUrl.replace(
        "/view-rrr/details.json",
        "/details.json",
      );
      console.log("Fetching Remita JSON API:", remitaApiUrl);

      const remitaRes = await fetch(remitaApiUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!remitaRes.ok) {
        return {
          success: false,
          error: `[Step 4: Fetch Remita Receipt] Failed to fetch Remita receipt data (HTTP status ${remitaRes.status}). Please check the URL is correct and accessible.`,
        };
      }
      interface RemitaPaymentDetail {
        APPLYVAT: string | null;
        LOGO1: string | null;
        STATUS: string;
        NAME: string;
        ID: string;
        QRCODE: string;
        PAYMENTMODE: string;
        HE: string;
        PAYMENTSTATUS: string;
        DESCRIPTION: string;
        SHOWBANK: string;
        BRANCHCODE: string | null;
        USERNAME: string;
        TELLERNUMBER: string | null;
        PAYMENTCHANNELTRUE: string;
        RRRNUMBER: string;
        CASHID: number;
        COLLID: number;
        RRR: string;
        PAYER: string;
        PHONENUMBER: string;
        EMAIL: string;
        ADDRESS: string | null;
        TRANSACTIONDATE: string;
        SERVICEDESC: string;
        BILLER: string;
        TRANSACTIONAMOUNT_NOFEE: number;
        TRANSACTIONAMOUNT: number;
        COLLECTOR_ID: number;
        PAYMENTCHANNEL: string;
        FIRSPAYMENTREF: string | null;
        COMPANY_ID: string;
        AUTHREF: string;
        VATAMOUNT: number;
        PROCFEE: number;
        SERVICEDATA1LABEL: string | null;
        EXTRADATA1: string | null;
        PARENTRRR: string;
        READABLERRR: string;
        BENACCOUNTNO: string;
        PAYERACCOUNTNO: string;
        BENBANK: string;
        BENEMAIL: string;
        BENEFICIARYID: number;
        TRANSACTIONREF: number;
        CURRENCYCODE: string;
        SL_CNT: number;
        SP_CNT: number;
        FLAT_CNT: number;
        PART_CNT: number;
        SCHE_CNT: number;
        VATONCHARGES: number;
        PAYLINKCUST_CNT: number;
        CHARGE: number;
        QRCODE_URL: string;
        MASKEDPAN: string | null;
        CARDSCHEME: string | null;
        TRANSACTION_ID: string | null;
        USER_ID: number;
      }

      interface RemitaCustomField {
        CUSTOM_ID: number;
        COLUMNNAME: string;
        COLUMNVALUE: string;
        RRRN: string;
      }

      interface RemitaApiResponse {
        paymentDetails: RemitaPaymentDetail[];
        customFields: RemitaCustomField[];
        customFieldsSL: unknown[];
        customFieldsSP: unknown[];
        partPayment: unknown[];
        rrrInvoice: unknown | null;
        taxPayment: unknown[];
        status: string;
      }

      const remitaJson: RemitaApiResponse = await remitaRes.json();

      // Validate the response structure
      if (
        !remitaJson?.paymentDetails ||
        remitaJson.paymentDetails.length === 0
      ) {
        return {
          success: false,
          error: `[Step 4: Fetch Remita Receipt] Remita API returned no payment details. The receipt may be invalid or expired.`,
        };
      }

      const pd = remitaJson.paymentDetails[0];
      const customFields = remitaJson.customFields || [];

      // Extract the LASG anchor from custom fields (the "Lasg" column)
      const lasgField = customFields.find(
        (f) => f.COLUMNNAME?.toLowerCase() === "lasg",
      );
      const remitaTransactionAnchor = lasgField?.COLUMNVALUE || "";

      // Determine payment status from the API response
      // status "A" = Active/Approved, PAYMENTSTATUS "RTC" = Real-Time Cleared
      const isRemitaPaid =
        remitaJson.status === "A" ||
        pd.PAYMENTSTATUS === "RTC" ||
        pd.PAYMENTSTATUS === "00" ||
        pd.PAYMENTSTATUS === "01";

      // Build the remitaData object (same shape as the old AI-extracted one)
      remitaData = {
        rrr: String(pd.RRRNUMBER || pd.RRR || "").replace(/\D/g, ""),
        amount: Number(pd.TRANSACTIONAMOUNT) || 0,
        status: isRemitaPaid ? "PAID" : "UNPAID",
        transactionAnchor: remitaTransactionAnchor,
        payerName: String(pd.PAYER || "").trim(),
        payerEmail: String(pd.EMAIL || "").trim(),
      };

      console.log("Remita JSON extraction result:", remitaData);

      if (!remitaData.rrr || remitaData.rrr.length < 10) {
        return {
          success: false,
          error: `[Step 5: Remita Data Extraction] Could not extract a valid RRR from the Remita receipt.`,
        };
      }

      if (!remitaData.transactionAnchor) {
        return {
          success: false,
          error: `[Step 5: Remita Data Extraction] Could not extract the LASG reference (anchor) from the Remita receipt BILLER REQUIRED INFORMATION section.`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: `[Step 4: Fetch Remita Receipt] Failed to access Remita receipt URL: ${err.message}`,
      };
    }

    // 6. AI extract from LASG receipt content (PDF text)
    console.log("Extracting fields from LASG receipt content...");
    const lasgResult = await extractLASGReceiptFromHtml(lasgContent);
    if (!lasgResult.success || !lasgResult.data) {
      return {
        success: false,
        error: `[Step 5: LASG Data Extraction] ${lasgResult.error}`,
      };
    }
    console.log("LASG extraction result:", lasgResult.data);

    const lasgData = lasgResult.data;

    // 7. Cross-validation (all deterministic)

    // 7a. Anchor match — the transaction reference must match between both receipts
    const normalizeAnchor = (anchor: string) =>
      anchor.replace(/[^0-9-]/g, "").trim();

    const lasgAnchor = normalizeAnchor(lasgData.transactionAnchor);
    const remitaAnchor = normalizeAnchor(remitaData.transactionAnchor);

    if (lasgAnchor !== remitaAnchor) {
      return {
        success: false,
        error: `[Step 6: Anchor Cross-Check] Transaction anchor mismatch: The LASG receipt reference "${lasgData.transactionAnchor}" does not match the Remita receipt reference "${remitaData.transactionAnchor}". These two receipts do not appear to be for the same transaction.`,
      };
    }

    // 7b. Amount match — LASG amount must exactly match the batch total
    if (lasgData.amountPaid !== batch.totalAmount) {
      return {
        success: false,
        error: `[Step 6: Amount Verification] Amount mismatch: The LASG receipt shows ₦${lasgData.amountPaid.toLocaleString()} but the batch total is ₦${batch.totalAmount.toLocaleString()}. The payment amount must exactly match.`,
      };
    }

    // 7c. Remita payment status must indicate PAID
    if (remitaData.status !== "PAID") {
      return {
        success: false,
        error: `[Step 6: Payment Status] Remita receipt status is "${remitaData.status}" — expected "PAID". Please ensure payment is complete before verifying.`,
      };
    }

    // 7d. RRR uniqueness check
    const rrr = remitaData.rrr;
    const existingBatchWithRRR =
      await prisma.certificateOfDepositBatch.findFirst({
        where: {
          userPaymentRef: rrr,
          id: { not: batchId },
        },
        select: { id: true, batchCode: true },
      });

    if (existingBatchWithRRR) {
      return {
        success: false,
        error: `[Step 6: RRR Uniqueness] This RRR (${rrr}) has already been used for batch ${existingBatchWithRRR.batchCode}. Each RRR can only be used once.`,
      };
    }

    // 8. Construct the EBS URL from parsed LASG URL params
    const ebsUrl = `https://printreceipt.ebs-rcm.com/Listen/printreceipt?dbName=LASG&payertype=${payerType}&payerid=${payerId}&transid=${transId}&transcode=${transCode}`;
    console.log("Constructed EBS URL:", ebsUrl);

    // 9. Update Batch — store URLs, skip S3
    // Use the actual LASG transaction date from the receipt, fallback to now
    const lasgPaymentDate = lasgData.transactionDate
      ? new Date(lasgData.transactionDate)
      : new Date();
    // Guard against invalid date parsing
    const validLasgPaymentDate = isNaN(lasgPaymentDate.getTime())
      ? new Date()
      : lasgPaymentDate;

    await prisma.certificateOfDepositBatch.update({
      where: { id: batchId },
      data: {
        userPaymentRef: rrr,
        paymentStatus: "LASG_PAID",
        userPaymentDate: new Date(),
        lasgPaymentDate: validLasgPaymentDate,
        paymentAnchor: lasgAnchor, // Cross-validation anchor linking LASG and Remita receipts
        lasgReceiptUrl: ebsUrl,
        remitaReceiptUrl: remitaReceiptUrl,
        lasgReceiptS3Key: null, // No S3 upload in two-link flow
      },
    });

    // 10. Notifications
    const submitter =
      fullUser ||
      (await prisma.surfboardUser.findUnique({
        where: { id: user.id },
        select: { firstName: true, lastName: true },
      }));

    if (submitter) {
      try {
        await notifyPaymentReceived({
          batchId: batch.id,
          batchCode: batch.batchCode,
          amount: batch.totalAmount,
          paidBy: submitter,
          sendEmail: true,
        });

        await notifyLASGReceiptUploaded({
          batchId: batch.id,
          batchCode: batch.batchCode,
          planCount: batch.planCount,
          sendEmail: true,
        });
      } catch (e) {
        console.error("Notification error", e);
      }
    }

    return {
      success: true,
      data: {
        success: true,
        status: "LASG_PAID",
        ebsUrl,
      },
    };
  } catch (error) {
    console.error("verifyBatchPaymentWithLinks error:", error);
    return {
      success: false,
      error: handlePrismaError(error, "verifyBatchPaymentWithLinks"),
    };
  }
}

/**
 * Fallback: Verify a user-provided LASG Receipt Link
 * Uses AI to analyze the receipt PDF and validate payment
 */
export async function verifyLASGReceiptLink(
  batchId: string,
  receiptUrl: string,
): Promise<ApiResult<{ success: boolean; status: string }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const batch = await prisma.certificateOfDepositBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return { success: false, error: "Batch not found" };
    }

    if (batch.submittedBy !== user.id && user.role !== "SUPERADMIN") {
      return { success: false, error: "Unauthorized to verify this batch" };
    }

    // Fetch and Analyze the receipt using AI
    const { text } = await fetchAndExtractTextFromUrl(receiptUrl);
    const aiResult = await extractPaymentDetailsFromText(text);

    if (!aiResult.success || !aiResult.data) {
      return {
        success: false,
        error:
          "Could not analyze receipt. Please ensure it is a valid PDF receipt.",
      };
    }

    const { status, amount, rrr } = aiResult.data;

    // Check Status
    if (status === "PENDING" || status === "FAILED") {
      return {
        success: false,
        error: `Receipt analysis indicates status is ${status}. Please upload a successful payment receipt.`,
      };
    }

    // Check Amount (with tolerance)
    const tolerance = 5.0;
    if (Math.abs(amount - batch.totalAmount) > tolerance) {
      return {
        success: false,
        error: `Receipt amount (₦${amount}) does not match batch amount (₦${batch.totalAmount}).`,
      };
    }

    // Update Batch
    await prisma.certificateOfDepositBatch.update({
      where: { id: batchId },
      data: {
        userPaymentRef: rrr || batch.userPaymentRef,
        paymentStatus: "LASG_PAID",
        userPaymentDate: new Date(),
        lasgPaymentDate: new Date(),
        lasgReceiptUrl: receiptUrl,
      },
    });

    // Send Notifications
    const submitter = await prisma.surfboardUser.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true },
    });

    if (submitter) {
      try {
        await notifyPaymentReceived({
          batchId: batch.id,
          batchCode: batch.batchCode,
          amount: batch.totalAmount,
          paidBy: submitter,
          sendEmail: true,
        });

        await notifyLASGReceiptUploaded({
          batchId: batch.id,
          batchCode: batch.batchCode,
          planCount: batch.planCount,
          sendEmail: true,
        });
      } catch (e) {
        console.error("Notification error", e);
      }
    }

    return { success: true, data: { success: true, status: "LASG_PAID" } };
  } catch (error) {
    console.error("verifyLASGReceiptLink error:", error);
    return {
      success: false,
      error: handlePrismaError(error, "verifyLASGReceiptLink"),
    };
  }
}

/**
 * Get all batches submitted by the current user
 */
export async function getUserBatches(): Promise<
  ApiResult<{
    batches: Array<{
      id: string;
      batchCode: string;
      planCount: number;
      totalFees: number;
      systemCharges: number;
      totalAmount: number;
      paymentStatus: string;
      userPaymentRef: string | null;
      userPaymentDate: Date | null;
      createdAt: Date;
      plans: Array<{
        id: string;
        planNumber: string;
        surveyTitle: string;
        status: string;
        redCopyStatus: string;
      }>;
      submitter: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phoneNumber?: string | null;
        payerID?: number | null;
        payerIDType?: string | null;
      } | null;
    }>;
  }>
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const batches = await prisma.certificateOfDepositBatch.findMany({
      where: {
        submittedBy: user.id,
      },
      select: {
        id: true,
        batchCode: true,
        planCount: true,
        totalFees: true,
        systemCharges: true,
        totalAmount: true,
        paymentStatus: true,
        userPaymentRef: true,
        userPaymentDate: true,
        createdAt: true,
        plans: {
          select: {
            id: true,
            planNumber: true,
            surveyTitle: true,
            status: true,
            redCopyStatus: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        submitter: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            payerID: true,
            payerIDType: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: { batches },
    };
  } catch (error) {
    console.error("Error fetching user batches:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getUserBatches"),
    };
  }
}

/**
 * Retry payment for a batch with pending/failed payment
 */
export async function retryBatchPayment(batchId: string): Promise<
  ApiResult<{
    reference: string;
    email: string;
    amount: number;
    batchCode: string;
    batchId: string;
    submitter: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string | null;
      payerID?: number | null;
      payerIDType?: string | null;
    };
  }>
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Find batch and verify ownership
    const batch = await prisma.certificateOfDepositBatch.findFirst({
      where: {
        id: batchId,
        submittedBy: user.id,
      },
      select: {
        id: true,
        batchCode: true,
        totalAmount: true,
        paymentStatus: true,
        userPaymentRef: true,
      },
    });

    if (!batch) {
      return { success: false, error: "Batch not found" };
    }

    // Check if already paid
    if (
      batch.paymentStatus === "USER_PAID" ||
      batch.paymentStatus === "LASG_PAID"
    ) {
      return { success: false, error: "Batch payment already completed" };
    }

    // Get user details
    const userDetails = await prisma.surfboardUser.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        payerID: true,
        payerIDType: true,
      },
    });
    if (!userDetails?.email) {
      return { success: false, error: "User or email not found" };
    }

    // Validate amount
    if (!batch.totalAmount || batch.totalAmount <= 0) {
      console.error("Invalid batch amount:", {
        batchId: batch.id,
        batchCode: batch.batchCode,
        totalAmount: batch.totalAmount,
      });
      return {
        success: false,
        error: "Invalid batch amount. Please contact support.",
      };
    }

    // Generate or reuse payment reference
    const reference =
      batch.userPaymentRef || `SurfCoD_${batch.batchCode}_${Date.now()}`;

    // Update batch with payment reference if new
    if (!batch.userPaymentRef) {
      await prisma.certificateOfDepositBatch.update({
        where: { id: batch.id },
        data: { userPaymentRef: reference },
      });
    }

    return {
      success: true,
      data: {
        reference: reference,
        email: userDetails.email,
        amount: batch.totalAmount,
        batchCode: batch.batchCode,
        batchId: batch.id,
        submitter: {
          id: userDetails.id,
          email: userDetails.email,
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
          phoneNumber: userDetails.phoneNumber,
          payerID: userDetails.payerID,
          payerIDType: userDetails.payerIDType,
        },
      },
    };
  } catch (error) {
    console.error("Error retrying batch payment:", error);
    return {
      success: false,
      error: handlePrismaError(error, "retryBatchPayment"),
    };
  }
}

/**
 * Upload LASG receipt (Surfboard Admin only)
 */
export async function uploadLASGReceipt(
  batchId: string,
  receiptUrl: string,
  receiptS3Key: string,
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.certificateOfDepositBatch.update({
      where: { id: batchId },
      data: {
        lasgReceiptUrl: receiptUrl,
        lasgReceiptS3Key: receiptS3Key,
        lasgPaymentDate: new Date(),
        lasgReceiptUploadedBy: user.id,
        lasgReceiptUploadedAt: new Date(),
        paymentStatus: "LASG_PAID",
      },
    });

    // Send notification to Records I, Records II, Accounts, Charting, SURCON
    const batchWithPlans = await prisma.certificateOfDepositBatch.findUnique({
      where: { id: batchId },
      select: { batchCode: true, planCount: true },
    });

    if (batchWithPlans) {
      await notifyLASGReceiptUploaded({
        batchId,
        batchCode: batchWithPlans.batchCode,
        planCount: batchWithPlans.planCount,
        sendEmail: true,
      });
    }

    // Log audit action
    await logAuditAction({
      userId: user.id,
      action: "UPLOAD_LASG_RECEIPT",
      entity: "CertificateOfDepositBatch",
      entityId: batchId,
      changes: createChangeLog({
        batchCode: batchWithPlans?.batchCode,
        receiptUrl,
        receiptS3Key,
        paymentStatus: "LASG_PAID",
      }),
    });

    revalidatePath("/surf-restricted/dashboard/surf-plans");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error uploading LASG receipt:", error);
    return {
      success: false,
      error: handlePrismaError(error, "uploadLASGReceipt"),
    };
  }
}

/**
 * Accounts Admin: Approve or disapprove batch
 */
export async function updateAccountsApproval(
  batchId: string,
  approved: boolean,
  comment?: string,
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || (user.role !== "ACCOUNTS" && user.role !== "SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    // Update the batch status and get batchCode in the same query
    const batch = await prisma.certificateOfDepositBatch.update({
      where: { id: batchId },
      data: {
        accountsApprovedBy: user.id,
        accountsApprovedAt: new Date(),
        accountsDisapproved: !approved,
        accountsComment: comment,
        paymentStatus: approved ? "ACCOUNTS_APPROVED" : "ACCOUNTS_DISAPPROVED",
      },
      select: { batchCode: true },
    });

    // Fetch plans with their status fields BEFORE updating (other statuses don't change)
    // This allows us to reuse the data for notification check later
    const batchPlans = await prisma.surfboardPlan.findMany({
      where: { batchId: batchId },
      select: {
        id: true,
        userId: true,
        planNumber: true,
        accountsStatus: true,
        chartingStatus: true,
        surconStatus: true,
        recordsIStatus: true,
        recordsIIStatus: true,
      },
    });

    // Update accountsStatus on all plans in the batch
    await prisma.surfboardPlan.updateMany({
      where: { batchId: batchId },
      data: {
        accountsStatus: approved ? "APPROVED" : "QUERIED",
        accountsApprovedBy: user.id,
        accountsApprovedAt: new Date(),
        accountsComment: comment,
      },
    });

    if (!approved) {
      // Send notification to Surfboard Admins only
      await notifyAccountsDisapproval({
        batchId,
        batchCode: batch.batchCode,
        comment,
        sendEmail: true,
      });
    }

    revalidatePath("/surf-mda/dashboard/accounts");
    revalidatePath("/surf-mda/dashboard/charting");
    revalidatePath("/surf-mda/dashboard/surcon");
    revalidatePath("/surf-mda/dashboard/records-i");
    revalidatePath("/surf-mda/dashboard/records-ii");
    revalidatePath("/surf-mda/dashboard"); // Main MDA dashboard for pending counts

    // Log audit action
    await logAuditAction({
      userId: user.id,
      action: approved ? "APPROVE_ACCOUNTS" : "DISAPPROVE_ACCOUNTS",
      entity: "CertificateOfDepositBatch",
      entityId: batchId,
      changes: createChangeLog({
        batchCode: batch.batchCode,
        approved,
        comment: comment || null,
        paymentStatus: approved ? "ACCOUNTS_APPROVED" : "ACCOUNTS_DISAPPROVED",
      }),
    });

    revalidatePath("/surf-restricted/dashboard/surf-plans");

    // Check if all four MDA approvals are complete for each plan
    // Accounts is now APPROVED, check the other three using already-fetched data
    for (const plan of batchPlans) {
      if (approved) {
        const allFourApproved =
          plan.chartingStatus === "APPROVED" &&
          plan.surconStatus === "APPROVED" &&
          plan.recordsIStatus === "APPROVED" &&
          plan.recordsIIStatus === "PENDING";

        if (allFourApproved && plan.userId) {
          await notifyReadyForPhysicalSubmission({
            userId: plan.userId,
            planId: plan.id,
            planNumber: plan.planNumber,
            sendEmail: true,
          });
        }
      }
      // Re-evaluate consolidated queries after updating accounts 
      await checkAndDispatchQueries(plan.id);
    }

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error updating accounts approval:", error);
    return {
      success: false,
      error: handlePrismaError(error, "updateAccountsApproval"),
    };
  }
}

/**
 * Charting Admin: Approve or query plan
 */
export async function updateChartingStatus(
  planId: string,
  mode: "APPROVE" | "QUERY",
  comment?: string,
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || (user.role !== "CHARTING" && user.role !== "SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const approved = mode === "APPROVE";

    const plan = await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        chartingRemarks: approved ? comment : undefined,
        chartingComment: !approved ? comment : undefined,
        chartingStatus: approved ? "APPROVED" : "QUERIED",
        chartingApprovedBy: user.id,
        chartingApprovedAt: new Date(),
      },
      select: {
        userId: true,
        planNumber: true,
        accountsStatus: true,
        surconStatus: true,
        recordsIStatus: true,
        recordsIIStatus: true,
      },
    });

    revalidatePath("/surf-mda/dashboard/charting");
    revalidatePath("/surf-mda/dashboard"); // Main MDA dashboard for pending counts

    // Log audit action
    await logAuditAction({
      userId: user.id,
      action: approved ? "APPROVE_CHARTING" : "QUERY_CHARTING",
      entity: "SurfboardPlan",
      entityId: planId,
      changes: createChangeLog({
        planNumber: plan.planNumber,
        approved,
        comment: comment || null,
        chartingStatus: approved ? "APPROVED" : "QUERIED",
      }),
    });

    // Check if all four MDA approvals are complete and notify user
    // Charting is now APPROVED, check the other three
    if (approved) {
      const allFourApproved =
        plan.accountsStatus === "APPROVED" &&
        plan.surconStatus === "APPROVED" &&
        plan.recordsIStatus === "APPROVED" &&
        plan.recordsIIStatus === "PENDING";

      if (allFourApproved && plan.userId) {
        await notifyReadyForPhysicalSubmission({
          userId: plan.userId,
          planId,
          planNumber: plan.planNumber,
          sendEmail: true,
        });
      }
    }
    
    await checkAndDispatchQueries(planId);

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error updating charting status:", error);
    return {
      success: false,
      error: handlePrismaError(error, "updateChartingStatus"),
    };
  }
}

/**
 * SURCON Admin: Approve or query plan
 */
export async function updateSurconStatus(
  planId: string,
  approved: boolean,
  comment?: string,
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || (user.role !== "SURCON" && user.role !== "SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const plan = await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        surconStatus: approved ? "APPROVED" : "QUERIED",
        surconApprovedBy: user.id,
        surconApprovedAt: new Date(),
        surconComment: comment,
      },
      select: {
        userId: true,
        planNumber: true,
        accountsStatus: true,
        chartingStatus: true,
        recordsIStatus: true,
        recordsIIStatus: true,
      },
    });

    revalidatePath("/surf-mda/dashboard/surcon");
    revalidatePath("/surf-mda/dashboard"); // Main MDA dashboard for pending counts

    // Log audit action
    await logAuditAction({
      userId: user.id,
      action: approved ? "APPROVE_SURCON" : "QUERY_SURCON",
      entity: "SurfboardPlan",
      entityId: planId,
      changes: createChangeLog({
        planNumber: plan.planNumber,
        approved,
        comment: comment || null,
        surconStatus: approved ? "APPROVED" : "QUERIED",
      }),
    });

    // Check if all four MDA approvals are complete and notify user
    // SURCON is now APPROVED, check the other three
    if (approved) {
      const allFourApproved =
        plan.accountsStatus === "APPROVED" &&
        plan.chartingStatus === "APPROVED" &&
        plan.recordsIStatus === "APPROVED" &&
        plan.recordsIIStatus === "PENDING";

      if (allFourApproved && plan.userId) {
        await notifyReadyForPhysicalSubmission({
          userId: plan.userId,
          planId,
          planNumber: plan.planNumber,
          sendEmail: true,
        });
      }
    }
    
    await checkAndDispatchQueries(planId);

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error updating SURCON status:", error);
    return {
      success: false,
      error: handlePrismaError(error, "updateSurconStatus"),
    };
  }
}

/**
 * Records I Admin: Approve or query plan
 */
export async function updateRecordsIStatus(
  planId: string,
  approved: boolean,
  comment?: string,
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || (user.role !== "RECORDS_I" && user.role !== "SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const plan = await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        recordsIStatus: approved ? "APPROVED" : "QUERIED",
        recordsIApprovedBy: user.id,
        recordsIApprovedAt: new Date(),
        recordsIComment: comment,
      },
      select: {
        userId: true,
        planNumber: true,
        accountsStatus: true,
        chartingStatus: true,
        surconStatus: true,
        recordsIIStatus: true,
      },
    });

    revalidatePath("/surf-mda/dashboard/records-i");
    revalidatePath("/surf-mda/dashboard"); // Main MDA dashboard for pending counts

    // Log audit action
    await logAuditAction({
      userId: user.id,
      action: approved ? "APPROVE_RECORDS_I" : "QUERY_RECORDS_I",
      entity: "SurfboardPlan",
      entityId: planId,
      changes: createChangeLog({
        planNumber: plan.planNumber,
        approved,
        comment: comment || null,
        recordsIStatus: approved ? "APPROVED" : "QUERIED",
      }),
    });

    // Check if all four MDA approvals are complete and notify user
    // Records I is now APPROVED, check the other three
    if (approved) {
      const allFourApproved =
        plan.accountsStatus === "APPROVED" &&
        plan.chartingStatus === "APPROVED" &&
        plan.surconStatus === "APPROVED" &&
        plan.recordsIIStatus === "PENDING";

      if (allFourApproved && plan.userId) {
        await notifyReadyForPhysicalSubmission({
          userId: plan.userId,
          planId,
          planNumber: plan.planNumber,
          sendEmail: true,
        });
      }
    }

    await checkAndDispatchQueries(planId);

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error updating Records I status:", error);
    return {
      success: false,
      error: handlePrismaError(error, "updateRecordsIStatus"),
    };
  }
}

/**
 * Intake Admin: Sequential approval of batches
 */
export async function updateIntakeStatus(
  planId: string,
  approved: boolean,
  comment?: string,
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || (user.role !== "INTAKE" && user.role !== "SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if parallel approvals are done before intake can approve
    const planCheck = await prisma.surfboardPlan.findUnique({
      where: { id: planId },
      select: {
        accountsStatus: true,
        chartingStatus: true,
        surconStatus: true,
        recordsIStatus: true,
      },
    });

    if (!planCheck) {
      return { success: false, error: "Plan not found" };
    }

    if (
      planCheck.accountsStatus !== "APPROVED" ||
      planCheck.chartingStatus !== "APPROVED" ||
      planCheck.surconStatus !== "APPROVED" ||
      planCheck.recordsIStatus !== "APPROVED"
    ) {
      return { success: false, error: "Parallel reviews must be completed before Intake Admin can act." };
    }

    const plan = await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        intakeStatus: approved ? "APPROVED" : "QUERIED",
        intakeApprovedBy: user.id,
        intakeApprovedAt: new Date(),
        intakeComment: comment,
      },
      select: {
        userId: true,
        planNumber: true,
        redCopyStatus: true,
      },
    });

    revalidatePath("/surf-mda/dashboard/intake");
    revalidatePath("/surf-mda/dashboard"); // Main MDA dashboard

    // Log audit action
    await logAuditAction({
      userId: user.id,
      action: approved ? "APPROVE_INTAKE" : "QUERY_INTAKE",
      entity: "SurfboardPlan",
      entityId: planId,
      changes: createChangeLog({
        planNumber: plan.planNumber,
        approved,
        comment: comment || null,
        intakeStatus: approved ? "APPROVED" : "QUERIED",
      }),
    });

    // If INTAKE queries, dispatch a consolidated note indicating Intake queried
    if (!approved && plan.userId) {
      await prisma.surfboardPlan.update({
        where: { id: planId },
        data: { redCopyStatus: "QUERIED" }
      });

      const { notifyConsolidatedQueries } = await import("./notificationActions");
      await notifyConsolidatedQueries({
        userId: plan.userId,
        planId,
        planNumber: plan.planNumber,
        queries: [{ role: "Intake", comment: comment || undefined }],
        sendEmail: true,
      });
    }

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error updating Intake status:", error);
    return {
      success: false,
      error: handlePrismaError(error, "updateIntakeStatus"),
    };
  }
}

/**
 * Records II Admin: Final approval and submission to OSSG
 */
export async function updateRecordsIIStatus(
  planId: string,
  approved: boolean,
  comment?: string,
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || (user.role !== "RECORDS_II" && user.role !== "SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if all other approvals are done (including intake)
    const planCheck = await prisma.surfboardPlan.findUnique({
      where: { id: planId },
      select: {
        accountsStatus: true,
        chartingStatus: true,
        surconStatus: true,
        recordsIStatus: true,
        intakeStatus: true,
        batchId: true,
      },
    });

    if (!planCheck) {
      return { success: false, error: "Plan not found" };
    }

    if (
      planCheck.accountsStatus !== "APPROVED" ||
      planCheck.chartingStatus !== "APPROVED" ||
      planCheck.surconStatus !== "APPROVED" ||
      planCheck.recordsIStatus !== "APPROVED" ||
      planCheck.intakeStatus !== "APPROVED"
    ) {
      return {
        success: false,
        error: "All other approvals (including Intake) must be completed first",
      };
    }

    const plan = await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        recordsIIStatus: approved ? "APPROVED" : "QUERIED",
        recordsIIApprovedBy: user.id,
        recordsIIApprovedAt: new Date(),
        recordsIIComment: comment,
        // Nullify other roles + intake if queried
        ...(!approved ? {
          accountsStatus: "PENDING",
          chartingStatus: "PENDING",
          surconStatus: "PENDING",
          recordsIStatus: "PENDING",
          intakeStatus: "PENDING",
        } : {}),
        ...(approved
          ? {
            status: "LODGED",
            redCopyStatus: "APPROVED",
            dateLodged: new Date(),
          }
          : {}),
      },
      include: {
        user: true,
        batch: { select: { batchCode: true } },
      },
    });

    if (approved) {
      // Simulate transmitting to OSSG API
      await transmitToOSSG(plan, plan.user);

      // Send notification to user with batch details
      if (plan.userId) {
        await notifyPlanApproved({
          userId: plan.userId,
          planId,
          planNumber: plan.planNumber,
          batchCode: plan.batch?.batchCode,
          sendEmail: true,
        });
      }
    } else {
      // Send notification to user about query
      if (plan.userId) {
        await notifyPlanQueried({
          userId: plan.userId,
          planId,
          planNumber: plan.planNumber,
          queriedBy: "Records II",
          comment,
          sendEmail: true,
        });
      }
    }

    revalidatePath("/surf-mda/dashboard/records-ii");
    revalidatePath("/surf-mda/dashboard"); // Main MDA dashboard for pending counts

    // Log audit action
    await logAuditAction({
      userId: user.id,
      action: approved ? "APPROVE_RECORDS_II" : "QUERY_RECORDS_II",
      entity: "SurfboardPlan",
      entityId: planId,
      changes: createChangeLog({
        planNumber: plan.planNumber,
        approved,
        comment: comment || null,
        recordsIIStatus: approved ? "APPROVED" : "QUERIED",
      }),
    });

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error updating Records II status:", error);
    return {
      success: false,
      error: handlePrismaError(error, "updateRecordsIIStatus"),
    };
  }
}

/**
 * Get batches for Accounts Admin view
 */
export async function getAccountsBatches() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (
      !user ||
      (user.role !== "ACCOUNTS" &&
        user.role !== "SUPERADMIN" &&
        user.role !== "MDA_SUPERADMIN")
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const batches = await prisma.certificateOfDepositBatch.findMany({
      where: {
        paymentStatus: "LASG_PAID",
        accountsApprovedBy: null,
      },
      include: {
        submitter: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        plans: {
          select: {
            id: true,
            planNumber: true,
            lga: true,
            deededArea: true,
            queryLasgReceiptUrls: true,
            queryRemitaReceiptUrls: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log("\n\n\n\n\n\n\n\n Accounts batches:", batches);

    return { success: true, data: batches };
  } catch (error) {
    console.error("Error fetching accounts batches:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getAccountsBatches"),
    };
  }
}

/**
 * Get pending counts for all MDA roles
 */
export async function getPendingCountByRole(): Promise<
  ApiResult<{
    accounts: number;
    charting: number;
    surcon: number;
    recordsI: number;
    recordsII: number;
    archive: number;
    intake: number;
  }>
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (
      !user ||
      ![
        "ADMIN",
        "SUPERADMIN",
        "ACCOUNTS",
        "CHARTING",
        "SURCON",
        "RECORDS_I",
        "INTAKE",
        "RECORDS_II",
        "ARCHIVE",
        "MDA_SUPERADMIN",
      ].includes(user.role)
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const [
      accountsCount,
      chartingCount,
      surconCount,
      recordsICount,
      recordsIICount,
      archiveCount,
      intakeCount,
    ] = await Promise.all([
      // Accounts: Count batches with LASG_PAID status and no accounts approval
      prisma.certificateOfDepositBatch.count({
        where: {
          paymentStatus: "LASG_PAID",
          accountsApprovedBy: null,
        },
      }),
      // Charting: Count plans with PENDING charting status (only from batches with LASG receipt)
      prisma.surfboardPlan.count({
        where: {
          redCopyStatus: "SUBMITTED",
          chartingStatus: "PENDING",
          deleted: false,
          batch: {
            paymentStatus: {
              in: [
                "LASG_PAID",
                "ACCOUNTS_APPROVED",
                "ACCOUNTS_DISAPPROVED",
                "COMPLETED",
              ],
            },
          },
        },
      }),
      // SURCON: Count plans with PENDING or QUERIED surcon status (only from batches with LASG receipt)
      prisma.surfboardPlan.count({
        where: {
          redCopyStatus: "SUBMITTED",
          surconStatus: { in: ["PENDING", "QUERIED"] },
          deleted: false,
          batch: {
            paymentStatus: {
              in: [
                "LASG_PAID",
                "ACCOUNTS_APPROVED",
                "ACCOUNTS_DISAPPROVED",
                "COMPLETED",
              ],
            },
          },
        },
      }),
      // Records I: Count plans with PENDING or QUERIED records I status (only from batches with LASG receipt)
      prisma.surfboardPlan.count({
        where: {
          redCopyStatus: "SUBMITTED",
          recordsIStatus: { in: ["PENDING", "QUERIED"] },
          deleted: false,
          batch: {
            paymentStatus: {
              in: [
                "LASG_PAID",
                "ACCOUNTS_APPROVED",
                "ACCOUNTS_DISAPPROVED",
                "COMPLETED",
              ],
            },
          },
        },
      }),
      // Records II: Count plans with all other approvals complete including intake
      prisma.surfboardPlan.count({
        where: {
          redCopyStatus: "SUBMITTED",
          recordsIIStatus: "PENDING",
          accountsStatus: "APPROVED",
          chartingStatus: "APPROVED",
          surconStatus: "APPROVED",
          recordsIStatus: "APPROVED",
          intakeStatus: "APPROVED",
          deleted: false,
          batch: {
            paymentStatus: {
              in: [
                "LASG_PAID",
                "ACCOUNTS_APPROVED",
                "ACCOUNTS_DISAPPROVED",
                "COMPLETED",
              ],
            },
          },
        },
      }),
      // Archive: Count plans fully approved (including Records II and Intake), not yet archived
      prisma.surfboardPlan.count({
        where: {
          redCopyStatus: "APPROVED",
          surconStatus: "APPROVED",
          chartingStatus: "APPROVED",
          recordsIStatus: "APPROVED",
          intakeStatus: "APPROVED",
          recordsIIStatus: "APPROVED",
          accountsStatus: "APPROVED",
          archiveReceivedAt: null,
          deleted: false,
        },
      }),
      // Intake: Count batches with at least one plan pending intake (and previous steps approved)
      prisma.certificateOfDepositBatch.count({
        where: {
          plans: {
            some: {
              redCopyStatus: "SUBMITTED",
              accountsStatus: "APPROVED",
              chartingStatus: "APPROVED",
              surconStatus: "APPROVED",
              recordsIStatus: "APPROVED",
              recordsIIStatus: "PENDING",
              intakeStatus: "PENDING",
              deleted: false,
            }
          }
        }
      }),
    ]);

    return {
      success: true,
      data: {
        accounts: accountsCount,
        charting: chartingCount,
        surcon: surconCount,
        recordsI: recordsICount,
        recordsII: recordsIICount,
        archive: archiveCount,
        intake: intakeCount,
      },
    };
  } catch (error) {
    console.error("Error fetching pending counts:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getPendingCountByRole"),
    };
  }
}

/**
 * Get plans for Charting Admin view
 */
export async function getChartingPlans() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (
      !user ||
      (user.role !== "CHARTING" &&
        user.role !== "SUPERADMIN" &&
        user.role !== "MDA_SUPERADMIN")
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();
    const plans = await prisma.surfboardPlan.findMany({
      where: {
        redCopyStatus: "SUBMITTED",
        chartingStatus: "PENDING",
        deleted: false,
        // Only show plans where batch has LASG receipt uploaded (LASG_PAID or later)
        batch: {
          paymentStatus: {
            in: [
              "LASG_PAID",
              "ACCOUNTS_APPROVED",
              "ACCOUNTS_DISAPPROVED",
              "COMPLETED",
            ],
          },
        },
      },
      include: {
        batch: {
          select: {
            batchCode: true,
            paymentStatus: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { redCopySubmittedAt: "asc" }, // Oldest first for FIFO
    });

    // Add lock status information
    const plansWithLockStatus = plans.map((plan) => ({
      ...plan,
      isLocked:
        plan.chartingLockedBy &&
        plan.chartingLockExpiresAt &&
        new Date(plan.chartingLockExpiresAt) > now,
      lockExpiresAt: plan.chartingLockExpiresAt,
    }));

    return { success: true, data: plansWithLockStatus };
  } catch (error) {
    console.error("Error fetching charting plans:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getChartingPlans"),
    };
  }
}

/**
 * Get plans for SURCON Admin view
 */
export async function getSurconPlans() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (
      !user ||
      (user.role !== "SURCON" &&
        user.role !== "SUPERADMIN" &&
        user.role !== "MDA_SUPERADMIN")
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();
    const plans = await prisma.surfboardPlan.findMany({
      where: {
        redCopyStatus: "SUBMITTED",
        surconStatus: { in: ["PENDING"] },
        deleted: false,
        // Only show plans where batch has LASG receipt uploaded (LASG_PAID or later)
        batch: {
          paymentStatus: {
            in: [
              "LASG_PAID",
              "ACCOUNTS_APPROVED",
              "ACCOUNTS_DISAPPROVED",
              "COMPLETED",
            ],
          },
        },
      },
      include: {
        batch: {
          select: {
            batchCode: true,
            paymentStatus: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            surconRegNumber: true,
            companyName: true,
            surconRegName: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { redCopySubmittedAt: "asc" }, // Oldest first for FIFO
    });

    // Add lock status information
    const plansWithLockStatus = plans.map((plan) => ({
      ...plan,
      isLocked:
        plan.surconLockedBy &&
        plan.surconLockExpiresAt &&
        new Date(plan.surconLockExpiresAt) > now,
      lockExpiresAt: plan.surconLockExpiresAt,
    }));

    return { success: true, data: plansWithLockStatus };
  } catch (error) {
    console.error("Error fetching SURCON plans:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getSurconPlans"),
    };
  }
}

/**
 * Get plans for Records I Admin view
 */
export async function getRecordsIPlans() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (
      !user ||
      (user.role !== "RECORDS_I" &&
        user.role !== "SUPERADMIN" &&
        user.role !== "MDA_SUPERADMIN")
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();
    const plans = await prisma.surfboardPlan.findMany({
      where: {
        redCopyStatus: "SUBMITTED",
        recordsIStatus: { in: ["PENDING"] },
        deleted: false,
        // // Records I requires all 3 prior approvals to be complete
        // accountsStatus: "APPROVED",
        // chartingStatus: "APPROVED",
        // surconStatus: "APPROVED",
        // Only show plans where batch has LASG receipt uploaded (LASG_PAID or later)
        batch: {
          paymentStatus: {
            in: [
              "LASG_PAID",
              "ACCOUNTS_APPROVED",
              "ACCOUNTS_DISAPPROVED",
              "COMPLETED",
            ],
          },
        },
      },
      include: {
        batch: {
          select: {
            batchCode: true,
            paymentStatus: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            surconRegNumber: true,
            companyName: true,
          },
        },
      },
      orderBy: { redCopySubmittedAt: "asc" }, // Oldest first for FIFO
    });

    // Add lock status information
    const plansWithLockStatus = plans.map((plan) => ({
      ...plan,
      isLocked:
        plan.recordsILockedBy &&
        plan.recordsILockExpiresAt &&
        new Date(plan.recordsILockExpiresAt) > now,
      lockExpiresAt: plan.recordsILockExpiresAt,
    }));

    return { success: true, data: plansWithLockStatus };
  } catch (error) {
    console.error("Error fetching Records I plans:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getRecordsIPlans"),
    };
  }
}

/**
 * Get plans for Records II Admin view
 */
export async function getRecordsIIPlans() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (
      !user ||
      (user.role !== "RECORDS_II" &&
        user.role !== "SUPERADMIN" &&
        user.role !== "MDA_SUPERADMIN")
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();
    const plans = await prisma.surfboardPlan.findMany({
      where: {
        redCopyStatus: "SUBMITTED",
        recordsIIStatus: "PENDING",
        accountsStatus: "APPROVED",
        chartingStatus: "APPROVED",
        surconStatus: "APPROVED",
        recordsIStatus: "APPROVED",
        intakeStatus: "APPROVED",
        deleted: false,
        // Only show plans where batch has LASG receipt uploaded (LASG_PAID or later)
        batch: {
          paymentStatus: {
            in: [
              "LASG_PAID",
              "ACCOUNTS_APPROVED",
              "ACCOUNTS_DISAPPROVED",
              "COMPLETED",
            ],
          },
        },
      },
      include: {
        batch: {
          select: {
            batchCode: true,
            paymentStatus: true,
            planCount: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            surconRegNumber: true,
            companyName: true,
          },
        },
      },
      orderBy: { intakeApprovedAt: "asc" }, // Sequential by intake approval date
    });

    // Add lock status information
    const plansWithLockStatus = plans.map((plan) => ({
      ...plan,
      isLocked:
        plan.recordsIILockedBy &&
        plan.recordsIILockExpiresAt &&
        new Date(plan.recordsIILockExpiresAt) > now,
      lockExpiresAt: plan.recordsIILockExpiresAt,
    }));

    return { success: true, data: plansWithLockStatus };
  } catch (error) {
    console.error("Error fetching Records II plans:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getRecordsIIPlans"),
    };
  }
}

/**
 * DEVELOPMENT ONLY: Delete all certificate of deposit batches
 * This will also reset all related plan fields
 * @returns Result indicating success or failure
 */
export async function deleteAllBatches(): Promise<
  ApiResult<{ deletedCount: number }>
> {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
      return {
        success: false,
        error: "This action is not available in production",
      };
    }

    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || !["SUPERADMIN"].includes(user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    // First, reset all plans that have a batchId
    await prisma.surfboardPlan.updateMany({
      where: {
        batchId: { not: null },
      },
      data: {
        batchId: null,
        redCopyStatus: "NOT_SUBMITTED",
        redCopySubmittedAt: null,
        possibleChartingRemarks: null,
        accountsStatus: "PENDING",
        chartingStatus: "PENDING",
        surconStatus: "PENDING",
        recordsIStatus: "PENDING",
        recordsIIStatus: "PENDING",
        // Reset all approval fields
        chartingRemarks: null,
        chartingApprovedBy: null,
        chartingApprovedAt: null,
        surconApprovedBy: null,
        surconApprovedAt: null,
        surconComment: null,
        recordsIApprovedBy: null,
        recordsIApprovedAt: null,
        recordsIComment: null,
        recordsIIApprovedBy: null,
        recordsIIApprovedAt: null,
        recordsIIComment: null,
        // Reset lock fields for all roles
        accountsLockedBy: null,
        accountsLockedAt: null,
        accountsLockExpiresAt: null,
        chartingLockedBy: null,
        chartingLockedAt: null,
        chartingLockExpiresAt: null,
        surconLockedBy: null,
        surconLockedAt: null,
        surconLockExpiresAt: null,
        recordsILockedBy: null,
        recordsILockedAt: null,
        recordsILockExpiresAt: null,
        recordsIILockedBy: null,
        recordsIILockedAt: null,
        recordsIILockExpiresAt: null,
      },
    });

    // Delete all batches
    const result = await prisma.certificateOfDepositBatch.deleteMany({});

    revalidatePath("/surf-restricted/dashboard/surf-plans");
    revalidatePath("/surf-restricted/dashboard/cod");
    revalidatePath("/surfboard/dashboard/plans");

    return {
      success: true,
      data: { deletedCount: result.count },
    };
  } catch (error) {
    console.error("Error deleting all batches:", error);
    return {
      success: false,
      error: handlePrismaError(error, "deleteAllBatches"),
    };
  }
}

/**
 * Get queried plans for the current user
 */
export async function getQueriedPlansForUser(): Promise<
  ApiResult<{
    plans: Array<{
      id: string;
      planNumber: string;
      surveyTitle: string;
      lga: string | null;
      ward: string | null;
      lcda: string | null;
      deededArea: string;
      pillars: any;
      codFee: number | null;
      redCopyFileUrl: string | null;
      redCopyStatus: string | null;
      accountsStatus: string | null;
      accountsComment: string | null;
      chartingStatus: string | null;
      chartingComment: string | null;
      surconStatus: string | null;
      surconComment: string | null;
      recordsIStatus: string | null;
      recordsIComment: string | null;
      recordsIIStatus: string | null;
      recordsIIComment: string | null;
      batch: {
        batchCode: string;
      } | null;
    }>;
  }>
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const plans = await prisma.surfboardPlan.findMany({
      where: {
        userId: user.id,
        deleted: false,
        // Check if any role has queried the plan
        OR: [
          { accountsStatus: "QUERIED" },
          { chartingStatus: "QUERIED" },
          { surconStatus: "QUERIED" },
          { recordsIStatus: "QUERIED" },
          { recordsIIStatus: "QUERIED" },
        ],
      },
      select: {
        id: true,
        planNumber: true,
        surveyTitle: true,
        lga: true,
        ward: true,
        lcda: true,
        deededArea: true,
        pillars: true,
        codFee: true,
        redCopyFileUrl: true,
        redCopyStatus: true,
        accountsStatus: true,
        accountsComment: true,
        chartingStatus: true,
        chartingComment: true,
        surconStatus: true,
        surconComment: true,
        recordsIStatus: true,
        recordsIComment: true,
        recordsIIStatus: true,
        recordsIIComment: true,
        batch: {
          select: {
            batchCode: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return { success: true, data: { plans } };
  } catch (error) {
    console.error("Error fetching queried plans:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getQueriedPlansForUser"),
    };
  }
}

/**
 * Resubmit a queried plan with amendments
 */
export async function resubmitQueriedPlan(
  planId: string,
  pillars?: any,
  recordCopyUrl?: string,
  location?: { lga?: string; lcda?: string; ward?: string; state?: string },
  lasgReceiptUrl?: string,
  remitaReceiptUrl?: string
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Get the plan and verify ownership - check if any role has queried it
    const plan = await prisma.surfboardPlan.findFirst({
      where: {
        id: planId,
        userId: user.id,
        // Check if any role has queried the plan
        OR: [
          { accountsStatus: "QUERIED" },
          { chartingStatus: "QUERIED" },
          { surconStatus: "QUERIED" },
          { recordsIStatus: "QUERIED" },
          { recordsIIStatus: "QUERIED" },
        ],
      },
      select: {
        id: true,
        planNumber: true,
        accountsStatus: true,
        chartingStatus: true,
        surconStatus: true,
        recordsIStatus: true,
        recordsIIStatus: true,
      },
    });

    if (!plan) {
      return {
        success: false,
        error: "Plan not found or no pending queries to respond to",
      };
    }

    // Determine if payment verification is needed
    if (lasgReceiptUrl && remitaReceiptUrl) {
      // We need expectedAmount. Re-fetch plan with codFee
      const fullPlan = await prisma.surfboardPlan.findUnique({
        where: { id: planId },
        select: { codFee: true },
      });
      const { getCodSubmissionSettings } = await import("./settingsActions");
      const settings = await getCodSubmissionSettings();
      const feePercent = settings.queryResponseFeePercent || 0;
      const expectedAmount = fullPlan?.codFee ? (fullPlan.codFee * feePercent) / 100 : 0;

      if (expectedAmount > 0) {
        // Verify the payment links
        const verifyRes = await verifyQueryPaymentLinks(
          user,
          lasgReceiptUrl,
          remitaReceiptUrl,
          expectedAmount
        );
        if (!verifyRes.success) {
          return { success: false, error: verifyRes.error };
        }
      }
    }

    // Determine which role queried the plan
    let queriedBy: string | null = null;
    const updates: any = {
      // Update fields if provided
      ...(pillars && { pillars }),
      ...(recordCopyUrl && { redCopyFileUrl: recordCopyUrl }),
      ...(location?.lga && { lga: location.lga }),
      ...(location?.lcda && { lcda: location.lcda }),
      ...(location?.ward && { ward: location.ward }),
      ...(location?.state && { state: location.state }),
      // Append query receipts if provided
      ...(lasgReceiptUrl && {
        queryLasgReceiptUrls: { push: lasgReceiptUrl }
      }),
      ...(remitaReceiptUrl && {
        queryRemitaReceiptUrls: { push: remitaReceiptUrl }
      }),
      // ALWAYS reset ALL MDA statuses to PENDING on resubmission
      // regardless of which role specifically queried it
      redCopyStatus: "SUBMITTED",
      accountsStatus: "PENDING",
      accountsComment: null,
      chartingStatus: "PENDING",
      chartingComment: null,
      surconStatus: "PENDING",
      surconComment: null,
      recordsIStatus: "PENDING",
      recordsIComment: null,
      recordsIIStatus: "PENDING",
      recordsIIComment: null,
    };

    if (plan.accountsStatus === "QUERIED") {
      queriedBy = "Accounts";
    }
    if (plan.chartingStatus === "QUERIED") {
      queriedBy = queriedBy ? `${queriedBy}, Charting` : "Charting";
    }
    if (plan.surconStatus === "QUERIED") {
      queriedBy = queriedBy ? `${queriedBy}, SURCON` : "SURCON";
    }
    if (plan.recordsIStatus === "QUERIED") {
      queriedBy = queriedBy ? `${queriedBy}, Records I` : "Records I";
    }
    if (plan.recordsIIStatus === "QUERIED") {
      queriedBy = queriedBy ? `${queriedBy}, Records II` : "Records II";
    }

    // Update the plan
    await prisma.surfboardPlan.update({
      where: { id: planId },
      data: updates,
    });

    // Revalidate relevant paths
    revalidatePath("/surfboard/dashboard/queried-plans");
    revalidatePath("/surfboard/dashboard/plans");
    revalidatePath("/surf-mda/dashboard/surcon");
    revalidatePath("/surf-mda/dashboard/records-i");
    revalidatePath("/surf-mda/dashboard/records-ii");
    revalidatePath("/surf-mda/dashboard");

    // Log audit action
    await logAuditAction({
      userId: user.id,
      action: "RESUBMIT_QUERIED_PLAN",
      entity: "SurfboardPlan",
      entityId: planId,
      changes: createChangeLog({
        planNumber: plan.planNumber,
        redCopyStatus: "SUBMITTED",
        queriedBy,
        pillarsUpdated: !!pillars,
        recordCopyUpdated: !!recordCopyUrl,
        queryPayment: lasgReceiptUrl && remitaReceiptUrl ? {
          lasgReceiptUrl,
          remitaReceiptUrl,
          verified: true
        } : undefined
      }),
    });

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error resubmitting queried plan:", error);
    return {
      success: false,
      error: handlePrismaError(error, "resubmitQueriedPlan"),
    };
  }
}

/**
 * Get history for Charting Admin
 */
export async function getChartingHistory() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (
      !user ||
      (user.role !== "CHARTING" &&
        user.role !== "SUPERADMIN" &&
        user.role !== "MDA_SUPERADMIN")
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const plans = await prisma.surfboardPlan.findMany({
      where: {
        redCopyStatus: "SUBMITTED",
        chartingStatus: "APPROVED",
        deleted: false,
      },
      include: {
        batch: {
          select: {
            batchCode: true,
            paymentStatus: true,
          },
        },
        chartingApprovedByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        chartingApprovedAt: "desc",
      },
      take: 100, // Limit to last 100 for performance
    });

    return { success: true, data: plans };
  } catch (error) {
    console.error("Error fetching charting history:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getChartingHistory"),
    };
  }
}

/**
 * Get history for SURCON Admin
 */
export async function getSurconHistory() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (
      !user ||
      (user.role !== "SURCON" &&
        user.role !== "SUPERADMIN" &&
        user.role !== "MDA_SUPERADMIN")
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const plans = await prisma.surfboardPlan.findMany({
      where: {
        surconStatus: {
          in: ["APPROVED", "QUERIED"],
        },
        surconApprovedAt: {
          not: null,
        },
        deleted: false,
      },
      include: {
        batch: {
          select: {
            batchCode: true,
            paymentStatus: true,
          },
        },
        surconApprovedByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            surconRegNumber: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        surconApprovedAt: "desc",
      },
      take: 100,
    });

    return { success: true, data: plans };
  } catch (error) {
    console.error("Error fetching SURCON history:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getSurconHistory"),
    };
  }
}

/**
 * Get history for Records I Admin
 */
export async function getRecordsIHistory() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (
      !user ||
      (user.role !== "RECORDS_I" &&
        user.role !== "SUPERADMIN" &&
        user.role !== "MDA_SUPERADMIN")
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const plans = await prisma.surfboardPlan.findMany({
      where: {
        recordsIStatus: {
          in: ["APPROVED", "QUERIED"],
        },
        recordsIApprovedAt: {
          not: null,
        },
        deleted: false,
      },
      include: {
        batch: {
          select: {
            batchCode: true,
            paymentStatus: true,
          },
        },
        recordsIApprovedByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            surconRegNumber: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        recordsIApprovedAt: "desc",
      },
      take: 100,
    });

    return { success: true, data: plans };
  } catch (error) {
    console.error("Error fetching Records I history:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getRecordsIHistory"),
    };
  }
}

/**
 * Get history for Records II Admin
 */
export async function getRecordsIIHistory() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (
      !user ||
      (user.role !== "RECORDS_II" &&
        user.role !== "SUPERADMIN" &&
        user.role !== "MDA_SUPERADMIN")
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const plans = await prisma.surfboardPlan.findMany({
      where: {
        recordsIIStatus: {
          in: ["APPROVED", "QUERIED"],
        },
        recordsIIApprovedAt: {
          not: null,
        },
        deleted: false,
      },
      include: {
        batch: {
          select: {
            batchCode: true,
            paymentStatus: true,
          },
        },
        recordsIIApprovedByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            surconRegNumber: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        recordsIIApprovedAt: "desc",
      },
      take: 100,
    });

    return { success: true, data: plans };
  } catch (error) {
    console.error("Error fetching Records II history:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getRecordsIIHistory"),
    };
  }
}

/**
 * Get history for Accounts Admin
 */
export async function getAccountsHistory() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (
      !user ||
      (user.role !== "ACCOUNTS" &&
        user.role !== "SUPERADMIN" &&
        user.role !== "MDA_SUPERADMIN")
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const batches = await prisma.certificateOfDepositBatch.findMany({
      where: {
        accountsApprovedBy: {
          not: null,
        },
      },
      include: {
        submitter: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        accountsApprovedByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        plans: {
          select: {
            id: true,
            planNumber: true,
            lga: true,
            deededArea: true,
            queryLasgReceiptUrls: true,
            queryRemitaReceiptUrls: true,
          },
        },
      },
      orderBy: {
        accountsApprovedAt: "desc",
      },
      take: 100,
    });

    return { success: true, data: batches };
  } catch (error) {
    console.error("Error fetching Accounts history:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getAccountsHistory"),
    };
  }
}

/**
 * Batched Query Dispatcher
 * Checks if all four parallel roles (Accounts, Charting, SURCON, Records I)
 * have made a decision (i.e. not PENDING). If any queried, dispatches a consolidated note.
 */
export async function checkAndDispatchQueries(planId: string) {
  try {
    const plan = await prisma.surfboardPlan.findUnique({
      where: { id: planId },
      select: {
        userId: true,
        planNumber: true,
        accountsStatus: true,
        accountsComment: true,
        chartingStatus: true,
        chartingComment: true,
        surconStatus: true,
        surconComment: true,
        recordsIStatus: true,
        recordsIComment: true,
      },
    });

    if (!plan || !plan.userId) return;

    // Check if ALL four parallel roles are no longer PENDING
    const allActed =
      plan.accountsStatus !== "PENDING" &&
      plan.chartingStatus !== "PENDING" &&
      plan.surconStatus !== "PENDING" &&
      plan.recordsIStatus !== "PENDING";

    if (!allActed) return;

    // Compile queries
    const queries: Array<{ role: string; comment?: string }> = [];
    if (plan.accountsStatus === "QUERIED")
      queries.push({ role: "Accounts", comment: plan.accountsComment || undefined });
    if (plan.chartingStatus === "QUERIED")
      queries.push({ role: "Charting", comment: plan.chartingComment || undefined });
    if (plan.surconStatus === "QUERIED")
      queries.push({ role: "SURCON", comment: plan.surconComment || undefined });
    if (plan.recordsIStatus === "QUERIED")
      queries.push({ role: "Records I", comment: plan.recordsIComment || undefined });

    if (queries.length > 0) {
      // Set redCopyStatus to QUERIED now that all roles have checked
      await prisma.surfboardPlan.update({
        where: { id: planId },
        data: { redCopyStatus: "QUERIED" },
      });

      const { notifyConsolidatedQueries } = await import("./notificationActions");
      await notifyConsolidatedQueries({
        userId: plan.userId,
        planId,
        planNumber: plan.planNumber,
        queries,
        sendEmail: true,
      });
    }
  } catch (error) {
    console.error("Error in checkAndDispatchQueries (deprecated):", error);
  }
}

/**
 * Helper to verify query response payment links
 */
async function verifyQueryPaymentLinks(
  user: any,
  lasgReceiptUrl: string,
  remitaReceiptUrl: string,
  expectedAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Parse LASG URL parameters
    let transId: string, transCode: string, payerId: string;
    try {
      const lasgUrl = new URL(lasgReceiptUrl);
      transId = lasgUrl.searchParams.get("transid") || "";
      transCode = lasgUrl.searchParams.get("transcode") || "";
      payerId = lasgUrl.searchParams.get("payerid") || "";

      if (!transId || !transCode || !payerId) {
        return {
          success: false,
          error: "Invalid LASG receipt URL: missing required parameters.",
        };
      }
    } catch {
      return {
        success: false,
        error: "Invalid LASG receipt URL format.",
      };
    }

    // 2. Cross-check PayerID
    const fullUser = await prisma.surfboardUser.findUnique({
      where: { id: user.id },
      select: { payerID: true },
    });

    if (fullUser?.payerID) {
      if (parseInt(payerId, 10) !== fullUser.payerID) {
        return {
          success: false,
          error: `Payer ID mismatch: Receipt has ${payerId}, profile has ${fullUser.payerID}.`,
        };
      }
    }

    // 3. Fetch LASG receipt content
    try {
      const lasgExtracted = await fetchAndExtractTextFromUrl(lasgReceiptUrl);
      if (!lasgExtracted.text || lasgExtracted.text.trim().length < 50) {
        return {
          success: false,
          error: "LASG receipt returned insufficient content.",
        };
      }
    } catch {
      return { success: false, error: "Failed to access LASG receipt URL." };
    }

    // 4. Fetch Remita JSON API
    try {
      const remitaApiUrl = remitaReceiptUrl.replace(
        "/view-rrr/details.json",
        "/details.json"
      );
      const remitaRes = await fetch(remitaApiUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!remitaRes.ok) {
        const errorText = await remitaRes.text().catch(() => "Could not read error text");
        console.error(`Remita fetch failed with status ${remitaRes.status}:`, errorText);
        return { success: false, error: `Failed to fetch Remita receipt data (Status: ${remitaRes.status}).` };
      }
      const data = await remitaRes.json();

      // Allow minor rounding differences
      if (Math.abs(data.amount - expectedAmount) > 1) {
        return {
          success: false,
          error: `Payment amount mismatch: Expected ₦${expectedAmount}, but receipt is for ₦${data.amount}.`,
        };
      }

      if (data.status?.toUpperCase() !== "PAID" && data.PAYMENTSTATUS?.toUpperCase() !== "PAID" && data.STATUS?.toUpperCase() !== "PAID" && data.PAYMENTSTATUS?.toUpperCase() !== "SUCCESSFUL") {
        return {
          success: false,
          error: `Payment status is not PAID (${data.status}).`,
        };
      }
    } catch (err: any) {
      console.error("Error parsing Remita receipt data:", err);
      return { success: false, error: `Failed to parse Remita receipt data: ${err.message}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: `Verification error: ${error.message}` };
  }
}

/**
 * Get plans pending archiving (all approved, not yet archived)
 */
export async function getPendingArchivePlans() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || (!["ARCHIVE", "SUPERADMIN", "MDA_SUPERADMIN"].includes(user.role))) {
      return { success: false, error: "Unauthorized" };
    }

    const plans = await prisma.surfboardPlan.findMany({
      where: {
        redCopyStatus: "APPROVED",
        surconStatus: "APPROVED",
        chartingStatus: "APPROVED",
        recordsIStatus: "APPROVED",
        intakeStatus: "APPROVED",
        recordsIIStatus: "APPROVED",
        accountsStatus: "APPROVED",
        archiveReceivedAt: null,
        deleted: false,
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, companyName: true, surconRegNumber: true },
        },
        batch: {
          select: { batchCode: true },
        },
      },
      orderBy: { updatedAt: "asc" },
    });

    return { success: true, data: { plans } };
  } catch (error) {
    console.error("Error fetching pending archive plans:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getPendingArchivePlans"),
    };
  }
}

/**
 * Get recently archived plans
 */
export async function getArchiveHistory() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || (!["ARCHIVE", "SUPERADMIN", "MDA_SUPERADMIN"].includes(user.role))) {
      return { success: false, error: "Unauthorized" };
    }

    const plans = await prisma.surfboardPlan.findMany({
      where: {
        archiveReceivedAt: { not: null },
        deleted: false,
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, companyName: true },
        },
        batch: {
          select: { batchCode: true },
        },
      },
      orderBy: { archiveReceivedAt: "desc" },
      take: 100,
    });

    return { success: true, data: { plans } };
  } catch (error) {
    console.error("Error fetching archive history:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getArchiveHistory"),
    };
  }
}

/**
 * Mark a plan as physically received and archived
 */
export async function markPlanArchived(planId: string, notes?: string) {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || (user.role as string) !== "ARCHIVE") {
      return { success: false, error: "Unauthorized" };
    }

    const plan = await prisma.surfboardPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) return { success: false, error: "Plan not found" };

    if (
      plan.surconStatus !== "APPROVED" ||
      plan.chartingStatus !== "APPROVED" ||
      plan.recordsIStatus !== "APPROVED" ||
      plan.recordsIIStatus !== "APPROVED" ||
      plan.accountsStatus !== "APPROVED"
    ) {
      return { success: false, error: "Plan is not fully approved by all MDAs yet" };
    }

    const updated = await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        archiveReceivedBy: user.id,
        archiveReceivedAt: new Date(),
        archiveNotes: notes || null,
      }
    });

    revalidatePath("/surf-mda/dashboard/archive");
    revalidatePath("/surf-mda/dashboard");

    await logAuditAction({
      userId: user.id,
      action: "MARK_PLAN_ARCHIVED",
      entity: "SurfboardPlan",
      entityId: planId,
      changes: createChangeLog({
        archiveReceivedAt: updated.archiveReceivedAt,
        archiveNotes: notes
      }),
    });

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error marking plan archived:", error);
    return {
      success: false,
      error: handlePrismaError(error, "markPlanArchived"),
    };
  }
}

/**
 * Fetches the current authenticated user's payer profile for payment modals
 */
export async function getCurrentPayerProfile(): Promise<ApiResult<any>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) return { success: false, error: "Not authenticated" };

    const dbUser = await prisma.surfboardUser.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        payerID: true,
        payerIDType: true,
      },
    });

    if (!dbUser) return { success: false, error: "User not found" };

    return { success: true, data: dbUser };
  } catch (error) {
    console.error("Error fetching payer profile:", error);
    return { success: false, error: "Failed to fetch payer profile" };
  }
}

/**
 * Intake Admin: Get batches awaiting intake approval
 * Ordered oldest to newest.
 */
export async function getIntakeBatches() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || (user.role !== "INTAKE" && user.role !== "SUPERADMIN" && user.role !== "MDA_SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    // Get batches that have at least one plan ready for intake
    const batches = await prisma.certificateOfDepositBatch.findMany({
      where: {
        plans: {
          some: {
            redCopyStatus: "SUBMITTED",
            deleted: false,
            accountsStatus: "APPROVED",
            chartingStatus: "APPROVED",
            surconStatus: "APPROVED",
            recordsIStatus: "APPROVED",
            intakeStatus: "PENDING",
            recordsIIStatus: "PENDING",
          }
        }
      },
      include: {
        submitter: { select: { firstName: true, lastName: true, email: true, surconRegNumber: true, companyName: true, phoneNumber: true } },
        _count: { select: { plans: true } },
        plans: {
          where: {
            redCopyStatus: "SUBMITTED",
            deleted: false,
            accountsStatus: "APPROVED",
            chartingStatus: "APPROVED",
            surconStatus: "APPROVED",
            recordsIStatus: "APPROVED",
            intakeStatus: "PENDING",
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    return { success: true, data: batches };
  } catch (error) {
    console.error("Error fetching intake batches:", error);
    return { success: false, error: "Failed to fetch intake batches" };
  }
}

/**
 * Intake Admin: Get history of processed batches
 */
export async function getIntakeHistoryBatches() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || (user.role !== "INTAKE" && user.role !== "SUPERADMIN" && user.role !== "MDA_SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const batches = await prisma.certificateOfDepositBatch.findMany({
      where: {
        plans: {
          some: {
            intakeStatus: { in: ["APPROVED", "QUERIED"] }
          }
        }
      },
      include: {
        submitter: { select: { firstName: true, lastName: true, email: true, surconRegNumber: true, companyName: true, phoneNumber: true } },
        _count: { select: { plans: true } },
        plans: {
          where: {
            intakeStatus: { in: ["APPROVED", "QUERIED"] }
          },
          include: {
            intakeApprovedByUser: { select: { id: true, firstName: true, lastName: true } }
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 50
    });

    return { success: true, data: batches };
  } catch (error) {
    console.error("Error fetching intake history:", error);
    return { success: false, error: "Failed to fetch intake history" };
  }
}

/**
 * Intake Admin: Approve or query all eligible plans in a batch
 */
export async function updateIntakeBatchStatus(
  batchId: string,
  approved: boolean,
  comment?: string,
): Promise<ApiResult<{ success: boolean; updatedCount: number }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || (user.role !== "INTAKE" && user.role !== "SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const batch = await prisma.certificateOfDepositBatch.findUnique({
      where: { id: batchId },
      include: {
        plans: {
          where: {
            accountsStatus: "APPROVED",
            chartingStatus: "APPROVED",
            surconStatus: "APPROVED",
            recordsIStatus: "APPROVED",
            intakeStatus: "PENDING",
            deleted: false,
          }
        }
      }
    });

    if (!batch || batch.plans.length === 0) {
      return { success: false, error: "No eligible plans found in batch" };
    }

    const planIds = batch.plans.map(p => p.id);

    // Update all plans in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.surfboardPlan.updateMany({
        where: { id: { in: planIds } },
        data: {
          intakeStatus: approved ? "APPROVED" : "QUERIED",
          intakeApprovedBy: user.id,
          intakeApprovedAt: new Date(),
          intakeComment: comment,
          ...(approved ? {} : { redCopyStatus: "QUERIED" })
        }
      });

      // Audit logs
      for (const p of batch.plans) {
        await tx.surfboardAuditLog.create({
          data: {
            userId: user.id,
            action: approved ? "APPROVE_INTAKE" : "QUERY_INTAKE",
            entity: "SurfboardPlan",
            entityId: p.id,
            ipAddress: "System",
            changes: JSON.stringify(createChangeLog({
              planNumber: p.planNumber,
              approved,
              intakeStatus: approved ? "APPROVED" : "QUERIED"
            }))
          }
        });
      }
    });

    revalidatePath("/surf-mda/dashboard/intake");
    revalidatePath("/surf-mda/dashboard"); 

    // Dispatch notifications if queried
    if (!approved && batch.submittedBy) {
      const { notifyConsolidatedQueries } = await import("./notificationActions");
      for (const p of batch.plans) {
        await notifyConsolidatedQueries({
          userId: batch.submittedBy,
          planId: p.id,
          planNumber: p.planNumber,
          queries: [{ role: "Intake", comment: comment || undefined }],
          sendEmail: true,
        });
      }
    }

    return { success: true, data: { success: true, updatedCount: planIds.length } };
  } catch (error) {
    console.error("Error updating Intake batch:", error);
    return { success: false, error: handlePrismaError(error, "updateIntakeBatchStatus") };
  }
}

// ============================================================================
// Records II: Batch-oriented functions
// ============================================================================

const RECORDS_II_LOCK_MINUTES_PER_PLAN = 3;

/**
 * Get batches for Records II Admin view (batch-based display).
 * Only returns batches where all 5 prerequisite approvals are complete.
 * Ordered by oldest intake approval date first.
 */
export async function getRecordsIIBatches() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (
      !user ||
      (user.role !== "RECORDS_II" &&
        user.role !== "SUPERADMIN" &&
        user.role !== "MDA_SUPERADMIN")
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();

    // Get batches that have at least one plan ready for Records II
    const batches = await prisma.certificateOfDepositBatch.findMany({
      where: {
        plans: {
          some: {
            redCopyStatus: "SUBMITTED",
            deleted: false,
            accountsStatus: "APPROVED",
            chartingStatus: "APPROVED",
            surconStatus: "APPROVED",
            recordsIStatus: "APPROVED",
            intakeStatus: "APPROVED",
            recordsIIStatus: "PENDING",
          },
        },
      },
      include: {
        submitter: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            surconRegNumber: true,
            companyName: true,
          },
        },
        _count: { select: { plans: true } },
        plans: {
          where: {
            redCopyStatus: "SUBMITTED",
            deleted: false,
            accountsStatus: "APPROVED",
            chartingStatus: "APPROVED",
            surconStatus: "APPROVED",
            recordsIStatus: "APPROVED",
            intakeStatus: "APPROVED",
            recordsIIStatus: "PENDING",
          },
          select: {
            id: true,
            planNumber: true,
            surveyTitle: true,
            planType: true,
            referencePlanNumber: true,
            lga: true,
            ward: true,
            lcda: true,
            locality: true,
            deededArea: true,
            chartingRemarks: true,
            redCopyFileUrl: true,
            intakeApprovedAt: true,
            recordsIILockedBy: true,
            recordsIILockExpiresAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Sort batches by the earliest intakeApprovedAt among their plans
    const sortedBatches = batches
      .map((batch) => {
        const earliestIntake = Math.min(
          ...batch.plans.map((p) =>
            p.intakeApprovedAt ? new Date(p.intakeApprovedAt).getTime() : Infinity
          )
        );
        return { ...batch, _sortKey: earliestIntake };
      })
      .sort((a, b) => a._sortKey - b._sortKey)
      .map(({ _sortKey, ...batch }) => ({
        ...batch,
        // Add lock status info to each plan
        plans: batch.plans.map((plan) => ({
          ...plan,
          isLocked:
            !!plan.recordsIILockedBy &&
            !!plan.recordsIILockExpiresAt &&
            new Date(plan.recordsIILockExpiresAt) > now,
          isLockedByMe:
            plan.recordsIILockedBy === user.id &&
            !!plan.recordsIILockExpiresAt &&
            new Date(plan.recordsIILockExpiresAt) > now,
        })),
        // Batch-level lock info (check if first plan in batch is locked by current user)
        isBatchLockedByMe:
          batch.plans.length > 0 &&
          batch.plans[0].recordsIILockedBy === user.id &&
          !!batch.plans[0].recordsIILockExpiresAt &&
          new Date(batch.plans[0].recordsIILockExpiresAt) > now,
        batchLockExpiresAt:
          batch.plans.length > 0 &&
          batch.plans[0].recordsIILockedBy === user.id &&
          batch.plans[0].recordsIILockExpiresAt
            ? batch.plans[0].recordsIILockExpiresAt
            : null,
      }));

    return { success: true, data: sortedBatches };
  } catch (error) {
    console.error("Error fetching Records II batches:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getRecordsIIBatches"),
    };
  }
}

/**
 * Get history batches for Records II Admin.
 * Returns batches where at least one plan has been approved or queried by Records II.
 */
export async function getRecordsIIHistoryBatches() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (
      !user ||
      (user.role !== "RECORDS_II" &&
        user.role !== "SUPERADMIN" &&
        user.role !== "MDA_SUPERADMIN")
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const batches = await prisma.certificateOfDepositBatch.findMany({
      where: {
        plans: {
          some: {
            recordsIIStatus: { in: ["APPROVED", "QUERIED"] },
            recordsIIApprovedAt: { not: null },
          },
        },
      },
      include: {
        submitter: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            surconRegNumber: true,
            companyName: true,
          },
        },
        _count: { select: { plans: true } },
        plans: {
          where: {
            recordsIIStatus: { in: ["APPROVED", "QUERIED"] },
            recordsIIApprovedAt: { not: null },
          },
          select: {
            id: true,
            planNumber: true,
            surveyTitle: true,
            planType: true,
            referencePlanNumber: true,
            lga: true,
            ward: true,
            lcda: true,
            locality: true,
            deededArea: true,
            chartingRemarks: true,
            redCopyFileUrl: true,
            recordsIIStatus: true,
            recordsIIComment: true,
            recordsIIApprovedAt: true,
          },
          include: {
            recordsIIApprovedByUser: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    return { success: true, data: batches };
  } catch (error) {
    console.error("Error fetching Records II history batches:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getRecordsIIHistoryBatches"),
    };
  }
}

/**
 * Records II: Find and lock the oldest available batch.
 * Locks ALL plans in the batch atomically.
 * Lock duration = 3 minutes × number of plans in the batch.
 */
export async function getAndLockBatchForRecordsII(): Promise<
  ApiResult<{
    batchId: string | null;
    batchCode: string | null;
    planCount: number;
    locked: boolean;
    lockExpiresAt: Date | null;
  }>
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const now = new Date();

    // First, check if user already has plans locked for Records II
    const existingLock = await prisma.surfboardPlan.findFirst({
      where: {
        recordsIILockedBy: user.id,
        recordsIILockExpiresAt: { gt: now },
        deleted: false,
      },
      select: {
        id: true,
        batchId: true,
        recordsIILockExpiresAt: true,
        batch: {
          select: {
            id: true,
            batchCode: true,
          },
        },
      },
    });

    if (existingLock && existingLock.batch) {
      // Count how many plans in this batch are locked by the user
      const lockedCount = await prisma.surfboardPlan.count({
        where: {
          batchId: existingLock.batchId!,
          recordsIILockedBy: user.id,
          recordsIILockExpiresAt: { gt: now },
          deleted: false,
        },
      });

      return {
        success: true,
        data: {
          batchId: existingLock.batch.id,
          batchCode: existingLock.batch.batchCode,
          planCount: lockedCount,
          locked: true,
          lockExpiresAt: existingLock.recordsIILockExpiresAt,
        },
      };
    }

    // Find the oldest batch with plans ready for Records II (not locked by anyone else)
    const availableBatch = await prisma.certificateOfDepositBatch.findFirst({
      where: {
        plans: {
          some: {
            redCopyStatus: "SUBMITTED",
            deleted: false,
            accountsStatus: "APPROVED",
            chartingStatus: "APPROVED",
            surconStatus: "APPROVED",
            recordsIStatus: "APPROVED",
            intakeStatus: "APPROVED",
            recordsIIStatus: "PENDING",
            OR: [
              { recordsIILockedBy: null },
              { recordsIILockExpiresAt: { lt: now } },
            ],
          },
        },
      },
      include: {
        plans: {
          where: {
            redCopyStatus: "SUBMITTED",
            deleted: false,
            accountsStatus: "APPROVED",
            chartingStatus: "APPROVED",
            surconStatus: "APPROVED",
            recordsIStatus: "APPROVED",
            intakeStatus: "APPROVED",
            recordsIIStatus: "PENDING",
            OR: [
              { recordsIILockedBy: null },
              { recordsIILockExpiresAt: { lt: now } },
            ],
          },
          select: { id: true, intakeApprovedAt: true },
          orderBy: { intakeApprovedAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!availableBatch || availableBatch.plans.length === 0) {
      return {
        success: true,
        data: {
          batchId: null,
          batchCode: null,
          planCount: 0,
          locked: false,
          lockExpiresAt: null,
        },
      };
    }

    // Calculate lock duration: 3 minutes per plan in the batch
    const planCount = availableBatch.plans.length;
    const lockDurationMs =
      RECORDS_II_LOCK_MINUTES_PER_PLAN * planCount * 60000;
    const lockExpiry = new Date(now.getTime() + lockDurationMs);

    const planIds = availableBatch.plans.map((p) => p.id);

    // Lock all plans in the batch atomically
    const lockResult = await prisma.surfboardPlan.updateMany({
      where: {
        id: { in: planIds },
        OR: [
          { recordsIILockedBy: null },
          { recordsIILockedBy: user.id },
          { recordsIILockExpiresAt: { lt: now } },
        ],
      },
      data: {
        recordsIILockedBy: user.id,
        recordsIILockedAt: now,
        recordsIILockExpiresAt: lockExpiry,
      },
    });

    if (lockResult.count === 0) {
      // Another user grabbed the lock first — retry
      return getAndLockBatchForRecordsII();
    }

    return {
      success: true,
      data: {
        batchId: availableBatch.id,
        batchCode: availableBatch.batchCode,
        planCount: lockResult.count,
        locked: true,
        lockExpiresAt: lockExpiry,
      },
    };
  } catch (error) {
    console.error("Error locking batch for Records II:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getAndLockBatchForRecordsII"),
    };
  }
}

/**
 * Records II: Release all batch locks held by the current user.
 */
export async function releaseBatchLockForRecordsII(): Promise<
  ApiResult<{ releasedCount: number }>
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const result = await prisma.surfboardPlan.updateMany({
      where: {
        recordsIILockedBy: user.id,
      },
      data: {
        recordsIILockedBy: null,
        recordsIILockedAt: null,
        recordsIILockExpiresAt: null,
      },
    });

    return {
      success: true,
      data: { releasedCount: result.count },
    };
  } catch (error) {
    console.error("Error releasing batch lock for Records II:", error);
    return {
      success: false,
      error: handlePrismaError(error, "releaseBatchLockForRecordsII"),
    };
  }
}
