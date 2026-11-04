import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { developmentOnly } from "@/lib/api/developmentOnly";
import { validateCSRF } from "@/lib/auth/csrf";
import { clearUserSubscription } from "@/surfboard/services/subscriptionAnalyticsService";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * A debug tool (SubscriptionAdminFAB, rendered only when NODE_ENV is
 * "development"): it deletes the caller's own subscription and its history
 * without telling Paystack, which would keep charging. It exists only on a
 * development server; staging and production answer 404 (I-053).
 */
export const POST = developmentOnly(
  withAuth<SurfboardRole>(
    async (req, ctx) => {
      if (!validateCSRF(req)) {
        return NextResponse.json(
          { success: false, error: "Cross-origin request blocked" },
          { status: 403 }
        );
      }
      const data = await clearUserSubscription(ctx.session.sub);
      return NextResponse.json({ success: true, data });
    },
    { platform: Platform.SURFBOARD }
  )
);
