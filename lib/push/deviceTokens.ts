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

/** The tokens to send a push to for these people, on this platform. */
export async function tokensForUsers(
  userIds: string[],
  platform: Platform
): Promise<{ userId: string; token: string }[]> {
  if (userIds.length === 0) return [];
  return prisma.deviceToken.findMany({
    where: { userId: { in: userIds }, platform },
    select: { userId: true, token: true },
  });
}

/** Drops tokens the push service said are not registered any more. */
export async function removeTokens(tokens: string[]): Promise<number> {
  if (tokens.length === 0) return 0;
  const result = await prisma.deviceToken.deleteMany({
    where: { token: { in: tokens } },
  });
  return result.count;
}
