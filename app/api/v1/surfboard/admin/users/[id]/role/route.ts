import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { updateUserRole } from "@/surfboard/services/adminUserService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };

const roleSchema = z.object({ role: z.nativeEnum(SurfboardRole) });

/** Route allows ADMIN too, but the service itself rejects a non-SUPERADMIN caller — mirrors the source's requireAdmin()-then-check pattern. */
export const PATCH = withAuth<SurfboardRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { id } = await routeCtx.params;
    const { role } = await validateBody(req, roleSchema);
    const data = await updateUserRole(
      { id: ctx.session.sub, role: ctx.session.role },
      id,
      role
    );
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN],
  }
);
