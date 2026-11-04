import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getSubscriptionAnalytics } from "@/surfboard/services/subscriptionAnalyticsService";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * Staff only (I-052). The answer holds other people's user ids and the Paystack
 * subscription code and email token of subscriptions that are missing one of
 * them, so it must not reach an ordinary surveyor. The development widget
 * that calls it (SubscriptionAdminFAB, rendered only when NODE_ENV is
 * "development") signs in as a surveyor, so in development that role may call
 * it too; on Vercel (staging and production) NODE_ENV is "production".
 */
const roles =
  process.env.NODE_ENV === "development"
    ? [SurfboardRole.USER, SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN]
    : [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN];

export const GET = withAuth<SurfboardRole>(
  async () => {
    const data = await getSubscriptionAnalytics();
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles }
);
