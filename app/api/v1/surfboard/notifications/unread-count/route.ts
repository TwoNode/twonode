import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getUnreadNotificationCount } from "@/surfboard/services/notificationService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (_req, ctx) => {
    const data = await getUnreadNotificationCount(
      ctx.session.sub,
      ctx.session.role
    );
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
