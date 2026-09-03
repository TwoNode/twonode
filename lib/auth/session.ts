import crypto from "crypto";
import { Platform } from "@/utils/platform";
import prisma from "@/lib/prisma";
import { verifyToken, signAccessToken, JWTPayload } from "@/lib/auth/jwt";
import { getAccessTokenCookie, setAuthCookies } from "@/lib/auth/cookies";
import { findUserById } from "@/lib/auth/userLookup";
import {
  getUserActiveSubscription,
  type EncryptedUserData,
} from "@/utils/encryptedCookies";

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
 * The /api/v1/{reva,surfboard}/session routes (and the client hooks that
 * call them, useRevaUserAccess/useRevaAdminAccess) were built against the
 * legacy Kinde-derived encrypted cookie's EncryptedUserData shape. Rather
 * than teach every consumer a second shape, a natively-authenticated
 * request gets adapted into that same shape here — the one place that
 * translation happens — so those routes/hooks work unmodified for either
 * auth method.
 */
export async function getNativeSessionAsLegacyUserData(
  platform: Platform
): Promise<EncryptedUserData | null> {
  const session = await getServerSession(platform);
  if (!session) return null;

  const user = await findUserById(platform, session.sub);
  if (!user || !user.isActive) return null;

  const subscription =
    platform === Platform.SURFBOARD
      ? ((await getUserActiveSubscription(user.id)) ?? undefined)
      : undefined;

  return {
    userId: user.id,
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    kindeId: "", // native accounts have no real Kinde identity
    sessionId: session.sub,
    lastActivity: Date.now(),
    picture: null,
    platforms: { [platform]: { role: user.role as any, subscription } },
    // Legacy top-level fields some older call sites still read directly.
    platform,
    role: user.role as any,
    subscription,
  };
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
