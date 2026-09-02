import { NextRequest, NextResponse } from "next/server";
import { handleApiError, NotFoundError } from "@/lib/api/errors";
import { getEncryptedUserData } from "@/utils/encryptedCookies";

/**
 * Migrated from reva/actions/authActions.ts's getRevaUserData. Reads the
 * legacy multi-platform encrypted USER_SESSION cookie — a separate,
 * not-yet-unified session system from the native JWT one every other
 * /api/v1/reva/* route uses, kept here as-is since it's what
 * useRevaUserAccess/useRevaAdminAccess need for their client-side
 * UX gate (proxy.ts is still the real server-side security boundary).
 */
export async function GET(req: NextRequest) {
  try {
    const userData = await getEncryptedUserData();
    if (!userData) throw new NotFoundError("Session");
    return NextResponse.json({ success: true, data: userData });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
