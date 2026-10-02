import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getCurrentEdition } from "@/gbc/services/editionService";

/** Public — which edition the site is currently about (e.g. for the auth pages' footer). */
export async function GET(req: NextRequest) {
  try {
    const data = await getCurrentEdition();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
