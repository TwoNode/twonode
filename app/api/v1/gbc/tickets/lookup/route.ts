import { NextRequest, NextResponse } from "next/server";
import { handleApiError, ValidationError } from "@/lib/api/errors";
import { lookupMyTicket, withSignedQr } from "@/gbc/services/ticketService";

/** Public — ticket number + email is the real guest-auth pattern (GBCTicket has no relation to GBCUser). Backs "My Ticket". */
export async function GET(req: NextRequest) {
  try {
    const ticketNumber = req.nextUrl.searchParams.get("ticketNumber");
    const email = req.nextUrl.searchParams.get("email");
    if (!ticketNumber || !email) {
      throw new ValidationError({
        ticketNumber: "ticketNumber and email are required",
      });
    }
    const data = await withSignedQr(await lookupMyTicket(ticketNumber, email));
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
