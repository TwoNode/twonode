import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { validateCSRF } from "@/lib/auth/csrf";
import { validateBody } from "@/lib/api/validate";
import {
  checkRateLimit,
  recordAttempt,
  getClientIp,
} from "@/lib/auth/rateLimit";
import { UnauthenticatedError, handleApiError } from "@/lib/api/errors";
import { getServerSession, issueSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/userLookup";
import { verifyEmailOtp } from "@/lib/auth/emailVerificationOtp";

const verifyOtpSchema = z.object({
  platform: z.nativeEnum(Platform),
  code: z.string().length(6),
  userId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }

    const clientIp = getClientIp(req);
    if (!(await checkRateLimit(`verify-otp:${clientIp}`))) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const {
      platform,
      code,
      userId: explicitUserId,
    } = await validateBody(req, verifyOtpSchema);

    // Resolve user ID from active native session first, fallback to explicit userId if provided
    const session = await getServerSession(platform);
    const userId = session?.sub || explicitUserId;

    if (!userId) {
      throw new UnauthenticatedError();
    }

    await recordAttempt(`verify-otp:${clientIp}`);
    await verifyEmailOtp(platform, userId, code);

    // Re-issue session with updated emailVerified: true and mustVerifyNow: false claims
    const user = await findUserById(platform, userId);
    if (user && session) {
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
