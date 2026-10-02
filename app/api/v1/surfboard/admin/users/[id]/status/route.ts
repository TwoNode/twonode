import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { updateUserStatus } from "@/surfboard/services/adminUserService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };

const statusSchema = z.object({ isActive: z.boolean() });

export const PATCH = withAuth<SurfboardRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { id } = await routeCtx.params;
    const { isActive } = await validateBody(req, statusSchema);
    const data = await updateUserStatus(
      { id: ctx.session.sub, role: ctx.session.role },
      id,
      isActive
    );
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN],
  }
);
