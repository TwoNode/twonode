import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { rotateMobileRefreshToken } from "@/lib/auth/session";
import { consumeRateLimit } from "@/lib/auth/rateLimit";
import { validateBody } from "@/lib/api/validate";
import { handleApiError } from "@/lib/api/errors";
import { assertMobileClientAllowed } from "@/lib/api/mobileApp";

const refreshSchema = z.object({
  platform: z.literal(Platform.SURFBOARD),
  refreshToken: z.string().min(16).max(256),
});

/**
 * POST /api/v1/auth/mobile/refresh — rotates a native app's refresh token and
 * returns the new pair in the body. The refresh token in the body is the
 * credential, so there is no CSRF check. A token re-presented within 30
 * seconds of its rotation (the app never received the response) is rotated
 * again instead of ending the session; see rotateCore in lib/auth/session.ts.
 *
 * Responses: 200 pair | 401 SESSION_INVALID (sign in again) | 403
 * ACCOUNT_INACTIVE | 409 REFRESH_CONFLICT (try again in a moment) | 426
 * APP_UPDATE_REQUIRED (the app is older than the minimum; the session stays).
 */
export async function POST(req: NextRequest) {
  try {
    // Too old: 426, and the app keeps its session (only 401 and 403 end one).
    await assertMobileClientAllowed(req);

    const { platform, refreshToken } = await validateBody(req, refreshSchema);

    // Keyed on the token, not the IP: it stops a client stuck in a refresh
    // loop without penalising everyone behind the same carrier NAT address.
    const key = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex")
      .slice(0, 16);
    if (
      !(await consumeRateLimit(`mobile-refresh:${key}`, undefined, {
        max: 30,
        windowMs: 5 * 60 * 1000,
      }))
    ) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429 }
      );
    }

    const result = await rotateMobileRefreshToken(platform, refreshToken);
    if (!result.ok) {
      const map = {
        invalid: [401, "SESSION_INVALID", "Invalid or revoked session"],
        inactive: [403, "ACCOUNT_INACTIVE", "Account inactive"],
        conflict: [409, "REFRESH_CONFLICT", "Try again"],
        role: [
          403,
          "ACCOUNT_TYPE_NOT_SUPPORTED",
          "This account type can't sign in to the app",
        ],
      } as const;
      const [status, code, error] = map[result.reason];
      return NextResponse.json({ success: false, error, code }, { status });
    }

    const { session } = result;
    return NextResponse.json(
      {
        success: true,
        data: {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          accessExpiresIn: session.accessExpiresIn,
          refreshExpiresAt: session.refreshExpiresAt.toISOString(),
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
