import crypto from "crypto";
import { Platform } from "@/utils/platform";
import prisma from "@/lib/prisma";
import { signAccessToken } from "@/lib/auth/jwt";
import { setAuthCookies, clearAuthCookies } from "@/lib/auth/cookies";
import { findUserById } from "@/lib/auth/userLookup";
import {
  getEncryptedUserData,
  type EncryptedUserData,
} from "@/utils/encryptedCookies";
import { getUserActiveSubscription } from "@/lib/subscriptionQueries";
import { getServerSession } from "@/lib/auth/session-edge";

// Re-exported for existing Node-runtime callers of this file — Edge Runtime
// code (proxy.ts) must import getServerSession from session-edge directly
// instead, since importing it via this file would still bundle this file's
// own Prisma import. See session-edge.ts's comment for why that matters.
export { getServerSession };

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
 * Resolves session/role data for server components that need it in-process
 * (dashboard shells, admin route guards), preferring the native session over
 * the legacy Kinde cookie. Native login never writes the legacy cookie, so a
 * legacy-only read leaves natively-authenticated users with no role data at
 * all — an empty sidebar at best (DashboardShell) or a full lockout at worst
 * (ServerProtectedAdminRoute redirecting them straight back to login). A
 * Kinde login still gets an equivalent, current result either way, since its
 * callback route dual-writes a native session alongside the legacy cookie.
 *
 * The /api/v1/{reva,surfboard}/session API routes intentionally keep the
 * opposite (legacy-first) order for their own established reasons — this is
 * a separate, in-process-only helper, not a replacement for those.
 */
export async function getEffectiveUserData(
  platform: Platform
): Promise<EncryptedUserData | null> {
  return (
    (await getNativeSessionAsLegacyUserData(platform)) ??
    (await getEncryptedUserData())
  );
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

export type RefreshResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "inactive" };

/**
 * Rotates a refresh token into a fresh access+refresh pair, with reuse
 * detection (replaying an already-rotated token revokes the whole family —
 * theft response) and expiry-inheritance (rotation refreshes the token
 * value, it must not reset or extend the session length the original
 * login/rememberMe choice set). Extracted from POST /api/v1/auth/refresh so
 * proxy.ts's silent-refresh fast path (below) and the explicit client-
 * triggered route share one implementation of this security-critical logic
 * instead of two that can drift.
 */
export async function rotateRefreshToken(
  platform: Platform,
  rawRefreshToken: string
): Promise<RefreshResult> {
  const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");

  const rotated = await prisma.refreshToken.updateMany({
    where: { tokenHash, platform, revokedAt: null, expiresAt: { gt: new Date() } },
    data: { revokedAt: new Date() },
  });

  if (rotated.count === 0) {
    const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (existing?.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId },
        data: { revokedAt: new Date() },
      });
    }
    await clearAuthCookies(platform);
    return { ok: false, reason: "invalid" };
  }

  const currentToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  const user = currentToken ? await findUserById(platform, currentToken.userId) : null;

  if (!currentToken || !user || !user.isActive) {
    await clearAuthCookies(platform);
    return { ok: false, reason: "inactive" };
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
        // fresh +30 days — rotation refreshes the token value, it shouldn't
        // extend (or shorten) the session length the original login/
        // rememberMe choice set.
        expiresAt: currentToken.expiresAt,
      },
    }),
  ]);

  const newAccessToken = await signAccessToken({ sub: user.id, role: user.role, platform });
  const remainingSeconds = Math.max(
    0,
    Math.floor((currentToken.expiresAt.getTime() - Date.now()) / 1000)
  );
  await setAuthCookies(platform, newAccessToken, newRawRefreshToken, remainingSeconds);

  return { ok: true };
}
