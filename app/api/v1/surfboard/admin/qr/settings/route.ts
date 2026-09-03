import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { updateQREarningsSettings } from "@/surfboard/services/qrAdminService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const PATCH = withAuth<SurfboardRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const body = await req.json();
    const data = await updateQREarningsSettings(ctx.session.sub, body);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN] }
);
