import crypto from "crypto";
import { Platform } from "@/utils/platform";
import prisma from "@/lib/prisma";
import { verifyToken, signAccessToken, JWTPayload } from "@/lib/auth/jwt";
import { getAccessTokenCookie, setAuthCookies } from "@/lib/auth/cookies";

export async function getServerSession(
  platform: Platform
): Promise<JWTPayload | null> {
  const token = await getAccessTokenCookie(platform);
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.platform !== platform) return null;
  return payload;
}

/**
 * Mints a native access+refresh pair and sets the cookies for it, regardless
 * of how the caller authenticated the user (native password login or a Kinde
 * callback) — the one place session issuance happens so both paths stay
 * identical.
 */
export async function issueSession(
  userId: string,
  role: string,
  platform: Platform,
  refreshMaxAgeSeconds: number = 30 * 24 * 60 * 60
): Promise<void> {
  const familyId = crypto.randomUUID();
  const rawRefreshToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");

  await prisma.refreshToken.create({
    data: {
      userId,
      platform,
      tokenHash,
      familyId,
      expiresAt: new Date(Date.now() + refreshMaxAgeSeconds * 1000),
    },
  });

  const accessToken = await signAccessToken({ sub: userId, role, platform });
  await setAuthCookies(platform, accessToken, rawRefreshToken, refreshMaxAgeSeconds);
}
