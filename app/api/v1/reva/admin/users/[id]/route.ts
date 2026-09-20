import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { deleteUser } from "@/reva/services/adminUserService";
import { Platform, RevaRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };

export const DELETE = withAuth<RevaRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }
    const { id } = await routeCtx.params;
    await deleteUser(ctx.session.sub, id);
    return NextResponse.json({ success: true });
  },
  { platform: Platform.REVA, roles: [RevaRole.SUPERADMIN] }
);
