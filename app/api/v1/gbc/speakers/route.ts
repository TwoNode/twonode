import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getSpeakers } from "@/gbc/services/cmsService";

export async function GET(req: NextRequest) {
  try {
    const data = await getSpeakers();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
