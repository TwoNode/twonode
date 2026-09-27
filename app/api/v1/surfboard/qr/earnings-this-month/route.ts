import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getSurveyorEarningsThisMonth } from "@/surfboard/services/qrEarningsService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (_req, { session }) => {
    const amount = await getSurveyorEarningsThisMonth(session.sub);
    return NextResponse.json({ success: true, data: { amount } });
  },
  { platform: Platform.SURFBOARD }
);
