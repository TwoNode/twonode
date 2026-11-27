import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getProtectedFileInfo } from "@/surfboard/services/protectedFileService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string; n: string }> };

/**
 * GET /api/v1/surfboard/plans/{planId}/files/{n}/pages — how many pages a file of a plan SHARED WITH
 * THE CALLER has, for the app's protected viewer (TASK-0015 in the app repo):
 * `{ success, data: { pages, name, kind } }`. `n` is the file's place in the `files` list of
 * `plans/{planId}/summary`; only the files marked `protected` there (the survey plan(s) and the
 * Certificate) are served, and only to the person the plan was shared with: anything else is a 404.
 * The pages themselves are `.../pages/{p}`.
 */
export const GET = withAuth<SurfboardRole>(
  async (_req, ctx, routeCtx: RouteCtx) => {
    const { planId, n } = await routeCtx.params;
    const data = await getProtectedFileInfo(ctx.session.sub, planId, n);
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
