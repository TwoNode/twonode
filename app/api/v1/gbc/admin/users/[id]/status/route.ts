import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { toggleAdminStatus } from "@/gbc/services/adminUserService";
import { Platform, GBCRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };
const bodySchema = z.object({ isActive: z.boolean() });

export const PATCH = withAuth<GBCRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { id } = await routeCtx.params;
    const { isActive } = await validateBody(req, bodySchema);
    const admin = await toggleAdminStatus(id, isActive, ctx.session.sub);
    return NextResponse.json({ success: true, data: admin });
  },
  { platform: Platform.GBC, roles: [GBCRole.SUPERADMIN] }
);
