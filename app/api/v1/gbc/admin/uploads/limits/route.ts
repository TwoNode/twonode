import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getUploadLimits } from "@/gbc/services/cmsService";
import { Platform, GBCRole } from "@/utils/platform";

export const GET = withAuth<GBCRole>(
  async () => {
    return NextResponse.json({ success: true, data: getUploadLimits() });
  },
  { platform: Platform.GBC, roles: [GBCRole.ADMIN, GBCRole.SUPERADMIN] }
);
