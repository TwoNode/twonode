import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { validateCSRF } from "@/lib/auth/csrf";
import { revokeUserDevice } from "@/surfboard/services/adminUserService";
import { Platform, SurfboardRole } from "@/utils/platform";

type RouteCtx = { params: Promise<{ id: string; familyId: string }> };

/**
 * Ends one app sign-in of one person (TASK-0015 1J.3); `familyId` is the `id`
 * of the entry in `GET admin/users/{id}/devices`. 404 when that person has no
 * such live sign-in. Audited as REVOKE_DEVICE_SESSION.
 */
export const DELETE = withAuth<SurfboardRole>(
  async (req, ctx, routeCtx: RouteCtx) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { id, familyId } = await routeCtx.params;
    const data = await revokeUserDevice(
      { id: ctx.session.sub, role: ctx.session.role },
      id,
      familyId
    );
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN],
  }
);
