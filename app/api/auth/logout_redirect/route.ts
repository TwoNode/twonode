import { NextResponse, NextRequest } from "next/server";
import { addBaseUrl } from "@/utils/addBaseUrl";
import { Platform } from "@/utils/platform";
import {
  clearEncryptedUserCookie,
  getEncryptedUserData,
} from "@/utils/encryptedCookies";
import {
  canAccessRevaAdminPanel,
  canAccessSurfAdminPanel,
  canAccessSurfSuperAdminPanel,
  canAccessGBCAdminPanel,
  isMDARole,
} from "@/permissions";

export async function GET(request: NextRequest) {
  try {
    const userData = await getEncryptedUserData(request);
    const { searchParams } = new URL(request.url);
    
    // Check if we have an explicit platform we're logging out from
    const fromPlatform = searchParams.get("from") as Platform | null;

    let redirectUrl = "/";

    if (userData) {
      // Determine which platform session to use for the redirect decision
      // Prioritize 'from' param, then legacy 'platform' field
      const activePlatform = fromPlatform || userData.platform || Object.keys(userData.platforms)[0] as Platform;
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

    // Clear the cookie and redirect
    const response = NextResponse.redirect(addBaseUrl(redirectUrl));

    // Apply cookie clearing to the response
    const clearedResponse = await clearEncryptedUserCookie(response);

    return clearedResponse;
  } catch (error) {
    console.error("Error in logout handler:", error);
    // Fallback redirect to home page
    const response = NextResponse.redirect(addBaseUrl("/"));
    return await clearEncryptedUserCookie(response);
  }
}
