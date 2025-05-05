import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = cookies();
  const userType = cookieStore.get("USER_TYPE")?.value;

  if (userType === "reva_user") {
    return NextResponse.redirect("/reva/dashboard");
  } else if (userType === "scram_user") {
    return NextResponse.redirect("/scram/dashboard");
  } else {
    return NextResponse.redirect("/"); // Default redirect if usertype is not recognized
  }
}
