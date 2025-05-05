import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const userTypeCookie = cookies().get("USER_TYPE");

  cookies().set("USER_TYPE", "", { maxAge: 0 });
  cookies().delete("USER_TYPE");

  if (userTypeCookie?.value === "reva_user") {
    return NextResponse.redirect("/reva/login");
  } else if (userTypeCookie?.value === "scram_user") {
    return NextResponse.redirect("/scram/login");
  } else {
    return NextResponse.redirect("/");
  }
}
