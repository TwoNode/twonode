"use server";

import prisma from "@/lib/prisma";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";
import type { ApiResult } from "../types/surfboardTypes";
import { handlePrismaError } from "../utils/prismaErrorHandler";

interface AuditLogEntry {
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

interface GetAuditLogsParams {
  page?: number;
  pageSize?: number;
  action?: string;
  entity?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Get audit logs with pagination and filters
 * Only accessible by SUPERADMIN
 */
export async function getAuditLogs(params: GetAuditLogsParams = {}): Promise<
  ApiResult<{
    logs: AuditLogEntry[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>
> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || user.role !== "SUPERADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const {
      page = 1,
      pageSize = 50,
      action,
      entity,
      userId,
      startDate,
      endDate,
    } = params;

    // Build where clause
    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (entity) {
      where.entity = entity;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // Get total count
    const total = await prisma.surfboardAuditLog.count({ where });

    // Get paginated logs
    const logs = await prisma.surfboardAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Fetch user details for logs that have userId
    const userIds = logs
      .map((log) => log.userId)
      .filter((id): id is string => id !== null);
    const uniqueUserIds = [...new Set(userIds)];

    const users = await prisma.surfboardUser.findMany({
      where: { id: { in: uniqueUserIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Attach user details to logs
    const logsWithUsers = logs.map((log) => ({
      ...log,
      user: log.userId ? userMap.get(log.userId) || null : null,
    }));

    return {
      success: true,
      data: {
        logs: logsWithUsers,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getAuditLogs"),
    };
  }
}

/**
 * Get unique actions for filtering
 */
export async function getAuditLogActions(): Promise<ApiResult<string[]>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || user.role !== "SUPERADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const actions = await prisma.surfboardAuditLog.findMany({
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    });

    return {
      success: true,
      data: actions.map((a) => a.action),
    };
  } catch (error) {
    console.error("Error fetching audit log actions:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getAuditLogActions"),
    };
  }
}

/**
 * Get unique entities for filtering
 */
export async function getAuditLogEntities(): Promise<ApiResult<string[]>> {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || user.role !== "SUPERADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const entities = await prisma.surfboardAuditLog.findMany({
      select: { entity: true },
      distinct: ["entity"],
      orderBy: { entity: "asc" },
    });

    return {
      success: true,
      data: entities.map((e) => e.entity),
    };
  } catch (error) {
    console.error("Error fetching audit log entities:", error);
    return {
      success: false,
      error: handlePrismaError(error, "getAuditLogEntities"),
    };
  }
}
