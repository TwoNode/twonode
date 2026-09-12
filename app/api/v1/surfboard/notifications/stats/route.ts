import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getNotificationStats } from "@/surfboard/services/notificationService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (_req, ctx) => {
    const data = await getNotificationStats(ctx.session.sub, ctx.session.role);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
