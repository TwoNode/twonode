import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addBaseUrl } from "@/utils/addBaseUrl";
import { is_admin, REVA_ROLES, USER_PERMS } from "@/permissions";

export async function GET() {
  const userTypeCookie = cookies().get("USER_TYPE");
  const userRole = cookies().get("USER_ROLE")?.value;

  cookies().set("USER_TYPE", "", { maxAge: 0 });
  cookies().delete("USER_TYPE");

  cookies().set("USER_ROLE", "", { maxAge: 0 });
  cookies().delete("USER_ROLE");

  let redirectUrl = "/";

  if (userTypeCookie?.value === USER_PERMS.reva_user || userRole == REVA_ROLES.user) {
    redirectUrl = "/reva/login";
  } else if (userTypeCookie?.value === "reva_admin" && is_admin(userRole)) {
    redirectUrl = "/reva-restricted/login";
  } else if (userTypeCookie?.value === "scram_user") {
    redirectUrl = "/scram/login";
  }

  return NextResponse.redirect(addBaseUrl(redirectUrl));
}
