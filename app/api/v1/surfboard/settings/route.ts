import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { getCurrentSettings, updateSettings } from "@/surfboard/services/settingsService";
import { Platform, SurfboardRole } from "@/utils/platform";

/** Any authenticated Surfboard user, matching the source's getAuthenticatedSurfUserFromCookie()-only gate. */
export const GET = withAuth<SurfboardRole>(
  async (_req, ctx) => {
    const data = await getCurrentSettings(ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);

export const PATCH = withAuth<SurfboardRole>(
  async (req, ctx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const body = await req.json();
    const data = await updateSettings(ctx.session.sub, body);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN] }
);
