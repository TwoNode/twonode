import prisma from "@/lib/prisma";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { sendMail, sendEmailToAllSuperAdmins } from "@/utils/email";
import { writeAudit } from "@/lib/audit";
import { Platform } from "@/utils/platform";
import { notifySystemAlert } from "@/reva/services/notificationService";
import { paginatedResult } from "@/lib/api/pagination";

/**
 * Migrated from reva-restricted/actions/adminDbActions.ts's
 * "NEW REVAUSER-BASED ADMIN MANAGEMENT FUNCTIONS" section.
 * verifyRevaSuperAdminPermissions folds into withAuth's role check at the
 * route layer. The source's `email === process.env.DEV_EMAIL` guard on
 * every mutation is preserved as-is (protects the dev/seed account from
 * being demoted/deactivated/deleted through the admin UI).
 */

function assertNotDevAccount(email: string) {
  if (process.env.DEV_EMAIL && email === process.env.DEV_EMAIL) {
    throw new ForbiddenError();
  }
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Admins are no longer created directly: a superadmin invites them
 * (lib/auth/adminInvitations.ts) and the account appears when they accept.
 * This is the team notification createAdminUser used to send, now fired at
 * that moment. The invitation email replaces the old "account created" mail.
 */
export async function announceAdminJoined(data: { email: string; firstName: string; lastName: string; role: string }) {
  const name = `${data.firstName} ${data.lastName}`.trim();
  try {
    await notifySystemAlert(
      "Admin User Joined",
      `A new ${data.role} (${name}, ${data.email}) accepted their invitation and joined. You can manage admin users in the Super Admin dashboard.`
    );
    await sendEmailToAllSuperAdmins({
      subject: `REVA: New ${data.role} Joined`,
      text: `A new ${data.role} (${name}, ${data.email}) accepted their invitation and joined.`,
      html: `<p>A new <b>${escapeHtml(data.role)}</b> (<b>${escapeHtml(name)}</b>, <b>${escapeHtml(data.email)}</b>) accepted their invitation and joined.<br>You can manage admin users in the Super Admin dashboard.</p>`,
    });
  } catch (error) {
    console.warn("[adminUserService] notification/email for admin joining failed:", error);
  }
}

export async function getAllAdminUsers() {
  return prisma.revaUser.findMany({
    where: {
      role: { in: ["ADMIN", "SUPERADMIN"] },
      email: { not: process.env.DEV_EMAIL },
    },
    include: { _count: { select: { properties: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllUsers() {
  const allUsers = await prisma.revaUser.findMany({
    where: { email: { not: process.env.DEV_EMAIL } },
    include: { _count: { select: { properties: true } } },
    orderBy: { createdAt: "desc" },
  });

  const admins = allUsers.filter((user) => user.role === "ADMIN" || user.role === "SUPERADMIN");
  const regularUsers = allUsers.filter((user) => user.role === "USER");

  return { allUsers, admins, regularUsers };
}

export interface GetAllUsersPaginatedParams {
  page: number;
  pageSize: number;
  scope?: "all" | "admins" | "users";
  search?: string;
}

/**
 * Paginated/searchable sibling of getAllUsers()/getAllAdminUsers() — those
 * two stay as-is (getAllUsers() also feeds UserRoleManagementForm's
 * full-roster dropdown, which needs every user, not one page of them).
 */
export async function getAllUsersPaginated(params: GetAllUsersPaginatedParams) {
  const { page, pageSize, scope, search } = params;

  const where: any = { email: { not: process.env.DEV_EMAIL } };
  if (scope === "admins") where.role = { in: ["ADMIN", "SUPERADMIN"] };
  if (scope === "users") where.role = "USER";
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.revaUser.findMany({
      where,
      include: { _count: { select: { properties: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.revaUser.count({ where }),
  ]);

  return paginatedResult(rows, total, page, pageSize);
}

export async function makeUserAdmin(actorId: string, userId: string, role: "ADMIN" | "SUPERADMIN") {
  const user = await prisma.revaUser.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");
  assertNotDevAccount(user.email);

  if (user.role === "ADMIN" || user.role === "SUPERADMIN") {
    throw new ConflictError("User is already an admin");
  }

  const updatedUser = await prisma.revaUser.update({
    where: { id: userId },
    data: { role, is_active: true },
  });

  await writeAudit(Platform.REVA, {
    userId: actorId,
    action: "PROMOTE_TO_ADMIN",
    entity: "RevaUser",
    entityId: userId,
    changes: { before: { role: user.role }, after: { role }, userEmail: user.email },
  });

  try {
    await notifySystemAlert(
      "User Promoted to Admin",
      `User ${user.firstName || ""} ${user.lastName || ""} (${user.email}) was promoted to ${role} by a superadmin. You can manage admin users in the Super Admin dashboard.`
    );
    await sendEmailToAllSuperAdmins({
      subject: `REVA: User Promoted to ${role}`,
      text: `User ${user.firstName || ""} ${user.lastName || ""} (${user.email}) was promoted to ${role} by a superadmin.`,
      html: `<p>User <b>${user.firstName || ""} ${user.lastName || ""}</b> (<b>${user.email}</b>) was promoted to <b>${role}</b> by a superadmin.<br>You can manage admin users in the Super Admin dashboard.</p>`,
    });
    await sendMail({
      to: user.email,
      subject: `REVA: You have been promoted to ${role}`,
      text: `Hello ${user.firstName || ""},\n\nCongratulations! You have been promoted to ${role} on the REVA platform. You now have access to admin features.`,
      html: `<p>Hello <b>${user.firstName || ""}</b>,<br><br>Congratulations! You have been promoted to <b>${role}</b> on the REVA platform. You now have access to admin features.<br><br>Best regards,<br>The REVA Team</p>`,
    });
  } catch (error) {
    console.warn("[adminUserService] notification/email for admin promotion failed:", error);
  }

  return updatedUser;
}

export async function removeAdminPrivileges(actorId: string, userId: string) {
  const user = await prisma.revaUser.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");
  assertNotDevAccount(user.email);

  if (user.role === "USER") throw new ValidationError({ role: "User is not an admin" });

  const updated = await prisma.revaUser.update({ where: { id: userId }, data: { role: "USER" } });

  await writeAudit(Platform.REVA, {
    userId: actorId,
    action: "REMOVE_ADMIN_PRIVILEGES",
    entity: "RevaUser",
    entityId: userId,
    changes: { before: { role: user.role }, after: { role: "USER" }, userEmail: user.email },
  });

  return updated;
}

export async function deactivateUser(actorId: string, userId: string) {
  const user = await prisma.revaUser.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");
  assertNotDevAccount(user.email);

  if (!user.is_active) throw new ConflictError("User is already deactivated");

  const updated = await prisma.revaUser.update({ where: { id: userId }, data: { is_active: false } });

  await writeAudit(Platform.REVA, {
    userId: actorId,
    action: "DEACTIVATE_USER",
    entity: "RevaUser",
    entityId: userId,
    changes: { isActive: false, userEmail: user.email },
  });

  return updated;
}

export async function reactivateUser(actorId: string, userId: string) {
  const user = await prisma.revaUser.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");
  assertNotDevAccount(user.email);

  if (user.is_active) throw new ConflictError("User is already active");

  const updated = await prisma.revaUser.update({ where: { id: userId }, data: { is_active: true } });

  await writeAudit(Platform.REVA, {
    userId: actorId,
    action: "ACTIVATE_USER",
    entity: "RevaUser",
    entityId: userId,
    changes: { isActive: true, userEmail: user.email },
  });

  return updated;
}

export async function deleteUser(actorId: string, userId: string) {
  const user = await prisma.revaUser.findUnique({
    where: { id: userId },
    include: { _count: { select: { properties: true } } },
  });
  if (!user) throw new NotFoundError("User");
  assertNotDevAccount(user.email);

  if (user._count.properties > 0) {
    throw new ConflictError(
      `Cannot delete user with ${user._count.properties} associated properties. Please reassign or delete the properties first.`
    );
  }

  await prisma.revaUser.delete({ where: { id: userId } });

  await writeAudit(Platform.REVA, {
    userId: actorId,
    action: "DELETE_USER",
    entity: "RevaUser",
    entityId: userId,
    changes: { userEmail: user.email, role: user.role },
  });
}
