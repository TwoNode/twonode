"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";
import type { ApiResult } from "../types/surfboardTypes";
import { handlePrismaError } from "../utils/prismaErrorHandler";
import { paystack, getEnv } from "../utils/paystack";

// Lock duration in minutes
const LOCK_DURATION_MINUTES = 30;

type MDARole = "ACCOUNTS" | "CHARTING" | "SURCON" | "RECORDS_I" | "RECORDS_II";

/**
 * Acquire lock on a plan for a specific role
 */
export async function acquirePlanLock(
  planId: string,
  role: MDARole,
  userId: string
): Promise<ApiResult<{ locked: boolean; lockedBy?: string }>> {
  try {
    const now = new Date();
    const lockExpiry = new Date(now.getTime() + LOCK_DURATION_MINUTES * 60000);

    const rolePrefix = role.toLowerCase().replace("_", "");
    const lockedByField = `${rolePrefix}LockedBy` as any;
    const lockedAtField = `${rolePrefix}LockedAt` as any;
    const lockExpiresAtField = `${rolePrefix}LockExpiresAt` as any;

    // Check if plan is already locked by someone else
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
  userId: string
): Promise<ApiResult<{ released: boolean }>> {
  try {
    const rolePrefix = role.toLowerCase().replace("_", "");
    const lockedByField = `${rolePrefix}LockedBy` as any;
    const lockedAtField = `${rolePrefix}LockedAt` as any;
    const lockExpiresAtField = `${rolePrefix}LockExpiresAt` as any;

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
 * Check if user can work on this plan (chronological enforcement)
 * Returns the oldest available plan if this one is not allowed
 */
export async function canWorkOnPlan(
  planId: string,
  role: MDARole,
  userId: string
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
    const statusField = `${role.toLowerCase().replace("_", "")}Status` as any;
    const lockedByField = `${role
      .toLowerCase()
      .replace("_", "")}LockedBy` as any;
    const lockExpiresAtField = `${role
      .toLowerCase()
      .replace("_", "")}LockExpiresAt` as any;

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
  geometry: any
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
 * Get LGA fees from settings
 */
export async function getLGAFees(): Promise<Record<string, number>> {
  try {
    const settings = await prisma.surfboardSettings.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!settings || !settings.settings) {
      return {};
    }

    const settingsData = settings.settings as any;
    return settingsData.lgaFees || {};
  } catch (err) {
    console.error("Error fetching LGA fees:", err);
    return {};
  }
}

/**
 * Get system charge percentage from settings
 */
export async function getSystemChargePercent(): Promise<number> {
  try {
    const settings = await prisma.surfboardSettings.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!settings || !settings.settings) {
      return 10; // Default 10%
    }

    const settingsData = settings.settings as any;
    return settingsData.systemChargePercent || 10;
  } catch (err) {
    console.error("Error fetching system charge:", err);
    return 10;
  }
}

/**
 * Calculate fee for a single plan based on LGA and area
 */
export async function calculatePlanFee(
  lga: string | null,
  deededArea: string
): Promise<{ fee: number; systemCharge: number; total: number }> {
  const lgaFees = await getLGAFees();
  const systemChargePercent = await getSystemChargePercent();

  // Parse area (assuming it's in square meters)
  const areaMatch = deededArea.match(/[\d,]+\.?\d*/);
  const area = areaMatch ? parseFloat(areaMatch[0].replace(/,/g, "")) : 0;

  // Get rate per sqm for the LGA
  const ratePerSqm = lga && lgaFees[lga] ? lgaFees[lga] : 0;

  const fee = ratePerSqm * area;
  const systemCharge = fee * (systemChargePercent / 100);
  const total = fee + systemCharge;

  return { fee, systemCharge, total };
}

/**
 * Submit batch of plans for Certificate of Deposit
 * This handles:
 * - Spatial intersection for charting remarks
 * - Fee calculation
 * - Batch creation
 * - Status updates
 */
export async function submitRedCopyBatch(planIds: string[]): Promise<
  ApiResult<{
    batchId: string;
    batchCode: string;
    totalAmount: number;
    paymentUrl?: string;
  }>
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

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

    // Calculate fees for all plans
    let totalFees = 0;
    const planFees: Record<string, number> = {};

    for (const plan of plans) {
      const { total } = await calculatePlanFee(plan.lga, plan.deededArea);
      planFees[plan.id] = total;
      totalFees += total;
    }

    const systemChargePercent = await getSystemChargePercent();
    const systemCharges = totalFees * (systemChargePercent / 100);
    const totalAmount = totalFees + systemCharges;

    // Create batch
    const batch = await prisma.certificateOfDepositBatch.create({
      data: {
        submittedBy: user.id,
        planCount: plans.length,
        totalFees,
        systemCharges,
        totalAmount,
        paymentStatus: "PENDING_USER_PAYMENT",
      },
      select: {
        id: true,
        batchCode: true,
      },
    });

    // Update plans with batch ID and perform spatial intersection
    for (const plan of plans) {
      // Get charting interpretation
      const chartingInterpretation = await getChartingInterpretation(
        plan.geometry
      );

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
        },
      });
    }

    // Initialize Paystack payment
    let paymentUrl: string | undefined;
    try {
      // Get user details for payment
      const userDetails = await prisma.surfboardUser.findUnique({
        where: { id: user.id },
        select: { email: true, firstName: true, lastName: true },
      });

      if (userDetails?.email) {
        const reference = `COD_${batch.batchCode}_${Date.now()}`;
        const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/surfboard/dashboard/payment/callback?reference=${reference}`;

        const paymentInit = await paystack.transactions.initialize(getEnv(), {
          email: userDetails.email,
          amount: Math.round(totalAmount * 100), // Paystack expects amount in kobo
          reference,
          callback_url: callbackUrl,
          metadata: {
            batchId: batch.id,
            batchCode: batch.batchCode,
            planCount: plans.length,
            userId: user.id,
            type: "certificate_of_deposit",
          },
        });

        if (paymentInit?.data?.authorization_url) {
          paymentUrl = paymentInit.data.authorization_url;

          // Update batch with payment reference
          await prisma.certificateOfDepositBatch.update({
            where: { id: batch.id },
            data: { userPaymentRef: reference },
          });
        }
      }
    } catch (paymentError) {
      console.error("Payment initialization error:", paymentError);
      // Don't fail the batch creation, user can pay later
    }

    revalidatePath("/surf-restricted/dashboard/surf-plans");

    return {
      success: true,
      data: {
        batchId: batch.id,
        batchCode: batch.batchCode,
        totalAmount,
        paymentUrl,
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
 * Verify Paystack payment and update batch status
 */
export async function verifyBatchPayment(
  reference: string
): Promise<ApiResult<{ batchId: string }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Find batch by payment reference
    const batch = await prisma.certificateOfDepositBatch.findFirst({
      where: {
        userPaymentRef: reference,
        submittedBy: user.id,
      },
    });

    if (!batch) {
      return { success: false, error: "Batch not found" };
    }

    // Update batch payment status
    await prisma.certificateOfDepositBatch.update({
      where: { id: batch.id },
      data: {
        paymentStatus: "USER_PAID",
        userPaymentDate: new Date(),
      },
    });

    // TODO: Send notification to all Surfboard Admins
    // await notifyAdmins({ ... });

    revalidatePath("/surf-restricted/dashboard/surf-plans");

    return {
      success: true,
      data: { batchId: batch.id },
    };
  } catch (error) {
    console.error("Error verifying payment:", error);
    return {
      success: false,
      error: handlePrismaError(error, "verifyBatchPayment"),
    };
  }
}

/**
 * Upload LASG receipt (Surfboard Admin only)
 */
export async function uploadLASGReceipt(
  batchId: string,
  receiptUrl: string,
  receiptS3Key: string
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

    // TODO: Send notification to Records I, Records II, Accounts, Charting, SURCON
    // await notifyMDARoles({ ... });

    revalidatePath("/surf-restricted/dashboard/cod");

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
  comment?: string
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || user.role !== "ACCOUNTS") {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.certificateOfDepositBatch.update({
      where: { id: batchId },
      data: {
        accountsApprovedBy: user.id,
        accountsApprovedAt: new Date(),
        accountsDisapproved: !approved,
        accountsComment: comment,
        paymentStatus: approved ? "ACCOUNTS_APPROVED" : "ACCOUNTS_DISAPPROVED",
      },
    });

    if (!approved) {
      // TODO: Send notification to Surfboard Admins only
      // await notifyAdmins({ ... });
    }

    revalidatePath("/surf-restricted/dashboard/cod/accounts");

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
 * Charting Admin: Update charting remarks and approve
 */
export async function updateChartingStatus(
  planId: string,
  chartingRemarks: string
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || user.role !== "CHARTING") {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        chartingRemarks,
        chartingStatus: "APPROVED",
        chartingApprovedBy: user.id,
        chartingApprovedAt: new Date(),
      },
    });

    revalidatePath("/surf-restricted/dashboard/cod/charting");

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
  comment?: string
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || user.role !== "SURCON") {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        surconStatus: approved ? "APPROVED" : "QUERIED",
        surconApprovedBy: user.id,
        surconApprovedAt: new Date(),
        surconComment: comment,
        ...(approved ? {} : { redCopyStatus: "QUERIED" }),
      },
    });

    if (!approved) {
      // TODO: Send notification to user
      // await notifyUser({ ... });
    }

    revalidatePath("/surf-restricted/dashboard/cod/surcon");

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
  comment?: string
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || user.role !== "RECORDS_I") {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        recordsIStatus: approved ? "APPROVED" : "QUERIED",
        recordsIApprovedBy: user.id,
        recordsIApprovedAt: new Date(),
        recordsIComment: comment,
        ...(approved ? {} : { redCopyStatus: "QUERIED" }),
      },
    });

    if (!approved) {
      // TODO: Send notification to user
      // await notifyUser({ ... });
    }

    revalidatePath("/surf-restricted/dashboard/cod/records-i");

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
 * Records II Admin: Final approval and submission to OSSG
 */
export async function updateRecordsIIStatus(
  planId: string,
  approved: boolean,
  comment?: string
): Promise<ApiResult<{ success: boolean }>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || user.role !== "RECORDS_II") {
      return { success: false, error: "Unauthorized" };
    }

    // Check if all other approvals are done
    const plan = await prisma.surfboardPlan.findUnique({
      where: { id: planId },
      select: {
        accountsStatus: true,
        chartingStatus: true,
        surconStatus: true,
        recordsIStatus: true,
        batchId: true,
      },
    });

    if (!plan) {
      return { success: false, error: "Plan not found" };
    }

    if (
      plan.accountsStatus !== "APPROVED" ||
      plan.chartingStatus !== "APPROVED" ||
      plan.surconStatus !== "APPROVED" ||
      plan.recordsIStatus !== "APPROVED"
    ) {
      return {
        success: false,
        error: "All other approvals must be completed first",
      };
    }

    await prisma.surfboardPlan.update({
      where: { id: planId },
      data: {
        recordsIIStatus: approved ? "APPROVED" : "QUERIED",
        recordsIIApprovedBy: user.id,
        recordsIIApprovedAt: new Date(),
        recordsIIComment: comment,
        ...(approved
          ? {
              status: "LODGED",
              redCopyStatus: "APPROVED",
              dateLodged: new Date(),
            }
          : { redCopyStatus: "QUERIED" }),
      },
    });

    if (approved) {
      // TODO: Send data to OSSG API
      // TODO: Send notification to user with batch details
      // await sendToOSSG({ ... });
      // await notifyUser({ ... });
    }

    revalidatePath("/surf-restricted/dashboard/cod/records-ii");

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
    if (!user || user.role !== "ACCOUNTS") {
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

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
 * Get plans for Charting Admin view
 */
export async function getChartingPlans() {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || user.role !== "CHARTING") {
      return { success: false, error: "Unauthorized" };
    }

    const plans = await prisma.surfboardPlan.findMany({
      where: {
        redCopyStatus: "SUBMITTED",
        chartingStatus: "PENDING",
        deleted: false,
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
          },
        },
      },
      orderBy: { redCopySubmittedAt: "desc" },
    });

    return { success: true, data: plans };
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
    if (!user || user.role !== "SURCON") {
      return { success: false, error: "Unauthorized" };
    }

    const plans = await prisma.surfboardPlan.findMany({
      where: {
        redCopyStatus: "SUBMITTED",
        surconStatus: "PENDING",
        deleted: false,
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
          },
        },
      },
      orderBy: { redCopySubmittedAt: "desc" },
    });

    return { success: true, data: plans };
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
    if (!user || user.role !== "RECORDS_I") {
      return { success: false, error: "Unauthorized" };
    }

    const plans = await prisma.surfboardPlan.findMany({
      where: {
        redCopyStatus: "SUBMITTED",
        recordsIStatus: "PENDING",
        deleted: false,
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
          },
        },
      },
      orderBy: { redCopySubmittedAt: "desc" },
    });

    return { success: true, data: plans };
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
    if (!user || user.role !== "RECORDS_II") {
      return { success: false, error: "Unauthorized" };
    }

    const plans = await prisma.surfboardPlan.findMany({
      where: {
        redCopyStatus: "SUBMITTED",
        recordsIIStatus: "PENDING",
        accountsStatus: "APPROVED",
        chartingStatus: "APPROVED",
        surconStatus: "APPROVED",
        recordsIStatus: "APPROVED",
        deleted: false,
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
          },
        },
      },
      orderBy: { redCopySubmittedAt: "desc" },
    });

    return { success: true, data: plans };
  } catch (error) {
    console.error("Error fetching Records II plans:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getRecordsIIPlans"),
    };
  }
}
