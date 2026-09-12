import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getBatchStatusStats } from "@/surfboard/services/remitaVerificationService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const status = req.nextUrl.searchParams.get("status") ?? "";
    const data = await getBatchStatusStats(ctx.session.role, status);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN] }
);
