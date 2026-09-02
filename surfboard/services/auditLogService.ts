import prisma from "@/lib/prisma";

/**
 * Migrated from app/(projects)/(surfboard)/actions/auditLogActions.ts — role
 * gating (SUPERADMIN-only) moved to the route layer's withAuth, same as
 * every other Surfboard/REVA/GBC service.
 */

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  changes: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface GetAuditLogsParams {
  page?: number;
  pageSize?: number;
  action?: string;
  entity?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export async function getAuditLogs(params: GetAuditLogsParams = {}) {
  const { page = 1, pageSize = 50, action, entity, userId, startDate, endDate } = params;

  const where: any = {};
  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (userId) where.userId = userId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const total = await prisma.surfboardAuditLog.count({ where });
  const logs = await prisma.surfboardAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const userIds = [...new Set(logs.map((log) => log.userId).filter((id): id is string => id !== null))];
  const users = await prisma.surfboardUser.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const logsWithUsers: AuditLogEntry[] = logs.map((log) => ({
    ...log,
    user: log.userId ? userMap.get(log.userId) || null : null,
  }));

  return {
    logs: logsWithUsers,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getAuditLogActions() {
  const actions = await prisma.surfboardAuditLog.findMany({
    select: { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  });
  return actions.map((a) => a.action);
}

export async function getAuditLogEntities() {
  const entities = await prisma.surfboardAuditLog.findMany({
    select: { entity: true },
    distinct: ["entity"],
    orderBy: { entity: "asc" },
  });
  return entities.map((e) => e.entity);
}
