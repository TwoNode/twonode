import prisma from "@/lib/prisma";
import { paginatedResult, type Paginated } from "@/lib/api/pagination";
import type { AuditLogEntry } from "@/lib/api/auditLogTypes";
import { Platform } from "@/utils/platform";

/**
 * Reads of the per-product audit tables that lib/audit.ts's `writeAudit`
 * fills — one implementation for GBC, Surfboard and REVA, since their log
 * tables and user tables have the same columns and only differ in name.
 */

export interface AuditLogFilter {
  page?: number;
  pageSize?: number;
  action?: string;
  entity?: string;
  /** Only entries performed by this account. */
  userId?: string;
  /** Matches the actor's name/email, the entity id or the IP address. */
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

type AuditRow = Omit<AuditLogEntry, "createdAt" | "user"> & { createdAt: Date };
type Actor = { id: string; firstName: string | null; lastName: string | null; email: string };

interface AuditTables {
  logs: {
    count(args: { where: object }): Promise<number>;
    findMany(args: object): Promise<AuditRow[]>;
  };
  users: { findMany(args: object): Promise<Actor[]> };
}

function tablesFor(platform: Platform): AuditTables {
  switch (platform) {
    case Platform.GBC:
      return { logs: prisma.gBCAuditLog, users: prisma.gBCUser };
    case Platform.SURFBOARD:
      return { logs: prisma.surfboardAuditLog, users: prisma.surfboardUser };
    case Platform.REVA:
      return { logs: prisma.revaAuditLog, users: prisma.revaUser };
    default:
      throw new Error(`No audit log for platform: ${platform}`);
  }
}

export async function listAuditLogs(
  platform: Platform,
  filter: AuditLogFilter = {}
): Promise<Paginated<Omit<AuditLogEntry, "createdAt"> & { createdAt: Date }>> {
  const { page = 1, pageSize = 10, action, entity, userId, search, startDate, endDate } = filter;
  const { logs, users } = tablesFor(platform);

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (userId) where.userId = userId;
  if (startDate || endDate) {
    where.createdAt = { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) };
  }
  if (search) {
    const matchingActors = await users.findMany({
      where: {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    where.OR = [
      { entityId: { contains: search, mode: "insensitive" } },
      { ipAddress: { contains: search, mode: "insensitive" } },
      ...(matchingActors.length ? [{ userId: { in: matchingActors.map((u) => u.id) } }] : []),
    ];
  }

  const [total, rows] = await Promise.all([
    logs.count({ where }),
    logs.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);

  const actorIds = [...new Set(rows.map((r) => r.userId).filter((id): id is string => id !== null))];
  const actors = actorIds.length
    ? await users.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : [];
  const actorById = new Map(actors.map((a) => [a.id, a]));

  const entries = rows.map((row) => {
    const actor = row.userId ? actorById.get(row.userId) : undefined;
    return {
      ...row,
      user: actor ? { firstName: actor.firstName ?? "", lastName: actor.lastName ?? "", email: actor.email } : null,
    };
  });

  return paginatedResult(entries, total, page, pageSize);
}

/** The distinct actions and entities that have been logged, for the viewer's two dropdowns. */
export async function getAuditLogFilterOptions(platform: Platform): Promise<{ actions: string[]; entities: string[] }> {
  const { logs } = tablesFor(platform);
  const distinct = (field: "action" | "entity") =>
    logs.findMany({ select: { [field]: true }, distinct: [field], orderBy: { [field]: "asc" } }) as unknown as Promise<
      Array<Record<typeof field, string>>
    >;

  const [actions, entities] = await Promise.all([distinct("action"), distinct("entity")]);
  return { actions: actions.map((a) => a.action), entities: entities.map((e) => e.entity) };
}
