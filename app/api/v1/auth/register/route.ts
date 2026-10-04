import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { validateCSRF } from "@/lib/auth/csrf";
import { consumeRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";
import { completePendingRegistration } from "@/lib/auth/pendingRegistration";
import { issueSession } from "@/lib/auth/session";

const registerSchema = z.object({
  platform: z.nativeEnum(Platform),
  pendingRegistrationId: z.string().min(1),
  // Accepts either a 6-digit OTP or a long link token — whichever the
  // platform's method setting had this registration use (see
  // lib/auth/pendingRegistration.ts). The hash comparison doesn't care
  // which; only the length floor is a shared sanity check.
  code: z.string().min(6),
  // The password the registration was started with — see
  // completePendingRegistration for why the emailed secret alone isn't enough.
  password: z.string().min(1),
  // Deliberately no `email` field — the account is created from the
  // PendingRegistration row's own stored email (see
  // lib/auth/pendingRegistration.ts's send-otp step), never from this
  // request body, so a manipulated client can't verify one address and
  // attach the result to another.
});

/**
 * Final step of OTP/link-first registration (see send-otp/route.ts for the
 * first): verifies the code or link token and creates the account
 * atomically. By the time this returns success, emailVerified is already
 * true (via whichever method was actually used) — there's no
 * unverified-account window. This route used to accept
 * {email,password,firstName,lastName} directly and create the account
 * immediately; it's been fully repurposed to this 2-step flow (its only
 * caller, NativeAuthCard.tsx, now drives both steps) rather than kept
 * alongside a separate /register/complete path.
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
    // consume = record first, then check: counts successes too and holds up
    // under a burst of parallel requests (see consumeRateLimit).
    if (!(await consumeRateLimit(`register-complete:${clientIp}`))) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { platform, pendingRegistrationId, code, password } =
      await validateBody(req, registerSchema);

    const user = await completePendingRegistration(
      platform,
      pendingRegistrationId,
      code,
      password
    );

    await issueSession(user.id, user.role, platform, 30 * 24 * 60 * 60, user);

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role.toLowerCase(),
        emailVerified: user.emailVerified,
        mustVerifyNow: false,
      },
    });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
