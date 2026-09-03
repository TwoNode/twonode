import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getPublicSurfPlanByIdWithSurveyor } from "@/surfboard/services/planService";

type RouteCtx = { params: Promise<{ planId: string }> };

/** Public, ungated — full plan data, no redaction. Increments the QR scan counter. */
export async function GET(req: NextRequest, routeCtx: RouteCtx) {
  try {
    const { planId } = await routeCtx.params;
    const data = await getPublicSurfPlanByIdWithSurveyor(planId);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
