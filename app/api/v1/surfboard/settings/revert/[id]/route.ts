import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { revertToPreviousSettings } from "@/surfboard/services/settingsService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };

export const POST = withAuth<SurfboardRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { id } = await routeCtx.params;
    const data = await revertToPreviousSettings(ctx.session.sub, id);
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN],
  }
);
