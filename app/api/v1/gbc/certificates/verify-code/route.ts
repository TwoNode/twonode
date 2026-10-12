import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, ValidationError } from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validate";
import { getClientIp } from "@/lib/auth/rateLimit";
import { verifyCertificateOtpAndIssueToken } from "@/gbc/services/certificateOtpService";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
});

// ADR-0008: Verify 6-digit code and issue short-lived download token
export async function POST(req: NextRequest) {
  try {
    const { email, code } = await validateBody(req, bodySchema);
    const nonce = req.cookies.get("cn")?.value;

    if (!nonce) {
      throw new ValidationError({
        code: "No verification session found. Please request a new code.",
      });
    }

    const { token, ticketNumbers } = await verifyCertificateOtpAndIssueToken({
      email,
      code,
      nonce,
      ip: getClientIp(req),
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        ticketNumbers,
      },
    });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
