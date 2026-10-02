import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import {
  getAccountsBatches,
  getAccountsHistory,
} from "@/surfboard/services/batchApprovalService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (req) => {
    const view = req.nextUrl.searchParams.get("view");
    const data =
      view === "history"
        ? await getAccountsHistory()
        : await getAccountsBatches();
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [
      SurfboardRole.ACCOUNTS,
      SurfboardRole.SUPERADMIN,
      SurfboardRole.MDA_SUPERADMIN,
    ],
  }
);
