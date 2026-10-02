import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { parsePagination } from "@/lib/api/pagination";
import {
  getUserNotifications,
  getAdminNotifications,
  getSuperAdminNotifications,
  getAdminNotificationsPaginated,
  createNotification,
} from "@/reva/services/notificationService";
import { Platform, RevaRole } from "@/utils/platform";
import type {
  Role,
  NotificationAudience,
  NotificationType,
} from "@/prisma/generated";

/**
 * One route, role from the session picks which query runs — not a
 * caller-supplied `role` argument like the source's getUserNotifications
 * (which trusted whatever role the client passed).
 *
 * Opt-in: `?page=` switches ADMIN/SUPERADMIN to the paginated/searchable
 * variant (the reva-restricted admin notifications list) — the regular
 * /reva/dashboard bell-equivalent list never passes it, and expects the
 * original plain-array shape, so it's left untouched.
 */
export const GET = withAuth<RevaRole>(
  async (req, ctx) => {
    const params = req.nextUrl.searchParams;

    if (
      params.has("page") &&
      (ctx.session.role === RevaRole.ADMIN ||
        ctx.session.role === RevaRole.SUPERADMIN)
    ) {
      const pagination = parsePagination(params);
      const data = await getAdminNotificationsPaginated(
        ctx.session.role as unknown as "ADMIN" | "SUPERADMIN",
        ctx.session.sub,
        {
          ...pagination,
          search: params.get("search") || undefined,
          type: (params.get("type") as NotificationType) || undefined,
          status:
            (params.get("status") as "UNREAD" | "READ" | "ALL") || undefined,
          includeDismissed: params.get("includeDismissed") === "true",
        }
      );
      return NextResponse.json({ success: true, data });
    }

    const notifications =
      ctx.session.role === RevaRole.SUPERADMIN
        ? await getSuperAdminNotifications()
        : ctx.session.role === RevaRole.ADMIN
          ? await getAdminNotifications()
          : await getUserNotifications(
              ctx.session.sub,
              ctx.session.role as unknown as Role
            );

    // getAdminNotifications/getSuperAdminNotifications don't take a userId
    // (unlike getUserNotifications), so they return bare readBy/dismissedBy
    // arrays with no per-viewer read state — computed here instead, for all
    // three roles uniformly, rather than threading userId into two more
    // service functions for a one-field difference.
    const data = notifications.map((n) => ({
      ...n,
      isRead: n.readBy.includes(ctx.session.sub),
      isDismissed: n.dismissedBy.includes(ctx.session.sub),
    }));
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.REVA,
    roles: [RevaRole.USER, RevaRole.ADMIN, RevaRole.SUPERADMIN],
  }
);

const createSchema = z.object({
  type: z.enum([
    "INFO",
    "SUCCESS",
    "WARNING",
    "ERROR",
    "SYSTEM",
    "PAYMENT",
    "PROPERTY",
  ]),
  title: z.string().min(1),
  message: z.string().min(1),
  userIds: z.array(z.string()).optional(),
  audience: z
    .enum([
      "SPECIFIC_USERS",
      "GENERAL_USERS",
      "GENERAL_ADMINS",
      "SUPERADMIN",
      "ALL_USERS",
    ])
    .optional(),
  link: z.string().optional(),
  metadata: z.any().optional(),
});

export const POST = withAuth<RevaRole>(
  async (req) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const body = await validateBody(req, createSchema);
    const data = await createNotification({
      ...body,
      type: body.type as NotificationType,
      audience: body.audience as NotificationAudience | undefined,
    });
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.REVA, roles: [RevaRole.ADMIN, RevaRole.SUPERADMIN] }
);
