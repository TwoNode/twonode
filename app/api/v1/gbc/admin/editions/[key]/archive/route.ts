import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { archiveEdition } from "@/gbc/services/editionService";
import { Platform, GBCRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ key: string }> };

export const PATCH = withAuth<GBCRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { key } = await routeCtx.params;
    const data = await archiveEdition(key, ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.SUPERADMIN] }
);
