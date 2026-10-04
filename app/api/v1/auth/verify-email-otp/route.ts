import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { validateCSRF } from "@/lib/auth/csrf";
import { validateBody } from "@/lib/api/validate";
import { consumeRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { UnauthenticatedError, handleApiError } from "@/lib/api/errors";
import { getServerSession, issueSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/userLookup";
import { verifyEmailOtp } from "@/lib/auth/emailVerificationOtp";

// No `userId`: whose email is being verified comes from the session, never
// from the request body. (A body-supplied id let an unauthenticated caller
// aim guesses at any account.)
const verifyOtpSchema = z.object({
  platform: z.nativeEnum(Platform),
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }

    const { platform, code } = await validateBody(req, verifyOtpSchema);

    const session = await getServerSession(platform);
    if (!session) throw new UnauthenticatedError();
    const userId = session.sub;

    // Records the attempt first, then counts, so a burst of parallel requests
    // can't all read the same low count (see consumeRateLimit).
    const clientIp = getClientIp(req);
    if (!(await consumeRateLimit(`verify-otp:${clientIp}`, userId))) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    await verifyEmailOtp(platform, userId, code);

    // Re-issue session with updated emailVerified: true and mustVerifyNow: false claims
    const user = await findUserById(platform, userId);
    if (user) {
      await issueSession(user.id, user.role, platform, 30 * 24 * 60 * 60, user);
    }

    return NextResponse.json({
      success: true,
      data: { message: "Email verified successfully." },
    });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
