import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getQREarningsSettings } from "@/surfboard/services/qrEarningsService";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * Not one of Step 9's originally-listed 5 routes — added while migrating,
 * since the admin QR-earnings settings page reads raw settings directly
 * (mutation stays in qrAdminActions.ts, out of scope here). Same
 * SUPERADMIN gate that page already enforces client-side.
 */
export const GET = withAuth<SurfboardRole>(
  async () => {
    const data = await getQREarningsSettings();
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.SUPERADMIN] }
);
