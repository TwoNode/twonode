import prisma from "@/lib/prisma";
import { Platform } from "@/utils/platform";

/**
 * Push addresses of the native app's installs (TASK-0015 1I.1). A token is a
 * delivery address and never a credential, but it is not returned or logged:
 * the only things this file hands out are the tokens to send to
 * (`tokensForUsers`) and nothing at all to a client.
 */

/** `ExponentPushToken[xxxx]` (older SDKs: `ExpoPushToken[xxxx]`). */
export const EXPO_TOKEN = /^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$/;

export const PUSH_OS = ["android", "ios"] as const;
export type PushOs = (typeof PUSH_OS)[number];

export type RegisterDeviceTokenInput = {
  deviceId: string;
  token: string;
  os: PushOs;
  appVersion?: string | null;
};

/**
 * Remembers this install's token for this user. The token belongs to the
 * install, so a phone someone else signs in on moves it to them (the old
 * owner stops getting this phone's pushes), and an install that changed its
 * token replaces the old one. Returns false, writing nothing, when `deviceId`
 * is not a live device session of the caller: a token is only ever kept for a
 * phone that is signed in as this user.
 */
export async function registerDeviceToken(
  userId: string,
  platform: Platform,
  input: RegisterDeviceTokenInput
): Promise<boolean> {
  const session = await prisma.refreshToken.findFirst({
    where: {
      userId,
      platform,
      deviceId: input.deviceId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  if (!session) return false;

  const data = {
    userId,
    platform,
    deviceId: input.deviceId,
    token: input.token,
    os: input.os,
    appVersion: input.appVersion ?? null,
    lastSeenAt: new Date(),
  };
  await prisma.$transaction([
    // One token per install and one install per user: whatever this token or
    // this user's device was tied to before goes, then the pair is written.
    prisma.deviceToken.deleteMany({
      where: {
        OR: [
          { token: input.token },
          { userId, platform, deviceId: input.deviceId },
        ],
      },
    }),
    prisma.deviceToken.create({ data }),
  ]);
  return true;
}

/** Forgets one device's token (the app turned push off, or is signing out). */
export async function removeDeviceToken(
  userId: string,
  platform: Platform,
  deviceId: string
): Promise<number> {
  const result = await prisma.deviceToken.deleteMany({
    where: { userId, platform, deviceId },
  });
  return result.count;
}

/**
 * The tokens to send a push to for these people, on this platform: only those
 * whose device still has a live session (not revoked, not expired). A phone
 * that signed out with no connection never told the server, so its token would
 * otherwise outlive the sign-in (A-053); such a token is not returned, and is
 * deleted here, best effort, so the table does not keep dead addresses.
 */
export async function tokensForUsers(
  userIds: string[],
  platform: Platform
): Promise<{ userId: string; token: string }[]> {
  if (userIds.length === 0) return [];
  const candidates = await prisma.deviceToken.findMany({
    where: { userId: { in: userIds }, platform },
    select: { id: true, userId: true, deviceId: true, token: true },
  });
  if (candidates.length === 0) return [];

  const sessions = await prisma.refreshToken.findMany({
    where: {
      userId: { in: userIds },
      platform,
      deviceId: { in: candidates.map((c) => c.deviceId) },
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { userId: true, deviceId: true },
  });
  // A session of another person on the same phone does not keep this person's
  // token alive, so the pair is the key.
  const live = new Set(sessions.map((s) => `${s.userId}/${s.deviceId}`));
  const isLive = (c: { userId: string; deviceId: string }) =>
    live.has(`${c.userId}/${c.deviceId}`);

  const ended = candidates.filter((c) => !isLive(c));
  if (ended.length > 0) {
    try {
      await prisma.deviceToken.deleteMany({
        where: { id: { in: ended.map((c) => c.id) } },
      });
    } catch (err) {
      // Not sending to them is what matters; the next send tries again.
      console.error("Push: could not drop tokens of ended sessions", err);
    }
  }

  return candidates
    .filter(isLive)
    .map(({ userId, token }) => ({ userId, token }));
}

/** Drops tokens the push service said are not registered any more. */
export async function removeTokens(tokens: string[]): Promise<number> {
  if (tokens.length === 0) return 0;
  const result = await prisma.deviceToken.deleteMany({
    where: { token: { in: tokens } },
  });
  return result.count;
}

/** Each pair is two bind values, and the database takes at most 32,767 of them in one query. */
const DEAD_TOKEN_CHUNK = 500;

/**
 * Drops tokens a delivery receipt (1I.6) said belong to a phone that is gone,
 * except one that registered again after the message was sent: the receipt is
 * about that earlier message, and an install that has been seen since is back.
 * The app registers on each launch, which moves `lastSeenAt`.
 */
export async function removeTokensDeadSince(
  dead: { token: string; sentAt: Date }[]
): Promise<number> {
  let removed = 0;
  for (let i = 0; i < dead.length; i += DEAD_TOKEN_CHUNK) {
    const result = await prisma.deviceToken.deleteMany({
      where: {
        OR: dead.slice(i, i + DEAD_TOKEN_CHUNK).map(({ token, sentAt }) => ({
          token,
          lastSeenAt: { lte: sentAt },
        })),
      },
    });
    removed += result.count;
  }
  return removed;
}
