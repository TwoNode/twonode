import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getPreviousSettings } from "@/gbc/services/settingsService";
import { Platform, GBCRole } from "@/utils/platform";

export const GET = withAuth<GBCRole>(
  async () => {
    const data = await getPreviousSettings();
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
