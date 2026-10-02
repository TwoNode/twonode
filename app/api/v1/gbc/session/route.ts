import { NextRequest, NextResponse } from "next/server";
import { handleApiError, NotFoundError } from "@/lib/api/errors";
import { getEncryptedUserData } from "@/utils/encryptedCookies";
import { getNativeSessionAsLegacyUserData } from "@/lib/auth/session";
import { Platform } from "@/utils/platform";

/**
 * Same shape and fallback order as /api/v1/reva/session (legacy encrypted
 * cookie first, native JWT session adapted to the same shape second) — GBC
 * has the identical dual-auth situation (Kinde legacy admins alongside
 * native-login ones, see gbc/utils/auth.ts's requireAuth/requireAdmin
 * fallback), just never had its own /session route until the admin header
 * needed real user data (name/picture) for the notification bell area.
 */
export async function GET(req: NextRequest) {
  try {
    const userData =
      (await getEncryptedUserData()) ??
      (await getNativeSessionAsLegacyUserData(Platform.GBC));
    if (!userData) throw new NotFoundError("Session");
    return NextResponse.json({ success: true, data: userData });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
