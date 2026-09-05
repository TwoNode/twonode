import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getUnreadGBCNotificationCount } from "@/gbc/services/notificationService";
import { Platform, GBCRole } from "@/utils/platform";

export const GET = withAuth<GBCRole>(
  async (_req, ctx) => {
    const data = await getUnreadGBCNotificationCount(ctx.session.sub, ctx.session.role as "ADMIN" | "SUPERADMIN");
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
