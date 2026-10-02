import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import {
  getIntakeBatches,
  getIntakeHistoryBatches,
} from "@/surfboard/services/batchApprovalService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req) => {
    const view = req.nextUrl.searchParams.get("view");
    const data =
      view === "history"
        ? await getIntakeHistoryBatches()
        : await getIntakeBatches();
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [
      SurfboardRole.INTAKE,
      SurfboardRole.SUPERADMIN,
      SurfboardRole.MDA_SUPERADMIN,
    ],
  }
);
