import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { ValidationError } from "@/lib/api/errors";
import { searchReferencePlanNumbers } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const planType = req.nextUrl.searchParams.get("planType");
    if (!planType) throw new ValidationError({ planType: "Missing planType" });
    const data = await searchReferencePlanNumbers(ctx.session.sub, planType);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
