import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getRecordsIIBatches, getRecordsIIHistoryBatches } from "@/surfboard/services/batchApprovalService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const view = req.nextUrl.searchParams.get("view");
    const data = view === "history" ? await getRecordsIIHistoryBatches() : await getRecordsIIBatches(ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.RECORDS_II, SurfboardRole.SUPERADMIN, SurfboardRole.MDA_SUPERADMIN] }
);
