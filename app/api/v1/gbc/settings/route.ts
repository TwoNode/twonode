import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getSettings } from "@/gbc/services/settingsService";

/** Public — event details are meant to be shown on the public site, matches the source having no auth check on the read path. `?edition=` picks an edition; without it, the one the public site shows. */
export async function GET(req: NextRequest) {
  try {
    const data = await getSettings(
      req.nextUrl.searchParams.get("edition") || undefined
    );
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
