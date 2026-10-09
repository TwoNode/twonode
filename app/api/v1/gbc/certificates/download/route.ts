import { NextRequest, NextResponse } from "next/server";
import {
  handleApiError,
  ValidationError,
  NotFoundError,
} from "@/lib/api/errors";
import { verifyDownloadToken } from "@/gbc/services/certificateOtpService";
import { getTicketByNumber } from "@/gbc/services/ticketService";
import { generateCertificatePdfBuffer } from "@/gbc/services/certificatePdfService";

export const runtime = "nodejs";

// ADR-0008: Stream PDF buffer after verifying short-lived download token
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    const ticketNumber = req.nextUrl.searchParams.get("ticketNumber");

    if (!token || !ticketNumber) {
      throw new ValidationError({
        download: "Both download token and ticketNumber are required",
      });
    }

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
