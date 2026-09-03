import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getUnreadNotificationCount } from "@/reva/services/notificationService";
import { Platform, RevaRole } from "@/utils/platform";
import type { Role } from "@/prisma/generated";

export const GET = withAuth<RevaRole>(
  async (_req, ctx) => {
    const count = await getUnreadNotificationCount(ctx.session.sub, ctx.session.role as unknown as Role);
    return NextResponse.json({ success: true, data: { count } });
  },
  { platform: Platform.REVA, roles: [RevaRole.USER, RevaRole.ADMIN, RevaRole.SUPERADMIN] }
);
