import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addBaseUrl } from "@/utils/addBaseUrl";

export async function GET() {
  const userTypeCookie = cookies().get("USER_TYPE");

  cookies().set("USER_TYPE", "", { maxAge: 0 });
  cookies().delete("USER_TYPE");

  let redirectUrl = "/";

  if (userTypeCookie?.value === "reva_user") {
    redirectUrl = "/reva/login";
  } else if (userTypeCookie?.value === "reva_admin") {
    redirectUrl = "/reva-restricted/login";
  } else if (userTypeCookie?.value === "scram_user") {
    redirectUrl = "/scram/login";
  }

  return NextResponse.redirect(addBaseUrl(redirectUrl));
}
