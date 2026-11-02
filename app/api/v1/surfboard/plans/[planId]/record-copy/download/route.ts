import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { downloadPlanPdfAsBase64 } from "@/surfboard/services/verificationService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ planId: string }> };

export const GET = withAuth<SurfboardRole>(
  async (_req, ctx, routeCtx: RouteCtx) => {
    const { planId } = await routeCtx.params;
    // The plan's owner or an admin only (I-046): a plan id is in its public QR address.
    const data = await downloadPlanPdfAsBase64(
      ctx.session.sub,
      ctx.session.role,
      planId
    );
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.USER, SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN],
  }
);
