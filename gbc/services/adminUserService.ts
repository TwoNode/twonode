import prisma from "@/lib/prisma";
import { ConflictError, ForbiddenError } from "@/lib/api/errors";
import type { GBCRole } from "@/prisma/generated";
import { paginatedResult } from "@/lib/api/pagination";

/**
 * Migrated from admin-actions.ts — the live, better-designed admin-user
 * implementation over its two dead duplicates (user-actions.ts,
 * contact-actions.ts's "USER MANAGEMENT" tail — see phase-4-gbc.md).
 * checkAuthorization()'s Kinde-session lookup is superseded entirely by
 * withAuth<GBCRole> at the route layer; self-demotion/self-deletion/
 * self-deactivation guards (real protections the two dead duplicates never
 * had) are preserved as-is. The hardcoded personal-email exclusion becomes
 * a DEV_EMAIL env-var check, matching reva/services/adminUserService.ts's
 * existing pattern.
 */

function assertNotDevAccount(email: string) {
  if (process.env.DEV_EMAIL && email === process.env.DEV_EMAIL) {
    throw new ForbiddenError();
  }
}

export async function getAllAdmins() {
  return prisma.gBCUser.findMany({
    where: { email: { not: process.env.DEV_EMAIL } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kindeId: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export interface GetAllAdminsPaginatedParams {
  page: number;
  pageSize: number;
  search?: string;
  roles?: ("ADMIN" | "SUPERADMIN")[];
  statuses?: boolean[];
}

/** Paginated/searchable sibling of getAllAdmins() — that one stays as-is (has its own unit test). */
export async function getAllAdminsPaginated(params: GetAllAdminsPaginatedParams) {
  const { page, pageSize, search, roles, statuses } = params;

  const where: any = { email: { not: process.env.DEV_EMAIL } };
  if (roles) where.role = { in: roles };
  if (statuses) where.isActive = { in: statuses };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const select = {
    id: true,
    kindeId: true,
    email: true,
    firstName: true,
    lastName: true,
    phone: true,
    role: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  const [rows, total] = await Promise.all([
    prisma.gBCUser.findMany({
      where,
      select,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.gBCUser.count({ where }),
  ]);

  return paginatedResult(rows, total, page, pageSize);
}

/** Overview counts for the admin Users page's stat cards — independent of whatever filters/page the browsable list currently has applied. */
export async function getAdminStats() {
  const where = { email: { not: process.env.DEV_EMAIL } };
  const [total, superAdmins] = await Promise.all([
    prisma.gBCUser.count({ where }),
    prisma.gBCUser.count({ where: { ...where, role: "SUPERADMIN" } }),
  ]);
  return { total, superAdmins, admins: total - superAdmins };
}

export async function addAdmin(
  data: { email: string; firstName: string; lastName: string; phone: string; role: "ADMIN" | "SUPERADMIN" },
  actorId: string
) {
  assertNotDevAccount(data.email);

  const existing = await prisma.gBCUser.findUnique({ where: { email: data.email } });
  if (existing) throw new ConflictError("User with this email already exists");

  const newAdmin = await prisma.gBCUser.create({
    data: {
      // Temporary — replaced with the real Kinde id on first login, same as the source.
      kindeId: `temp_${Date.now()}`,
      email: data.email,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      phone: data.phone || null,
      role: data.role,
    },
  });

  await prisma.gBCAuditLog.create({
    data: {
      userId: actorId,
      action: "ADD_ADMIN",
      entity: "GBCUser",
      entityId: newAdmin.id,
      changes: JSON.stringify({ email: data.email, role: data.role }),
    },
  });

  return newAdmin;
}

export async function updateAdminRole(adminId: string, newRole: GBCRole, actorId: string) {
  if (actorId === adminId && newRole !== "SUPERADMIN") {
    throw new ForbiddenError();
  }

  const updated = await prisma.gBCUser.update({ where: { id: adminId }, data: { role: newRole } });

  await prisma.gBCAuditLog.create({
    data: { userId: actorId, action: "UPDATE_ADMIN_ROLE", entity: "GBCUser", entityId: adminId, changes: JSON.stringify({ newRole }) },
  });

  return updated;
}

export async function deleteAdmin(adminId: string, actorId: string) {
  if (actorId === adminId) throw new ForbiddenError();

  await prisma.gBCUser.delete({ where: { id: adminId } });

  await prisma.gBCAuditLog.create({
    data: { userId: actorId, action: "DELETE_ADMIN", entity: "GBCUser", entityId: adminId },
  });
}

export async function toggleAdminStatus(adminId: string, isActive: boolean, actorId: string) {
  if (actorId === adminId && !isActive) throw new ForbiddenError();

  const updated = await prisma.gBCUser.update({ where: { id: adminId }, data: { isActive } });

  await prisma.gBCAuditLog.create({
    data: {
      userId: actorId,
      action: isActive ? "ACTIVATE_ADMIN" : "DEACTIVATE_ADMIN",
      entity: "GBCUser",
      entityId: adminId,
      changes: JSON.stringify({ isActive }),
    },
  });

  return updated;
}
