import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  handleApiError,
  ValidationError,
  NotFoundError,
} from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validate";
import { verifyDownloadToken } from "@/gbc/services/certificateOtpService";
import { getTicketByNumber } from "@/gbc/services/ticketService";
import { generateCertificatePdfBuffer } from "@/gbc/services/certificatePdfService";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().min(1),
  ticketNumber: z.string().min(1),
});

// ADR-0008: Stream PDF buffer after verifying short-lived download token.
// POST with the token in the body, not GET with it in the URL: URLs end up in
// server logs, browser history and Referer headers.
export async function POST(req: NextRequest) {
  try {
    const { token, ticketNumber } = await validateBody(req, bodySchema);

    // 1. Verify signed token signature and expiry
    const { ticketNumbers } = verifyDownloadToken(token);
    if (!ticketNumbers.includes(ticketNumber)) {
      throw new ValidationError({
        download: "Download token is not authorized for this ticket",
      });
    }

    // 2. Fetch ticket and confirm certificate status
    const ticket = await getTicketByNumber(ticketNumber);
    if (!ticket || !ticket.certificateIssued) {
      throw new NotFoundError("Certificate");
    }

    // 3. Render and stream PDF buffer directly
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
