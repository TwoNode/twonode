import prisma from "@/lib/prisma";
import { SurfboardRole } from "@/prisma/generated";
import { ForbiddenError, NotFoundError, ConflictError } from "@/lib/api/errors";
import {
  logAuditAction,
  createChangeLog,
  formatChanges,
} from "@/app/(projects)/(surfboard)/utils/auditLogger";
import { paginatedResult } from "@/lib/api/pagination";
import { activeSubscriptionWhereClause } from "@/surfboard/services/subscriptionService";
import { EXPIRING_SOON_WINDOW_DAYS } from "@/surfboard/utils/subscriptionExpiry";

/**
 * Who is performing an admin action. The audit log's `userId` is defined as
 * "user who performed the action", so it must always be this and never the
 * account being changed.
 */
export interface AdminActor {
  id: string;
  role: SurfboardRole;
}

/** Matches user-management/page.tsx's admin-vs-MDA tab split. */
const ADMIN_TAB_ROLES: SurfboardRole[] = ["ADMIN", "SUPERADMIN"];
const MDA_TAB_ROLES: SurfboardRole[] = [
  "RECORDS_I",
  "INTAKE",
  "RECORDS_II",
  "ACCOUNTS",
  "CHARTING",
  "SURCON",
  "ARCHIVE",
  "MDA_SUPERADMIN",
];

export interface GetAllUsersParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  search?: string;
  roleGroup?: "admins" | "mda" | "all";
  role?: string;
  status?: "active" | "inactive";
  subscriptionStatus?: "expired" | "expiring_soon" | "active";
}

/**
 * Migrated from app/(projects)/(surfboard)/actions/adminActions.ts. Broad
 * ADMIN/SUPERADMIN access folds into withAuth's role check at the route
 * layer; the finer SUPERADMIN-only rules within some of these functions
 * (role changes, admin-account status changes, subscription mutations) stay
 * here, gated on an explicit `callerRole` param, same as every other
 * product's admin service. getCurrentUserRole/getUserById/deleteUser were
 * confirmed dead (zero real callers) and not migrated.
 */

export async function getAllUsers(
  callerRole: SurfboardRole,
  params: GetAllUsersParams
) {
  const where: NonNullable<
    Parameters<typeof prisma.surfboardUser.findMany>[0]
  >["where"] = {};
  if (params.roleGroup === "mda") {
    where.role = { in: MDA_TAB_ROLES };
  } else if (params.roleGroup !== "all") {
    where.role = { in: ADMIN_TAB_ROLES };
  }
  if (params.role && params.role !== "all") {
    where.role = params.role as SurfboardRole;
  }
  if (params.status === "active") where.isActive = true;
  if (params.status === "inactive") where.isActive = false;
  if (params.subscriptionStatus === "active") {
    where.subscription = { some: activeSubscriptionWhereClause() };
  }
  if (params.subscriptionStatus === "expired") {
    where.subscription = { some: { currentEnd: { lt: new Date() } } };
  }
  if (params.subscriptionStatus === "expiring_soon") {
    const now = new Date();
    const soon = new Date(
      now.getTime() + EXPIRING_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );
    where.subscription = { some: { currentEnd: { gte: now, lte: soon } } };
  }
  if (params.search) {
    where.OR = [
      { firstName: { contains: params.search, mode: "insensitive" } },
      { lastName: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
      { companyName: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.surfboardUser.count({ where }),
    prisma.surfboardUser.findMany({
      where,
      include: {
        subscription: { take: 1, orderBy: { createdAt: "desc" } },
        _count: { select: { plans: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    }),
  ]);

  const data = users.map((user) => ({
    id: user.id,
    kindeId: user.kindeId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    companyName: user.companyName,
    surconRegNumber: user.surconRegNumber,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    plansCount: user._count.plans,
    // ADMINs can only see subscriptions for USER role accounts
    subscription:
      callerRole === "ADMIN" && user.role !== "USER"
        ? null
        : user.subscription[0] || null,
  }));

  return paginatedResult(data, total, params.page, params.pageSize);
}

export async function getUserStats() {
  const now = new Date();
  const expiringSoonCutoff = new Date(
    now.getTime() + EXPIRING_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const [
    totalUsers,
    activeUsers,
    admins,
    superAdmins,
    usersWithSubscriptions,
    expiredSubscriptions,
    expiringSoonSubscriptions,
  ] = await Promise.all([
    prisma.surfboardUser.count(),
    prisma.surfboardUser.count({ where: { isActive: true } }),
    prisma.surfboardUser.count({ where: { role: "ADMIN" } }),
    prisma.surfboardUser.count({ where: { role: "SUPERADMIN" } }),
    prisma.subscription.count({ where: activeSubscriptionWhereClause(now) }),
    prisma.subscription.count({ where: { currentEnd: { lt: now } } }),
    prisma.subscription.count({
      where: { currentEnd: { gte: now, lte: expiringSoonCutoff } },
    }),
  ]);

  return {
    totalUsers,
    activeUsers,
    inactiveUsers: totalUsers - activeUsers,
    admins,
    superAdmins,
    regularUsers: totalUsers - admins - superAdmins,
    usersWithActiveSubscriptions: usersWithSubscriptions,
    expiredSubscriptions,
    expiringSoonSubscriptions,
  };
}

export async function updateUserRole(
  actor: AdminActor,
  userId: string,
  newRole: SurfboardRole
) {
  if (actor.role === "ADMIN") throw new ForbiddenError();

  const targetUser = await prisma.surfboardUser.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  });
  if (!targetUser) throw new NotFoundError("User");

  const updatedUser = await prisma.surfboardUser.update({
    where: { id: userId },
    data: { role: newRole },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  await logAuditAction({
    userId: actor.id,
    action: "UPDATE_USER_ROLE",
    entity: "SurfboardUser",
    entityId: userId,
    changes: {
      ...formatChanges({ role: targetUser.role }, { role: newRole }),
      userEmail: targetUser.email,
    },
  });

  return updatedUser;
}

export async function updateUserStatus(
  actor: AdminActor,
  userId: string,
  isActive: boolean
) {
  const targetUser = await prisma.surfboardUser.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  });
  if (!targetUser) throw new NotFoundError("User");

  if (
    actor.role === "ADMIN" &&
    (targetUser.role === "ADMIN" || targetUser.role === "SUPERADMIN")
  ) {
    throw new ForbiddenError();
  }

  const updatedUser = await prisma.surfboardUser.update({
    where: { id: userId },
    data: { isActive },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
    },
  });

  await logAuditAction({
    userId: actor.id,
    action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
    entity: "SurfboardUser",
    entityId: userId,
    changes: createChangeLog({ isActive, userEmail: targetUser.email }),
  });

  return updatedUser;
}

export async function updateUserSubscription(
  actorId: string,
  input: {
    userId: string;
    planCode: string;
    planName: string;
    amount: number;
    interval: string;
    status: string;
    currentEnd?: Date | string | null;
  }
) {
  const { userId, planCode, planName, amount, interval, status, currentEnd } =
    input;

  const user = await prisma.surfboardUser.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) throw new NotFoundError("User");

  const existingSubscription = await prisma.subscription.findUnique({
    where: { userId },
  });
  const currentEndDate = currentEnd ? new Date(currentEnd) : null;

  const subscription = existingSubscription
    ? await prisma.subscription.update({
        where: { userId },
        data: {
          planCode,
          planName,
          amount,
          interval,
          status,
          currentEnd: currentEndDate,
          updatedAt: new Date(),
        },
      })
    : await prisma.subscription.create({
        data: {
          userId,
          email: user.email,
          planCode,
          planName,
          amount,
          interval,
          status,
          currentEnd: currentEndDate,
          currency: "NGN",
          platform: "surfboard",
        },
      });

  const snapshot = (s: {
    planCode: string;
    planName: string;
    amount: number;
    interval: string;
    status: string;
    currentEnd: Date | null;
  }) => ({
    planCode: s.planCode,
    planName: s.planName,
    amount: s.amount,
    interval: s.interval,
    status: s.status,
    currentEnd: s.currentEnd,
  });
  await logAuditAction({
    userId: actorId,
    action: "UPDATE_USER_SUBSCRIPTION",
    entity: "Subscription",
    entityId: subscription.id,
    changes: {
      ...formatChanges(
        existingSubscription ? snapshot(existingSubscription) : null,
        snapshot(subscription)
      ),
      subscriberId: userId,
      userEmail: user.email,
      created: !existingSubscription,
    },
  });

  return { subscription, created: !existingSubscription };
}

export async function cancelUserSubscription(actorId: string, userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });
  if (!subscription) throw new NotFoundError("Subscription");

  const cancelled = await prisma.subscription.update({
    where: { userId },
    data: { status: "canceled", cancelledAt: new Date() },
  });

  await logAuditAction({
    userId: actorId,
    action: "CANCEL_USER_SUBSCRIPTION",
    entity: "Subscription",
    entityId: subscription.id,
    changes: {
      ...formatChanges({ status: subscription.status }, { status: "canceled" }),
      subscriberId: userId,
      userEmail: subscription.email,
    },
  });

  return cancelled;
}

export async function promoteToAdmin(actorId: string, userId: string) {
  const targetUser = await prisma.surfboardUser.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  });
  if (!targetUser) throw new NotFoundError("User");

  const promoted = await prisma.surfboardUser.update({
    where: { id: userId },
    data: { role: "ADMIN" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  await logAuditAction({
    userId: actorId,
    action: "PROMOTE_TO_ADMIN",
    entity: "SurfboardUser",
    entityId: userId,
    changes: {
      ...formatChanges({ role: targetUser.role }, { role: "ADMIN" }),
      userEmail: targetUser.email,
    },
  });

  return promoted;
}
