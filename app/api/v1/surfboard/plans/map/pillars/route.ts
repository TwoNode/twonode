import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getMapPillars } from "@/surfboard/services/planMapService";
import { parseMapPillarsQuery } from "@/surfboard/utils/mapPillarsQuery";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * GET /api/v1/surfboard/plans/map/pillars?ids=a,b,c — the pillars (number and stored UTM
 * coordinates) of up to 60 of the caller's plans (their own and the ones shared with them), for the app's Home map once it is zoomed in
 * far enough to number them (about a 1:5,000 scale). `plans/map` leaves pillars out so the first
 * answer stays small. A plan that is neither the caller's nor shared with them, is deleted or has no
 * usable pillar is simply not in the answer. Reads are not subscription-gated, like the other plan reads.
 */
export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const { ids } = parseMapPillarsQuery(req.nextUrl.searchParams);
    const data = await getMapPillars(ctx.session.sub, ids);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
