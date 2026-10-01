import { NextRequest, NextResponse } from "next/server";
import { Platform } from "@/utils/platform";
import { getEncryptedUserData } from "@/utils/encryptedCookies";
import {
  canAccessRevaAdminPanel,
  canAccessRevaUserPanel,
  canAccessSurfAdminPanel,
  canAccessSurfUserPanel,
  canAccessSurfSuperAdminPanel,
  canAccessGBCAdminPanel,
  canAccessGBCUserPanel,
  isMDARole,
} from "@/permissions";

export async function GET(request: NextRequest) {
  console.log("login_redirect PAGE");
  const userData = await getEncryptedUserData();

  let redirectUrl = "/";

  if (!userData) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (userData.platform === Platform.REVA) {
    if (canAccessRevaAdminPanel(userData.role)) {
      redirectUrl = "/reva-restricted/dashboard";
    } else if (canAccessRevaUserPanel(userData.role)) {
      redirectUrl = "/reva/dashboard";
    }
  } else if (userData.platform === Platform.SCRAM) {
    if (userData.role === "ADMIN" || userData.role === "SUPERADMIN") {
      redirectUrl = "/scram-restricted/dashboard";
    } else if (userData.role === "USER") {
      redirectUrl = "/scram/dashboard";
    }
  } else if (userData.platform === Platform.SURFBOARD) {
    if (canAccessSurfSuperAdminPanel(userData.role)) {
      redirectUrl = "/surfboard-restricted/superadmin";
    } else if (canAccessSurfAdminPanel(userData.role)) {
      redirectUrl = "/surfboard-restricted/dashboard";
    } else if (isMDARole(userData.role)) {
      redirectUrl = "/surfboard-mda/dashboard";
    } else if (canAccessSurfUserPanel(userData.role)) {
      redirectUrl = "/surfboard/dashboard";
    }
  } else if (userData.platform === Platform.GBC) {
    if (canAccessGBCAdminPanel(userData.role)) {
      redirectUrl = "/gbc-restricted";
    } else if (canAccessGBCUserPanel(userData.role)) {
      redirectUrl = "/gbc";
    }
  }

  return NextResponse.redirect(new URL(redirectUrl, request.url));
}

// import { NextResponse } from "next/server";
// import { cookies } from "next/headers";
// import { addBaseUrl } from "@/utils/addBaseUrl";
// import { is_admin, USER_PERMS, REVA_ROLES } from "@/permissions";
// import { getAuthenticatedUser } from "@/utils/authUser";

// export async function GET() {
//   console.log("login_redirect PAGE");
//   const session = await getAuthenticatedUser();

//   let redirectUrl = "/";

//   if (!session) {
//     return NextResponse.redirect(addBaseUrl("/"));
//   }

//   const { userType, userRole } = session;

//   if (userType === USER_PERMS.reva_user || userRole === REVA_ROLES.user) {
//     redirectUrl = "/reva/dashboard";
//   } else if (userType === "reva_admin" && is_admin(userRole)) {
//     redirectUrl = "/reva-restricted/dashboard";
//   } else if (userType === "scram_user") {
//     redirectUrl = "/scram/dashboard";
//   } else if (userType === "scram_admin") {
//     redirectUrl = "/scram-restricted/dashboard";
//   } else {
//     redirectUrl = "/";
//   }

//   return NextResponse.redirect(addBaseUrl(redirectUrl));
// }
