import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getFullSurfPlanForViewer } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };

/**
 * Full plan data, no redaction, for logged-in Surfboard users only (it used to
 * be open to anyone with a plan id, and returned file links and the surveyor's
 * email). Staff read any plan; a surveyor their own or a shared one. The
 * public, QR-gated view is `../public`.
 */
export const GET = withAuth<SurfboardRole>(
  async (_req: NextRequest, ctx, routeCtx: RouteCtx) => {
    const { planId } = await routeCtx.params;
    const data = await getFullSurfPlanForViewer(
      ctx.session.sub,
      ctx.session.role,
      planId
    );
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: Object.values(SurfboardRole) }
);
