import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getPartners } from "@/gbc/services/cmsService";

export async function GET(req: NextRequest) {
  try {
    const edition = req.nextUrl.searchParams.get("edition") ?? undefined;
    const data = await getPartners(edition);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
