import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  refreshToken: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
}));
const mockPush = vi.hoisted(() => ({ removeDeviceToken: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/push/deviceTokens", () => mockPush);

const { listDeviceSessions, revokeDeviceSession, revokeFamilyByRefreshToken } =
  await import("@/lib/auth/deviceSessions");
const { Platform } = await import("@/utils/platform");

describe("listDeviceSessions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists only live, device-tagged sessions for this user and platform", async () => {
    mockPrisma.refreshToken.findMany.mockResolvedValue([
      {
        familyId: "fam1",
        deviceId: "dev-1",
        deviceLabel: "Pixel 8",
        appVersion: "1.0.0",
        lastUsedAt: new Date("2026-10-19"),
        createdAt: new Date("2026-10-01"),
      },
    ]);
    const list = await listDeviceSessions("u1", Platform.SURFBOARD);

    const where = mockPrisma.refreshToken.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      userId: "u1",
      platform: "surfboard",
      revokedAt: null,
      deviceId: { not: null },
    });
    expect(list).toEqual([
      {
        id: "fam1",
        deviceId: "dev-1",
        deviceLabel: "Pixel 8",
        appVersion: "1.0.0",
        lastUsedAt: new Date("2026-10-19"),
        signedInAt: new Date("2026-10-01"),
      },
    ]);
  });
});

describe("revokeDeviceSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is scoped to the caller's own user and platform, so someone else's family id matches nothing", async () => {
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });
    expect(
      await revokeDeviceSession("u1", Platform.SURFBOARD, "fam-of-u2")
    ).toBe(0);
    expect(mockPrisma.refreshToken.updateMany.mock.calls[0][0].where).toEqual({
      userId: "u1",
      platform: "surfboard",
      familyId: "fam-of-u2",
      revokedAt: null,
    });
  });

  it("forgets the push token of the device the family belongs to", async () => {
    mockPrisma.refreshToken.findFirst.mockResolvedValue({ deviceId: "dev-1" });
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

    expect(await revokeDeviceSession("u1", Platform.SURFBOARD, "fam1")).toBe(2);

    // The device is looked up for the caller's own family only.
    expect(mockPrisma.refreshToken.findFirst.mock.calls[0][0].where).toEqual({
      userId: "u1",
      platform: "surfboard",
      familyId: "fam1",
      deviceId: { not: null },
    });
    expect(mockPush.removeDeviceToken).toHaveBeenCalledWith(
      "u1",
      "surfboard",
      "dev-1"
    );
  });

  it("forgets no token for a family that is not the caller's", async () => {
    mockPrisma.refreshToken.findFirst.mockResolvedValue(null);
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    await revokeDeviceSession("u1", Platform.SURFBOARD, "fam-of-u2");

    expect(mockPush.removeDeviceToken).not.toHaveBeenCalled();
  });
});

describe("revokeFamilyByRefreshToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("revokes the whole family of the presented token", async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      platform: "surfboard",
      familyId: "fam1",
    });
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    expect(await revokeFamilyByRefreshToken(Platform.SURFBOARD, "raw")).toBe(
      true
    );
    expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalledWith({
      where: {
        tokenHash: crypto.createHash("sha256").update("raw").digest("hex"),
      },
    });
    expect(mockPrisma.refreshToken.updateMany.mock.calls[0][0].where).toEqual({
      familyId: "fam1",
      platform: "surfboard",
      revokedAt: null,
    });
  });

  it("does nothing for an unknown token or one from another platform", async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(null);
    expect(await revokeFamilyByRefreshToken(Platform.SURFBOARD, "x")).toBe(
      false
    );
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      platform: "reva",
      familyId: "fam9",
    });
    expect(await revokeFamilyByRefreshToken(Platform.SURFBOARD, "y")).toBe(
      false
    );
    expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(mockPush.removeDeviceToken).not.toHaveBeenCalled();
  });

  it("forgets the push token of the phone that signed out", async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      platform: "surfboard",
      familyId: "fam1",
      userId: "u1",
      deviceId: "dev-1",
    });
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    await revokeFamilyByRefreshToken(Platform.SURFBOARD, "raw");

    expect(mockPush.removeDeviceToken).toHaveBeenCalledWith(
      "u1",
      "surfboard",
      "dev-1"
    );
  });

  it("forgets the token even when the session had already ended", async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      platform: "surfboard",
      familyId: "fam1",
      userId: "u1",
      deviceId: "dev-1",
    });
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    expect(await revokeFamilyByRefreshToken(Platform.SURFBOARD, "raw")).toBe(
      false
    );
    expect(mockPush.removeDeviceToken).toHaveBeenCalledTimes(1);
  });

  it("has no token to forget for a browser session, which has no device", async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      platform: "surfboard",
      familyId: "fam1",
      userId: "u1",
      deviceId: null,
    });
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    await revokeFamilyByRefreshToken(Platform.SURFBOARD, "raw");

    expect(mockPush.removeDeviceToken).not.toHaveBeenCalled();
  });
});
