import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { validateCSRF } from "@/lib/auth/csrf";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/auth/rateLimit";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";
import { findUserByEmail } from "@/lib/auth/userLookup";
import { issueAndSendVerificationEmail } from "@/lib/auth/emailVerification";

const resendSchema = z.object({
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
    data: { message: "If that email is registered and unverified, we've sent a new link to it." },
  });
}

/**
 * Same generic-response, non-enumerating shape as request-password-reset —
 * see that route's doc comment for why. Works for any account regardless
 * of authProviders (Kinde-registered accounts are not assumed verified;
 * see gbc.prisma's GBCUser.emailVerified doc comment), not just native
 * ones — verification confirms the address, not the auth method.
 */
export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }

    const { platform, email } = await validateBody(req, resendSchema);
    const clientIp = getClientIp(req);
    const identifier = `resend-verification:${clientIp}:${email}`;

    if (!(await checkRateLimit(identifier))) {
      return genericResponse();
    }
    await recordAttempt(identifier);

    const user = await findUserByEmail(platform, email);
    if (user && user.isActive && !user.emailVerified) {
      await issueAndSendVerificationEmail(platform, user);
    }

    return genericResponse();
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
