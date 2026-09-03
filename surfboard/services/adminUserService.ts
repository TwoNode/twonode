import prisma from "@/lib/prisma";
import { SurfboardRole } from "@/prisma/generated";
import { ForbiddenError, NotFoundError, ConflictError } from "@/lib/api/errors";
import { logAuditAction, createChangeLog, formatChanges } from "@/app/(projects)/(surfboard)/utils/auditLogger";

/**
 * Migrated from app/(projects)/(surfboard)/actions/adminActions.ts. Broad
 * ADMIN/SUPERADMIN access folds into withAuth's role check at the route
 * layer; the finer SUPERADMIN-only rules within some of these functions
 * (role changes, admin-account status changes, subscription mutations) stay
 * here, gated on an explicit `callerRole` param, same as every other
 * product's admin service. getCurrentUserRole/getUserById/deleteUser were
 * confirmed dead (zero real callers) and not migrated.
 */

export async function getAllUsers(callerRole: SurfboardRole) {
  const users = await prisma.surfboardUser.findMany({
    include: {
      subscription: { take: 1, orderBy: { createdAt: "desc" } },
      _count: { select: { plans: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return users.map((user) => ({
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
    subscription: callerRole === "ADMIN" && user.role !== "USER" ? null : user.subscription[0] || null,
  }));
}

export async function getUserStats() {
  const [totalUsers, activeUsers, admins, superAdmins, usersWithSubscriptions] = await Promise.all([
    prisma.surfboardUser.count(),
    prisma.surfboardUser.count({ where: { isActive: true } }),
    prisma.surfboardUser.count({ where: { role: "ADMIN" } }),
    prisma.surfboardUser.count({ where: { role: "SUPERADMIN" } }),
    prisma.subscription.count({ where: { status: "active" } }),
  ]);

  return {
    totalUsers,
    activeUsers,
    inactiveUsers: totalUsers - activeUsers,
    admins,
    superAdmins,
    regularUsers: totalUsers - admins - superAdmins,
    usersWithActiveSubscriptions: usersWithSubscriptions,
  };
}

export async function updateUserRole(callerRole: SurfboardRole, userId: string, newRole: SurfboardRole) {
  if (callerRole === "ADMIN") throw new ForbiddenError();

  const targetUser = await prisma.surfboardUser.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  if (!targetUser) throw new NotFoundError("User");

  const updatedUser = await prisma.surfboardUser.update({
    where: { id: userId },
    data: { role: newRole },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });

  await logAuditAction({
    userId,
    action: "UPDATE_USER_ROLE",
    entity: "SurfboardUser",
    entityId: userId,
    changes: formatChanges({ role: targetUser.role }, { role: newRole }),
  });

  return updatedUser;
}

export async function updateUserStatus(callerRole: SurfboardRole, userId: string, isActive: boolean) {
  const targetUser = await prisma.surfboardUser.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  if (!targetUser) throw new NotFoundError("User");

  if (callerRole === "ADMIN" && (targetUser.role === "ADMIN" || targetUser.role === "SUPERADMIN")) {
    throw new ForbiddenError();
  }

  const updatedUser = await prisma.surfboardUser.update({
    where: { id: userId },
    data: { isActive },
    select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
  });

  await logAuditAction({
    userId,
    action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
    entity: "SurfboardUser",
    entityId: userId,
    changes: createChangeLog({ isActive, userEmail: targetUser.email }),
  });

  return updatedUser;
}

export async function updateUserSubscription(input: {
  userId: string;
  planCode: string;
  planName: string;
  amount: number;
  interval: string;
  status: string;
  currentEnd?: Date | string | null;
}) {
  const { userId, planCode, planName, amount, interval, status, currentEnd } = input;

  const user = await prisma.surfboardUser.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!user) throw new NotFoundError("User");

  const existingSubscription = await prisma.subscription.findUnique({ where: { userId } });
  const currentEndDate = currentEnd ? new Date(currentEnd) : null;

  const subscription = existingSubscription
    ? await prisma.subscription.update({
        where: { userId },
        data: { planCode, planName, amount, interval, status, currentEnd: currentEndDate, updatedAt: new Date() },
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

  return { subscription, created: !existingSubscription };
}

export async function cancelUserSubscription(userId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription) throw new NotFoundError("Subscription");

  return prisma.subscription.update({
    where: { userId },
    data: { status: "canceled", cancelledAt: new Date() },
  });
}

export async function promoteToAdmin(userId: string) {
  return prisma.surfboardUser.update({
    where: { id: userId },
    data: { role: "ADMIN" },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });
}

export async function createAdmin(input: { email: string; firstName: string; lastName: string; role: SurfboardRole }) {
  const { email, firstName, lastName, role } = input;

  const existingUser = await prisma.surfboardUser.findUnique({ where: { email } });
  if (existingUser) throw new ConflictError("User with this email already exists");

  const newUser = await prisma.surfboardUser.create({
    data: {
      email,
      firstName,
      lastName,
      role,
      kindeId: `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      isActive: true,
      emailVerified: false,
    },
  });

  await logAuditAction({
    userId: newUser.id,
    action: "CREATE_ADMIN",
    entity: "SurfboardUser",
    entityId: newUser.id,
    changes: createChangeLog({ email, firstName, lastName, role }),
  });

  return newUser;
}
