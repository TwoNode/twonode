import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { ValidationError } from "@/lib/api/errors";
import { findPlanNumberMatches } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const planNumber = req.nextUrl.searchParams.get("planNumber");
    if (!planNumber)
      throw new ValidationError({ planNumber: "Missing planNumber" });
    const excludeId = req.nextUrl.searchParams.get("excludeId") ?? undefined;
    const data = await findPlanNumberMatches(
      ctx.session.sub,
      planNumber,
      excludeId
    );
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
