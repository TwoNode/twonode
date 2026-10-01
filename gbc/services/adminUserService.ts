import prisma from "@/lib/prisma";
import { ForbiddenError } from "@/lib/api/errors";
import type { GBCRole } from "@/prisma/generated";
import { paginatedResult } from "@/lib/api/pagination";
import { writeAudit } from "@/lib/audit";
import { Platform } from "@/utils/platform";

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
  if (statuses) {
    // Prisma's BoolFilter only has `equals`/`not` — no `in` (a boolean only
    // has two possible values, so Prisma never generated that variant) —
    // `{ in: statuses }` throws PrismaClientValidationError. Reproduce the
    // same "in" semantics by hand: both selected (or none passed) means no
    // filter, exactly one selected narrows to that value, and zero selected
    // (both checkboxes off) should match nothing rather than everything.
    const uniqueStatuses = Array.from(new Set(statuses));
    if (uniqueStatuses.length === 0) {
      return paginatedResult([], 0, page, pageSize);
    }
    if (uniqueStatuses.length === 1) {
      where.isActive = uniqueStatuses[0];
    }
  }
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

export async function updateAdminRole(adminId: string, newRole: GBCRole, actorId: string) {
  if (actorId === adminId && newRole !== "SUPERADMIN") {
    throw new ForbiddenError();
  }

  const updated = await prisma.gBCUser.update({ where: { id: adminId }, data: { role: newRole } });

  await writeAudit(Platform.GBC, {
    userId: actorId,
    action: "UPDATE_ADMIN_ROLE",
    entity: "GBCUser",
    entityId: adminId,
    changes: { newRole, userEmail: updated.email },
  });

  return updated;
}

export async function deleteAdmin(adminId: string, actorId: string) {
  if (actorId === adminId) throw new ForbiddenError();

  const removed = await prisma.gBCUser.delete({ where: { id: adminId } });

  await writeAudit(Platform.GBC, {
    userId: actorId,
    action: "DELETE_ADMIN",
    entity: "GBCUser",
    entityId: adminId,
    changes: { userEmail: removed?.email, role: removed?.role },
  });
}

export async function toggleAdminStatus(adminId: string, isActive: boolean, actorId: string) {
  if (actorId === adminId && !isActive) throw new ForbiddenError();

  const updated = await prisma.gBCUser.update({ where: { id: adminId }, data: { isActive } });

  await writeAudit(Platform.GBC, {
    userId: actorId,
    action: isActive ? "ACTIVATE_ADMIN" : "DEACTIVATE_ADMIN",
    entity: "GBCUser",
    entityId: adminId,
    changes: { isActive, userEmail: updated.email },
  });

  return updated;
}
