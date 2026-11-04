import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { Platform, SurfboardRole } from "@/utils/platform";
import { listDeviceSessions } from "@/lib/auth/deviceSessions";

/** GET /api/v1/auth/mobile/devices — the caller's signed-in app devices. */
export const GET = withAuth<SurfboardRole>(
  async (_req, { session }) => {
    const devices = await listDeviceSessions(session.sub, Platform.SURFBOARD);
    return NextResponse.json({ success: true, data: devices });
  },
  // Signed-in devices must be manageable even while email verification is
  // still outstanding.
  { platform: Platform.SURFBOARD, allowUnverified: true }
);
