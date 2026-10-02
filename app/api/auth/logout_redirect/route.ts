import { NextResponse, NextRequest } from "next/server";
import { Platform } from "@/utils/platform";
import {
  clearEncryptedUserCookie,
  getEncryptedUserData,
} from "@/utils/encryptedCookies";
import { getEffectiveUserData, revokeUserSession } from "@/lib/auth/session";
import {
  canAccessRevaAdminPanel,
  canAccessSurfAdminPanel,
  canAccessSurfSuperAdminPanel,
  canAccessGBCAdminPanel,
  isMDARole,
} from "@/permissions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Check if we have an explicit platform we're logging out from
    const fromPlatform = searchParams.get("from") as Platform | null;

    // getEncryptedUserData only reads the legacy Kinde-derived cookie, which
    // a natively-authenticated session (JWT cookie, e.g. Surfboard's
    // access_token_surfboard) never has — that left native users with
    // userData === null here, falling through to the "/" default below
    // instead of their platform's login page. getEffectiveUserData checks
    // the native session first (given an explicit platform to check it
    // against), falling back to the legacy cookie either way.
    const userData = fromPlatform
      ? await getEffectiveUserData(fromPlatform)
      : await getEncryptedUserData(request);

    let redirectUrl = "/";

    if (userData) {
      // Determine which platform session to use for the redirect decision
      // Prioritize 'from' param, then legacy 'platform' field
      const activePlatform =
        fromPlatform ||
        userData.platform ||
        (Object.keys(userData.platforms)[0] as Platform);
      const session = userData.platforms[activePlatform];
      const role = session?.role || userData.role || "";

      if (activePlatform === Platform.REVA) {
        if (canAccessRevaAdminPanel(role)) {
          redirectUrl = "/reva-restricted/login";
        } else {
          redirectUrl = "/reva/login";
        }
      } else if (activePlatform === Platform.SCRAM) {
        // Scram uses Reva admin check for now as per previous implementation
        if (canAccessRevaAdminPanel(role)) {
          redirectUrl = "/scram-restricted/login";
        } else {
          redirectUrl = "/scram/login";
        }
      } else if (activePlatform === Platform.SURFBOARD) {
        if (canAccessSurfSuperAdminPanel(role)) {
          redirectUrl = "/surfboard-restricted/login";
        } else if (canAccessSurfAdminPanel(role)) {
          redirectUrl = "/surfboard-restricted/login";
        } else if (isMDARole(role)) {
          redirectUrl = "/surfboard-mda/login";
        } else {
          redirectUrl = "/surfboard/login";
        }
      } else if (activePlatform === Platform.GBC) {
        if (canAccessGBCAdminPanel(role)) {
          redirectUrl = "/gbc-restricted/login";
        } else {
          redirectUrl = "/gbc/login";
        }
      }
    }

    // Revoke all active refresh tokens in the database and clear the native
    // JWT session cookies for this platform.
    const targetPlatform =
      fromPlatform || (userData?.platform as Platform) || null;
    const userId = userData?.userId || null;
    await revokeUserSession(targetPlatform, userId);

    // Clear the cookie and redirect
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));

    // Apply cookie clearing to the response
    const clearedResponse = await clearEncryptedUserCookie(response);

    return clearedResponse;
  } catch (error) {
    console.error("Error in logout handler:", error);
    // Fallback redirect to home page
    const response = NextResponse.redirect(new URL("/", request.url));
    return await clearEncryptedUserCookie(response);
  }
}
