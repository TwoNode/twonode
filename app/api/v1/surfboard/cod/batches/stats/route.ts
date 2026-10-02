import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import {
  getAllBatchStats,
  getBatchStatusStats,
} from "@/surfboard/services/remitaVerificationService";
import { Platform, SurfboardRole } from "@/utils/platform";

/** With ?status=, returns that one bucket's stats (Batch Management's two tabs). Without it, returns the breakdown across every status (Certificates page's overview cards). */
export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const status = req.nextUrl.searchParams.get("status");
    if (!status) {
      const data = await getAllBatchStats(ctx.session.role);
      return NextResponse.json({ success: true, data });
    }
    const data = await getBatchStatusStats(ctx.session.role, status);
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN],
  }
);
