import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getSettingsHistory } from "@/surfboard/services/settingsService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async () => {
    const data = await getSettingsHistory();
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN],
  }
);
