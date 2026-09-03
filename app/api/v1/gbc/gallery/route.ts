import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getGalleryItems } from "@/gbc/services/cmsService";

export async function GET(req: NextRequest) {
  try {
    const yearParam = req.nextUrl.searchParams.get("year");
    const data = await getGalleryItems(yearParam ? Number(yearParam) : undefined);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
