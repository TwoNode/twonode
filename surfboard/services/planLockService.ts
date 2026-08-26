import prisma from "@/lib/prisma";
import { SurfboardRole } from "@/utils/platform";
import { ConflictError, NotFoundError } from "@/lib/api/errors";

/**
 * Migrated from app/(projects)/(surfboard)/actions/codActions.ts's locking
 * functions — same FIFO-gated optimistic-locking behavior, Prisma-only (no
 * "use server", no next/cache). Batch-level locking (ACCOUNTS/INTAKE/
 * RECORDS_II lock every plan in a batch atomically) and plan-level locking
 * (the other 4 MDA stages) share one mechanism — the same
 * *LockedBy/*LockedAt/*LockExpiresAt columns on SurfboardPlan, selected
 * dynamically by role — so both live in this one service, per the Phase 2
 * spec.
 *
 * Callers pass userId explicitly (from the authenticated route's session)
 * instead of this service reading cookies itself — same convention
 * qrEarningsService.ts already established in Phase 1.
 */

export type MDARole = Extract<
  SurfboardRole,
  | "ACCOUNTS"
  | "CHARTING"
  | "SURCON"
  | "RECORDS_I"
  | "RECORDS_II"
  | "INTAKE"
  | "ARCHIVE"
  | "MDA_SUPERADMIN"
>;

const LOCK_DURATION_MINUTES = 6;
const RECORDS_II_LOCK_MINUTES_PER_PLAN = 3;

// MDA_SUPERADMIN has no lock fields of its own on SurfboardPlan (it's a
// supervisory role, never a workflow participant that acquires a lock) —
// this entry is preserved from the source for type completeness but is
// never actually reachable through acquirePlanLock/etc. in practice.
const ROLE_FIELD_PREFIX: Record<MDARole, string> = {
  ACCOUNTS: "accounts",
  CHARTING: "charting",
  SURCON: "surcon",
  RECORDS_I: "recordsI",
  RECORDS_II: "recordsII",
  INTAKE: "intake",
  ARCHIVE: "archive",
  MDA_SUPERADMIN: "mdaSuperadmin",
};

function getRoleFieldPrefix(role: MDARole): string {
  return ROLE_FIELD_PREFIX[role];
}

/** Every role that can hold a plan-level or batch-level lock — for routes' withAuth roles array. */
export const MDA_ROLES: MDARole[] = [
  SurfboardRole.ACCOUNTS,
  SurfboardRole.CHARTING,
  SurfboardRole.SURCON,
  SurfboardRole.RECORDS_I,
  SurfboardRole.RECORDS_II,
  SurfboardRole.INTAKE,
  SurfboardRole.ARCHIVE,
  SurfboardRole.MDA_SUPERADMIN,
];

/** The 3 roles whose locking is batch-level rather than plan-level. */
export type BatchLockRole = Extract<SurfboardRole, "ACCOUNTS" | "INTAKE" | "RECORDS_II">;
export const BATCH_LOCK_ROLES: BatchLockRole[] = [SurfboardRole.ACCOUNTS, SurfboardRole.INTAKE, SurfboardRole.RECORDS_II];

// ---------------------------------------------------------------------------
// Plan-level locking (ACCOUNTS/CHARTING/SURCON/RECORDS_I/ARCHIVE) — INTAKE
// and RECORDS_II escalate to batch-level locking within the same function,
// exactly as the source did.
// ---------------------------------------------------------------------------

export async function acquirePlanLock(
  planId: string,
  role: MDARole,
  userId: string
): Promise<{ locked: boolean }> {
  const now = new Date();
  const lockExpiry = new Date(now.getTime() + LOCK_DURATION_MINUTES * 60000);

  const rolePrefix = getRoleFieldPrefix(role);
  const lockedByField = `${rolePrefix}LockedBy` as any;
  const lockedAtField = `${rolePrefix}LockedAt` as any;
  const lockExpiresAtField = `${rolePrefix}LockExpiresAt` as any;

  const plan = await prisma.surfboardPlan.findUnique({
    where: { id: planId },
    select: { [lockedByField]: true, [lockExpiresAtField]: true, batchId: true },
  });
  if (!plan) throw new NotFoundError("Plan");

  const currentLock = (plan as any)[lockedByField];
  const currentExpiry = (plan as any)[lockExpiresAtField];

  if (currentLock && currentLock !== userId && currentExpiry && new Date(currentExpiry) > now) {
    // Original also returned {locked:false, lockedBy: currentLock} alongside
    // this failure — callers needing that detail call getPlanLockStatus.
    throw new ConflictError("Plan is currently being reviewed by another user");
  }

  // Batch-level locking for INTAKE and RECORDS_II
  if ((role === "INTAKE" || role === "RECORDS_II") && plan.batchId) {
    const batchPlans = await prisma.surfboardPlan.findMany({
      where: { batchId: plan.batchId, deleted: false },
      select: { id: true, [lockedByField]: true, [lockExpiresAtField]: true },
    });

    for (const bp of batchPlans) {
      const bpLock = (bp as any)[lockedByField];
      const bpExpiry = (bp as any)[lockExpiresAtField];
      if (bpLock && bpLock !== userId && bpExpiry && new Date(bpExpiry) > now) {
        throw new ConflictError("Another plan in this batch is being reviewed by another user");
      }
    }

    const batchLockExpiry = new Date(now.getTime() + 3 * batchPlans.length * 60000);
    await prisma.surfboardPlan.updateMany({
      where: { batchId: plan.batchId, deleted: false },
      data: { [lockedByField]: userId, [lockedAtField]: now, [lockExpiresAtField]: batchLockExpiry },
    });
    return { locked: true };
  }

  await prisma.surfboardPlan.update({
    where: { id: planId },
    data: { [lockedByField]: userId, [lockedAtField]: now, [lockExpiresAtField]: lockExpiry },
  });
  return { locked: true };
}

export async function releasePlanLock(
  planId: string,
  role: MDARole,
  userId: string
): Promise<{ released: boolean }> {
  const rolePrefix = getRoleFieldPrefix(role);
  const lockedByField = `${rolePrefix}LockedBy` as any;
  const lockedAtField = `${rolePrefix}LockedAt` as any;
  const lockExpiresAtField = `${rolePrefix}LockExpiresAt` as any;

  if (role === "INTAKE" || role === "RECORDS_II") {
    const plan = await prisma.surfboardPlan.findUnique({ where: { id: planId }, select: { batchId: true } });
    if (plan?.batchId) {
      await prisma.surfboardPlan.updateMany({
        where: { batchId: plan.batchId, [lockedByField]: userId },
        data: { [lockedByField]: null, [lockedAtField]: null, [lockExpiresAtField]: null },
      });
      return { released: true };
    }
  }

  await prisma.surfboardPlan.updateMany({
    where: { id: planId, [lockedByField]: userId },
    data: { [lockedByField]: null, [lockedAtField]: null, [lockExpiresAtField]: null },
  });
  return { released: true };
}

export async function getPlanLockStatus(
  planId: string,
  role: MDARole,
  userId: string
): Promise<{ isLocked: boolean; lockedByMe: boolean; lockedBy: string | null; lockExpiresAt: Date | null }> {
  const now = new Date();
  const rolePrefix = getRoleFieldPrefix(role);
  const lockedByField = `${rolePrefix}LockedBy` as any;
  const lockExpiresAtField = `${rolePrefix}LockExpiresAt` as any;

  const plan = await prisma.surfboardPlan.findUnique({
    where: { id: planId },
    select: { [lockedByField]: true, [lockExpiresAtField]: true },
  });
  if (!plan) throw new NotFoundError("Plan");

  const lockedBy = (plan as any)[lockedByField];
  const lockExpiresAt = (plan as any)[lockExpiresAtField];
  const isLockValid = Boolean(lockExpiresAt && new Date(lockExpiresAt) > now);

  return {
    isLocked: Boolean(lockedBy && isLockValid),
    lockedByMe: lockedBy === userId && isLockValid,
    lockedBy: isLockValid ? lockedBy : null,
    lockExpiresAt: isLockValid ? lockExpiresAt : null,
  };
}

export async function canWorkOnPlan(
  planId: string,
  role: MDARole,
  userId: string
): Promise<{
  allowed: boolean;
  reason?: string;
  oldestAvailablePlanId?: string;
  oldestAvailablePlanNumber?: string;
  oldestAvailableSubmittedAt?: Date;
}> {
  const rolePrefix = getRoleFieldPrefix(role);
  const statusField = `${rolePrefix}Status` as any;
  const lockedByField = `${rolePrefix}LockedBy` as any;
  const lockExpiresAtField = `${rolePrefix}LockExpiresAt` as any;

  const targetPlan = await prisma.surfboardPlan.findUnique({
    where: { id: planId },
    select: { redCopySubmittedAt: true, planNumber: true },
  });
  if (!targetPlan || !targetPlan.redCopySubmittedAt) throw new NotFoundError("Plan (or not yet submitted)");

  const now = new Date();
  const oldestPlan = await prisma.surfboardPlan.findFirst({
    where: {
      redCopyStatus: "SUBMITTED",
      [statusField]: "PENDING",
      deleted: false,
      OR: [{ [lockedByField]: null }, { [lockedByField]: userId }, { [lockExpiresAtField]: { lt: now } }],
    },
    select: { id: true, planNumber: true, redCopySubmittedAt: true },
    orderBy: { redCopySubmittedAt: "asc" },
  });

  // No plans available at all is a valid, non-exceptional state — same
  // response shape as "not the oldest", not a thrown error.
  if (!oldestPlan) {
    return { allowed: false, reason: "No plans available for processing" };
  }

  if (oldestPlan.id === planId) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "Please complete older submissions first",
    oldestAvailablePlanId: oldestPlan.id,
    oldestAvailablePlanNumber: oldestPlan.planNumber,
    oldestAvailableSubmittedAt: oldestPlan.redCopySubmittedAt ?? undefined,
  };
}

export async function releaseAllLocksForUser(role: MDARole, userId: string): Promise<{ releasedCount: number }> {
  const rolePrefix = getRoleFieldPrefix(role);
  const lockedByField = `${rolePrefix}LockedBy` as any;
  const lockedAtField = `${rolePrefix}LockedAt` as any;
  const lockExpiresAtField = `${rolePrefix}LockExpiresAt` as any;

  const result = await prisma.surfboardPlan.updateMany({
    where: { [lockedByField]: userId },
    data: { [lockedByField]: null, [lockedAtField]: null, [lockExpiresAtField]: null },
  });
  return { releasedCount: result.count };
}

const ROLE_SPECIFIC_CRITERIA: Record<MDARole, any> = {
  INTAKE: {
    physicalCopySubmitted: true,
    batch: { paymentStatus: { in: ["LASG_PAID", "ACCOUNTS_APPROVED", "ACCOUNTS_DISAPPROVED", "COMPLETED"] } },
  },
  RECORDS_II: {
    accountsStatus: "APPROVED",
    chartingStatus: "APPROVED",
    surconStatus: "APPROVED",
    recordsIStatus: "APPROVED",
    intakeStatus: "APPROVED",
    batch: { paymentStatus: { in: ["LASG_PAID", "ACCOUNTS_APPROVED", "ACCOUNTS_DISAPPROVED", "COMPLETED"] } },
  },
  RECORDS_I: { batch: { paymentStatus: { in: ["LASG_PAID", "ACCOUNTS_APPROVED", "ACCOUNTS_DISAPPROVED", "COMPLETED"] } } },
  SURCON: { batch: { paymentStatus: { in: ["LASG_PAID", "ACCOUNTS_APPROVED", "ACCOUNTS_DISAPPROVED", "COMPLETED"] } } },
  CHARTING: { batch: { paymentStatus: { in: ["LASG_PAID", "ACCOUNTS_APPROVED", "ACCOUNTS_DISAPPROVED", "COMPLETED"] } } },
  ACCOUNTS: {},
  ARCHIVE: {},
  MDA_SUPERADMIN: {},
};

export async function getAndLockOldestAvailablePlan(
  role: MDARole,
  userId: string
): Promise<{ planId: string | null; planNumber: string | null; locked: boolean; lockExpiresAt: Date | null }> {
  const now = new Date();
  const lockExpiry = new Date(now.getTime() + LOCK_DURATION_MINUTES * 60000);

  const rolePrefix = getRoleFieldPrefix(role);
  const statusField = `${rolePrefix}Status` as any;
  const lockedByField = `${rolePrefix}LockedBy` as any;
  const lockedAtField = `${rolePrefix}LockedAt` as any;
  const lockExpiresAtField = `${rolePrefix}LockExpiresAt` as any;

  const existingLock = await prisma.surfboardPlan.findFirst({
    where: { [lockedByField]: userId, [lockExpiresAtField]: { gt: now }, deleted: false },
    select: { id: true, planNumber: true, [lockExpiresAtField]: true },
  });
  if (existingLock) {
    return {
      planId: existingLock.id,
      planNumber: existingLock.planNumber,
      locked: true,
      lockExpiresAt: (existingLock as any)[lockExpiresAtField],
    };
  }

  const availablePlan = await prisma.surfboardPlan.findFirst({
    where: {
      redCopyStatus: "SUBMITTED",
      [statusField]: "PENDING",
      deleted: false,
      ...ROLE_SPECIFIC_CRITERIA[role],
      OR: [{ [lockedByField]: null }, { [lockExpiresAtField]: { lt: now } }],
    },
    select: { id: true, planNumber: true },
    orderBy: role === "INTAKE" ? { physicalCopySubmittedAt: "asc" } : { redCopySubmittedAt: "asc" },
  });

  if (!availablePlan) {
    return { planId: null, planNumber: null, locked: false, lockExpiresAt: null };
  }

  const lockResult = await prisma.surfboardPlan.updateMany({
    where: {
      id: availablePlan.id,
      OR: [{ [lockedByField]: null }, { [lockedByField]: userId }, { [lockExpiresAtField]: { lt: now } }],
    },
    data: { [lockedByField]: userId, [lockedAtField]: now, [lockExpiresAtField]: lockExpiry },
  });

  if (lockResult.count === 0) {
    // Another user grabbed it between the find and the update — retry.
    return getAndLockOldestAvailablePlan(role, userId);
  }

  return { planId: availablePlan.id, planNumber: availablePlan.planNumber, locked: true, lockExpiresAt: lockExpiry };
}

// ---------------------------------------------------------------------------
// Batch-level locking (ACCOUNTS / INTAKE / RECORDS_II) — locks every eligible
// plan in the oldest ready batch atomically. Kept as three near-identical
// functions rather than one parametrized one to preserve each stage's
// distinct eligibility criteria and lock-duration formula exactly as-is.
// ---------------------------------------------------------------------------

type BatchLockResult = {
  batchId: string | null;
  batchCode: string | null;
  planCount: number;
  locked: boolean;
  lockExpiresAt: Date | null;
};

export async function getAndLockBatchForAccounts(userId: string): Promise<BatchLockResult> {
  const now = new Date();
  const lockExpiry = new Date(now.getTime() + 3 * 60000);

  const existingLock = await prisma.surfboardPlan.findFirst({
    where: { accountsLockedBy: userId, accountsLockExpiresAt: { gt: now }, deleted: false },
    select: { id: true, batchId: true, accountsLockExpiresAt: true, batch: { select: { id: true, batchCode: true } } },
  });
  if (existingLock && existingLock.batch) {
    const lockedCount = await prisma.surfboardPlan.count({
      where: { batchId: existingLock.batchId!, accountsLockedBy: userId, accountsLockExpiresAt: { gt: now }, deleted: false },
    });
    return {
      batchId: existingLock.batch.id,
      batchCode: existingLock.batch.batchCode,
      planCount: lockedCount,
      locked: true,
      lockExpiresAt: existingLock.accountsLockExpiresAt,
    };
  }

  const availableBatch = await prisma.certificateOfDepositBatch.findFirst({
    where: {
      plans: {
        some: {
          deleted: false,
          accountsStatus: "PENDING",
          OR: [{ accountsLockedBy: null }, { accountsLockExpiresAt: { lt: now } }],
        },
      },
      paymentStatus: { in: ["LASG_PAID", "ACCOUNTS_APPROVED", "ACCOUNTS_DISAPPROVED", "COMPLETED"] },
    },
    include: {
      plans: {
        where: {
          deleted: false,
          accountsStatus: "PENDING",
          OR: [{ accountsLockedBy: null }, { accountsLockExpiresAt: { lt: now } }],
        },
        select: { id: true },
      },
    },
    orderBy: [{ userPaymentDate: "asc" }, { createdAt: "asc" }],
  });

  if (!availableBatch || availableBatch.plans.length === 0) {
    return { batchId: null, batchCode: null, planCount: 0, locked: false, lockExpiresAt: null };
  }

  const planIdsToLock = availableBatch.plans.map((p) => p.id);
  const lockResult = await prisma.surfboardPlan.updateMany({
    where: {
      id: { in: planIdsToLock },
      OR: [{ accountsLockedBy: null }, { accountsLockedBy: userId }, { accountsLockExpiresAt: { lt: now } }],
    },
    data: { accountsLockedBy: userId, accountsLockedAt: now, accountsLockExpiresAt: lockExpiry },
  });

  if (lockResult.count === 0) return getAndLockBatchForAccounts(userId);

  return { batchId: availableBatch.id, batchCode: availableBatch.batchCode, planCount: lockResult.count, locked: true, lockExpiresAt: lockExpiry };
}

export async function releaseBatchLockForAccounts(userId: string): Promise<{ success: true }> {
  await prisma.surfboardPlan.updateMany({
    where: { accountsLockedBy: userId },
    data: { accountsLockedBy: null, accountsLockedAt: null, accountsLockExpiresAt: null },
  });
  return { success: true };
}

export async function getAndLockBatchForIntake(userId: string): Promise<BatchLockResult> {
  const now = new Date();

  const existingLock = await prisma.surfboardPlan.findFirst({
    where: { intakeLockedBy: userId, intakeLockExpiresAt: { gt: now }, deleted: false },
    select: { id: true, batchId: true, intakeLockExpiresAt: true, batch: { select: { id: true, batchCode: true } } },
  });
  if (existingLock && existingLock.batch) {
    const lockedCount = await prisma.surfboardPlan.count({
      where: { batchId: existingLock.batchId!, intakeLockedBy: userId, intakeLockExpiresAt: { gt: now }, deleted: false },
    });
    return {
      batchId: existingLock.batch.id,
      batchCode: existingLock.batch.batchCode,
      planCount: lockedCount,
      locked: true,
      lockExpiresAt: existingLock.intakeLockExpiresAt,
    };
  }

  const availableBatch = await prisma.certificateOfDepositBatch.findFirst({
    where: {
      plans: {
        some: {
          redCopyStatus: "SUBMITTED",
          deleted: false,
          physicalCopySubmitted: true,
          intakeStatus: "PENDING",
          OR: [{ intakeLockedBy: null }, { intakeLockExpiresAt: { lt: now } }],
        },
      },
      paymentStatus: { in: ["LASG_PAID", "ACCOUNTS_APPROVED", "ACCOUNTS_DISAPPROVED", "COMPLETED"] },
    },
    include: {
      plans: {
        where: {
          redCopyStatus: "SUBMITTED",
          deleted: false,
          physicalCopySubmitted: true,
          intakeStatus: "PENDING",
          OR: [{ intakeLockedBy: null }, { intakeLockExpiresAt: { lt: now } }],
        },
        select: { id: true, physicalCopySubmittedAt: true },
        orderBy: { physicalCopySubmittedAt: "asc" },
      },
    },
  });

  if (!availableBatch || availableBatch.plans.length === 0) {
    return { batchId: null, batchCode: null, planCount: 0, locked: false, lockExpiresAt: null };
  }

  const planCount = availableBatch.plans.length;
  const lockExpiresAt = new Date(now.getTime() + planCount * 3 * 60000);
  const planIdsToLock = availableBatch.plans.map((p) => p.id);

  await prisma.surfboardPlan.updateMany({
    where: { id: { in: planIdsToLock } },
    data: { intakeLockedBy: userId, intakeLockedAt: now, intakeLockExpiresAt: lockExpiresAt },
  });

  return { batchId: availableBatch.id, batchCode: availableBatch.batchCode, planCount, locked: true, lockExpiresAt };
}

export async function releaseBatchLockForIntake(userId: string): Promise<{ success: true }> {
  await prisma.surfboardPlan.updateMany({
    where: { intakeLockedBy: userId },
    data: { intakeLockedBy: null, intakeLockedAt: null, intakeLockExpiresAt: null },
  });
  return { success: true };
}

export async function getAndLockBatchForRecordsII(userId: string): Promise<BatchLockResult> {
  const now = new Date();

  const existingLock = await prisma.surfboardPlan.findFirst({
    where: { recordsIILockedBy: userId, recordsIILockExpiresAt: { gt: now }, deleted: false },
    select: { id: true, batchId: true, recordsIILockExpiresAt: true, batch: { select: { id: true, batchCode: true } } },
  });
  if (existingLock && existingLock.batch) {
    const lockedCount = await prisma.surfboardPlan.count({
      where: { batchId: existingLock.batchId!, recordsIILockedBy: userId, recordsIILockExpiresAt: { gt: now }, deleted: false },
    });
    return {
      batchId: existingLock.batch.id,
      batchCode: existingLock.batch.batchCode,
      planCount: lockedCount,
      locked: true,
      lockExpiresAt: existingLock.recordsIILockExpiresAt,
    };
  }

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
          OR: [{ recordsIILockedBy: null }, { recordsIILockExpiresAt: { lt: now } }],
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
          OR: [{ recordsIILockedBy: null }, { recordsIILockExpiresAt: { lt: now } }],
        },
        select: { id: true, intakeApprovedAt: true },
        orderBy: { intakeApprovedAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!availableBatch || availableBatch.plans.length === 0) {
    return { batchId: null, batchCode: null, planCount: 0, locked: false, lockExpiresAt: null };
  }

  const planCount = availableBatch.plans.length;
  const lockExpiry = new Date(now.getTime() + RECORDS_II_LOCK_MINUTES_PER_PLAN * planCount * 60000);
  const planIds = availableBatch.plans.map((p) => p.id);

  const lockResult = await prisma.surfboardPlan.updateMany({
    where: {
      id: { in: planIds },
      OR: [{ recordsIILockedBy: null }, { recordsIILockedBy: userId }, { recordsIILockExpiresAt: { lt: now } }],
    },
    data: { recordsIILockedBy: userId, recordsIILockedAt: now, recordsIILockExpiresAt: lockExpiry },
  });

  if (lockResult.count === 0) return getAndLockBatchForRecordsII(userId);

  return { batchId: availableBatch.id, batchCode: availableBatch.batchCode, planCount: lockResult.count, locked: true, lockExpiresAt: lockExpiry };
}

export async function releaseBatchLockForRecordsII(userId: string): Promise<{ releasedCount: number }> {
  const result = await prisma.surfboardPlan.updateMany({
    where: { recordsIILockedBy: userId },
    data: { recordsIILockedBy: null, recordsIILockedAt: null, recordsIILockExpiresAt: null },
  });
  return { releasedCount: result.count };
}
