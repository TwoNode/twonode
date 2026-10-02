import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { checkRateLimit, recordAttempt } from "@/lib/auth/rateLimit";
import { verifyDownloadOtpAndGetUrl } from "@/reva/services/downloadOtpService";

const verifyOtpSchema = z.object({
  reference: z.string().min(1),
  email: z.string().email(),
  target: z.string().min(1),
  code: z.string().min(1),
});

/** Public — same reference+email pair as the request endpoint. */
export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }

    const { reference, email, target, code } = await validateBody(
      req,
      verifyOtpSchema
    );
    const identifier = `download-otp:verify:${reference}:${target}:${email}`;

    if (!(await checkRateLimit(identifier))) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Try again later." },
        { status: 429 }
      );
    }
    await recordAttempt(identifier);

    const data = await verifyDownloadOtpAndGetUrl({
      reference,
      email,
      target,
      code,
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
