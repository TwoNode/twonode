import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getTransactionData } from "@/reva/services/propertyRequestService";

/** Public — matches the source (reference-only, no email check; used by the post-Paystack redirect landing page which only has the reference in the URL). */
export async function GET(req: NextRequest, routeCtx: { params: Promise<{ reference: string }> }) {
  try {
    const { reference } = await routeCtx.params;
    const data = await getTransactionData(reference);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
