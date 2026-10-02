import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import {
  getUnreadNotificationCount,
  getAdminNotificationUnreadCount,
} from "@/reva/services/notificationService";
import { Platform, RevaRole } from "@/utils/platform";
import type { Role } from "@/prisma/generated";

export const GET = withAuth<RevaRole>(
  async (_req, ctx) => {
    const count =
      ctx.session.role === RevaRole.ADMIN ||
      ctx.session.role === RevaRole.SUPERADMIN
        ? await getAdminNotificationUnreadCount(
            ctx.session.role as unknown as "ADMIN" | "SUPERADMIN",
            ctx.session.sub
          )
        : await getUnreadNotificationCount(
            ctx.session.sub,
            ctx.session.role as unknown as Role
          );
    return NextResponse.json({ success: true, data: { count } });
  },
  {
    platform: Platform.REVA,
    roles: [RevaRole.USER, RevaRole.ADMIN, RevaRole.SUPERADMIN],
  }
);
