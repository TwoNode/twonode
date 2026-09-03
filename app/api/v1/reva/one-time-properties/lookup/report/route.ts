import { NextRequest, NextResponse } from "next/server";
import { handleApiError, ValidationError } from "@/lib/api/errors";
import { downloadOneTimeRequestReport } from "@/reva/services/propertyRequestService";

/** Public — same reference+email pair, gated further on report.isApproved inside the service. */
export async function GET(req: NextRequest) {
  try {
    const reference = req.nextUrl.searchParams.get("reference");
    const email = req.nextUrl.searchParams.get("email");
    if (!reference || !email) throw new ValidationError({ reference: "reference and email are required" });
    const data = await downloadOneTimeRequestReport(reference, email);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
