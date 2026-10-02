import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getCoordinateShifts } from "@/surfboard/services/settingsService";

/** Public in the source too — used by map components that may render on public plan pages. */
export async function GET(req: NextRequest) {
  try {
    const data = await getCoordinateShifts();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
