import { NextRequest, NextResponse } from "next/server";
import { getPlanQRAccessState } from "@/surfboard/services/qrEarningsService";
import { handleApiError } from "@/lib/api/errors";

/**
 * Public — no auth. Anonymous QR scanners and the public plan page both
 * need this to work without a session.
 */
export async function GET(req: NextRequest) {
  try {
    const planId = req.nextUrl.searchParams.get("planId");
    const token = req.nextUrl.searchParams.get("token") ?? undefined;
    if (!planId) {
      return NextResponse.json({ success: false, error: "Missing planId" }, { status: 400 });
    }

    const data = await getPlanQRAccessState(planId, token);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err);
  }
}
