import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getPlanSummaries } from "@/surfboard/services/planSummaryService";
import { parsePlanSummaryQuery } from "@/surfboard/utils/planSummaryQuery";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * GET /api/v1/surfboard/plans/summary — the lean plan list the mobile app uses
 * (TASK-0015 1D.1, 1D.2): one `displayStatus` per plan, no geometry, pillars or
 * file links, never more than 100 a page, in the shared `{ data, pagination }`
 * envelope. `scope=mine` (default) or `scope=shared-with-me`; filters and sort
 * are in `parsePlanSummaryQuery`. Reads are not subscription-gated, like the
 * other plan reads.
 */
export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const params = parsePlanSummaryQuery(req.nextUrl.searchParams);
    const data = await getPlanSummaries(ctx.session.sub, params);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
