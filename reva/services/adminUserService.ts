import prisma from "@/lib/prisma";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { sendMail, sendEmailToAllSuperAdmins } from "@/utils/email";
import { notifySystemAlert } from "@/reva/services/notificationService";

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

export async function createAdminUser(data: {
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "SUPERADMIN";
}) {
  assertNotDevAccount(data.email);

  const existingUser = await prisma.revaUser.findUnique({ where: { email: data.email } });
  if (existingUser) throw new ConflictError("User with this email already exists");

  const newUser = await prisma.revaUser.create({
    data: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      emailVerified: true,
      is_active: true,
      kindeId: `REVA_ADMIN_KINDE_ID_${Date.now()}__${Math.random().toString(36).substring(2, 11)}`,
    },
  });

  try {
    await notifySystemAlert(
      "Admin User Created",
      `A new ${data.role} (${data.firstName} ${data.lastName}, ${data.email}) was created by a superadmin. You can manage admin users in the Super Admin dashboard.`
    );
    await sendEmailToAllSuperAdmins({
      subject: `REVA: New ${data.role} Created`,
      text: `A new ${data.role} (${data.firstName} ${data.lastName}, ${data.email}) was created by a superadmin.`,
      html: `<p>A new <b>${data.role}</b> (<b>${data.firstName} ${data.lastName}</b>, <b>${data.email}</b>) was created by a superadmin.<br>You can manage admin users in the Super Admin dashboard.</p>`,
    });
    await sendMail({
      to: data.email,
      subject: `REVA: Your ${data.role} account has been created`,
      text: `Hello ${data.firstName},\n\nCongratulations! Your account has been created as a ${data.role} on the REVA platform. You now have access to admin features.`,
      html: `<p>Hello <b>${data.firstName}</b>,<br><br>Congratulations! Your account has been created as a <b>${data.role}</b> on the REVA platform. You now have access to admin features.<br><br>Best regards,<br>The REVA Team</p>`,
    });
  } catch (error) {
    console.warn("[adminUserService] notification/email for admin creation failed:", error);
  }

  return {
    id: newUser.id,
    email: newUser.email,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    role: newUser.role,
  };
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

export async function makeUserAdmin(userId: string, role: "ADMIN" | "SUPERADMIN") {
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

export async function removeAdminPrivileges(userId: string) {
  const user = await prisma.revaUser.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");
  assertNotDevAccount(user.email);

  if (user.role === "USER") throw new ValidationError({ role: "User is not an admin" });

  return prisma.revaUser.update({ where: { id: userId }, data: { role: "USER" } });
}

export async function deactivateUser(userId: string) {
  const user = await prisma.revaUser.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");
  assertNotDevAccount(user.email);

  if (!user.is_active) throw new ConflictError("User is already deactivated");

  return prisma.revaUser.update({ where: { id: userId }, data: { is_active: false } });
}

export async function reactivateUser(userId: string) {
  const user = await prisma.revaUser.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");
  assertNotDevAccount(user.email);

  if (user.is_active) throw new ConflictError("User is already active");

  return prisma.revaUser.update({ where: { id: userId }, data: { is_active: true } });
}

export async function deleteUser(userId: string) {
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
}
