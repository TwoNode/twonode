import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { checkRateLimit, recordAttempt } from "@/lib/auth/rateLimit";
import { requestDownloadOtp } from "@/reva/services/downloadOtpService";

const requestOtpSchema = z.object({
  reference: z.string().min(1),
  email: z.string().email(),
  target: z.string().min(1),
});

// A function, not a module-level NextResponse singleton — a NextResponse's
// body stream is consumed once it's actually sent, so a shared object
// reused across requests serves an empty body (and an "Unexpected end of
// JSON input" client-side parse error) on every request after the first.
function genericResponse() {
  return NextResponse.json({
    success: true,
    data: {
      message:
        "If that request is valid, a code has been sent to the associated email.",
    },
  });
}

/**
 * Public — same reference+email pair the rest of the guest flow uses.
 * Always returns the same generic response, same reasoning as
 * request-password-reset: a distinct response here would let this
 * endpoint be used to enumerate valid reference/email pairs or probe
 * report-approval state.
 */
export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }

    const { reference, email, target } = await validateBody(
      req,
      requestOtpSchema
    );
    const identifier = `download-otp:request:${reference}:${target}:${email}`;

    if (!(await checkRateLimit(identifier))) {
      return genericResponse();
    }
    await recordAttempt(identifier);

    await requestDownloadOtp({ reference, email, target });
    return genericResponse();
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
