import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getPendingCountByRole } from "@/surfboard/services/batchApprovalService";
import { Platform, SurfboardRole } from "@/utils/platform";

/** Sidebar badge counts — every MDA-adjacent role can read this, matching the source's wide allow-list. */
export const GET = withAuth<SurfboardRole>(
  async () => {
    const data = await getPendingCountByRole();
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [
      SurfboardRole.ADMIN,
      SurfboardRole.SUPERADMIN,
      SurfboardRole.ACCOUNTS,
      SurfboardRole.CHARTING,
      SurfboardRole.SURCON,
      SurfboardRole.RECORDS_I,
      SurfboardRole.INTAKE,
      SurfboardRole.RECORDS_II,
      SurfboardRole.ARCHIVE,
      SurfboardRole.MDA_SUPERADMIN,
    ],
  }
);
