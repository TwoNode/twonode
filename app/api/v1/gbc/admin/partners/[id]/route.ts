import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { deletePartner } from "@/gbc/services/cmsService";
import { Platform, GBCRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };

export const DELETE = withAuth<GBCRole>(
  async (req, _ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { id } = await routeCtx.params;
    await deletePartner(id);
    return NextResponse.json({ success: true, message: "Partner deleted successfully" });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
