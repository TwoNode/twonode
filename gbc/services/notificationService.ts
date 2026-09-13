import prisma from "@/lib/prisma";
import { GBCUserNotificationType, GBCUserNotificationAudience } from "@/prisma/generated";
import { NotFoundError } from "@/lib/api/errors";
import { paginatedResult } from "@/lib/api/pagination";

/**
 * GBC's in-app admin notification inbox — mirrors Surfboard's
 * notificationService.ts exactly (same readBy/dismissedBy-array pattern,
 * same audience targeting, same isRead/isDismissed computed-on-read shape),
 * since GBC's admin area is the only logged-in area this product has. Kept
 * intentionally smaller than Surfboard's — no email-sending trigger
 * functions yet, just the CRUD the bell dropdown and the notifications page
 * actually need; add triggers here as real events need them, same as
 * Surfboard's notifyPlanCreated/notifyPaymentReceived etc. grew over time.
 */

export type CreateGBCNotificationInput = {
  type: GBCUserNotificationType;
  title: string;
  message: string;
  audience: GBCUserNotificationAudience;
  userIds?: string[];
  link?: string;
  metadata?: any;
};

export type GBCNotificationWithReadState = {
  id: string;
  type: GBCUserNotificationType;
  title: string;
  message: string;
  audience: GBCUserNotificationAudience;
  link: string | null;
  createdAt: Date;
  isRead: boolean;
  isDismissed: boolean;
};

export async function createGBCNotification(input: CreateGBCNotificationInput) {
  const notification = await prisma.gBCUserNotification.create({
    data: {
      type: input.type,
      title: input.title,
      message: input.message,
      audience: input.audience,
      userIds: input.userIds || [],
      link: input.link,
      metadata: input.metadata || {},
    },
  });
  return { id: notification.id };
}

export async function getAdminNotifications(
  userId: string,
  role: "ADMIN" | "SUPERADMIN",
  options?: { includeRead?: boolean; includeDismissed?: boolean; limit?: number }
): Promise<GBCNotificationWithReadState[]> {
  const { includeRead = true, includeDismissed = false, limit = 50 } = options || {};

  const where: any = { OR: [{ audience: "ALL_USERS" }, { audience: "GENERAL_ADMINS" }, { userIds: { has: userId } }] };
  if (role === "SUPERADMIN") where.OR.push({ audience: "SUPERADMIN" });

  const notifications = await prisma.gBCUserNotification.findMany({ where, orderBy: { createdAt: "desc" }, take: limit });

  return notifications
    .map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      audience: n.audience,
      link: n.link,
      createdAt: n.createdAt,
      isRead: n.readBy.includes(userId),
      isDismissed: n.dismissedBy.includes(userId),
    }))
    .filter((n) => {
      if (!includeRead && n.isRead) return false;
      if (!includeDismissed && n.isDismissed) return false;
      return true;
    });
}

export interface GetAdminNotificationsPaginatedParams {
  page: number;
  pageSize: number;
  search?: string;
  type?: GBCUserNotificationType;
  includeRead?: boolean;
  includeDismissed?: boolean;
}

/**
 * Paginated/searchable sibling of getAdminNotifications() — that one stays
 * as-is (has its own unit test). Also fixes a real bug found while wiring
 * this up: getAdminNotifications() filters includeRead/includeDismissed
 * client-side in JS *after* `take: limit`, so `take` could cap the
 * pre-filter set and silently under-return matches. Filtering now happens
 * in the Prisma `where` clause, so skip/take operate on the true count.
 */
export async function getAdminNotificationsPaginated(
  userId: string,
  role: "ADMIN" | "SUPERADMIN",
  params: GetAdminNotificationsPaginatedParams
) {
  const { page, pageSize, search, type, includeRead = true, includeDismissed = false } = params;

  const where: any = { OR: [{ audience: "ALL_USERS" }, { audience: "GENERAL_ADMINS" }, { userIds: { has: userId } }] };
  if (role === "SUPERADMIN") where.OR.push({ audience: "SUPERADMIN" });

  const and: any[] = [];
  if (type) where.type = type;
  if (!includeRead) and.push({ NOT: { readBy: { has: userId } } });
  if (!includeDismissed) and.push({ NOT: { dismissedBy: { has: userId } } });
  if (and.length) where.AND = and;
  if (search) {
    where.AND = [...(where.AND || []), { OR: [{ title: { contains: search, mode: "insensitive" } }, { message: { contains: search, mode: "insensitive" } }] }];
  }

  const [rows, total] = await Promise.all([
    prisma.gBCUserNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.gBCUserNotification.count({ where }),
  ]);

  const data = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    audience: n.audience,
    link: n.link,
    createdAt: n.createdAt,
    isRead: n.readBy.includes(userId),
    isDismissed: n.dismissedBy.includes(userId),
  }));

  return paginatedResult(data, total, page, pageSize);
}

export async function markGBCNotificationAsRead(userId: string, notificationId: string) {
  const notification = await prisma.gBCUserNotification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new NotFoundError("Notification");

  const readBy = [...new Set([...notification.readBy, userId])];
  await prisma.gBCUserNotification.update({ where: { id: notificationId }, data: { readBy } });
  return { success: true };
}

export async function dismissGBCNotification(userId: string, notificationId: string) {
  const notification = await prisma.gBCUserNotification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new NotFoundError("Notification");

  const dismissedBy = [...new Set([...notification.dismissedBy, userId])];
  await prisma.gBCUserNotification.update({ where: { id: notificationId }, data: { dismissedBy } });
  return { success: true };
}

/** ADMIN/SUPERADMIN only, enforced by the caller (route-level withAuth). */
export async function deleteGBCNotification(notificationId: string) {
  await prisma.gBCUserNotification.delete({ where: { id: notificationId } });
  return { success: true };
}

export async function getUnreadGBCNotificationCount(userId: string, role: "ADMIN" | "SUPERADMIN") {
  const where: any = {
    OR: [{ audience: "ALL_USERS" }, { audience: "GENERAL_ADMINS" }, { userIds: { has: userId } }],
    NOT: [{ readBy: { has: userId } }, { dismissedBy: { has: userId } }],
  };
  if (role === "SUPERADMIN") where.OR.push({ audience: "SUPERADMIN" });

  const count = await prisma.gBCUserNotification.count({ where });
  return { count };
}
