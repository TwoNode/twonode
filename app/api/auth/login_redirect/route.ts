import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addBaseUrl } from "@/utils/addBaseUrl";
import { is_admin, USER_PERMS, REVA_ROLES } from "@/permissions";

export async function GET() {
  const cookieStore = cookies();
  const userType = cookieStore.get("USER_TYPE")?.value;
  const userRole = cookieStore.get("USER_ROLE")?.value;

  let redirectUrl = "/";

  if (userType === USER_PERMS.reva_user || userRole == REVA_ROLES.user) {
    redirectUrl = "/reva/dashboard";
  } else if (userType === "reva_admin" && is_admin(userRole)) {
    redirectUrl = "/reva-restricted/dashboard";
  } else if (userType === "scram_user") {
    redirectUrl = "/scram/dashboard";
  } else if (userType === "scram_admin") {
    redirectUrl = "/scram-restricted/dashboard";
  } else {
    redirectUrl = "/";
  }

  return NextResponse.redirect(addBaseUrl(redirectUrl));
}
