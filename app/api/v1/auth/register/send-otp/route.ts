import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { validateCSRF } from "@/lib/auth/csrf";
import { consumeRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";
import { issuePendingRegistration } from "@/lib/auth/pendingRegistration";

const sendOtpSchema = z.object({
  platform: z.nativeEnum(Platform),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  // No `role` field, deliberately — same reasoning as the account-creation
  // path this feeds: a public route accepting a client-chosen role would
  // be a privilege-escalation bug.
});

/**
 * Step 1 of OTP-first registration: holds the signup's data in a
 * PendingRegistration row and emails either a 6-digit code or a
 * verification link, per the platform's admin-configured verification
 * `method`. No User row is created here — see lib/auth/pendingRegistration.ts.
 */
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
        {
          success: false,
          error: "Too many registration attempts. Please try again later.",
        },
        { status: 429 }
      );

    // Every request is counted — successes included. This route sends an
    // email and runs a cost-12 bcrypt hash, so "only failures count" meant
    // unlimited mail to any address and unlimited CPU burn.
    if (!(await consumeRateLimit(`register-send:${clientIp}`))) {
      return tooMany();
    }

    const { platform, email, password, firstName, lastName } =
      await validateBody(req, sendOtpSchema);

    // Second bucket keyed on the TARGET address (not the caller), so a
    // distributed attacker can't mail-bomb one inbox from many IPs.
    if (
      !(await consumeRateLimit(
        `register-send-to:${platform}:${email.trim().toLowerCase()}`
      ))
    ) {
      return tooMany();
    }

    const { pendingRegistrationId, method } = await issuePendingRegistration(
      platform,
      { email, password, firstName, lastName }
    );
    return NextResponse.json({
      success: true,
      data: { pendingRegistrationId, method },
    });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
