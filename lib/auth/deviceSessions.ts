import crypto from "crypto";
import prisma from "@/lib/prisma";
import { Platform } from "@/utils/platform";
import { removeDeviceToken } from "@/lib/push/deviceTokens";

export type DeviceSession = {
  id: string; // the refresh-token family, the unit that is revoked
  deviceId: string;
  deviceLabel: string | null;
  appVersion: string | null;
  lastUsedAt: Date | null;
  signedInAt: Date;
};

/**
 * Signed-in native-app devices for a user: one entry per live refresh-token
 * family that was created through the mobile login (browser sessions carry no
 * deviceId and are not listed).
 */
export async function listDeviceSessions(
  userId: string,
  platform: Platform
): Promise<DeviceSession[]> {
  const rows = await prisma.refreshToken.findMany({
    where: {
      userId,
      platform,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      deviceId: { not: null },
    },
    orderBy: { lastUsedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.familyId,
    deviceId: r.deviceId as string,
    deviceLabel: r.deviceLabel,
    appVersion: r.appVersion,
    lastUsedAt: r.lastUsedAt,
    signedInAt: r.createdAt,
  }));
}

/**
 * Revokes one device's whole token family. Scoped to the caller's own user and
 * platform, so a family id belonging to someone else matches nothing.
 */
export async function revokeDeviceSession(
  userId: string,
  platform: Platform,
  familyId: string
): Promise<number> {
  // The device the family belongs to, read first: its push token goes with it.
  const family = await prisma.refreshToken.findFirst({
    where: { userId, platform, familyId, deviceId: { not: null } },
    select: { deviceId: true },
  });
  const result = await prisma.refreshToken.updateMany({
    where: { userId, platform, familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (family?.deviceId) {
    await removeDeviceToken(userId, platform, family.deviceId);
  }
  return result.count;
}

/**
 * Sign-out for a native app: revokes the family the presented refresh token
 * belongs to. Holding the refresh token is the credential, so this works even
 * when the access token has expired. Returns whether a live session was ended.
 */
export async function revokeFamilyByRefreshToken(
  platform: Platform,
  rawRefreshToken: string
): Promise<boolean> {
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawRefreshToken)
    .digest("hex");
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!row || row.platform !== platform) return false;
  const result = await prisma.refreshToken.updateMany({
    where: { familyId: row.familyId, platform, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  // Signing out stops the pushes to this phone for this person, even when the session had
  // already ended some other way (an expired family does not revoke itself).
  if (row.deviceId) {
    await removeDeviceToken(row.userId, platform, row.deviceId);
  }
  return result.count > 0;
}
