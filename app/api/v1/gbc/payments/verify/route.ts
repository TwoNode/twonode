import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validate";
import { verifyPayment, withSignedQr } from "@/gbc/services/ticketService";

const bodySchema = z.object({
  reference: z.string().min(1),
  sendEmail: z.boolean().optional(),
});

/** Public — reached from gbc/tickets/success's server-side render after the Paystack redirect; also called by the webhook's handleGBC (Phase 4 step 11). */
export async function POST(req: NextRequest) {
  try {
    const { reference, sendEmail } = await validateBody(req, bodySchema);
    const result = await verifyPayment(reference, sendEmail);
    const data = {
      ...result,
      tickets: await Promise.all(result.tickets.map(withSignedQr)),
    };
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
