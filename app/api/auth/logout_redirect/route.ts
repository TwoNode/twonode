import { NextResponse } from "next/server";
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
} from "@/permissions";

export async function GET() {
  try {
    const userData = await getEncryptedUserData();

    let redirectUrl = "/";

    if (userData) {
      if (userData.platform === Platform.REVA) {
        if (canAccessRevaAdminPanel(userData.role)) {
          redirectUrl = "/reva-restricted/login";
        } else {
          redirectUrl = "/reva/login";
        }
      } else if (userData.platform === Platform.SCRAM) {
        if (canAccessRevaAdminPanel(userData.role)) {
          redirectUrl = "/scram-restricted/login";
        } else {
          redirectUrl = "/scram/login";
        }
      } else if (userData.platform === Platform.SURFBOARD) {
        if (canAccessSurfSuperAdminPanel(userData.role)) {
          redirectUrl = "/surf-restricted/login";
        } else if (canAccessSurfAdminPanel(userData.role)) {
          redirectUrl = "/surf-restricted/login";
        } else {
          redirectUrl = "/surfboard/login";
        }
      }
    }

    // Clear the cookie and redirect
    const response = NextResponse.redirect(addBaseUrl(redirectUrl));

    // Apply cookie clearing to the response
    const clearedResponse = clearEncryptedUserCookie(response);

    return clearedResponse;
  } catch (error) {
    console.error("Error in logout handler:", error);
    // Fallback redirect to home page
    const response = NextResponse.redirect(addBaseUrl("/"));
    return clearEncryptedUserCookie(response);
  }
}
