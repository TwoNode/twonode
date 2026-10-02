import { NextRequest, NextResponse } from "next/server";
import { handleApiError, NotFoundError } from "@/lib/api/errors";
import { getEncryptedUserData } from "@/utils/encryptedCookies";
import { getNativeSessionAsLegacyUserData } from "@/lib/auth/session";
import { Platform } from "@/utils/platform";

/**
 * The legacy multi-platform cookie session (used by access-control hooks),
 * not the native JWT one — mirrors reva's session route, including the
 * native-session fallback for the same reason.
 */
export async function GET(req: NextRequest) {
  try {
    const userData =
      (await getEncryptedUserData()) ??
      (await getNativeSessionAsLegacyUserData(Platform.SURFBOARD));
    if (!userData) throw new NotFoundError("Session");
    return NextResponse.json({ success: true, data: userData });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
