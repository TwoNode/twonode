import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { dismissNotification } from "@/reva/services/notificationService";
import { Platform, RevaRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };

export const POST = withAuth<RevaRole>(
  async (_req, ctx, routeCtx: RouteCtx) => {
    const { id } = await routeCtx.params;
    const data = await dismissNotification(id, ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.REVA, roles: [RevaRole.USER, RevaRole.ADMIN, RevaRole.SUPERADMIN] }
);
