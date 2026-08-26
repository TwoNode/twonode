import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getCurrentPayerProfile } from "@/surfboard/services/remitaVerificationService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const data = await getCurrentPayerProfile(ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
