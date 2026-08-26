import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getBatchPDFData } from "@/surfboard/services/remitaVerificationService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ batchId: string }> };

export const GET = withAuth<SurfboardRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    const { batchId } = await routeCtx.params;
    const data = await getBatchPDFData(ctx.session.sub, batchId);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
