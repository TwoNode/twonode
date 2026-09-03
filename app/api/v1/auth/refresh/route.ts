import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { Platform } from "@/utils/platform";
import prisma from "@/lib/prisma";
import { signAccessToken } from "@/lib/auth/jwt";
import { setAuthCookies, clearAuthCookies, getRefreshTokenCookie } from "@/lib/auth/cookies";
import { validateCSRF } from "@/lib/auth/csrf";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { handleApiError } from "@/lib/api/errors";
import { findUserById } from "@/lib/auth/userLookup";

const platformParam = z.nativeEnum(Platform);

export async function POST(req: NextRequest) {
  try {
    if (!validateCSRF(req)) {
      return NextResponse.json({ success: false, error: "Cross-origin request blocked" }, { status: 403 });
    }

    if (!(await checkRateLimit(`refresh:${getClientIp(req)}`))) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    // Platform can't come from the (refresh-scoped) cookie itself, so it's a
    // query param: /api/v1/auth/refresh?platform=surfboard.
    const parsedPlatform = platformParam.safeParse(req.nextUrl.searchParams.get("platform"));
    if (!parsedPlatform.success) {
      return NextResponse.json({ success: false, error: "Missing or invalid platform" }, { status: 400 });
    }
    const platform = parsedPlatform.data;

    const rawRefreshToken = await getRefreshTokenCookie(platform);
    if (!rawRefreshToken) {
      return NextResponse.json({ success: false, error: "Missing refresh token" }, { status: 401 });
    }

    const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");

    // Atomic update: only succeeds if token is active, unrevoked, and for this platform
    const rotated = await prisma.refreshToken.updateMany({
      where: { tokenHash, platform, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date() },
    });

    if (rotated.count === 0) {
      // Reuse detected or invalid/expired session — revoke the whole family if this
      // was a replay of an already-rotated token (theft-detection, per proplity's pattern).
      const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
      if (existing?.revokedAt) {
        await prisma.refreshToken.updateMany({
          where: { familyId: existing.familyId },
          data: { revokedAt: new Date() },
        });
      }
      await clearAuthCookies(platform);
      return NextResponse.json({ success: false, error: "Invalid or revoked session" }, { status: 401 });
    }

    const currentToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    const user = currentToken ? await findUserById(platform, currentToken.userId) : null;

    if (!currentToken || !user || !user.isActive) {
      await clearAuthCookies(platform);
      return NextResponse.json({ success: false, error: "Account inactive" }, { status: 403 });
    }

    const newRawRefreshToken = crypto.randomBytes(32).toString("hex");
    const newTokenHash = crypto.createHash("sha256").update(newRawRefreshToken).digest("hex");

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: currentToken.id },
        data: { replacedBy: newTokenHash },
      }),
      prisma.refreshToken.create({
        data: {
          userId: currentToken.userId,
          platform,
          tokenHash: newTokenHash,
          familyId: currentToken.familyId,
          // Inherit the rotated token's own expiry rather than resetting to a
          // fresh +30 days -- rotation refreshes the token value, it shouldn't
          // extend (or shorten) the session length the original login/rememberMe
          // choice set.
          expiresAt: currentToken.expiresAt,
        },
      }),
    ]);

    const newAccessToken = await signAccessToken({ sub: user.id, role: user.role, platform });
    // Cookie maxAge must match the token's actual remaining lifetime (set
    // above), not setAuthCookies's 30-day default -- otherwise the browser
    // drops the cookie on a different schedule than the DB row expires on.
    const remainingSeconds = Math.max(
      0,
      Math.floor((currentToken.expiresAt.getTime() - Date.now()) / 1000)
    );
    await setAuthCookies(platform, newAccessToken, newRawRefreshToken, remainingSeconds);

    return NextResponse.json({ success: true, data: {} });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
