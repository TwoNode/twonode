import crypto from "crypto";
import { Platform } from "@/utils/platform";
import prisma from "@/lib/prisma";
import { verifyToken, signAccessToken, JWTPayload } from "@/lib/auth/jwt";
import {
  getAccessTokenCookie,
  setAuthCookies,
  setAccessTokenCookie,
  clearAuthCookies,
} from "@/lib/auth/cookies";
import { findUserById } from "@/lib/auth/userLookup";
import {
  getEncryptedUserData,
  getUserActiveSubscription,
  type EncryptedUserData,
} from "@/utils/encryptedCookies";
import { computeMustVerifyNow } from "@/lib/auth/emailVerificationGate";

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
  refreshMaxAgeSeconds: number = 30 * 24 * 60 * 60,
  userVerification?: { emailVerified: boolean; createdAt: Date }
): Promise<void> {
  const familyId = crypto.randomUUID();
  const rawRefreshToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawRefreshToken)
    .digest("hex");

  await prisma.refreshToken.create({
    data: {
      userId,
      platform,
      tokenHash,
      familyId,
      expiresAt: new Date(Date.now() + refreshMaxAgeSeconds * 1000),
    },
  });

  const user = userVerification ?? (await findUserById(platform, userId));
  const emailVerified = user?.emailVerified ?? false;
  const mustVerifyNow = user
    ? await computeMustVerifyNow(platform, user)
    : false;

  const accessToken = await signAccessToken({
    sub: userId,
    role,
    platform,
    emailVerified,
    mustVerifyNow,
  });
  await setAuthCookies(
    platform,
    accessToken,
    rawRefreshToken,
    refreshMaxAgeSeconds
  );
}

export type RefreshResult =
  { ok: true } | { ok: false; reason: "invalid" | "inactive" };

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
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawRefreshToken)
    .digest("hex");

  const newRawRefreshToken = crypto.randomBytes(32).toString("hex");
  const newTokenHash = crypto
    .createHash("sha256")
    .update(newRawRefreshToken)
    .digest("hex");

  // Claim the old token AND create its replacement in one transaction, with
  // `replacedBy` set by the claim itself. Anything less leaves a window where
  // the old token is revoked but has no recorded successor — a second tab
  // refreshing in that window looks exactly like token theft and gets the
  // whole family revoked. The claim is also the concurrency guard: under
  // READ COMMITTED the second of two simultaneous updateMany calls waits for
  // the first to commit, re-evaluates `revokedAt: null`, and matches nothing.
  const claimed = await prisma.$transaction(async (tx) => {
    const claim = await tx.refreshToken.updateMany({
      where: {
        tokenHash,
        platform,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date(), replacedBy: newTokenHash },
    });
    if (claim.count === 0) return null;

    const current = await tx.refreshToken.findUnique({ where: { tokenHash } });
    if (!current) return null;

    await tx.refreshToken.create({
      data: {
        userId: current.userId,
        platform,
        tokenHash: newTokenHash,
        familyId: current.familyId,
        // Inherit the rotated token's own expiry rather than resetting to a
        // fresh +30 days — rotation refreshes the token value, it shouldn't
        // extend (or shorten) the session length the original login/
        // rememberMe choice set.
        expiresAt: current.expiresAt,
      },
    });
    return current;
  });

  if (!claimed) {
    const existing = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    // Concurrency grace period (30 seconds): a token rotated moments ago whose
    // replacement is still live was presented again by a concurrent request
    // (e.g. several tabs waking at once), not by a thief. Re-issue an access
    // token only — never a second refresh token — for the active session.
    // Platform must match: a token minted for another product is not ours to
    // vouch for.
    const GRACE_PERIOD_MS = 30 * 1000;
    if (
      existing &&
      existing.platform === platform &&
      existing.revokedAt &&
      existing.replacedBy &&
      Date.now() - existing.revokedAt.getTime() < GRACE_PERIOD_MS
    ) {
      const replacement = await prisma.refreshToken.findUnique({
        where: { tokenHash: existing.replacedBy },
      });
      if (
        replacement &&
        !replacement.revokedAt &&
        replacement.expiresAt > new Date()
      ) {
        const user = await findUserById(platform, replacement.userId);
        if (user && user.isActive) {
          const mustVerifyNow = await computeMustVerifyNow(platform, user);
          const newAccessToken = await signAccessToken({
            sub: user.id,
            role: user.role,
            platform,
            emailVerified: user.emailVerified,
            mustVerifyNow,
          });
          await setAccessTokenCookie(platform, newAccessToken);
          return { ok: true };
        }
      }
    }

    if (existing?.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId },
        data: { revokedAt: new Date() },
      });
    }
    await clearAuthCookies(platform);
    return { ok: false, reason: "invalid" };
  }

  const user = await findUserById(platform, claimed.userId);
  if (!user || !user.isActive) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: newTokenHash },
      data: { revokedAt: new Date() },
    });
    await clearAuthCookies(platform);
    return { ok: false, reason: "inactive" };
  }

  const mustVerifyNow = await computeMustVerifyNow(platform, user);
  const newAccessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    platform,
    emailVerified: user.emailVerified,
    mustVerifyNow,
  });
  const remainingSeconds = Math.max(
    0,
    Math.floor((claimed.expiresAt.getTime() - Date.now()) / 1000)
  );
  await setAuthCookies(
    platform,
    newAccessToken,
    newRawRefreshToken,
    remainingSeconds
  );

  return { ok: true };
}

/**
 * Revokes all active refresh tokens in the database for a user and clears
 * the native auth cookies. Can safely be called with or without a platform.
 */
export async function revokeUserSession(
  platform?: Platform | null,
  userId?: string | null
): Promise<void> {
  if (userId) {
    await prisma.refreshToken
      .updateMany({
        where: {
          userId,
          ...(platform ? { platform } : {}),
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      })
      .catch(() => {});
  }

  if (platform) {
    await clearAuthCookies(platform);
  } else {
    // Clear all known product platforms if platform was not specified
    await Promise.all([
      clearAuthCookies(Platform.SURFBOARD),
      clearAuthCookies(Platform.REVA),
      clearAuthCookies(Platform.GBC),
    ]).catch(() => {});
  }
}
