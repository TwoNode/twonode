import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getSurfPlanByIdWithSurveyor } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };

export const GET = withAuth<SurfboardRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    const { planId } = await routeCtx.params;
    const data = await getSurfPlanByIdWithSurveyor(ctx.session.sub, planId);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
