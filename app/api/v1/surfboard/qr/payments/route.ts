import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { initiateQRServicePayment } from "@/surfboard/services/qrEarningsService";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";

const initiateSchema = z.object({
  planId: z.string().min(1),
  serviceType: z.enum(["LOCATION_AUTHENTICITY", "CERTIFICATE_OF_DEPOSIT"]),
  payerEmail: z.string().email().optional(),
  payerName: z.string().optional(),
});

/**
 * Public — the payer is an anonymous person unlocking a public plan, not a
 * logged-in Surfboard user, so there's no session to check here.
 */
export async function POST(req: NextRequest) {
  try {
    const { planId, serviceType, payerEmail, payerName } = await validateBody(req, initiateSchema);
    const data = await initiateQRServicePayment(planId, serviceType, payerEmail, payerName);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
