import { NextRequest, NextResponse } from "next/server";
import {
  handleApiError,
  ValidationError,
  NotFoundError,
} from "@/lib/api/errors";
import { getTicketByNumber } from "@/gbc/services/ticketService";
import { generateCertificatePdfBuffer } from "@/gbc/services/certificatePdfService";
import { verifyDownloadToken } from "@/gbc/services/certificateOtpService";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ ticketNumber: string }> };

// ADR-0008: Direct public download without verified token is disabled.
export async function GET(req: NextRequest, routeCtx: RouteCtx) {
  try {
    const { ticketNumber } = await routeCtx.params;
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Direct public download is retired. Please request a verification code to download your certificate.",
        },
        { status: 403 }
      );
    }

    const { ticketNumbers } = verifyDownloadToken(token);
    if (!ticketNumbers.includes(ticketNumber)) {
      throw new ValidationError({
        download: "Download token is not authorized for this ticket",
      });
    }

    const ticket = await getTicketByNumber(ticketNumber);
    if (!ticket || !ticket.certificateIssued) {
      throw new NotFoundError("Certificate");
    }

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
