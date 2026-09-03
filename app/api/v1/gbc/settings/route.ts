import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getSettings } from "@/gbc/services/settingsService";

/** Public — event details are meant to be shown on the public site, matches the source having no auth check on the read path. */
export async function GET(req: NextRequest) {
  try {
    const data = await getSettings();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
