import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validate";
import { createTicket } from "@/gbc/services/ticketService";
import { ticketPurchaseSchema } from "@/gbc/utils/validations";

/** Public — buying a ticket has no session, matching REVA's guest one-time-request purchase route. */
export async function POST(req: NextRequest) {
  try {
    const data = await validateBody(req, ticketPurchaseSchema);
    const result = await createTicket(data);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
