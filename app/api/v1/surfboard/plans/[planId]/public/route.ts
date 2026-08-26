import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getGatedPublicSurfPlan } from "@/surfboard/services/planService";

type RouteCtx = { params: Promise<{ planId: string }> };

/** Public, QR-gated: redacts geometry/pillars/centroid/user unless the caller has a PAID_ACTIVE or FREE QR-earnings session. */
export async function GET(req: NextRequest, routeCtx: RouteCtx) {
  try {
    const { planId } = await routeCtx.params;
    const token = req.nextUrl.searchParams.get("token") ?? undefined;
    const data = await getGatedPublicSurfPlan(planId, token);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
