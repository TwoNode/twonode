import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getAnyRequestByReferenceForAdmin } from "@/reva/services/reportService";
import { Platform, RevaRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ reference: string }> };

/** Resolves Property vs OneTimeUserProperty server-side — see getAnyRequestByReferenceForAdmin. */
export const GET = withAuth<RevaRole>(
  async (_req, _ctx, routeCtx: RouteCtx) => {
    const { reference } = await routeCtx.params;
    const data = await getAnyRequestByReferenceForAdmin(reference);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.REVA, roles: [RevaRole.ADMIN, RevaRole.SUPERADMIN] }
);
