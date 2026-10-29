import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getPlanDetail } from "@/surfboard/services/planDetailService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };

/**
 * GET /api/v1/surfboard/plans/{planId}/summary — one plan for the mobile app's
 * detail screen (TASK-0015 1D.4, 1D.7): the list summary plus key facts, when
 * each step happened and the files, with no geometry or pillars. A plan shared
 * with the caller comes without the record copy, reviewer comments, batch or
 * payment, or the other people it is shared with. A plan that is not the
 * caller's or not shared with them, or is in the trash, is a 404.
 * `GET plans/{planId}` itself stays the website's full row.
 */
export const GET = withAuth<SurfboardRole>(
  async (_req, ctx, routeCtx: RouteCtx) => {
    const { planId } = await routeCtx.params;
    const data = await getPlanDetail(ctx.session.sub, planId);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
