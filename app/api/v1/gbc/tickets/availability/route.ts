import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getTicketAvailability } from "@/gbc/services/ticketService";

/** Public — capacity only, no revenue. Backs the homepage/purchase-page "N tickets remaining" banners. */
export async function GET(req: NextRequest) {
  try {
    const data = await getTicketAvailability();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
