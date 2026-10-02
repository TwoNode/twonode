import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { deleteAdmin } from "@/gbc/services/adminUserService";
import { Platform, GBCRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };

export const DELETE = withAuth<GBCRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { id } = await routeCtx.params;
    await deleteAdmin(id, ctx.session.sub);
    return NextResponse.json({ success: true });
  },
  { platform: Platform.GBC, roles: [GBCRole.SUPERADMIN] }
);
