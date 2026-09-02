import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/withAuth";
import { getUserActiveSubscription } from "@/surfboard/services/subscriptionService";
import { Platform, SurfboardRole } from "@/utils/platform";

export const GET = withAuth<SurfboardRole>(
  async (_req, ctx) => {
    const data = await getUserActiveSubscription(ctx.session.sub);
    return NextResponse.json({ success: true, data });
  },
  { platform: Platform.SURFBOARD }
);
