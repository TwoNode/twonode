import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;

  if (url.pathname.startsWith("/reva/")) {
    return NextResponse.redirect(new URL("/reva", req.url));
  } else if (url.pathname.startsWith("/scram/")) {
    return NextResponse.redirect(new URL("/scram", req.url));
  } else if (url.pathname.startsWith("/surfboard/")) {
    return NextResponse.redirect(new URL("/surfboard", req.url));
  } else if (url.pathname.startsWith("/surf-restricted/")) {
    return NextResponse.redirect(new URL("/surf-restricted", req.url));
  } else if (url.pathname.startsWith("/gbc2/")) {
    return NextResponse.redirect(new URL("/gbc2", req.url));
  } else if (url.pathname.startsWith("/gbc2-restricted/")) {
    return NextResponse.redirect(new URL("/gbc2-restricted", req.url));
  } else {
    return NextResponse.redirect(new URL("/", req.url));
  }
}
