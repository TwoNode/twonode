import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getEditionAdminStats } from "@/gbc/services/editionService";
import { Platform, GBCRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ key: string }> };

export const GET = withAuth<GBCRole>(
  async (_req, _ctx, routeCtx: RouteCtx) => {
    const { key } = await routeCtx.params;
    const data = await getEditionAdminStats(key);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
