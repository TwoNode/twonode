import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getArchiveHistoryBatches, getPendingArchiveBatches } from "@/surfboard/services/batchApprovalService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req) => {
    const view = req.nextUrl.searchParams.get("view");
    const data = view === "history" ? await getArchiveHistoryBatches() : await getPendingArchiveBatches();
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.ARCHIVE, SurfboardRole.SUPERADMIN, SurfboardRole.MDA_SUPERADMIN] }
);
