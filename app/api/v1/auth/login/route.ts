import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { issueSession } from "@/lib/auth/session";
import { validateCSRF } from "@/lib/auth/csrf";
import {
  checkRateLimit,
  recordAttempt,
  getClientIp,
} from "@/lib/auth/rateLimit";
import {
  ACCOUNT_CHALLENGE_AFTER,
  WEB_LOGIN_TURNSTILE_ACTION,
  accountFailureKey,
  getAccountGuardState,
  logWebLogin,
} from "@/lib/auth/loginGuard";
import { isTurnstileEnabled, verifyTurnstile } from "@/lib/security/turnstile";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";
import { findUserByEmail } from "@/lib/auth/userLookup";
import { verifyPassword } from "@/lib/auth/passwordCheck";

const loginSchema = z.object({
  platform: z.nativeEnum(Platform),
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(true),
  /** Only sent after the server asked for it (`code: "CHALLENGE_REQUIRED"`). */
  turnstileToken: z.string().max(2048).optional(),
});

const TOO_MANY = "Too many attempts. Try again later.";

export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }

    const { platform, email, password, rememberMe, turnstileToken } =
      await validateBody(req, loginSchema);
    // Lowercased so varying the casing of one address can't reset its limit.
    const normalizedEmail = email.trim().toLowerCase();
    const clientIp = getClientIp(req);
    const identifier = `${clientIp}:${normalizedEmail}`;
    const logFields = { platform, email: normalizedEmail, clientIp };

    if (!(await checkRateLimit(identifier))) {
      logWebLogin("rate_limited", logFields);
      return NextResponse.json(
        { success: false, error: TOO_MANY },
        { status: 429 }
      );
    }

    // The same account from every address together (I-058): the limit above
    // never sees a script that changes address on each try.
    const account = await getAccountGuardState(normalizedEmail);
    if (account.state === "blocked") {
      logWebLogin("account_limited", logFields);
      return NextResponse.json(
        { success: false, error: TOO_MANY },
        { status: 429 }
      );
    }
    // Before the password is looked at, so a guess cannot be tried without the
    // challenge. Off until both Turnstile keys are set; then only an account
    // that already failed (here or elsewhere) is asked, everyone else signs in
    // exactly as before.
    if (account.failures >= ACCOUNT_CHALLENGE_AFTER && isTurnstileEnabled()) {
      const check = await verifyTurnstile({
        token: turnstileToken,
        action: WEB_LOGIN_TURNSTILE_ACTION,
        remoteIp: clientIp,
        requestHost:
          req.headers.get("x-forwarded-host") || req.headers.get("host"),
      });
      if (!check.ok) {
        if (check.reason === "unavailable") {
          logWebLogin("challenge_unavailable", logFields);
          return NextResponse.json(
            {
              success: false,
              error:
                "Verification is temporarily unavailable. Please try again in a moment.",
            },
            { status: 503 }
          );
        }
        logWebLogin(
          check.reason === "missing-token"
            ? "challenge_required"
            : "challenge_failed",
          { ...logFields, reason: check.reason }
        );
        return NextResponse.json(
          {
            success: false,
            error: "Please confirm you are not a robot, then sign in again.",
            code: "CHALLENGE_REQUIRED",
          },
          { status: 403 }
        );
      }
    }

    const user = await findUserByEmail(platform, email);
    // No passwordHash means this account only ever signed in via Kinde — a
    // native-login attempt against it should fail exactly like a wrong
    // password would, not with a different (account-enumerating) message, and
    // not faster: verifyPassword hashes once whether or not there is an account
    // (I-054).
    const valid = await verifyPassword(password, user?.passwordHash);

    if (!valid) {
      await recordAttempt(identifier, user?.id);
      await recordAttempt(accountFailureKey(normalizedEmail), user?.id);
      logWebLogin("invalid_credentials", logFields);
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user!.isActive) {
      logWebLogin("inactive", { ...logFields, userId: user!.id });
      return NextResponse.json(
        { success: false, error: "Account is inactive" },
        { status: 403 }
      );
    }

    const refreshDays = rememberMe ? 30 : 1;
    const refreshMaxAgeSeconds = refreshDays * 24 * 60 * 60;

    await issueSession(user!.id, user!.role, platform, refreshMaxAgeSeconds);
    logWebLogin("ok", { ...logFields, userId: user!.id });

    return NextResponse.json({
      success: true,
      data: {
        id: user!.id,
        email: user!.email,
        role: user!.role.toLowerCase(),
      },
    });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
