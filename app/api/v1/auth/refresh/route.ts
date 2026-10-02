import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import { rotateRefreshToken } from "@/lib/auth/session";
import { getRefreshTokenCookie } from "@/lib/auth/cookies";
import { validateCSRF } from "@/lib/auth/csrf";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { handleApiError } from "@/lib/api/errors";

const platformParam = z.nativeEnum(Platform);

export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 }
      );
    }

    if (!(await checkRateLimit(`refresh:${getClientIp(req)}`))) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429 }
      );
    }

    // Platform can't come from the (refresh-scoped) cookie itself, so it's a
    // query param: /api/v1/auth/refresh?platform=surfboard.
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

    const rawRefreshToken = await getRefreshTokenCookie(platform);
    if (!rawRefreshToken) {
      return NextResponse.json(
        { success: false, error: "Missing refresh token" },
        { status: 401 }
      );
    }

    const result = await rotateRefreshToken(platform, rawRefreshToken);
    if (!result.ok) {
      const status = result.reason === "inactive" ? 403 : 401;
      const error =
        result.reason === "inactive"
          ? "Account inactive"
          : "Invalid or revoked session";
      return NextResponse.json({ success: false, error }, { status });
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (err) {
    return handleApiError(err, {
      route: req.nextUrl.pathname,
      method: req.method,
    });
  }
}
