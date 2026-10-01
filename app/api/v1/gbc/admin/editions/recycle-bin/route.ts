import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getDeletedEditions } from "@/gbc/services/editionService";
import { Platform, GBCRole } from "@/utils/platform";

export const GET = withAuth<GBCRole>(
  async () => {
    const data = await getDeletedEditions();
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.GBC, roles: [GBCRole.SUPERADMIN] }
);
