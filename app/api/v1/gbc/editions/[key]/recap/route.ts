import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getEditionPublicRecap } from "@/gbc/services/editionService";

type RouteCtx = { params: Promise<{ key: string }> };

/** Public — no revenue. Backs the Past Editions page's per-edition recap. */
export async function GET(req: NextRequest, routeCtx: RouteCtx) {
  try {
    const { key } = await routeCtx.params;
    const data = await getEditionPublicRecap(key);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
