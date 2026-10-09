import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validate";
import { getClientIp } from "@/lib/auth/rateLimit";
import { requestCertificateOtp } from "@/gbc/services/certificateOtpService";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
});

// ADR-0008: Request a 6-digit one-time code to download certificate
export async function POST(req: NextRequest) {
  try {
    const { email } = await validateBody(req, bodySchema);
    const ip = getClientIp(req);
    const result = await requestCertificateOtp({ email, ip });

    const response = NextResponse.json({
      success: true,
      message: result.message,
    });

    // Set HttpOnly, Secure, SameSite browser-binding nonce cookie (cn)
    response.cookies.set("cn", result.nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
