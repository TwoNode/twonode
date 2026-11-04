import { NextResponse } from "next/server";
import { Platform, SurfboardRole } from "@/utils/platform";
import { withAuth } from "@/lib/api/withAuth";
import { UnauthenticatedError } from "@/lib/api/errors";
import { validateCSRF } from "@/lib/auth/csrf";
import { consumeRateLimit } from "@/lib/auth/rateLimit";
import { findUserById } from "@/lib/auth/userLookup";
import { getEmailVerificationSettings } from "@/lib/auth/emailVerificationSettings";
import { issueAndSendVerificationOtp } from "@/lib/auth/emailVerificationOtp";
import { issueAndSendVerificationEmail } from "@/lib/auth/emailVerification";

// An email costs money and an inbox's patience: a handful a quarter hour, per
// account. Not keyed on the IP address (phones share carrier addresses).
const RESEND_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };

const noStore = { headers: { "Cache-Control": "no-store" } };

/**
 * POST /api/v1/auth/mobile/resend-verification: sends the signed-in
 * surveyor a new verification code (or link, whichever the platform is set
 * to) at the address on the account. No body: the app is signed in, so who to
 * send to comes from the session, and unlike the website's route there is
 * nothing to hide about whether the account exists. Callable while
 * verification is outstanding.
 *
 * Answers `{ sent, method }`, or `{ sent: false, alreadyVerified: true }` for
 * an account that no longer needs it (the app then refreshes).
 */
export const POST = withAuth<SurfboardRole>(
  async (req, { session }) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }

    const user = await findUserById(Platform.SURFBOARD, session.sub);
    if (!user || !user.isActive) throw new UnauthenticatedError();
    if (user.emailVerified) {
      return NextResponse.json(
        { success: true, data: { sent: false, alreadyVerified: true } },
        noStore
      );
    }

    if (
      !(await consumeRateLimit(
        `mobile-resend-verification:${user.id}`,
        user.id,
        RESEND_LIMIT
      ))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    const { method } = await getEmailVerificationSettings(Platform.SURFBOARD);
    if (method === "OTP") {
      await issueAndSendVerificationOtp(Platform.SURFBOARD, user);
    } else {
      await issueAndSendVerificationEmail(Platform.SURFBOARD, user);
    }

    return NextResponse.json(
      { success: true, data: { sent: true, method } },
      noStore
    );
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.USER],
    allowUnverified: true,
  }
);
