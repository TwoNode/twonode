import { NextResponse } from "next/server";

export const runtime = "nodejs";

// ADR-0008: Direct download by ticket number is retired. It used to accept a
// download token in the query string; tokens now go only to
// POST /api/v1/gbc/certificates/download so they never appear in a URL.
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Direct public download is retired. Please request a verification code to download your certificate.",
    },
    { status: 403 }
  );
}
