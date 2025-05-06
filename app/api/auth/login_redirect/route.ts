import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addBaseUrl } from "@/utils/addBaseUrl";

export async function GET() {
  const cookieStore = cookies();
  const userType = cookieStore.get("USER_TYPE")?.value;

  let redirectUrl = "/";

  if (userType === "reva_user") {
    redirectUrl = "/reva/dashboard";
  } else if (userType === "reva_admin") {
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
