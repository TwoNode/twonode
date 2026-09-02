import prisma from "@/lib/prisma";
import { ApprovalStatus, BatchPaymentStatus } from "@/prisma/generated";
import { transmitToOSSG } from "@/surfboard/utils/ossg";
import {
  notifyAccountsDisapproval,
  notifyConsolidatedQueries,
  notifyPlanApproved,
  notifyPlanQueried,
  notifyReadyForPhysicalSubmission,
} from "@/app/(projects)/(surfboard)/actions/notificationActions";
import { logAuditAction, createChangeLog } from "@/app/(projects)/(surfboard)/utils/auditLogger";
import { verifyQueryPaymentLinks } from "@/surfboard/services/remitaVerificationService";
import { getCodSubmissionSettings } from "@/surfboard/services/settingsService";
import { NotFoundError, ValidationError } from "@/lib/api/errors";

/**
 * Migrated from app/(projects)/(surfboard)/actions/codActions.ts — the
 * approval chain (Accounts -> Charting/SURCON/Records I in parallel ->
 * Intake -> Records II -> Archive), per-role queue/history reads, and
 * query/resubmission handling. The largest of the four codActions.ts
 * services, per the Phase 2 spec.
 *
 * Role authorization is enforced entirely at the route layer (withAuth's
 * `roles` array matches each function's source role check exactly — see
 * the route files) rather than re-checked here, since every check in the
 * source was a static role-membership test with no per-request data
 * dependency (unlike, say, remitaVerificationService.ts's "batch owner or
 * SUPERADMIN" checks, which do depend on request data and stay inline).
 */

// ---------------------------------------------------------------------------
// Approval chain
// ---------------------------------------------------------------------------

export async function updateAccountsApproval(userId: string, batchId: string, approved: boolean, comment?: string) {
  const batch = await prisma.certificateOfDepositBatch.update({
    where: { id: batchId },
    data: {
      accountsApprovedBy: userId,
      accountsApprovedAt: new Date(),
      accountsDisapproved: !approved,
      accountsComment: comment,
      paymentStatus: approved ? "ACCOUNTS_APPROVED" : "ACCOUNTS_DISAPPROVED",
    },
    select: { batchCode: true },
  });

  const batchPlans = await prisma.surfboardPlan.findMany({
    where: { batchId },
    select: { id: true, userId: true, planNumber: true, accountsStatus: true, chartingStatus: true, surconStatus: true, recordsIStatus: true, recordsIIStatus: true },
  });

  await prisma.surfboardPlan.updateMany({
    where: { batchId },
    data: {
      accountsStatus: approved ? "APPROVED" : "QUERIED",
      accountsApprovedBy: userId,
      accountsApprovedAt: new Date(),
      accountsComment: comment,
      accountsLockedBy: null,
      accountsLockedAt: null,
      accountsLockExpiresAt: null,
    },
  });

  if (!approved) {
    await notifyAccountsDisapproval({ batchId, batchCode: batch.batchCode, comment, sendEmail: true });
  }

  await logAuditAction({
    userId,
    action: approved ? "APPROVE_ACCOUNTS" : "DISAPPROVE_ACCOUNTS",
    entity: "CertificateOfDepositBatch",
    entityId: batchId,
    changes: createChangeLog({ batchCode: batch.batchCode, approved, comment: comment || null, paymentStatus: approved ? "ACCOUNTS_APPROVED" : "ACCOUNTS_DISAPPROVED" }),
  });

  for (const plan of batchPlans) {
    if (approved) {
      const allFourApproved = plan.chartingStatus === "APPROVED" && plan.surconStatus === "APPROVED" && plan.recordsIStatus === "APPROVED" && plan.recordsIIStatus === "PENDING";
      if (allFourApproved && plan.userId) {
        await notifyReadyForPhysicalSubmission({ userId: plan.userId, planId: plan.id, planNumber: plan.planNumber, sendEmail: true });
      }
    }
    await checkAndDispatchQueries(plan.id);
  }

  return { success: true };
}

export async function updateChartingStatus(userId: string, planId: string, mode: "APPROVE" | "QUERY", comment?: string) {
  const approved = mode === "APPROVE";

  const plan = await prisma.surfboardPlan.update({
    where: { id: planId },
    data: {
      chartingRemarks: approved ? comment : undefined,
      chartingComment: !approved ? comment : undefined,
      chartingStatus: approved ? "APPROVED" : "QUERIED",
      chartingApprovedBy: userId,
      chartingApprovedAt: new Date(),
      chartingLockedBy: null,
      chartingLockedAt: null,
      chartingLockExpiresAt: null,
    },
    select: { userId: true, planNumber: true, accountsStatus: true, surconStatus: true, recordsIStatus: true, recordsIIStatus: true },
  });

  await logAuditAction({
    userId,
    action: approved ? "APPROVE_CHARTING" : "QUERY_CHARTING",
    entity: "SurfboardPlan",
    entityId: planId,
    changes: createChangeLog({ planNumber: plan.planNumber, approved, comment: comment || null, chartingStatus: approved ? "APPROVED" : "QUERIED" }),
  });

  if (approved) {
    const allFourApproved = plan.accountsStatus === "APPROVED" && plan.surconStatus === "APPROVED" && plan.recordsIStatus === "APPROVED" && plan.recordsIIStatus === "PENDING";
    if (allFourApproved && plan.userId) {
      await notifyReadyForPhysicalSubmission({ userId: plan.userId, planId, planNumber: plan.planNumber, sendEmail: true });
    }
  }

  await checkAndDispatchQueries(planId);
  return { success: true };
}

export async function updateSurconStatus(userId: string, planId: string, approved: boolean, comment?: string) {
  const plan = await prisma.surfboardPlan.update({
    where: { id: planId },
    data: {
      surconStatus: approved ? "APPROVED" : "QUERIED",
      surconApprovedBy: userId,
      surconApprovedAt: new Date(),
      surconComment: comment,
      surconLockedBy: null,
      surconLockedAt: null,
      surconLockExpiresAt: null,
    },
    select: { userId: true, planNumber: true, accountsStatus: true, chartingStatus: true, recordsIStatus: true, recordsIIStatus: true },
  });

  await logAuditAction({
    userId,
    action: approved ? "APPROVE_SURCON" : "QUERY_SURCON",
    entity: "SurfboardPlan",
    entityId: planId,
    changes: createChangeLog({ planNumber: plan.planNumber, approved, comment: comment || null, surconStatus: approved ? "APPROVED" : "QUERIED" }),
  });

  if (approved) {
    const allFourApproved = plan.accountsStatus === "APPROVED" && plan.chartingStatus === "APPROVED" && plan.recordsIStatus === "APPROVED" && plan.recordsIIStatus === "PENDING";
    if (allFourApproved && plan.userId) {
      await notifyReadyForPhysicalSubmission({ userId: plan.userId, planId, planNumber: plan.planNumber, sendEmail: true });
    }
  }

  await checkAndDispatchQueries(planId);
  return { success: true };
}

export async function updateRecordsIStatus(userId: string, planId: string, approved: boolean, comment?: string) {
  const plan = await prisma.surfboardPlan.update({
    where: { id: planId },
    data: {
      recordsIStatus: approved ? "APPROVED" : "QUERIED",
      recordsIApprovedBy: userId,
      recordsIApprovedAt: new Date(),
      recordsIComment: comment,
      recordsILockedBy: null,
      recordsILockedAt: null,
      recordsILockExpiresAt: null,
    },
    select: { userId: true, planNumber: true, accountsStatus: true, chartingStatus: true, surconStatus: true, recordsIIStatus: true },
  });

  await logAuditAction({
    userId,
    action: approved ? "APPROVE_RECORDS_I" : "QUERY_RECORDS_I",
    entity: "SurfboardPlan",
    entityId: planId,
    changes: createChangeLog({ planNumber: plan.planNumber, approved, comment: comment || null, recordsIStatus: approved ? "APPROVED" : "QUERIED" }),
  });

  if (approved) {
    const allFourApproved = plan.accountsStatus === "APPROVED" && plan.chartingStatus === "APPROVED" && plan.surconStatus === "APPROVED" && plan.recordsIIStatus === "PENDING";
    if (allFourApproved && plan.userId) {
      await notifyReadyForPhysicalSubmission({ userId: plan.userId, planId, planNumber: plan.planNumber, sendEmail: true });
    }
  }

  await checkAndDispatchQueries(planId);
  return { success: true };
}

export async function updateIntakeStatus(userId: string, planId: string, approved: boolean, comment?: string) {
  const planCheck = await prisma.surfboardPlan.findUnique({
    where: { id: planId },
    select: { accountsStatus: true, chartingStatus: true, surconStatus: true, recordsIStatus: true },
  });
  if (!planCheck) throw new NotFoundError("Plan");

  if (planCheck.accountsStatus !== "APPROVED" || planCheck.chartingStatus !== "APPROVED" || planCheck.surconStatus !== "APPROVED" || planCheck.recordsIStatus !== "APPROVED") {
    throw new ValidationError({ status: "Parallel reviews must be completed before Intake Admin can act." });
  }

  const plan = await prisma.surfboardPlan.update({
    where: { id: planId },
    data: {
      intakeStatus: approved ? "APPROVED" : "QUERIED",
      intakeApprovedBy: userId,
      intakeApprovedAt: new Date(),
      intakeComment: comment,
      intakeLockedBy: null,
      intakeLockedAt: null,
      intakeLockExpiresAt: null,
    },
    select: { userId: true, planNumber: true, redCopyStatus: true },
  });

  await logAuditAction({
    userId,
    action: approved ? "APPROVE_INTAKE" : "QUERY_INTAKE",
    entity: "SurfboardPlan",
    entityId: planId,
    changes: createChangeLog({ planNumber: plan.planNumber, approved, comment: comment || null, intakeStatus: approved ? "APPROVED" : "QUERIED" }),
  });

  if (!approved && plan.userId) {
    await prisma.surfboardPlan.update({ where: { id: planId }, data: { redCopyStatus: "QUERIED" } });
    await notifyConsolidatedQueries({ userId: plan.userId, planId, planNumber: plan.planNumber, queries: [{ role: "Intake", comment: comment || undefined }], sendEmail: true });
  }

  return { success: true };
}

export async function updateIntakeBatchStatus(userId: string, batchId: string, approved: boolean, comment?: string) {
  const batch = await prisma.certificateOfDepositBatch.findUnique({
    where: { id: batchId },
    include: {
      plans: { where: { accountsStatus: "APPROVED", chartingStatus: "APPROVED", surconStatus: "APPROVED", recordsIStatus: "APPROVED", intakeStatus: "PENDING", deleted: false } },
    },
  });
  if (!batch || batch.plans.length === 0) {
    throw new ValidationError({ batchId: "No eligible plans found in batch" });
  }

  const planIds = batch.plans.map((p) => p.id);

  await prisma.$transaction(async (tx) => {
    await tx.surfboardPlan.updateMany({
      where: { id: { in: planIds } },
      data: {
        intakeStatus: approved ? "APPROVED" : "QUERIED",
        intakeApprovedBy: userId,
        intakeApprovedAt: new Date(),
        intakeComment: comment,
        ...(approved ? {} : { redCopyStatus: "QUERIED" }),
      },
    });

    for (const p of batch.plans) {
      await tx.surfboardAuditLog.create({
        data: {
          userId,
          action: approved ? "APPROVE_INTAKE" : "QUERY_INTAKE",
          entity: "SurfboardPlan",
          entityId: p.id,
          ipAddress: "System",
          changes: JSON.stringify(createChangeLog({ planNumber: p.planNumber, approved, intakeStatus: approved ? "APPROVED" : "QUERIED" })),
        },
      });
    }
  });

  if (!approved && batch.submittedBy) {
    for (const p of batch.plans) {
      await notifyConsolidatedQueries({ userId: batch.submittedBy, planId: p.id, planNumber: p.planNumber, queries: [{ role: "Intake", comment: comment || undefined }], sendEmail: true });
    }
  }

  return { success: true, updatedCount: planIds.length };
}

export async function updateRecordsIIStatus(userId: string, planId: string, approved: boolean, comment?: string) {
  const planCheck = await prisma.surfboardPlan.findUnique({
    where: { id: planId },
    select: { accountsStatus: true, chartingStatus: true, surconStatus: true, recordsIStatus: true, intakeStatus: true, batchId: true },
  });
  if (!planCheck) throw new NotFoundError("Plan");

  if (
    planCheck.accountsStatus !== "APPROVED" ||
    planCheck.chartingStatus !== "APPROVED" ||
    planCheck.surconStatus !== "APPROVED" ||
    planCheck.recordsIStatus !== "APPROVED" ||
    planCheck.intakeStatus !== "APPROVED"
  ) {
    throw new ValidationError({ status: "All other approvals (including Intake) must be completed first" });
  }

  const plan = await prisma.surfboardPlan.update({
    where: { id: planId },
    data: {
      recordsIIStatus: approved ? "APPROVED" : "QUERIED",
      recordsIIApprovedBy: userId,
      recordsIIApprovedAt: new Date(),
      recordsIIComment: comment,
      recordsIILockedBy: null,
      recordsIILockedAt: null,
      recordsIILockExpiresAt: null,
      ...(!approved
        ? { accountsStatus: "PENDING", chartingStatus: "PENDING", surconStatus: "PENDING", recordsIStatus: "PENDING", intakeStatus: "PENDING" }
        : {}),
      ...(approved ? { status: "LODGED", redCopyStatus: "APPROVED", dateLodged: new Date() } : {}),
    },
    include: { user: true, batch: { select: { batchCode: true } } },
  });

  if (approved) {
    await transmitToOSSG(plan, plan.user);
    if (plan.userId) {
      await notifyPlanApproved({ userId: plan.userId, planId, planNumber: plan.planNumber, batchCode: plan.batch?.batchCode, sendEmail: true });
    }
  } else if (plan.userId) {
    await notifyPlanQueried({ userId: plan.userId, planId, planNumber: plan.planNumber, queriedBy: "Records II", comment, sendEmail: true });
  }

  await logAuditAction({
    userId,
    action: approved ? "APPROVE_RECORDS_II" : "QUERY_RECORDS_II",
    entity: "SurfboardPlan",
    entityId: planId,
    changes: createChangeLog({ planNumber: plan.planNumber, approved, comment: comment || null, recordsIIStatus: approved ? "APPROVED" : "QUERIED" }),
  });

  return { success: true };
}

export async function markPlanArchived(userId: string, planId: string, notes?: string) {
  const plan = await prisma.surfboardPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError("Plan");

  if (
    plan.surconStatus !== "APPROVED" ||
    plan.chartingStatus !== "APPROVED" ||
    plan.recordsIStatus !== "APPROVED" ||
    plan.intakeStatus !== "APPROVED" ||
    plan.recordsIIStatus !== "APPROVED" ||
    plan.accountsStatus !== "APPROVED"
  ) {
    throw new ValidationError({ status: "Plan is not fully approved by all MDAs yet" });
  }

  const updated = await prisma.surfboardPlan.update({
    where: { id: planId },
    data: { archiveReceivedBy: userId, archiveReceivedAt: new Date(), archiveNotes: notes || null },
  });

  await logAuditAction({
    userId,
    action: "MARK_PLAN_ARCHIVED",
    entity: "SurfboardPlan",
    entityId: planId,
    changes: createChangeLog({ archiveReceivedAt: updated.archiveReceivedAt, archiveNotes: notes }),
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Per-role queue/history reads
// ---------------------------------------------------------------------------

export async function getAccountsBatches() {
  return prisma.certificateOfDepositBatch.findMany({
    where: {
      paymentStatus: { in: ["LASG_PAID", "ACCOUNTS_APPROVED", "ACCOUNTS_DISAPPROVED", "COMPLETED"] },
      OR: [{ accountsApprovedBy: null }, { plans: { some: { accountsStatus: "PENDING" } } }],
    },
    include: {
      submitter: { select: { firstName: true, lastName: true, email: true } },
      plans: { select: { id: true, planNumber: true, planType: true, lga: true, deededArea: true, queryLasgReceiptUrls: true, queryRemitaReceiptUrls: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getAccountsHistory() {
  return prisma.certificateOfDepositBatch.findMany({
    where: { accountsApprovedBy: { not: null } },
    include: {
      submitter: { select: { firstName: true, lastName: true, email: true } },
      accountsApprovedByUser: { select: { firstName: true, lastName: true } },
      plans: { select: { id: true, planNumber: true, planType: true, lga: true, deededArea: true, queryLasgReceiptUrls: true, queryRemitaReceiptUrls: true } },
    },
    orderBy: { accountsApprovedAt: "desc" },
    take: 100,
  });
}

async function getPlansWithLockStatus(where: any, lockField: "chartingLockedBy" | "surconLockedBy" | "recordsILockedBy", lockExpiresField: "chartingLockExpiresAt" | "surconLockExpiresAt" | "recordsILockExpiresAt", include: any, orderBy: any) {
  const now = new Date();
  const plans = await prisma.surfboardPlan.findMany({ where, include, orderBy });
  return plans.map((plan: any) => ({
    ...plan,
    isLocked: plan[lockField] && plan[lockExpiresField] && new Date(plan[lockExpiresField]) > now,
    lockExpiresAt: plan[lockExpiresField],
  }));
}

const BATCH_PAID_STATUSES: BatchPaymentStatus[] = [
  BatchPaymentStatus.LASG_PAID,
  BatchPaymentStatus.ACCOUNTS_APPROVED,
  BatchPaymentStatus.ACCOUNTS_DISAPPROVED,
  BatchPaymentStatus.COMPLETED,
];

export async function getChartingPlans() {
  return getPlansWithLockStatus(
    { redCopyStatus: "SUBMITTED", chartingStatus: "PENDING", deleted: false, batch: { paymentStatus: { in: BATCH_PAID_STATUSES } } },
    "chartingLockedBy",
    "chartingLockExpiresAt",
    { batch: { select: { batchCode: true, paymentStatus: true } }, user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } } },
    { redCopySubmittedAt: "asc" }
  );
}

export async function getChartingHistory() {
  return prisma.surfboardPlan.findMany({
    where: { redCopyStatus: "SUBMITTED", chartingStatus: "APPROVED", deleted: false },
    include: { batch: { select: { batchCode: true, paymentStatus: true } }, chartingApprovedByUser: { select: { firstName: true, lastName: true } } },
    orderBy: { chartingApprovedAt: "desc" },
    take: 100,
  });
}

export async function getSurconPlans() {
  return getPlansWithLockStatus(
    { redCopyStatus: "SUBMITTED", surconStatus: { in: ["PENDING"] }, deleted: false, batch: { paymentStatus: { in: BATCH_PAID_STATUSES } } },
    "surconLockedBy",
    "surconLockExpiresAt",
    { batch: { select: { batchCode: true, paymentStatus: true } }, user: { select: { firstName: true, lastName: true, email: true, surconRegNumber: true, companyName: true, surconRegName: true, phoneNumber: true } } },
    { redCopySubmittedAt: "asc" }
  );
}

export async function getSurconHistory() {
  return prisma.surfboardPlan.findMany({
    where: { surconStatus: { in: ["APPROVED", "QUERIED"] }, surconApprovedAt: { not: null }, deleted: false },
    include: {
      batch: { select: { batchCode: true, paymentStatus: true } },
      surconApprovedByUser: { select: { firstName: true, lastName: true } },
      user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true, surconRegNumber: true, companyName: true } },
    },
    orderBy: { surconApprovedAt: "desc" },
    take: 100,
  });
}

export async function getRecordsIPlans() {
  return getPlansWithLockStatus(
    { redCopyStatus: "SUBMITTED", recordsIStatus: { in: ["PENDING"] }, deleted: false, batch: { paymentStatus: { in: BATCH_PAID_STATUSES } } },
    "recordsILockedBy",
    "recordsILockExpiresAt",
    { batch: { select: { batchCode: true, paymentStatus: true } }, user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true, surconRegNumber: true, companyName: true } } },
    { redCopySubmittedAt: "asc" }
  );
}

export async function getRecordsIHistory() {
  return prisma.surfboardPlan.findMany({
    where: { recordsIStatus: { in: ["APPROVED", "QUERIED"] }, recordsIApprovedAt: { not: null }, deleted: false },
    include: {
      batch: { select: { batchCode: true, paymentStatus: true } },
      recordsIApprovedByUser: { select: { firstName: true, lastName: true } },
      user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true, surconRegNumber: true, companyName: true } },
    },
    orderBy: { recordsIApprovedAt: "desc" },
    take: 100,
  });
}

export async function getRecordsIIPlans() {
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
      batch: { paymentStatus: { in: BATCH_PAID_STATUSES } },
    },
    include: {
      batch: { select: { batchCode: true, paymentStatus: true, planCount: true } },
      user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true, surconRegNumber: true, companyName: true } },
    },
    orderBy: { intakeApprovedAt: "asc" },
  });

  return plans.map((plan) => ({
    ...plan,
    isLocked: Boolean(plan.recordsIILockedBy && plan.recordsIILockExpiresAt && new Date(plan.recordsIILockExpiresAt) > now),
    lockExpiresAt: plan.recordsIILockExpiresAt,
  }));
}

export async function getRecordsIIHistory() {
  return prisma.surfboardPlan.findMany({
    where: { recordsIIStatus: { in: ["APPROVED", "QUERIED"] }, recordsIIApprovedAt: { not: null }, deleted: false },
    include: {
      batch: { select: { batchCode: true, paymentStatus: true } },
      recordsIIApprovedByUser: { select: { firstName: true, lastName: true } },
      user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true, surconRegNumber: true, companyName: true } },
    },
    orderBy: { recordsIIApprovedAt: "desc" },
    take: 100,
  });
}

export async function getIntakeBatches() {
  const criteria = { redCopyStatus: "SUBMITTED" as const, deleted: false, physicalCopySubmitted: true, intakeStatus: "PENDING" as const, accountsStatus: "APPROVED" as const, chartingStatus: "APPROVED" as const, recordsIStatus: "APPROVED" as const, surconStatus: "APPROVED" as const };
  return prisma.certificateOfDepositBatch.findMany({
    where: { plans: { some: criteria }, paymentStatus: { in: BATCH_PAID_STATUSES } },
    include: {
      submitter: { select: { firstName: true, lastName: true, email: true, surconRegNumber: true, companyName: true, phoneNumber: true } },
      plans: {
        where: criteria,
        select: { id: true, planNumber: true, surveyTitle: true, lga: true, ward: true, lcda: true, deededArea: true, redCopyFileUrl: true, intakeStatus: true, intakeLockedBy: true, intakeLockExpiresAt: true, physicalCopySubmittedAt: true, recordCopyVerdict: true, recordCopyVerificationData: true },
        orderBy: { physicalCopySubmittedAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getIntakeHistoryBatches() {
  const criteria = { intakeStatus: { in: [ApprovalStatus.APPROVED, ApprovalStatus.QUERIED] }, accountsStatus: ApprovalStatus.APPROVED, chartingStatus: ApprovalStatus.APPROVED, recordsIStatus: ApprovalStatus.APPROVED, surconStatus: ApprovalStatus.APPROVED };
  return prisma.certificateOfDepositBatch.findMany({
    where: { plans: { some: criteria } },
    include: {
      submitter: { select: { firstName: true, lastName: true, email: true, surconRegNumber: true, companyName: true, phoneNumber: true } },
      plans: { where: criteria, include: { intakeApprovedByUser: { select: { id: true, firstName: true, lastName: true } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}

export async function getRecordsIIBatches(userId: string) {
  const now = new Date();
  const criteria = { redCopyStatus: "SUBMITTED" as const, deleted: false, accountsStatus: "APPROVED" as const, chartingStatus: "APPROVED" as const, surconStatus: "APPROVED" as const, recordsIStatus: "APPROVED" as const, intakeStatus: "APPROVED" as const, recordsIIStatus: "PENDING" as const };

  const batches = await prisma.certificateOfDepositBatch.findMany({
    where: { plans: { some: criteria } },
    include: {
      submitter: { select: { firstName: true, lastName: true, email: true, phoneNumber: true, surconRegNumber: true, companyName: true } },
      plans: {
        where: criteria,
        select: { id: true, planNumber: true, surveyTitle: true, planType: true, referencePlanNumber: true, lga: true, ward: true, lcda: true, locality: true, deededArea: true, chartingRemarks: true, redCopyFileUrl: true, intakeApprovedAt: true, recordsIILockedBy: true, recordsIILockExpiresAt: true, recordCopyVerdict: true, recordCopyVerificationData: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return batches
    .map((batch) => {
      const earliestIntake = Math.min(...batch.plans.map((p) => (p.intakeApprovedAt ? new Date(p.intakeApprovedAt).getTime() : Infinity)));
      return { ...batch, _sortKey: earliestIntake };
    })
    .sort((a, b) => a._sortKey - b._sortKey)
    .map(({ _sortKey, ...batch }) => ({
      ...batch,
      plans: batch.plans.map((plan) => ({
        ...plan,
        isLocked: Boolean(plan.recordsIILockedBy && plan.recordsIILockExpiresAt && new Date(plan.recordsIILockExpiresAt) > now),
        isLockedByMe: plan.recordsIILockedBy === userId && Boolean(plan.recordsIILockExpiresAt) && new Date(plan.recordsIILockExpiresAt!) > now,
      })),
      isBatchLockedByMe: batch.plans.length > 0 && batch.plans[0].recordsIILockedBy === userId && Boolean(batch.plans[0].recordsIILockExpiresAt) && new Date(batch.plans[0].recordsIILockExpiresAt!) > now,
      batchLockExpiresAt: batch.plans.length > 0 && batch.plans[0].recordsIILockedBy === userId && batch.plans[0].recordsIILockExpiresAt ? batch.plans[0].recordsIILockExpiresAt : null,
    }));
}

export async function getRecordsIIHistoryBatches() {
  const criteria = { recordsIIStatus: { in: [ApprovalStatus.APPROVED, ApprovalStatus.QUERIED] }, recordsIIApprovedAt: { not: null } };
  return prisma.certificateOfDepositBatch.findMany({
    where: { plans: { some: criteria } },
    include: {
      submitter: { select: { firstName: true, lastName: true, email: true, phoneNumber: true, surconRegNumber: true, companyName: true } },
      plans: {
        where: criteria,
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
          recordCopyVerdict: true,
          recordCopyVerificationData: true,
          recordsIIApprovedByUser: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}

export async function getPendingArchiveBatches() {
  const criteria = { redCopyStatus: "APPROVED" as const, deleted: false, accountsStatus: "APPROVED" as const, chartingStatus: "APPROVED" as const, surconStatus: "APPROVED" as const, recordsIStatus: "APPROVED" as const, intakeStatus: "APPROVED" as const, recordsIIStatus: "APPROVED" as const, archiveReceivedAt: null };

  const batches = await prisma.certificateOfDepositBatch.findMany({
    where: { plans: { some: criteria } },
    include: {
      submitter: { select: { firstName: true, lastName: true, email: true, phoneNumber: true, surconRegNumber: true, companyName: true } },
      plans: { where: criteria, select: { id: true, planNumber: true, surveyTitle: true, planType: true, referencePlanNumber: true, lga: true, ward: true, lcda: true, locality: true, deededArea: true, chartingRemarks: true, redCopyFileUrl: true, recordsIIApprovedAt: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return batches
    .map((batch) => {
      const earliestApproval = Math.min(...batch.plans.map((p) => (p.recordsIIApprovedAt ? new Date(p.recordsIIApprovedAt).getTime() : Infinity)));
      return { ...batch, _sortKey: earliestApproval };
    })
    .sort((a, b) => a._sortKey - b._sortKey)
    .map(({ _sortKey, ...batch }) => batch);
}

export async function getArchiveHistoryBatches() {
  const criteria = { archiveReceivedAt: { not: null }, deleted: false };
  return prisma.certificateOfDepositBatch.findMany({
    where: { plans: { some: criteria } },
    include: {
      submitter: { select: { firstName: true, lastName: true, email: true, phoneNumber: true, surconRegNumber: true, companyName: true } },
      plans: { where: criteria, select: { id: true, planNumber: true, surveyTitle: true, planType: true, lga: true, ward: true, lcda: true, deededArea: true, chartingRemarks: true, redCopyFileUrl: true, archiveReceivedAt: true, archiveNotes: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}

export async function getPendingCountByRole() {
  const [accountsCount, chartingCount, surconCount, recordsICount, recordsIICount, archiveCount, intakeCount] = await Promise.all([
    prisma.certificateOfDepositBatch.count({
      where: { paymentStatus: { in: BATCH_PAID_STATUSES }, OR: [{ accountsApprovedBy: null }, { plans: { some: { accountsStatus: "PENDING" } } }] },
    }),
    prisma.surfboardPlan.count({ where: { redCopyStatus: "SUBMITTED", chartingStatus: "PENDING", deleted: false, batch: { paymentStatus: { in: BATCH_PAID_STATUSES } } } }),
    prisma.surfboardPlan.count({ where: { redCopyStatus: "SUBMITTED", surconStatus: { in: ["PENDING", "QUERIED"] }, deleted: false, batch: { paymentStatus: { in: BATCH_PAID_STATUSES } } } }),
    prisma.surfboardPlan.count({ where: { redCopyStatus: "SUBMITTED", recordsIStatus: { in: ["PENDING", "QUERIED"] }, deleted: false, batch: { paymentStatus: { in: BATCH_PAID_STATUSES } } } }),
    prisma.surfboardPlan.count({
      where: { redCopyStatus: "SUBMITTED", recordsIIStatus: "PENDING", accountsStatus: "APPROVED", chartingStatus: "APPROVED", surconStatus: "APPROVED", recordsIStatus: "APPROVED", intakeStatus: "APPROVED", deleted: false, batch: { paymentStatus: { in: BATCH_PAID_STATUSES } } },
    }),
    prisma.surfboardPlan.count({
      where: { redCopyStatus: "APPROVED", surconStatus: "APPROVED", chartingStatus: "APPROVED", recordsIStatus: "APPROVED", intakeStatus: "APPROVED", recordsIIStatus: "APPROVED", accountsStatus: "APPROVED", archiveReceivedAt: null, deleted: false },
    }),
    prisma.certificateOfDepositBatch.count({
      where: { plans: { some: { redCopyStatus: "SUBMITTED", accountsStatus: "APPROVED", chartingStatus: "APPROVED", surconStatus: "APPROVED", recordsIStatus: "APPROVED", recordsIIStatus: "PENDING", intakeStatus: "PENDING", physicalCopySubmitted: true, deleted: false } } },
    }),
  ]);

  return { accounts: accountsCount, charting: chartingCount, surcon: surconCount, recordsI: recordsICount, recordsII: recordsIICount, archive: archiveCount, intake: intakeCount };
}

// ---------------------------------------------------------------------------
// Query / resubmission
// ---------------------------------------------------------------------------

const QUERIED_OR = [{ accountsStatus: "QUERIED" as const }, { chartingStatus: "QUERIED" as const }, { surconStatus: "QUERIED" as const }, { recordsIStatus: "QUERIED" as const }, { recordsIIStatus: "QUERIED" as const }];

export async function getQueriedPlansForUser(userId: string) {
  return prisma.surfboardPlan.findMany({
    where: { userId, deleted: false, OR: QUERIED_OR },
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
      batch: { select: { batchCode: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function resubmitQueriedPlan(
  userId: string,
  planId: string,
  pillars?: any,
  recordCopyUrl?: string,
  location?: { lga?: string; lcda?: string; ward?: string; state?: string },
  lasgReceiptUrl?: string,
  remitaReceiptUrl?: string
) {
  const plan = await prisma.surfboardPlan.findFirst({
    where: { id: planId, userId, OR: QUERIED_OR },
    select: { id: true, planNumber: true, codFee: true, accountsStatus: true, accountsComment: true, chartingStatus: true, surconStatus: true, recordsIStatus: true, recordsIIStatus: true },
  });
  if (!plan) throw new NotFoundError("Plan (or no pending queries to respond to)");

  if (lasgReceiptUrl && remitaReceiptUrl) {
    const settings = await getCodSubmissionSettings();
    const feePercent = settings.queryResponseFeePercent || 0;
    const expectedAmount = plan.codFee ? (Number(plan.codFee) * feePercent) / 100 : 0;

    if (expectedAmount > 0) {
      const verifyRes = await verifyQueryPaymentLinks(userId, lasgReceiptUrl, remitaReceiptUrl, expectedAmount);
      if (!verifyRes.success) {
        throw new ValidationError({ payment: verifyRes.error });
      }
    }
  }

  let queriedBy: string | null = null;
  const needsAccountReview = plan.accountsStatus === "QUERIED" || !!lasgReceiptUrl || !!remitaReceiptUrl;

  const updates: any = {
    ...(pillars && { pillars }),
    ...(recordCopyUrl && { redCopyFileUrl: recordCopyUrl }),
    ...(location?.lga && { lga: location.lga }),
    ...(location?.lcda && { lcda: location.lcda }),
    ...(location?.ward && { ward: location.ward }),
    ...(location?.state && { state: location.state }),
    ...(lasgReceiptUrl && { queryLasgReceiptUrls: { push: lasgReceiptUrl } }),
    ...(remitaReceiptUrl && { queryRemitaReceiptUrls: { push: remitaReceiptUrl } }),
    redCopyStatus: "SUBMITTED",
    accountsStatus: needsAccountReview ? "PENDING" : plan.accountsStatus,
    accountsComment: needsAccountReview ? null : plan.accountsComment,
    chartingStatus: "PENDING",
    chartingComment: null,
    surconStatus: "PENDING",
    surconComment: null,
    recordsIStatus: "PENDING",
    recordsIComment: null,
    recordsIIStatus: "PENDING",
    recordsIIComment: null,
  };

  if (plan.accountsStatus === "QUERIED") queriedBy = "Accounts";
  if (plan.chartingStatus === "QUERIED") queriedBy = queriedBy ? `${queriedBy}, Charting` : "Charting";
  if (plan.surconStatus === "QUERIED") queriedBy = queriedBy ? `${queriedBy}, SURCON` : "SURCON";
  if (plan.recordsIStatus === "QUERIED") queriedBy = queriedBy ? `${queriedBy}, Records I` : "Records I";
  if (plan.recordsIIStatus === "QUERIED") queriedBy = queriedBy ? `${queriedBy}, Records II` : "Records II";

  await prisma.surfboardPlan.update({ where: { id: planId }, data: updates });

  await logAuditAction({
    userId,
    action: "RESUBMIT_QUERIED_PLAN",
    entity: "SurfboardPlan",
    entityId: planId,
    changes: createChangeLog({
      planNumber: plan.planNumber,
      redCopyStatus: "SUBMITTED",
      queriedBy,
      pillarsUpdated: !!pillars,
      recordCopyUpdated: !!recordCopyUrl,
      queryPayment: lasgReceiptUrl && remitaReceiptUrl ? { lasgReceiptUrl, remitaReceiptUrl, verified: true } : undefined,
    }),
  });

  return { success: true };
}

/**
 * "Batched query dispatcher" — once all 4 parallel roles (Accounts,
 * Charting, SURCON, Records I) have made a decision, compiles any QUERIED
 * ones into one consolidated notification and flips redCopyStatus.
 * Internal — called by each of the 4 parallel approval functions above,
 * never exposed as a route.
 */
async function checkAndDispatchQueries(planId: string) {
  const plan = await prisma.surfboardPlan.findUnique({
    where: { id: planId },
    select: { userId: true, planNumber: true, accountsStatus: true, accountsComment: true, chartingStatus: true, chartingComment: true, surconStatus: true, surconComment: true, recordsIStatus: true, recordsIComment: true },
  });
  if (!plan || !plan.userId) return;

  const allActed = plan.accountsStatus !== "PENDING" && plan.chartingStatus !== "PENDING" && plan.surconStatus !== "PENDING" && plan.recordsIStatus !== "PENDING";
  if (!allActed) return;

  const queries: Array<{ role: string; comment?: string }> = [];
  if (plan.accountsStatus === "QUERIED") queries.push({ role: "Accounts", comment: plan.accountsComment || undefined });
  if (plan.chartingStatus === "QUERIED") queries.push({ role: "Charting", comment: plan.chartingComment || undefined });
  if (plan.surconStatus === "QUERIED") queries.push({ role: "SURCON", comment: plan.surconComment || undefined });
  if (plan.recordsIStatus === "QUERIED") queries.push({ role: "Records I", comment: plan.recordsIComment || undefined });

  if (queries.length > 0) {
    await prisma.surfboardPlan.update({ where: { id: planId }, data: { redCopyStatus: "QUERIED" } });
    await notifyConsolidatedQueries({ userId: plan.userId, planId, planNumber: plan.planNumber, queries, sendEmail: true });
  }
}

// ---------------------------------------------------------------------------
// Physical copy
// ---------------------------------------------------------------------------

export async function submitPhysicalCopies(userId: string, planIds: string[]) {
  const plans = await prisma.surfboardPlan.findMany({
    where: { id: { in: planIds }, userId, redCopyStatus: "SUBMITTED", physicalCopySubmitted: false, deleted: false },
    select: { id: true },
  });
  if (plans.length === 0) throw new ValidationError({ planIds: "No eligible plans found to submit" });

  const validPlanIds = plans.map((p) => p.id);
  const result = await prisma.surfboardPlan.updateMany({
    where: { id: { in: validPlanIds } },
    data: { physicalCopySubmitted: true, physicalCopySubmittedAt: new Date() },
  });

  return { count: result.count };
}
