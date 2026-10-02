import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import {
  deactivateUser,
  reactivateUser,
} from "@/reva/services/adminUserService";
import { Platform, RevaRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };

const statusSchema = z.object({ active: z.boolean() });

export const PATCH = withAuth<RevaRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { id } = await routeCtx.params;
    const { active } = await validateBody(req, statusSchema);
    const data = active
      ? await reactivateUser(ctx.session.sub, id)
      : await deactivateUser(ctx.session.sub, id);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.REVA, roles: [RevaRole.SUPERADMIN] }
);
