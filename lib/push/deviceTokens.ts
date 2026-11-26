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

/** How many times a registration is tried when another one gets in between (see below). */
const REGISTER_TRIES = 3;

/** How long a registration may wait for its turn and then run (a lock is held only for the transaction). */
const TRANSACTION_LIMITS = { maxWait: 8_000, timeout: 8_000 };

/**
 * Takes, for the rest of this transaction, a Postgres advisory lock on the install and another on the
 * token, so that two registrations that could hit one of the two unique indexes run one after the
 * other. The two locks are always taken in the same (sorted) order, so two registrations can never each
 * hold one and wait for the other (no deadlock). Registrations for different installs and different
 * tokens do not wait for each other. The locks are released when the transaction ends.
 */
async function serialise(
  tx: {
    $executeRaw: (
      query: TemplateStringsArray,
      ...values: unknown[]
    ) => Promise<number>;
  },
  userId: string,
  platform: Platform,
  input: RegisterDeviceTokenInput
) {
  const keys = [
    `push-install:${userId}:${platform}:${input.deviceId}`,
    `push-token:${input.token}`,
  ].sort();
  for (const key of keys) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }
}

const isUniqueViolation = (error: unknown) =>
  (error as { code?: string } | null)?.code === "P2002";

/**
 * Remembers this install's token for this user. The token belongs to the
 * install, so a phone someone else signs in on moves it to them (the old
 * owner stops getting this phone's pushes), and an install that changed its
 * token replaces the old one. Returns false, writing nothing, when `deviceId`
 * is not a live device session of the caller: a token is only ever kept for a
 * phone that is signed in as this user.
 *
 * Registrations of one install can overlap (the app asks again whenever the
 * phone announces its address, and an older build asked dozens of times a
 * second), and so can two different tokens of one install (the address changed
 * while an earlier call was in flight) or two accounts signing in on one phone.
 * "Delete the old rows, then create the new one" is not safe against that: each
 * call deletes what the others just created, and the loser hits a unique index
 * (P2002, a 409 from the route) or a deadlock (a 500). So registrations that
 * could collide, the same install or the same token, are taken one at a time
 * with Postgres advisory locks inside the transaction (`serialise` below), and
 * the last one to run wins, as it would have if they had arrived one by one.
 * A P2002 that still gets through (another server running older code during a
 * deploy) is handled as before: when the row that got there first is this very
 * install's, it is only touched; otherwise the pair is written again, up to
 * `REGISTER_TRIES` times.
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
  for (let attempt = 1; ; attempt++) {
    try {
      await prisma.$transaction(async (tx) => {
        await serialise(tx, userId, platform, input);
        // One token per install and one install per user: whatever this token or
        // this user's device was tied to before goes, then the pair is written.
        await tx.deviceToken.deleteMany({
          where: {
            OR: [
              { token: input.token },
              { userId, platform, deviceId: input.deviceId },
            ],
          },
        });
        await tx.deviceToken.create({ data });
      }, TRANSACTION_LIMITS);
      return true;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Another registration got there first. If it was this install's own, it
      // is already what this call wanted: only note that the app is still here.
      const touched = await prisma.deviceToken.updateMany({
        where: {
          token: input.token,
          userId,
          platform,
          deviceId: input.deviceId,
        },
        data: {
          os: input.os,
          appVersion: input.appVersion ?? null,
          lastSeenAt: new Date(),
        },
      });
      if (touched.count > 0) return true;
      // Someone else's row (or one that has just gone): write the pair again.
      if (attempt >= REGISTER_TRIES) throw error;
    }
  }
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
