import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getUniqueChartingRemarks } from "@/surfboard/services/mdaRemarkService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async () => {
    const data = await getUniqueChartingRemarks();
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
