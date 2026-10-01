import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getTicketByNumber } from "@/gbc/services/ticketService";

type RouteCtx = { params: Promise<{ ticketNumber: string }> };

/** Public — also backs the certificate page (gbc/certificate/[ticketNumber]). */
export async function GET(req: NextRequest, routeCtx: RouteCtx) {
  try {
    const { ticketNumber } = await routeCtx.params;
    const data = await getTicketByNumber(ticketNumber);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
