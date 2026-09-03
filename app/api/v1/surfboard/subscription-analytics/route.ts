import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getSubscriptionAnalytics } from "@/surfboard/services/subscriptionAnalyticsService";
import { Platform, SurfboardRole } from "@/utils/platform";

/** No stricter role check in the source either — just "any authenticated surfboard user"; a dev-only debug widget. */
export const GET = withAuth<SurfboardRole>(
  async () => {
    const data = await getSubscriptionAnalytics();
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
