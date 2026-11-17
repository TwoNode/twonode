import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Platform, SurfboardRole } from "@/utils/platform";
import { withAuth } from "@/lib/api/withAuth";
import { ApiError, UnauthenticatedError } from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validate";
import { validateCSRF } from "@/lib/auth/csrf";
import { consumeRateLimit } from "@/lib/auth/rateLimit";
import { findUserById, markEmailVerified } from "@/lib/auth/userLookup";
import prisma from "@/lib/prisma";

const verifySchema = z.object({
  platform: z.literal(Platform.SURFBOARD),
  token: z.string().min(1).max(256),
});

const noStore = { headers: { "Cache-Control": "no-store" } };

/**
 * POST /api/v1/auth/mobile/verify-email-link: confirms the signed-in surveyor's
 * email with the token from the emailed link, when the link opened the app
 * (TASK-0015 1H.2). The app's own version of POST /api/v1/auth/verify-email,
 * which it cannot use as it is: that route re-issues a cookie session and
 * starts a refresh family the app never uses. This one only records the
 * verification; the app calls refresh afterwards.
 *
 * The token must have been issued to the account in the session. A token for
 * someone else, an unknown one, a used one and an expired one all answer the
 * same way (VERIFICATION_LINK_INVALID), so the route says nothing about whose
 * token it was. Callable while verification is outstanding (that is its
 * purpose). Verifying an already verified account is a success.
 */
export const POST = withAuth<SurfboardRole>(
  async (req, { session }) => {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }
    const { platform, token } = await validateBody(req, verifySchema);

    const user = await findUserById(platform, session.sub);
    if (!user || !user.isActive) throw new UnauthenticatedError();
    if (user.emailVerified) {
      return NextResponse.json(
        { success: true, data: { verified: true } },
        noStore
      );
    }

    // The token is 256 random bits, so guessing it is not a risk; the limit
    // only stops a loop of requests from filling the table.
    if (
      !(await consumeRateLimit(
        `verify-link-user:${platform}:${user.id}`,
        user.id
      ))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many attempts. Please try again later.",
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });
    if (
      !record ||
      record.userId !== user.id ||
      record.platform !== platform ||
      record.usedAt ||
      record.expiresAt < new Date()
    ) {
      throw new ApiError(
        400,
        "VERIFICATION_LINK_INVALID",
        "This link is invalid or has expired."
      );
    }

    await prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    await markEmailVerified(platform, user.id, "LINK");

    return NextResponse.json(
      { success: true, data: { verified: true } },
      noStore
    );
  },
  {
    platform: Platform.SURFBOARD,
    roles: [SurfboardRole.USER],
    allowUnverified: true,
  }
);
