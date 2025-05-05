import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;

  if (url.pathname.startsWith("/reva/")) {
    return NextResponse.redirect(new URL("/reva", req.url));
  } else if (url.pathname.startsWith("/scram/")) {
    return NextResponse.redirect(new URL("/scram", req.url));
  } else {
    return NextResponse.redirect(new URL("/", req.url));
  }
}
