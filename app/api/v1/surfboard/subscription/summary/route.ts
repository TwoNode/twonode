import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getSubscriptionSummary } from "@/surfboard/services/subscriptionService";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * GET /api/v1/surfboard/subscription/summary — the subscription as the mobile
 * app shows it (TASK-0015 1F.5): state (none, active, ending, grace, ended),
 * plan name, interval and when the paid period ends. Status only: no price,
 * card or payment details (ADR-0003). Unlike `user-and-active` it also reports
 * a subscription that has ended.
 */
export const GET = withAuth<SurfboardRole>(
  async (_req, ctx) => {
    const data = await getSubscriptionSummary(ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER] }
);
