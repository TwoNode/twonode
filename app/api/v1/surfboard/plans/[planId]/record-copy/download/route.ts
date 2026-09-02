import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { downloadPlanPdfAsBase64 } from "@/surfboard/services/verificationService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };

export const GET = withAuth<SurfboardRole>(
  async (_req, _ctx, routeCtx: RouteCtx) => {
    const { planId } = await routeCtx.params;
    const data = await downloadPlanPdfAsBase64(planId);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
