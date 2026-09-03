import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { saveFormDataAndInitiatePaystack } from "@/reva/services/paymentService";

/** Public — a guest submitting a due-diligence request has no session, matching Surfboard's public QR-payment routes. Multipart, not JSON. */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const data = await saveFormDataAndInitiatePaystack(formData);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
