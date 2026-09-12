import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getAdminSurfPlansStats } from "@/surfboard/services/planService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async () => {
    const data = await getAdminSurfPlansStats();
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN] }
);
