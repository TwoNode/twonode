import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getSharedWithMeSurfPlans } from "@/surfboard/services/planService";
import { parsePlanListQuery } from "@/surfboard/utils/planListQuery";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const { page, pageSize, filters, sort } = parsePlanListQuery(
      req.nextUrl.searchParams
    );

    const data = await getSharedWithMeSurfPlans(
      ctx.session.sub,
      page,
      pageSize,
      filters,
      sort
    );
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
