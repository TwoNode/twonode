import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import {
  listUserDevices,
  revokeAllUserDevices,
} from "@/surfboard/services/adminUserService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string }> };

const roles = [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN];

/**
 * GET: the app sign-ins of one person (TASK-0015 1J.3), most recently used
 * first. DELETE: ends all of them at once (a lost or stolen phone); each
 * phone's push address goes with its sign-in. Audited as
 * REVOKE_ALL_DEVICE_SESSIONS. An ADMIN cannot act on another ADMIN or a
 * SUPERADMIN, as for the status route.
 */
export const GET = withAuth<SurfboardRole>(
  async (_req, ctx, routeCtx: RouteCtx) => {
    const { id } = await routeCtx.params;
    const data = await listUserDevices(
      { id: ctx.session.sub, role: ctx.session.role },
      id
    );
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles }
);

export const DELETE = withAuth<SurfboardRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { id } = await routeCtx.params;
    const data = await revokeAllUserDevices(
      { id: ctx.session.sub, role: ctx.session.role },
      id
    );
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles }
);
