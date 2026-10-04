import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { clearAuthCookies, getAccessTokenCookie } from "@/lib/auth/cookies";
import { validateCSRF } from "@/lib/auth/csrf";
import { getServerSession, revokeUserSession } from "@/lib/auth/session";
import { verifyTokenAllowExpired } from "@/lib/auth/jwt";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";
import { clearEncryptedUserCookie } from "@/utils/encryptedCookies";

const logoutSchema = z.object({ platform: z.nativeEnum(Platform) });

export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }

    const { platform } = await validateBody(req, logoutSchema);

    // Identify user from active session or expired access token to revoke DB refresh tokens
    const session = await getServerSession(platform);
    let userId = session?.sub;
    if (!userId) {
      const rawToken = await getAccessTokenCookie(platform);
      if (rawToken) {
        const decoded = await verifyTokenAllowExpired(rawToken);
        // Signature-verified, and issued for THIS platform — a token minted
        // for another product must not revoke sessions here.
        if (decoded?.platform === platform) userId = decoded.sub;
      }
    }

    await revokeUserSession(platform, userId);

    const response = NextResponse.json({ success: true, data: {} });
    return await clearEncryptedUserCookie(response);
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
