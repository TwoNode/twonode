import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getSurveyorEarningsOverview } from "@/surfboard/services/qrEarningsService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (_req, { session }) => {
    const data = await getSurveyorEarningsOverview(session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
