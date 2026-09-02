import { NextRequest, NextResponse } from "next/server";
import { handleApiError, NotFoundError } from "@/lib/api/errors";
import { getEncryptedUserData } from "@/utils/encryptedCookies";

/** The legacy multi-platform cookie session (used by access-control hooks), not the native JWT one — mirrors reva's session route. */
export async function GET(req: NextRequest) {
  try {
    const userData = await getEncryptedUserData();
    if (!userData) throw new NotFoundError("Session");
    return NextResponse.json({ success: true, data: userData });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
