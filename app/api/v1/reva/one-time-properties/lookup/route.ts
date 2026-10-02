import { NextRequest, NextResponse } from "next/server";
import { handleApiError, ValidationError } from "@/lib/api/errors";
import { getOneTimeRequestByReference } from "@/reva/services/propertyRequestService";

/** Public — reference+email is the real guest-auth pattern used everywhere else in REVA for one-time requests. Backs the reva/onetimerequest tracking page. */
export async function GET(req: NextRequest) {
  try {
    const reference = req.nextUrl.searchParams.get("reference");
    const email = req.nextUrl.searchParams.get("email");
    if (!reference || !email)
      throw new ValidationError({
        reference: "reference and email are required",
      });
    const data = await getOneTimeRequestByReference(reference, email);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
