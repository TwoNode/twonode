"use server";

/**
 * Certificate of Deposit Actions
 * Server actions for batch submission, payment processing, and approval workflows
 */

import prisma from "@/lib/prisma";
import {
  BatchSubmissionDTO,
  BatchSubmissionResult,
  UserPaymentDTO,
  AccountsApprovalDTO,
  ApprovalDTO,
  ChartingApprovalDTO,
  BatchFeeCalculation,
  ChartingIntersectionResult,
  OSSGCertificateData,
} from "../types/certificateOfDepositTypes";
import { SurfboardPlanStatus, SurfboardRedCopyStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import * as turf from "@turf/turf";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate area from GeoJSON geometry in square meters
 */
function calculateAreaFromGeometry(geometry: any): number {
  try {
    const feature = turf.feature(geometry);
    const area = turf.area(feature);
    return Math.round(area * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error("Error calculating area:", error);
    return 0;
  }
}

/**
 * Perform spatial intersection with LASG charting interpretation
 */
async function performChartingIntersection(
  planId: string,
  geometry: any
): Promise<ChartingIntersectionResult> {
  try {
    // This would use PostGIS ST_Intersects
    // For now, we'll use a raw query
    const result = await prisma.$queryRaw<Array<{ interpretation: string }>>`
      SELECT interpretation 
      FROM "LASG_charting_interpretation"
      WHERE ST_Intersects(
        geom,
        ST_GeomFromGeoJSON(${JSON.stringify(geometry)})
      )
      LIMIT 1
    `;

    if (result && result.length > 0) {
      return {
        planId,
        interpretation: result[0].interpretation,
        intersected: true,
      };
    }

    return { planId, interpretation: null, intersected: false };
  } catch (error) {
    console.error("Error performing charting intersection:", error);
    return { planId, interpretation: null, intersected: false };
  }
}

/**
 * Get LGA fee configuration
 */
async function getLGAFeeConfig(lgaName: string) {
  const config = await prisma.lGAFeeConfig.findUnique({
    where: { lgaName },
  });

  // Default values if not configured
  return (
    config || {
      ratePerSqM: 10, // Default ₦10/m²
      systemChargePercent: 10,
    }
  );
}

/**
 * Calculate fees for a batch of plans
 */
async function calculateBatchFees(
  plans: Array<{
    id: string;
    planNumber: string;
    lga: string | null;
    geometry: any;
  }>
): Promise<{ calculations: BatchFeeCalculation[]; totalAmount: number }> {
  const calculations: BatchFeeCalculation[] = [];
  let totalFees = 0;

  for (const plan of plans) {
    const area = calculateAreaFromGeometry(plan.geometry);
    const feeConfig = await getLGAFeeConfig(plan.lga || "");
    const planFee = area * feeConfig.ratePerSqM;

    calculations.push({
      planId: plan.id,
      planNumber: plan.planNumber,
      lga: plan.lga || "",
      area,
      ratePerSqM: feeConfig.ratePerSqM,
      planFee,
    });

    totalFees += planFee;
  }

  const systemCharges = totalFees * 0.1; // 10%
  const totalAmount = totalFees + systemCharges;

  return { calculations, totalAmount };
}

// ============================================================================
// Batch Submission
// ============================================================================

/**
 * Submit a batch of survey plans for Certificate of Deposit
 */
export async function submitBatchForCertificate(
  dto: BatchSubmissionDTO
): Promise<BatchSubmissionResult> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();

    if (!user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    // 1. Validate plans can be submitted
    const plans = await prisma.surfboardPlan.findMany({
      where: {
        id: { in: dto.planIds },
        status: SurfboardPlanStatus.PENDING,
        redCopyStatus: {
          in: [
            SurfboardRedCopyStatus.NOT_SUBMITTED,
            // Allow pending as well based on PDF
          ],
        },
        deleted: false,
      },
      select: {
        id: true,
        planNumber: true,
        surveyTitle: true,
        lga: true,
        geometry: true,
        redCopyFileUrl: true,
      },
    });

    if (plans.length === 0) {
      return {
        success: false,
        error: "No eligible plans found for submission",
      };
    }

    if (plans.length !== dto.planIds.length) {
      return {
        success: false,
        error: "Some plans are not eligible for submission",
      };
    }

    // Check all plans have record copy
    const plansWithoutRecordCopy = plans.filter((p: any) => !p.redCopyFileUrl);
    if (plansWithoutRecordCopy.length > 0) {
      return {
        success: false,
        error: `Plans missing record copy: ${plansWithoutRecordCopy
          .map((p: any) => p.planNumber)
          .join(", ")}`,
      };
    }

    // 2. Perform spatial intersection for charting remarks
    const intersectionPromises = plans.map((plan) =>
      performChartingIntersection(plan.id, plan.geometry)
    );

    const intersectionResults = await Promise.all(intersectionPromises);

    // 3. Calculate fees
    const { calculations, totalAmount } = await calculateBatchFees(plans);

    // 4. Create batch
    const batch = await prisma.certificateOfDepositBatch.create({
      data: {
        submittedBy: user.id,
        planCount: plans.length,
        totalFees: totalAmount / 1.1, // Remove system charges to get base
        systemCharges: totalAmount * 0.1,
        totalAmount,
        paymentStatus: "PENDING_USER_PAYMENT",
      },
    });

    // 5. Update plans
    await Promise.all(
      plans.map((plan: any, index: number) => {
        const intersection = intersectionResults.find(
          (r: ChartingIntersectionResult) => r.planId === plan.id
        );

        return prisma.surfboardPlan.update({
          where: { id: plan.id },
          data: {
            batchId: batch.id,
            possibleChartingRemarks: intersection?.interpretation,
            redCopyStatus: SurfboardRedCopyStatus.SUBMITTED,
            redCopySubmittedAt: new Date(),
            // Initialize all approval statuses to PENDING
            accountsStatus: "PENDING",
            chartingStatus: "PENDING",
            surconStatus: "PENDING",
            recordsIStatus: "PENDING",
            recordsIIStatus: "PENDING",
          },
        });
      })
    );

    // 6. TODO: Generate Paystack payment link
    const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/surfboard/payment/${batch.id}`;

    revalidatePath("/surf-restricted/dashboard");

    return {
      success: true,
      batchId: batch.id,
      batchCode: batch.batchCode,
      totalAmount,
      paymentUrl,
    };
  } catch (error) {
    console.error("Error submitting batch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit batch",
    };
  }
}

// ============================================================================
// Payment Processing
// ============================================================================

/**
 * Record user payment (Fold 1)
 */
export async function recordUserPayment(dto: UserPaymentDTO) {
  try {
    const batch = await prisma.certificateOfDepositBatch.update({
      where: { id: dto.batchId },
      data: {
        userPaymentRef: dto.paymentRef,
        userPaymentDate: new Date(),
        userPaymentAmount: dto.amount,
        paymentStatus: "USER_PAID",
      },
    });

    // Send notification to all Surfboard Admins
    await notifySurfboardAdmins(batch.id, "USER_PAYMENT_RECEIVED");

    revalidatePath("/surf-restricted/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error recording user payment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to record payment",
    };
  }
}

/**
 * Upload LASG receipt (Fold 2)
 */
export async function uploadLASGReceipt(
  batchId: string,
  receiptUrl: string,
  receiptS3Key: string,
  uploadedBy: string
) {
  try {
    const batch = await prisma.certificateOfDepositBatch.update({
      where: { id: batchId },
      data: {
        lasgReceiptUrl: receiptUrl,
        lasgReceiptS3Key: receiptS3Key,
        lasgReceiptUploadedBy: uploadedBy,
        lasgReceiptUploadedAt: new Date(),
        paymentStatus: "LASG_PAID",
      },
    });

    // Send notification to MDA roles
    await notifyMDARoles(batch.id, "LASG_RECEIPT_UPLOADED");

    revalidatePath("/surf-restricted/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error uploading LASG receipt:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to upload receipt",
    };
  }
}

// ============================================================================
// Approval Workflows
// ============================================================================

/**
 * Accounts Admin Approval
 */
export async function approveAccountsPayment(dto: AccountsApprovalDTO) {
  try {
    const batch = await prisma.certificateOfDepositBatch.update({
      where: { id: dto.batchId },
      data: {
        accountsApprovedBy: dto.approvedBy,
        accountsApprovedAt: new Date(),
        accountsDisapproved: !dto.approved,
        accountsComment: dto.comment,
        paymentStatus: dto.approved
          ? "ACCOUNTS_APPROVED"
          : "ACCOUNTS_DISAPPROVED",
      },
    });

    if (!dto.approved) {
      // Send email only to Surfboard admins
      await notifySurfboardAdmins(batch.id, "ACCOUNTS_DISAPPROVED");
    } else {
      // Update all plans in batch
      await prisma.surfboardPlan.updateMany({
        where: { batchId: dto.batchId },
        data: {
          accountsStatus: "APPROVED",
          accountsApprovedBy: dto.approvedBy,
          accountsApprovedAt: new Date(),
        },
      });

      // Check if all MDA approvals are complete for each plan and notify users
      await checkAndNotifyMDACompletion(dto.batchId);
    }

    revalidatePath("/surf-restricted/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error approving accounts payment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to approve payment",
    };
  }
}

/**
 * Charting Admin Approval
 */
export async function approveCharting(dto: ChartingApprovalDTO) {
  try {
    const updateData: any = {
      chartingStatus: dto.status,
      chartingApprovedBy: dto.approvedBy,
      chartingApprovedAt: new Date(),
      chartingComment: dto.comment,
    };

    if (dto.possibleChartingRemarks) {
      updateData.possibleChartingRemarks = dto.possibleChartingRemarks;
    }

    await prisma.surfboardPlan.update({
      where: { id: dto.planId },
      data: updateData,
    });

    if (dto.status === "QUERIED") {
      // Send notification to user
      const plan = await prisma.surfboardPlan.findUnique({
        where: { id: dto.planId },
        include: { user: true },
      });
      if (plan?.user) {
        await notifyUser(
          plan.user.id,
          plan.planNumber,
          "CHARTING_QUERIED",
          dto.comment
        );
      }
    } else if (dto.status === "APPROVED") {
      // Check if all MDA approvals are complete and notify user
      await checkAndNotifyMDACompletionForPlan(dto.planId);
    }

    revalidatePath("/surf-restricted/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error approving charting:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to approve charting",
    };
  }
}

/**
 * SURCON Admin Approval
 */
export async function approveSURCON(dto: ApprovalDTO) {
  try {
    await prisma.surfboardPlan.update({
      where: { id: dto.planId },
      data: {
        surconStatus: dto.status,
        surconApprovedBy: dto.approvedBy,
        surconApprovedAt: new Date(),
        surconComment: dto.comment,
      },
    });

    if (dto.status === "QUERIED") {
      // Send notification to user
      const plan = await prisma.surfboardPlan.findUnique({
        where: { id: dto.planId },
        include: { user: true },
      });
      if (plan?.user) {
        await notifyUser(
          plan.user.id,
          plan.planNumber,
          "SURCON_QUERIED",
          dto.comment
        );
      }
    } else if (dto.status === "APPROVED") {
      // Check if all MDA approvals are complete and notify user
      await checkAndNotifyMDACompletionForPlan(dto.planId);
    }

    revalidatePath("/surf-restricted/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error approving SURCON:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to approve SURCON",
    };
  }
}

/**
 * Records I Approval
 */
export async function approveRecordsI(dto: ApprovalDTO) {
  try {
    await prisma.surfboardPlan.update({
      where: { id: dto.planId },
      data: {
        recordsIStatus: dto.status,
        recordsIApprovedBy: dto.approvedBy,
        recordsIApprovedAt: new Date(),
        recordsIComment: dto.comment,
      },
    });

    if (dto.status === "QUERIED") {
      const plan = await prisma.surfboardPlan.findUnique({
        where: { id: dto.planId },
        include: { user: true },
      });
      if (plan?.user) {
        await notifyUser(
          plan.user.id,
          plan.planNumber,
          "RECORDS_I_QUERIED",
          dto.comment
        );
      }
    } else if (dto.status === "APPROVED") {
      // Check if all MDA approvals are complete and notify user
      await checkAndNotifyMDACompletionForPlan(dto.planId);
    }

    revalidatePath("/surf-restricted/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error approving Records I:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to approve Records I",
    };
  }
}

/**
 * Records II Approval and OSSG Submission
 */
export async function approveRecordsII(dto: ApprovalDTO) {
  try {
    // Check if all other approvals are done
    const plan = await prisma.surfboardPlan.findUnique({
      where: { id: dto.planId },
      include: {
        user: true,
        batch: true,
      },
    });

    if (!plan) {
      return { success: false, error: "Plan not found" };
    }

    // Verify all approvals are complete
    if (
      plan.accountsStatus !== "APPROVED" ||
      plan.chartingStatus !== "APPROVED" ||
      plan.surconStatus !== "APPROVED" ||
      plan.recordsIStatus !== "APPROVED"
    ) {
      return {
        success: false,
        error: "All previous approvals must be completed first",
      };
    }

    // Update Records II status
    await prisma.surfboardPlan.update({
      where: { id: dto.planId },
      data: {
        recordsIIStatus: dto.status,
        recordsIIApprovedBy: dto.approvedBy,
        recordsIIApprovedAt: new Date(),
        recordsIIComment: dto.comment,
      },
    });

    if (dto.status === "APPROVED") {
      // Submit to OSSG API
      const ossgData = prepareOSSGData(plan);
      const ossgResult = await submitToOSSG(ossgData);

      if (ossgResult.success) {
        // Update plan status
        await prisma.surfboardPlan.update({
          where: { id: dto.planId },
          data: {
            status: SurfboardPlanStatus.LODGED,
            redCopyStatus: "APPROVED" as any,
            dateLodged: new Date(),
          },
        });

        // Notify user
        if (plan.user) {
          await notifyUser(
            plan.user.id,
            plan.planNumber,
            "PLAN_LODGED",
            `Your plan ${plan.planNumber} has been successfully lodged.`
          );
        }
      }
    } else if (dto.status === "QUERIED") {
      if (plan.user) {
        await notifyUser(
          plan.user.id,
          plan.planNumber,
          "RECORDS_II_QUERIED",
          dto.comment
        );
      }
    }

    revalidatePath("/surf-restricted/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error approving Records II:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to approve Records II",
    };
  }
}

// ============================================================================
// OSSG Integration
// ============================================================================

/**
 * Prepare data for OSSG API
 */
function prepareOSSGData(plan: any): OSSGCertificateData {
  const pillars = Array.isArray(plan.pillars) ? plan.pillars : [];
  const pillarNumbers = pillars.map((p: any) => p.number || p.name);
  const pillarCoordinates = pillars.map((p: any) => ({
    number: p.number || p.name,
    x: p.x || p.longitude,
    y: p.y || p.latitude,
  }));

  return {
    planNumber: plan.planNumber,
    surveyTitle: plan.surveyTitle,
    parcelArea: calculateAreaFromGeometry(plan.geometry).toString(),
    lga: plan.lga || "",
    ward: plan.ward,
    lcda: plan.lcda,
    deededArea: plan.deededArea,
    pillarNumbers,
    pillarCoordinates,
    locality: plan.locality,
    possibleChartingRemarks: plan.possibleChartingRemarks,
  };
}

/**
 * Submit to OSSG API
 */
async function submitToOSSG(data: OSSGCertificateData) {
  try {
    // TODO: Implement actual OSSG API call
    // For now, return success
    console.log("Submitting to OSSG:", data);

    return {
      success: true,
      planNumber: data.planNumber,
      certificateUrl: `http://ossgdeposit.lagosstate.gov.ng/survey/check.php?plan=${data.planNumber}`,
    };
  } catch (error) {
    console.error("Error submitting to OSSG:", error);
    return {
      success: false,
      planNumber: data.planNumber,
      error:
        error instanceof Error ? error.message : "Failed to submit to OSSG",
    };
  }
}

// ============================================================================
// Notification Helpers
// ============================================================================

async function notifySurfboardAdmins(batchId: string, event: string) {
  // TODO: Implement email and in-app notifications
  console.log(`Notifying Surfboard admins about ${event} for batch ${batchId}`);
}

async function notifyMDARoles(batchId: string, event: string) {
  // TODO: Implement email and in-app notifications
  console.log(`Notifying MDA roles about ${event} for batch ${batchId}`);
}

async function notifyUser(
  userId: string,
  planNumber: string,
  event: string,
  message?: string
) {
  // TODO: Implement email and in-app notifications
  console.log(
    `Notifying user ${userId} about ${event} for plan ${planNumber}: ${message}`
  );
}

/**
 * Check if all MDA approvals are complete for plans in a batch and notify users
 */
async function checkAndNotifyMDACompletion(batchId: string) {
  try {
    // Get all plans in the batch that have all 4 MDA approvals complete
    const approvedPlans = await prisma.surfboardPlan.findMany({
      where: {
        batchId,
        accountsStatus: "APPROVED",
        chartingStatus: "APPROVED",
        surconStatus: "APPROVED",
        recordsIStatus: "APPROVED",
      },
      include: { user: true },
    });

    // Notify each user whose plan is now ready for physical submission
    const { notifyReadyForPhysicalSubmission } = await import(
      "./notificationActions"
    );

    for (const plan of approvedPlans) {
      if (plan.user) {
        await notifyReadyForPhysicalSubmission({
          userId: plan.user.id,
          planId: plan.id,
          planNumber: plan.planNumber,
          sendEmail: true,
        });
      }
    }
  } catch (error) {
    console.error("Error checking MDA completion:", error);
  }
}

/**
 * Check if all MDA approvals are complete for a single plan and notify user
 */
async function checkAndNotifyMDACompletionForPlan(planId: string) {
  try {
    const plan = await prisma.surfboardPlan.findUnique({
      where: { id: planId },
      include: { user: true },
    });

    if (!plan || !plan.user) return;

    // Check if all 4 MDA roles have approved
    if (
      plan.accountsStatus === "APPROVED" &&
      plan.chartingStatus === "APPROVED" &&
      plan.surconStatus === "APPROVED" &&
      plan.recordsIStatus === "APPROVED"
    ) {
      const { notifyReadyForPhysicalSubmission } = await import(
        "./notificationActions"
      );

      await notifyReadyForPhysicalSubmission({
        userId: plan.user.id,
        planId: plan.id,
        planNumber: plan.planNumber,
        sendEmail: true,
      });
    }
  } catch (error) {
    console.error("Error checking MDA completion for plan:", error);
  }
}

// ============================================================================
// LGA Fee Configuration
// ============================================================================

/**
 * Create or update LGA fee configuration
 */
export async function upsertLGAFeeConfig(lgaName: string, ratePerSqM: number) {
  try {
    const config = await prisma.lGAFeeConfig.upsert({
      where: { lgaName },
      update: { ratePerSqM },
      create: { lgaName, ratePerSqM },
    });

    revalidatePath("/surf-restricted/dashboard/settings");

    return { success: true, config };
  } catch (error) {
    console.error("Error upserting LGA fee config:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update fee config",
    };
  }
}

/**
 * Get all LGA fee configurations
 */
export async function getAllLGAFeeConfigs() {
  try {
    const configs = await prisma.lGAFeeConfig.findMany({
      orderBy: { lgaName: "asc" },
    });

    return { success: true, configs };
  } catch (error) {
    console.error("Error fetching LGA fee configs:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch fee configs",
      configs: [],
    };
  }
}
