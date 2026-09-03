import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { ValidationError } from "@/lib/api/errors";
import {
  getStatCards,
  getDimensionBreakdown,
  getLodgementTrend,
  getTimeTrend,
  getUserDashboardAnalytics,
  type AnalyticsDimension,
} from "@/surfboard/services/analyticsService";
import { Platform, SurfboardRole } from "@/utils/platform";

/**
 * ADMIN/SUPERADMIN get the full-population view, USER gets their own plans
 * only (analyticsService.ts scopes by session role automatically). MDA
 * stage roles use /mda/stage-stats instead — queue depth/time-in-stage, not
 * these platform-wide numbers.
 *
 * ?section=stats|dimension|lodgement-trend|time-trend (default: stats)
 * ?dimension=facilitator|lga|ward|lcda (required when section=dimension)
 */
const DIMENSIONS = ["facilitator", "lga", "ward", "lcda"] as const;
export const GET = withAuth<SurfboardRole>(
  async (req, ctx) => {
    const section = req.nextUrl.searchParams.get("section") ?? "stats";
    const scope = { role: ctx.session.role, userId: ctx.session.sub };

    if (section === "stats") {
      return NextResponse.json({ success: true, data: await getStatCards(scope) });
    }

    if (section === "dimension") {
      const dimension = req.nextUrl.searchParams.get("dimension");
      if (!DIMENSIONS.includes(dimension as (typeof DIMENSIONS)[number])) {
        throw new ValidationError({ dimension: `must be one of ${DIMENSIONS.join("|")}` });
      }
      return NextResponse.json({
        success: true,
        data: await getDimensionBreakdown(scope, dimension as AnalyticsDimension),
      });
    }

    if (section === "lodgement-trend") {
      return NextResponse.json({ success: true, data: await getLodgementTrend(scope) });
    }

    if (section === "time-trend") {
      return NextResponse.json({ success: true, data: await getTimeTrend(scope) });
    }

    if (section === "dashboard") {
      return NextResponse.json({ success: true, data: await getUserDashboardAnalytics(ctx.session.sub) });
    }

    throw new ValidationError({ section: "must be one of stats|dimension|lodgement-trend|time-trend|dashboard" });
  },
  { platform: Platform.SURFBOARD, roles: [SurfboardRole.USER, SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN] }
);
