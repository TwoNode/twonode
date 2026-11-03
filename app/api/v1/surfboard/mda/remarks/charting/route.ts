import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getUniqueChartingRemarks } from "@/surfboard/services/mdaRemarkService";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * The charting reviewers' suggestion list: the 50 most recent distinct comments
 * written on any plan, which can name a plan, a person or a place. For the
 * Charting reviewer and the staff roles that may open the Charting page, not
 * for a surveyor or another stage (I-056).
 */
export const GET = withAuth<SurfboardRole>(
  async () => {
    const data = await getUniqueChartingRemarks();
    return NextResponse.json({ success: true, data });
  },
  {
    platform: Platform.SURFBOARD,
    roles: [
      SurfboardRole.CHARTING,
      SurfboardRole.MDA_SUPERADMIN,
      SurfboardRole.ADMIN,
      SurfboardRole.SUPERADMIN,
    ],
  }
);
