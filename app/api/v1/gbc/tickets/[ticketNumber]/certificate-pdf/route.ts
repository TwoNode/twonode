import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getTicketByNumber } from "@/gbc/services/ticketService";
import { generateCertificatePdfBuffer } from "@/gbc/services/certificatePdfService";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ ticketNumber: string }> };

/** Public — same trust boundary as tickets/[ticketNumber] and the certificate
 * page itself: a ticket number alone is enough to view/print a certificate,
 * same as the old print-only flow, just server-rendered now. */
export async function GET(req: NextRequest, routeCtx: RouteCtx) {
  try {
    const { ticketNumber } = await routeCtx.params;
    const ticket = await getTicketByNumber(ticketNumber);
    const pdfBuffer = await generateCertificatePdfBuffer(ticket);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="GBC-Certificate-${ticketNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
