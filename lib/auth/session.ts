import crypto from "crypto";
import { Platform } from "@/utils/platform";
import prisma from "@/lib/prisma";
import { verifyToken, signAccessToken, JWTPayload } from "@/lib/auth/jwt";
import {
  getAccessTokenCookie,
  getRefreshTokenCookie,
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
import { getRequestBearerToken } from "@/lib/auth/bearer";

export async function getServerSession(
  platform: Platform
): Promise<JWTPayload | null> {
  // A native app sends its access token as `Authorization: Bearer`. When that
  // header is present it is the ONLY credential considered: an invalid bearer
  // token must not fall back to cookies, or the CSRF exemption for bearer
  // requests (lib/auth/csrf.ts) would apply to a cookie-authenticated request.
  const bearer = await getRequestBearerToken();
  if (bearer) {
    const payload = await verifyToken(bearer);
    if (!payload || payload.platform !== platform) return null;
    return payload;
  }

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

export type DeviceInfo = {
  deviceId: string;
  deviceLabel?: string | null;
  appVersion?: string | null;
};

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
/** How long a native-app session lasts without signing in again (rotation inherits it, never extends it). */
export const MOBILE_REFRESH_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Creates a new refresh-token family and signs its first access token. Shared
 * by the cookie path (issueSession) and the native-app path
 * (issueMobileSession) so both mint identical sessions; neither this function
 * nor its callers' security checks differ between them, only how the tokens
 * are delivered (cookies vs response body).
 */
async function mintSessionTokens(
  userId: string,
  role: string,
  platform: Platform,
  refreshMaxAgeSeconds: number,
  userVerification?: { emailVerified: boolean; createdAt: Date },
  device?: DeviceInfo
): Promise<{
  accessToken: string;
  rawRefreshToken: string;
  expiresAt: Date;
  emailVerified: boolean;
  mustVerifyNow: boolean;
}> {
  const familyId = crypto.randomUUID();
  const rawRefreshToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(rawRefreshToken);
  const expiresAt = new Date(Date.now() + refreshMaxAgeSeconds * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      platform,
      tokenHash,
      familyId,
      expiresAt,
      ...(device
        ? {
            deviceId: device.deviceId,
            deviceLabel: device.deviceLabel ?? null,
            appVersion: device.appVersion ?? null,
            lastUsedAt: new Date(),
          }
        : {}),
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
  return {
    accessToken,
    rawRefreshToken,
    expiresAt,
    emailVerified,
    mustVerifyNow,
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
  refreshMaxAgeSeconds: number = 30 * 24 * 60 * 60,
  userVerification?: { emailVerified: boolean; createdAt: Date }
): Promise<void> {
  const { accessToken, rawRefreshToken } = await mintSessionTokens(
    userId,
    role,
    platform,
    refreshMaxAgeSeconds,
    userVerification
  );
  await setAuthCookies(
    platform,
    accessToken,
    rawRefreshToken,
    refreshMaxAgeSeconds
  );
}

export type MobileSession = {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresAt: Date;
  emailVerified?: boolean;
  mustVerifyNow?: boolean;
};

/**
 * issueSession for a native app: same session, returned to the caller instead
 * of being set as cookies, and tagged with the device so it can be listed and
 * revoked on its own.
 */
export async function issueMobileSession(
  userId: string,
  role: string,
  platform: Platform,
  device: DeviceInfo,
  userVerification?: { emailVerified: boolean; createdAt: Date }
): Promise<MobileSession> {
  const {
    accessToken,
    rawRefreshToken,
    expiresAt,
    emailVerified,
    mustVerifyNow,
  } = await mintSessionTokens(
    userId,
    role,
    platform,
    MOBILE_REFRESH_LIFETIME_SECONDS,
    userVerification,
    device
  );
  return {
    accessToken,
    refreshToken: rawRefreshToken,
    accessExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshExpiresAt: expiresAt,
    emailVerified,
    mustVerifyNow,
  };
}

/**
 * Lifetime (seconds) to give a session that is being RE-issued for someone
 * who is already signed in, such as after verifying their email. It carries
 * the presented refresh token's remaining time instead of a fixed 30 days, so
 * a login made without "remember me" (1 day) is not silently stretched to 30.
 * Falls back to the 30-day default when there is no live refresh token.
 */
export async function currentRefreshLifetimeSeconds(
  platform: Platform
): Promise<number> {
  const DEFAULT_SECONDS = 30 * 24 * 60 * 60;
  const raw = await getRefreshTokenCookie(platform);
  if (!raw) return DEFAULT_SECONDS;

  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!row) return DEFAULT_SECONDS;

  const remaining = Math.floor((row.expiresAt.getTime() - Date.now()) / 1000);
  return remaining > 0 ? Math.min(remaining, DEFAULT_SECONDS) : DEFAULT_SECONDS;
}

export type RefreshResult =
  { ok: true } | { ok: false; reason: "invalid" | "inactive" };

type RotationOutcome =
  | {
      kind: "rotated";
      accessToken: string;
      newRawRefreshToken: string;
      expiresAt: Date;
    }
  | { kind: "grace"; accessToken: string }
  | { kind: "conflict" }
  | { kind: "invalid" }
  | { kind: "inactive" };

/**
 * The refresh-rotation logic itself, with no cookie handling, so the browser
 * path (rotateRefreshToken, cookies) and the native-app path
 * (rotateMobileRefreshToken, response body) share one implementation of this
 * security-critical code instead of two that can drift. Database side
 * effects (claiming the token, creating the successor, revoking a family on
 * reuse) all happen here; the callers only deliver the result.
 *
 * `reRotateOnGrace` is the one behavioural difference. A token re-presented
 * inside the 30-second grace window gets an access token only on the web
 * (the successor cookie is already in that browser). A phone whose refresh
 * response was lost still holds the OLD token and never saw the successor, so
 * for the app the grace branch revokes the live successor and issues a fresh
 * pair in the same family.
 */
async function rotateCore(
  platform: Platform,
  rawRefreshToken: string,
  opts: { reRotateOnGrace: boolean }
): Promise<RotationOutcome> {
  const tokenHash = sha256(rawRefreshToken);

  const newRawRefreshToken = crypto.randomBytes(32).toString("hex");
  const newTokenHash = sha256(newRawRefreshToken);

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
        // A native-app session keeps its device across rotations.
        deviceId: current.deviceId ?? null,
        deviceLabel: current.deviceLabel ?? null,
        appVersion: current.appVersion ?? null,
        lastUsedAt: current.deviceId ? new Date() : null,
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
    // (e.g. several tabs waking at once), not by a thief. Platform must match:
    // a token minted for another product is not ours to vouch for.
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

          if (!opts.reRotateOnGrace) {
            // Web: access token only, never a second refresh token.
            return { kind: "grace", accessToken: newAccessToken };
          }

          // App: replace the live successor with a fresh token, same family.
          const reissued = await prisma.$transaction(async (tx) => {
            const claim = await tx.refreshToken.updateMany({
              where: {
                tokenHash: replacement.tokenHash,
                revokedAt: null,
                expiresAt: { gt: new Date() },
              },
              data: { revokedAt: new Date(), replacedBy: newTokenHash },
            });
            if (claim.count === 0) return false;
            await tx.refreshToken.create({
              data: {
                userId: replacement.userId,
                platform,
                tokenHash: newTokenHash,
                familyId: replacement.familyId,
                expiresAt: replacement.expiresAt,
                deviceId: replacement.deviceId ?? null,
                deviceLabel: replacement.deviceLabel ?? null,
                appVersion: replacement.appVersion ?? null,
                lastUsedAt: replacement.deviceId ? new Date() : null,
              },
            });
            return true;
          });
          // Someone else rotated the successor first: not theft, but not
          // ours to finish either. The caller can simply try again.
          if (!reissued) return { kind: "conflict" };
          return {
            kind: "rotated",
            accessToken: newAccessToken,
            newRawRefreshToken,
            expiresAt: replacement.expiresAt,
          };
        }
      }
    }

    if (existing?.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId },
        data: { revokedAt: new Date() },
      });
    }
    return { kind: "invalid" };
  }

  const user = await findUserById(platform, claimed.userId);
  if (!user || !user.isActive) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: newTokenHash },
      data: { revokedAt: new Date() },
    });
    return { kind: "inactive" };
  }

  const mustVerifyNow = await computeMustVerifyNow(platform, user);
  const newAccessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    platform,
    emailVerified: user.emailVerified,
    mustVerifyNow,
  });
  return {
    kind: "rotated",
    accessToken: newAccessToken,
    newRawRefreshToken,
    expiresAt: claimed.expiresAt,
  };
}

/**
 * Rotates a refresh token into a fresh access+refresh pair, with reuse
 * detection (replaying an already-rotated token revokes the whole family —
 * theft response) and expiry-inheritance (rotation refreshes the token
 * value, it must not reset or extend the session length the original
 * login/rememberMe choice set). Extracted from POST /api/v1/auth/refresh so
 * proxy.ts's silent-refresh fast path (below) and the explicit client-
 * triggered route share one implementation of this security-critical logic
 * instead of two that can drift. Browser path: delivers the result as cookies.
 */
export async function rotateRefreshToken(
  platform: Platform,
  rawRefreshToken: string
): Promise<RefreshResult> {
  const outcome = await rotateCore(platform, rawRefreshToken, {
    reRotateOnGrace: false,
  });

  switch (outcome.kind) {
    case "rotated": {
      const remainingSeconds = Math.max(
        0,
        Math.floor((outcome.expiresAt.getTime() - Date.now()) / 1000)
      );
      await setAuthCookies(
        platform,
        outcome.accessToken,
        outcome.newRawRefreshToken,
        remainingSeconds
      );
      return { ok: true };
    }
    case "grace":
      await setAccessTokenCookie(platform, outcome.accessToken);
      return { ok: true };
    case "inactive":
      await clearAuthCookies(platform);
      return { ok: false, reason: "inactive" };
    default:
      // "invalid" (and "conflict", which only the app path can produce).
      await clearAuthCookies(platform);
      return { ok: false, reason: "invalid" };
  }
}

export type MobileRefreshResult =
  | { ok: true; session: MobileSession }
  | { ok: false; reason: "invalid" | "inactive" | "conflict" };

/**
 * rotateRefreshToken for a native app: the new pair comes back to the caller
 * instead of cookies, and a token re-presented inside the grace window is
 * re-rotated so a lost response does not end the session.
 */
export async function rotateMobileRefreshToken(
  platform: Platform,
  rawRefreshToken: string
): Promise<MobileRefreshResult> {
  const outcome = await rotateCore(platform, rawRefreshToken, {
    reRotateOnGrace: true,
  });
  if (outcome.kind === "rotated") {
    return {
      ok: true,
      session: {
        accessToken: outcome.accessToken,
        refreshToken: outcome.newRawRefreshToken,
        accessExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
        refreshExpiresAt: outcome.expiresAt,
      },
    };
  }
  if (outcome.kind === "conflict") return { ok: false, reason: "conflict" };
  if (outcome.kind === "inactive") return { ok: false, reason: "inactive" };
  return { ok: false, reason: "invalid" };
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
