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
 * Calculate fee for a single plan based on LGA and geometry
 */
export async function calculatePlanFee(
  lga: string | null,
  geometry: any,
  lgaFees: Record<string, number>,
  systemChargePercent: number
): Promise<{ fee: number; systemCharge: number; total: number }> {
  const { computeGeometryDetails } = await import("../utils/dbUtils");

  // Compute area from geometry
  let area = 0;
  try {
    const { areaSqM } = computeGeometryDetails(geometry);
    area = areaSqM;
  } catch (error) {
    console.error("Error computing area from geometry:", error);
  }

  // Get rate per sqm for the LGA (normalize case, remove spaces and dashes for matching)
  const normalizeLga = (str: string) => str.toUpperCase().replace(/[\s-]/g, "");
  const normalizedLga = lga ? normalizeLga(lga) : null;
  const lgaFeeKey = normalizedLga
    ? Object.keys(lgaFees).find((key) => normalizeLga(key) === normalizedLga)
    : null;
  const ratePerSqm = lgaFeeKey ? lgaFees[lgaFeeKey] : 0;

  const fee = ratePerSqm * area;
  const systemCharge = fee * (systemChargePercent / 100);
  const total = fee + systemCharge;

  return { fee, systemCharge, total };
}

/**
 * Calculate fee for multiple plans based on LGA and area
 */
export async function calculateMultiplePlanFee(
  plans: Array<{ lga: string | null; geometry: any }>
): Promise<{ fee: number; systemCharge: number; total: number }> {
  const lgaFees = await getLGAFees();
  const systemChargePercent = await getSystemChargePercent();

  const { computeGeometryDetails } = await import("../utils/dbUtils");

  let totalFee = 0;

  // Calculate fee for each plan
  for (const plan of plans) {
    try {
      // Compute area from geometry
      const { areaSqM } = computeGeometryDetails(plan.geometry);

      // Get rate per sqm for the LGA (normalize case, remove spaces and dashes for matching)
      const normalizeLga = (str: string) =>
        str.toUpperCase().replace(/[\s-]/g, "");
      const normalizedLga = plan.lga ? normalizeLga(plan.lga) : null;
      const lgaFeeKey = normalizedLga
        ? Object.keys(lgaFees).find(
            (key) => normalizeLga(key) === normalizedLga
          )
        : null;
      const ratePerSqm = lgaFeeKey ? lgaFees[lgaFeeKey] : 0;

      // Calculate plan fee
      totalFee += ratePerSqm * areaSqM;
    } catch (error) {
      console.error("Error calculating fee for plan:", error);
      // Continue with other plans
    }
  }

  const systemCharge = totalFee * (systemChargePercent / 100);
  const total = totalFee + systemCharge;

  return { fee: totalFee, systemCharge, total };
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
    reference: string | null;
    paymentUrl?: string;
    email?: string;
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

    const lgaFees = await getLGAFees();
    const systemChargePercent = await getSystemChargePercent();

    for (const plan of plans) {
      const { fee } = await calculatePlanFee(
        plan.lga,
        plan.geometry,
        lgaFees,
        systemChargePercent
      );
      planFees[plan.id] = fee;
      totalFees += fee;
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
          "Unable to calculate fees. Please ensure LGA fees are configured and plan area is valid.",
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
    let userDetails: {
      email: string;
      firstName: string;
      lastName: string;
    } | null = null;

    try {
      // Get user details for payment
      userDetails = await prisma.surfboardUser.findUnique({
        where: { id: user.id },
        select: { email: true, firstName: true, lastName: true },
      });

      if (userDetails?.email) {
        const reference = batch.userPaymentRef;
        const callbackUrl = `${
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        }/surfboard/dashboard/payment/callback?reference=${reference}`;

        // Convert from NAIRA (DB storage) to KOBO (Paystack API)
        // Paystack expects amount in kobo: 1 naira = 100 kobo
        // Round to 2 decimal places first to avoid floating point errors
        const amountInKobo = Math.trunc(
          (Math.trunc(totalAmount * 100) / 100) * 100
        );

        if (amountInKobo <= 0) {
          throw new Error("Invalid payment amount calculated");
        }

        const paymentInit = await paystack.transactions.initialize(getEnv(), {
          email: userDetails.email,
          amount: amountInKobo, // Paystack expects amount in kobo (integer, no decimals)
          reference,
          callback_url: callbackUrl,
          metadata: {
            batchId: batch.id,
            reference,
            batchCode: batch.batchCode,
            planCount: plans.length,
            userId: user.id,
            type: "certificate_of_deposit",
            platform: "surfboard",
          },
        });

        if (paymentInit?.data?.authorization_url) {
          paymentUrl = paymentInit.data.authorization_url;
        }
      }
    } catch (paymentError) {
      console.error("Payment initialization error:", paymentError);
      // Don't fail the batch creation, user can pay later
    }

    revalidatePath("/surf-restricted/dashboard/surf-plans");
    revalidatePath("/surfboard/dashboard/plans");

    return {
      success: true,
      data: {
        batchId: batch.id,
        batchCode: batch.batchCode,
        totalAmount, // Amount in NAIRA - frontend converts to kobo (*100) for Paystack
        paymentUrl,
        reference: batch.userPaymentRef,
        email: userDetails?.email,
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
    revalidatePath("/surfboard/dashboard/plans");

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

    // Get user email
    const userDetails = await prisma.surfboardUser.findUnique({
      where: { id: user.id },
      select: { email: true },
    });

    if (!userDetails?.email) {
      return { success: false, error: "User email not found" };
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
        reference,
        email: userDetails.email,
        // NOTE: amount is in NAIRA (from DB). Frontend must convert to kobo (*100) for Paystack
        amount: batch.totalAmount,
        batchCode: batch.batchCode,
        batchId: batch.id,
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
    if (!user || (user.role !== "ACCOUNTS" && user.role !== "SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    // Update the batch status
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

    // Also update accountsStatus on all plans in the batch
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
      // TODO: Send notification to Surfboard Admins only
      // await notifyAdmins({ ... });
    }

    revalidatePath("/surf-mda/dashboard/accounts");
    revalidatePath("/surf-mda/dashboard/charting");
    revalidatePath("/surf-mda/dashboard/surcon");
    revalidatePath("/surf-mda/dashboard/records-i");

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
    if (!user || (user.role !== "CHARTING" && user.role !== "SUPERADMIN")) {
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

    revalidatePath("/surf-mda/dashboard/charting");

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
    if (!user || (user.role !== "SURCON" && user.role !== "SUPERADMIN")) {
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

    revalidatePath("/surf-mda/dashboard/surcon");

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
    if (!user || (user.role !== "RECORDS_I" && user.role !== "SUPERADMIN")) {
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

    revalidatePath("/surf-mda/dashboard/records-i");

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
    if (!user || (user.role !== "RECORDS_II" && user.role !== "SUPERADMIN")) {
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

    revalidatePath("/surf-mda/dashboard/records-ii");

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
    if (!user || (user.role !== "ACCOUNTS" && user.role !== "SUPERADMIN")) {
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
 * Get pending counts for all MDA roles
 */
export async function getPendingCountByRole(): Promise<
  ApiResult<{
    accounts: number;
    charting: number;
    surcon: number;
    recordsI: number;
    recordsII: number;
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
        "RECORDS_II",
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
    ] = await Promise.all([
      // Accounts: Count batches with LASG_PAID status and no accounts approval
      prisma.certificateOfDepositBatch.count({
        where: {
          paymentStatus: "LASG_PAID",
          accountsApprovedBy: null,
        },
      }),
      // Charting: Count plans with PENDING charting status
      prisma.surfboardPlan.count({
        where: {
          redCopyStatus: "SUBMITTED",
          chartingStatus: "PENDING",
          deleted: false,
        },
      }),
      // SURCON: Count plans with PENDING surcon status
      prisma.surfboardPlan.count({
        where: {
          redCopyStatus: "SUBMITTED",
          surconStatus: "PENDING",
          deleted: false,
        },
      }),
      // Records I: Count plans with PENDING records I status
      prisma.surfboardPlan.count({
        where: {
          redCopyStatus: "SUBMITTED",
          recordsIStatus: "PENDING",
          deleted: false,
        },
      }),
      // Records II: Count plans with all other approvals complete
      prisma.surfboardPlan.count({
        where: {
          redCopyStatus: "SUBMITTED",
          recordsIIStatus: "PENDING",
          accountsStatus: "APPROVED",
          chartingStatus: "APPROVED",
          surconStatus: "APPROVED",
          recordsIStatus: "APPROVED",
          deleted: false,
        },
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
    if (!user || (user.role !== "CHARTING" && user.role !== "SUPERADMIN")) {
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
    if (!user || (user.role !== "SURCON" && user.role !== "SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();
    const plans = await prisma.surfboardPlan.findMany({
      where: {
        redCopyStatus: "SUBMITTED",
        surconStatus: "PENDING",
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
    if (!user || (user.role !== "RECORDS_I" && user.role !== "SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();
    const plans = await prisma.surfboardPlan.findMany({
      where: {
        redCopyStatus: "SUBMITTED",
        recordsIStatus: "PENDING",
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
    if (!user || (user.role !== "RECORDS_II" && user.role !== "SUPERADMIN")) {
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
          },
        },
      },
      orderBy: { redCopySubmittedAt: "asc" }, // Oldest first for FIFO
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
    if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) {
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
