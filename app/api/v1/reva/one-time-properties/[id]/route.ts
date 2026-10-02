import { NextRequest, NextResponse } from "next/server";
import { handleApiError, ValidationError } from "@/lib/api/errors";
import { getUserPropertyById } from "@/reva/services/propertyRequestService";

/** Public — guest data, gated on an email match (resolved open question — the source had no such check here, unlike every other guest-data route in this product). */
export async function GET(
  req: NextRequest,
  routeCtx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await routeCtx.params;
    const email = req.nextUrl.searchParams.get("email");
    if (!email) throw new ValidationError({ email: "email is required" });
    const data = await getUserPropertyById(id, email);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
