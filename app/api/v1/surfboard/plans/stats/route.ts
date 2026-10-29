import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getPlanStats } from "@/surfboard/services/planStatsService";
import { parsePlanStatsQuery } from "@/surfboard/utils/planStatsQuery";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * GET /api/v1/surfboard/plans/stats — the figures on the app's Stats tab
 * (TASK-0015 1F.3, 1F.7): totals, one count per display status, places,
 * facilitators, pillars, plans per month and active batches, for the caller's own
 * plans, optionally within a survey plan date range (`dateFrom`, `dateTo`).
 * Every tappable figure is counted with the same rules as the `plans/summary`
 * list it opens (see `surfboard/services/planStatsService.ts`). Reads are not
 * subscription-gated, like the other plan reads.
 */
export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const range = parsePlanStatsQuery(req.nextUrl.searchParams);
    const data = await getPlanStats(ctx.session.sub, range);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
