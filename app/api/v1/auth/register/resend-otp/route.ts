import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { validateCSRF } from "@/lib/auth/csrf";
import { consumeRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";
import { resendPendingRegistration } from "@/lib/auth/pendingRegistration";

const resendSchema = z.object({
  platform: z.nativeEnum(Platform),
  pendingRegistrationId: z.string().min(1),
});

/** Enumeration-safe: always returns the same success shape, matching resend-verification's pattern. */
export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }

    const clientIp = getClientIp(req);
    const tooMany = () =>
      NextResponse.json(
        { success: false, error: "Too many attempts. Please try again later." },
        { status: 429 }
      );

    if (!(await consumeRateLimit(`register-resend:${clientIp}`))) {
      return tooMany();
    }

    const { platform, pendingRegistrationId } = await validateBody(
      req,
      resendSchema
    );

    // Per-registration bucket too: each resend emails a real inbox, so one
    // pending signup shouldn't be resendable without limit from many IPs.
    if (
      !(await consumeRateLimit(`register-resend-for:${pendingRegistrationId}`))
    ) {
      return tooMany();
    }

    await resendPendingRegistration(platform, pendingRegistrationId);

    return NextResponse.json({
      success: true,
      data: { message: "A fresh verification code has been sent." },
    });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
