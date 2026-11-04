import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { validateCSRF } from "@/lib/auth/csrf";
import {
  checkRateLimit,
  recordAttempt,
  getClientIp,
} from "@/lib/auth/rateLimit";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";
import { findUserByEmail } from "@/lib/auth/userLookup";
import { issuePasswordReset } from "@/lib/auth/passwordReset";

const requestSchema = z.object({
  platform: z.nativeEnum(Platform),
  email: z.string().email(),
});

// A function, not a module-level NextResponse singleton — a NextResponse's
// body stream is consumed once it's actually sent, so a shared object
// reused across requests serves an empty body (and an "Unexpected end of
// JSON input" client-side parse error) on every request after the first.
function genericResponse() {
  return NextResponse.json({
    success: true,
    data: { message: "If that email is registered, we've sent a link to it." },
  });
}

/**
 * Always returns the same generic response whether or not the email is
 * registered — the login route (POST /api/v1/auth/login) deliberately does
 * the same for the identical reason: differentiating the response would let
 * anyone enumerate which emails have accounts (and, worse here, which ones
 * are Kinde-only) just by probing this endpoint. What CAN differ, safely,
 * is the emailed content itself — see sendPasswordResetEmail — since only
 * the inbox owner ever sees which variant was sent.
 */
export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }

    const { platform, email } = await validateBody(req, requestSchema);
    const clientIp = getClientIp(req);
    const identifier = `reset:${clientIp}:${email}`;

    if (!(await checkRateLimit(identifier))) {
      // Same generic response even when rate-limited — a distinct message
      // here would itself be a timing/enumeration signal.
      return genericResponse();
    }
    await recordAttempt(identifier);

    const user = await findUserByEmail(platform, email);
    if (user && user.isActive) {
      await issuePasswordReset(platform, user);
    }

    return genericResponse();
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
