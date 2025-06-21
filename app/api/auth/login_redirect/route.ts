import { NextResponse } from "next/server";
import { addBaseUrl } from "@/utils/addBaseUrl";
import { Platform } from "@/utils/platform";
import {
  canAccessRevaAdminPanel,
  canAccessRevaUserPanel,
  getEncryptedUserData,
} from "@/utils/encryptedCookies";

export async function GET() {
  console.log("login_redirect PAGE");
  const userData = await getEncryptedUserData();

  let redirectUrl = "/";

  if (!userData) {
    return NextResponse.redirect(addBaseUrl("/"));
  }

  if (userData.platform === Platform.REVA) {
    if (canAccessRevaAdminPanel(userData)) {
      redirectUrl = "/reva-restricted/dashboard";
    } else if (canAccessRevaUserPanel(userData)) {
      redirectUrl = "/reva/dashboard";
    }
  } else if (userData.platform === Platform.SCRAM) {
    if (userData.role === "ADMIN" || userData.role === "SUPERADMIN") {
      redirectUrl = "/scram-restricted/dashboard";
    } else if (userData.role === "USER") {
      redirectUrl = "/scram/dashboard";
    }
  }

  return NextResponse.redirect(addBaseUrl(redirectUrl));
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
