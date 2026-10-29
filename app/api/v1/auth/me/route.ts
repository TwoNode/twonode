import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { getServerSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/userLookup";
import { handleApiError } from "@/lib/api/errors";
import { UnauthenticatedError } from "@/lib/api/errors";
import {
  assertMobileClientAllowed,
  isMobileRequest,
} from "@/lib/api/mobileApp";

import {
  computeMustVerifyNow,
  computeVerificationGraceEndsAt,
} from "@/lib/auth/emailVerificationGate";
import { getEmailVerificationSettings } from "@/lib/auth/emailVerificationSettings";
import { getLiveVerificationCodeSentAt } from "@/lib/auth/emailVerificationOtp";

const platformParam = z.nativeEnum(Platform);

export async function GET(req: NextRequest) {
  try {
    // The app reads this after signing in. It is not behind withAuth, so it
    // meets the mobile version gate here; the website (cookies, no bearer and
    // no X-App-Platform) does not.
    if (isMobileRequest(req)) await assertMobileClientAllowed(req);

    const parsedPlatform = platformParam.safeParse(
      req.nextUrl.searchParams.get("platform")
    );
    if (!parsedPlatform.success) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid platform" },
        { status: 400 }
      );
    }
    const platform = parsedPlatform.data;

    const session = await getServerSession(platform);
    if (!session) throw new UnauthenticatedError();

    const user = await findUserById(platform, session.sub);
    if (!user || !user.isActive) throw new UnauthenticatedError();

    const config = await getEmailVerificationSettings(platform);
    const mustVerifyNow = await computeMustVerifyNow(platform, user);
    const verificationGraceEndsAt = await computeVerificationGraceEndsAt(
      platform,
      user
    );

    // Only for an account that is waiting for a code: whether one was sent, so the screens say
    // "Send a code" instead of claiming one was emailed (I-048). Null for everyone else.
    const codeSentAt =
      !user.emailVerified && config.method === "OTP"
        ? await getLiveVerificationCodeSentAt(platform, user.id)
        : null;

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        // The app has only the email after a restored session otherwise: the
        // login response carries the name and this did not (TASK-0015 1A.13).
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.toLowerCase(),
        emailVerified: user.emailVerified,
        emailVerifiedVia: user.emailVerifiedVia,
        mustVerifyNow,
        verificationMethod: config.method,
        verificationGraceEndsAt,
        verificationCodeSentAt: codeSentAt ? codeSentAt.toISOString() : null,
      },
    });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
