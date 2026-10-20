import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getPlanMap } from "@/surfboard/services/planMapService";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * GET /api/v1/surfboard/plans/map — the caller's own plans for the mobile app's
 * Home map (TASK-0015 1E.1): `{ plans, total, withoutOutline, truncated }`, each
 * plan with its `displayStatus`, place, area, centre and a simplified outline,
 * in the stored (uncorrected) coordinates. No pillars, files, comments or other
 * people's details. Reads are not subscription-gated, like the other plan reads.
 */
export const GET = withAuth<SurfboardRole>(
  async (_req, ctx) => {
    const data = await getPlanMap(ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
