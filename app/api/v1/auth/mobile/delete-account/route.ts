import { NextResponse } from "next/server";
import { z } from "zod";
import { Platform, SurfboardRole } from "@/utils/platform";
import { withAuth } from "@/lib/api/withAuth";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { consumeRateLimit } from "@/lib/auth/rateLimit";
import { closeSurveyorAccount } from "@/surfboard/services/accountClosureService";
import { logMobileAuthEvent, mobileTags } from "@/lib/observability/mobileTags";

const deleteSchema = z.object({
  platform: z.literal(Platform.SURFBOARD),
  // Asked for again here: a phone left unlocked or a stolen session must not be enough to close an
  // account for good.
  password: z.string().min(1).max(72),
});

const USER_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };

/**
 * POST /api/v1/auth/mobile/delete-account: closes the signed-in surveyor's account (decision D13;
 * the rules are in `closeSurveyorAccount`). The whole account goes, the website's side included.
 * Refused with 409 ACCOUNT_CLOSURE_BLOCKED while there is money in the wallet or a withdrawal is
 * unpaid, and with 502 SUBSCRIPTION_CANCEL_FAILED when the card could not be stopped (the account
 * is then still open). Allowed while the email is unverified. Whose account is closed comes from
 * the session, never the body.
 */
export const POST = withAuth<SurfboardRole>(
  async (req, { session }) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { password } = await validateBody(req, deleteSchema);

    // Counted before the password is checked, so parallel guesses cannot all see a low count.
    if (
      !(await consumeRateLimit(
        `delete-account:${session.sub}`,
        session.sub,
        USER_LIMIT
      ))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many attempts. Try again later.",
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    const result = await closeSurveyorAccount(session.sub, password);
    logMobileAuthEvent("mobile.account_closed", "ok", {
      ...mobileTags(req),
      userId: session.sub,
    });
    return NextResponse.json(
      { success: true, data: result },
      { headers: { "Cache-Control": "no-store" } }
    );
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.USER],
    allowUnverified: true,
  }
);
