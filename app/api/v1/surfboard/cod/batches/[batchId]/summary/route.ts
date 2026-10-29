import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getBatchDetail } from "@/surfboard/services/batchSummaryService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ batchId: string }> };

/**
 * GET /api/v1/surfboard/cod/batches/{batchId}/summary — one of the caller's
 * batches with every plan in it: each plan's `displayStatus`, whether it is
 * `ready` to be marked physically submitted, and any queries with the
 * reviewer's comment. `cod/batches/{batchId}` itself stays the website's PDF
 * data. Someone else's batch is a 404.
 */
export const GET = withAuth<SurfboardRole>(
  async (_req, ctx, routeCtx: RouteCtx) => {
    const { batchId } = await routeCtx.params;
    const data = await getBatchDetail(ctx.session.sub, batchId);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
