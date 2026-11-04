import { NextResponse } from "next/server";
import { z } from "zod";
import { Platform, SurfboardRole } from "@/utils/platform";
import { withAuth } from "@/lib/api/withAuth";
import { ApiError, UnauthenticatedError } from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { consumeRateLimit } from "@/lib/auth/rateLimit";
import { findUserById } from "@/lib/auth/userLookup";
import {
  OtpRejectedError,
  verifyEmailOtp,
  type OtpRejection,
} from "@/lib/auth/emailVerificationOtp";

const verifySchema = z.object({
  platform: z.literal(Platform.SURFBOARD),
  code: z.string().length(6),
});

// One code per way of being turned down, so the app words each case itself
// without matching on English.
const REJECTION_CODES: Record<OtpRejection, string> = {
  MALFORMED: "VERIFICATION_CODE_INVALID",
  INCORRECT: "VERIFICATION_CODE_INCORRECT",
  NO_ACTIVE_CODE: "VERIFICATION_CODE_EXPIRED",
  TOO_MANY_ATTEMPTS: "VERIFICATION_CODE_LOCKED",
};

const noStore = { headers: { "Cache-Control": "no-store" } };

/**
 * POST /api/v1/auth/mobile/verify-email: confirms the signed-in surveyor's
 * email with the six-digit code. The app's own version of
 * POST /api/v1/auth/verify-email-otp, which it cannot use as it is:
 *
 * - that route is limited per IP address as well, and phones on one carrier
 *   address would lock each other out. This one is limited per account only,
 *   on the same key, so the website and the app share one ceiling and neither
 *   doubles an attacker's guesses (the code's own five-attempt cap still
 *   applies);
 * - it re-issues a cookie session and starts a refresh family the app never
 *   uses. This one only records the verification. The app calls refresh
 *   afterwards, which re-reads the account, to get a token that says so.
 *
 * Callable while verification is still outstanding (that is its purpose).
 * Whose email is verified comes from the session, never the body. Verifying
 * an already verified account is a success, so a lost response can be retried.
 */
export const POST = withAuth<SurfboardRole>(
  async (req, { session }) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { platform, code } = await validateBody(req, verifySchema);

    const user = await findUserById(platform, session.sub);
    if (!user || !user.isActive) throw new UnauthenticatedError();
    if (user.emailVerified) {
      return NextResponse.json(
        { success: true, data: { verified: true } },
        noStore
      );
    }

    // Recorded first, then counted, so parallel guesses cannot all read the
    // same low count (see consumeRateLimit).
    if (
      !(await consumeRateLimit(
        `verify-otp-user:${platform}:${user.id}`,
        user.id
      ))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many attempts. Please try again later.",
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    try {
      await verifyEmailOtp(platform, user.id, code);
    } catch (err) {
      if (err instanceof OtpRejectedError) {
        throw new ApiError(
          400,
          REJECTION_CODES[err.reason],
          (err.details as { code: string }).code
        );
      }
      throw err;
    }

    return NextResponse.json(
      { success: true, data: { verified: true } },
      noStore
    );
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.USER],
    allowUnverified: true,
  }
);
