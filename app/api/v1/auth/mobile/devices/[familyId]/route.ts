import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { Platform, SurfboardRole } from "@/utils/platform";
import { validateCSRF } from "@/lib/auth/csrf";
import { revokeDeviceSession } from "@/lib/auth/deviceSessions";
import { NotFoundError } from "@/lib/api/errors";

/**
 * DELETE /api/v1/auth/mobile/devices/{familyId} — signs one device out. A
 * family id that is not the caller's own matches nothing and answers 404.
 */
export const DELETE = withAuth<SurfboardRole>(
  async (req: NextRequest, { session }, routeCtx) => {
    // Bearer requests pass this automatically; a browser session must still
    // come from our own origin.
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { familyId } = await routeCtx.params;
    const count = await revokeDeviceSession(
      session.sub,
      Platform.SURFBOARD,
      familyId
    );
    if (count === 0) throw new NotFoundError("Device session");
    return NextResponse.json({ success: true, data: {} });
  },
  { platform: Platform.SURFBOARD, allowUnverified: true }
);
