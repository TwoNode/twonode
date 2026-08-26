import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getAllFacilitators, getAllFacilitatorsAndPlanNumbers } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    if (req.nextUrl.searchParams.get("withPlanNumbers") === "true") {
      const data = await getAllFacilitatorsAndPlanNumbers(ctx.session.sub);
      return NextResponse.json({ success: true, data });
    }
    const data = await getAllFacilitators(ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
