import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { consumeRateLimit } from "@/lib/auth/rateLimit";
import { validateBody } from "@/lib/api/validate";
import { ApiError, ConflictError, handleApiError } from "@/lib/api/errors";
import {
  assertMobileClientAllowed,
  assertMobileSignInEnabled,
} from "@/lib/api/mobileApp";
import { issuePendingRegistration } from "@/lib/auth/pendingRegistration";
import { mobileRequestContext } from "@/lib/observability/mobileTags";

const startSchema = z.object({
  platform: z.literal(Platform.SURFBOARD),
  email: z.string().email(),
  // bcrypt reads at most 72 bytes, so a longer password would be silently cut short.
  password: z.string().min(8).max(72),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  // The version of the Terms and Privacy Policy the person agreed to (GET /auth/mobile/legal).
  // The server refuses a missing or old one (issuePendingRegistration), so the agreement is
  // enforced here, not only by the checkbox.
  acceptedLegalVersion: z.string().max(32),
  deviceId: z.string().min(8).max(128),
});

// Neither limit is keyed on the IP address: many phones share one carrier-grade NAT address. The
// per-email limit is the brake on mailing one inbox; the per-device limit stops one install
// (the device id is chosen by the client, so it is not the only brake).
const DEVICE_LIMIT = { max: 10, windowMs: 15 * 60 * 1000 };
const EMAIL_LIMIT = { max: 5, windowMs: 30 * 60 * 1000 };

/** What the answer tells the app so it can word the code screen without guessing. */
export const REGISTRATION_CODE_LIFETIME_SECONDS = 10 * 60;

/**
 * POST /api/v1/auth/mobile/register/start: step 1 of creating a Surfboard account from the app.
 * The same two steps as the website's sign-up (POST /auth/register/send-otp, then /auth/register):
 * nothing is created here, the person's details are held on a pending registration and a six-digit
 * code is emailed. Always the six-digit code, whatever the platform's setting says for the
 * website: a phone cannot follow a link into a form. Authenticated by nothing (it makes an
 * account), so there is no CSRF check: nothing here reads ambient browser credentials.
 *
 * An address that already has an account is told so (409 EMAIL_ALREADY_REGISTERED), as the
 * website does: without it a person could not know to sign in instead.
 */
export async function POST(req: NextRequest) {
  try {
    await assertMobileClientAllowed(req);
    await assertMobileSignInEnabled();

    const {
      platform,
      email,
      password,
      firstName,
      lastName,
      acceptedLegalVersion,
      deviceId,
    } = await validateBody(req, startSchema);
    const normalizedEmail = email.trim().toLowerCase();

    const allowed =
      (await consumeRateLimit(
        `mobile-register-device:${deviceId}`,
        undefined,
        DEVICE_LIMIT
      )) &&
      (await consumeRateLimit(
        `mobile-register-email:${normalizedEmail}`,
        undefined,
        EMAIL_LIMIT
      ));
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many attempts. Try again later.",
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    try {
      const { pendingRegistrationId, method } = await issuePendingRegistration(
        platform,
        { email, password, firstName, lastName, acceptedLegalVersion },
        { method: "OTP" }
      );
      return NextResponse.json(
        {
          success: true,
          data: {
            pendingRegistrationId,
            method,
            codeExpiresInSeconds: REGISTRATION_CODE_LIFETIME_SECONDS,
          },
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch (err) {
      if (err instanceof ConflictError) {
        throw new ApiError(
          409,
          "EMAIL_ALREADY_REGISTERED",
          "Email address is already registered"
        );
      }
      throw err;
    }
  } catch (err) {
    return handleApiError(err, mobileRequestContext(req));
  }
}
