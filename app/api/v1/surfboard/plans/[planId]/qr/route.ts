import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { generatePlanQRCode } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };

export const GET = withAuth<SurfboardRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    const { planId } = await routeCtx.params;
    const sp = req.nextUrl.searchParams;
    const options = {
      darkColor: sp.get("darkColor") ?? undefined,
      lightColor: sp.get("lightColor") ?? undefined,
      minLightAlpha: sp.get("minLightAlpha")
        ? Number(sp.get("minLightAlpha"))
        : undefined,
      margin: sp.get("margin") ? Number(sp.get("margin")) : undefined,
      scale: sp.get("scale") ? Number(sp.get("scale")) : undefined,
      width: sp.get("width") ? Number(sp.get("width")) : undefined,
      forceOpaque: sp.get("forceOpaque") === "true" ? true : undefined,
    };
    const data = await generatePlanQRCode(ctx.session.sub, planId, options);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
