import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyQRServicePayment } from "@/surfboard/services/qrEarningsService";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";

const verifySchema = z.object({
  reference: z.string().min(1),
  paystackRef: z.string().optional(),
});

/** Public — same anonymous-payer reasoning as /payments. */
export async function POST(req: NextRequest) {
  try {
    const { reference, paystackRef } = await validateBody(req, verifySchema);
    const data = await verifyQRServicePayment(reference, paystackRef);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
