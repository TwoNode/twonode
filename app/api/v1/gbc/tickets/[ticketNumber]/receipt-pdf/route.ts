import { NextRequest, NextResponse } from "next/server";
import { handleApiError, NotFoundError } from "@/lib/api/errors";
import { getTicketByNumber } from "@/gbc/services/ticketService";
import { generateTicketReceiptPdfBuffer } from "@/gbc/services/receiptPdfService";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ ticketNumber: string }> };

/** Public — same trust boundary as tickets/[ticketNumber] and the
 * certificate-pdf route: a ticket number alone is enough to re-download
 * its receipt, matching how the success page already links the QR code. */
export async function GET(req: NextRequest, routeCtx: RouteCtx) {
  try {
    const { ticketNumber } = await routeCtx.params;
    const ticket = await getTicketByNumber(ticketNumber);
    if (ticket.paymentStatus !== "COMPLETED") throw new NotFoundError("Receipt");
    const pdfBuffer = await generateTicketReceiptPdfBuffer(ticket);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="GBC-Receipt-${ticketNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
