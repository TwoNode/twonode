import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { markNotificationAsRead } from "@/surfboard/services/notificationService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };

export const POST = withAuth<SurfboardRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { id } = await routeCtx.params;
    const data = await markNotificationAsRead(ctx.session.sub, id);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
