import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getCodSubmissionSettings } from "@/surfboard/services/settingsService";

/** Public in the source too — no auth check, just plain config for the CoD-submission modal. */
export async function GET(req: NextRequest) {
  try {
    const data = await getCodSubmissionSettings();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
