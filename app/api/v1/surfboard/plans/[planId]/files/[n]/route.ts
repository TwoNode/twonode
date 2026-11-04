import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getPlanFileLink } from "@/surfboard/services/planFileLinkService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string; n: string }> };

/**
 * GET /api/v1/surfboard/plans/{planId}/files/{n} — a short-lived address for
 * the n-th entry (from 0) of the `files` list that `plans/{planId}/summary`
 * returns, for the mobile app (TASK-0015 1G.5):
 * `{ success, data: { url, expiresAt, name, format } }`. The address lives five
 * minutes, so the app asks on the tap and never stores it. The record copy is
 * the owner's alone (I-037), a plan or file that is not there or not the
 * caller's is a 404, and a drawing (DWG, DXF), which a phone cannot show, is a
 * 422 `FILE_NOT_VIEWABLE`. The website keeps using `files/view`.
 */
export const GET = withAuth<SurfboardRole>(
  async (_req, ctx, routeCtx: RouteCtx) => {
    const { planId, n } = await routeCtx.params;
    const data = await getPlanFileLink(ctx.session.sub, planId, n);
    // The address is a bearer secret for five minutes: nothing may keep it.
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "no-store" } }
    );
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
