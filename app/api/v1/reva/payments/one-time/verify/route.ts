import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validate";
import { checkPaymentSuccess } from "@/reva/services/paymentService";

const verifySchema = z.object({ reference: z.string().min(1) });

/** Public — same anonymous-payer reasoning as Surfboard's QR payment routes. */
export async function POST(req: NextRequest) {
  try {
    const { reference } = await validateBody(req, verifySchema);
    const data = await checkPaymentSuccess(reference);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
