import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { validateCSRF } from "@/lib/auth/csrf";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/auth/rateLimit";
import { validateBody } from "@/lib/api/validate";
import { ConflictError, handleApiError } from "@/lib/api/errors";
import { findUserByEmail, createNativeUser } from "@/lib/auth/userLookup";
import { issueAndSendVerificationEmail } from "@/lib/auth/emailVerification";
import { issueAndSendVerificationOtp } from "@/lib/auth/emailVerificationOtp";
import { getEmailVerificationSettings } from "@/lib/auth/emailVerificationSettings";
import { issueSession } from "@/lib/auth/session";
import { computeMustVerifyNow } from "@/lib/auth/emailVerificationGate";

const registerSchema = z.object({
  platform: z.nativeEnum(Platform),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  // No `role` field, deliberately — see lib/auth/userLookup.ts's createNativeUser.
});

export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }

    const clientIp = getClientIp(req);
    if (!(await checkRateLimit(`register:${clientIp}`))) {
      return NextResponse.json(
        { success: false, error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { platform, email, password, firstName, lastName } = await validateBody(req, registerSchema);

    const existing = await findUserByEmail(platform, email);
    if (existing) {
      await recordAttempt(`register:${clientIp}`);
      throw new ConflictError("Email address is already registered");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createNativeUser(platform, { email, passwordHash, firstName, lastName });

    // Send verification code or link according to platform configuration.
    // Best-effort delivery — failure shouldn't hard-fail signup, but user will land
    // on a gate screen with a working Resend option.
    const config = await getEmailVerificationSettings(platform);
    try {
      if (config.method === "OTP") {
        await issueAndSendVerificationOtp(platform, user);
      } else {
        await issueAndSendVerificationEmail(platform, user);
      }
    } catch (err) {
      console.error("Failed to send verification on registration:", err);
    }

    await issueSession(user.id, user.role, platform, 30 * 24 * 60 * 60, user);
    const mustVerifyNow = await computeMustVerifyNow(platform, user);

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role.toLowerCase(),
        emailVerified: user.emailVerified,
        mustVerifyNow,
      },
    });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
