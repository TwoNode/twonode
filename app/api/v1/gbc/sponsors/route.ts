import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getSponsors } from "@/gbc/services/cmsService";

export async function GET(req: NextRequest) {
  try {
    const data = await getSponsors();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
