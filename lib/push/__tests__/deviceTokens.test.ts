import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  refreshToken: { findFirst: vi.fn() },
  deviceToken: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const {
  EXPO_TOKEN,
  registerDeviceToken,
  removeDeviceToken,
  tokensForUsers,
  removeTokens,
} = await import("@/lib/push/deviceTokens");
const { Platform } = await import("@/utils/platform");

const INPUT = {
  deviceId: "device-abcdef01",
  token: "ExponentPushToken[abcdefgh12345678]",
  os: "android" as const,
  appVersion: "1.0.0",
};

beforeEach(() => {
  vi.resetAllMocks();
  mockPrisma.refreshToken.findFirst.mockResolvedValue({ id: "rt1" });
  mockPrisma.deviceToken.deleteMany.mockReturnValue("deleted");
  mockPrisma.deviceToken.create.mockReturnValue("created");
  mockPrisma.$transaction.mockResolvedValue([]);
});

describe("EXPO_TOKEN", () => {
  it.each([
    "ExponentPushToken[abcdefgh12345678]",
    "ExpoPushToken[abcdefgh12345678]",
    "ExponentPushToken[a_b-c_d-e1234]",
  ])("accepts %s", (token) => {
    expect(EXPO_TOKEN.test(token)).toBe(true);
  });

  it.each([
    "",
    "abcdefgh12345678",
    "ExponentPushToken[short]",
    "ExponentPushToken[abcdefgh12345678",
    "ExponentPushToken[abcd efgh 12345678]",
    "ExponentPushToken[abcdefgh12345678]extra",
    " ExponentPushToken[abcdefgh12345678]",
    `ExponentPushToken[${"a".repeat(201)}]`,
    "fcm:APA91bH...",
  ])("rejects %j", (token) => {
    expect(EXPO_TOKEN.test(token)).toBe(false);
  });
});

describe("registerDeviceToken", () => {
  it("keeps the token only for a live device session of this user", async () => {
    expect(await registerDeviceToken("u1", Platform.SURFBOARD, INPUT)).toBe(
      true
    );

    const where = mockPrisma.refreshToken.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({
      userId: "u1",
      platform: "surfboard",
      deviceId: "device-abcdef01",
      revokedAt: null,
    });
    expect(where.expiresAt.gt).toBeInstanceOf(Date);
  });

  it("writes nothing for a device that is not a live session of the caller", async () => {
    mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

    expect(await registerDeviceToken("u1", Platform.SURFBOARD, INPUT)).toBe(
      false
    );
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.deviceToken.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.deviceToken.create).not.toHaveBeenCalled();
  });

  it("moves a token that was another person's: the old rows go by token alone, then the pair is written", async () => {
    await registerDeviceToken("u2", Platform.SURFBOARD, INPUT);

    // Both writes go in one transaction, delete first.
    expect(mockPrisma.$transaction).toHaveBeenCalledWith([
      "deleted",
      "created",
    ]);
    const where = mockPrisma.deviceToken.deleteMany.mock.calls[0][0].where;
    // The first branch names the token only (no user), so u1's row for the same
    // phone is removed when u2 signs in on it.
    expect(where.OR).toContainEqual({ token: INPUT.token });
    // The second branch replaces this user's own earlier token for this device.
    expect(where.OR).toContainEqual({
      userId: "u2",
      platform: "surfboard",
      deviceId: "device-abcdef01",
    });
    expect(where.OR).toHaveLength(2);
  });

  it("stores the install's details and a fresh lastSeenAt", async () => {
    await registerDeviceToken("u1", Platform.SURFBOARD, INPUT);

    const data = mockPrisma.deviceToken.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      userId: "u1",
      platform: "surfboard",
      deviceId: "device-abcdef01",
      token: INPUT.token,
      os: "android",
      appVersion: "1.0.0",
    });
    expect(data.lastSeenAt).toBeInstanceOf(Date);
  });

  it("stores a missing app version as null", async () => {
    await registerDeviceToken("u1", Platform.SURFBOARD, {
      ...INPUT,
      appVersion: undefined,
    });
    expect(mockPrisma.deviceToken.create.mock.calls[0][0].data.appVersion).toBe(
      null
    );
  });
});

describe("removeDeviceToken", () => {
  it("removes only this user's token for this device and platform", async () => {
    mockPrisma.deviceToken.deleteMany.mockResolvedValue({ count: 1 });

    expect(await removeDeviceToken("u1", Platform.SURFBOARD, "dev-1")).toBe(1);
    expect(mockPrisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", platform: "surfboard", deviceId: "dev-1" },
    });
  });

  it("answers 0 when there was nothing to remove", async () => {
    mockPrisma.deviceToken.deleteMany.mockResolvedValue({ count: 0 });
    expect(await removeDeviceToken("u1", Platform.SURFBOARD, "dev-1")).toBe(0);
  });
});

describe("tokensForUsers", () => {
  it("looks up nothing for nobody", async () => {
    expect(await tokensForUsers([], Platform.SURFBOARD)).toEqual([]);
    expect(mockPrisma.deviceToken.findMany).not.toHaveBeenCalled();
  });

  it("returns only the user and the token, for the platform asked", async () => {
    mockPrisma.deviceToken.findMany.mockResolvedValue([
      { userId: "u1", token: "ExponentPushToken[abcdefgh12345678]" },
    ]);

    const rows = await tokensForUsers(["u1", "u2"], Platform.SURFBOARD);

    expect(rows).toEqual([
      { userId: "u1", token: "ExponentPushToken[abcdefgh12345678]" },
    ]);
    expect(mockPrisma.deviceToken.findMany).toHaveBeenCalledWith({
      where: { userId: { in: ["u1", "u2"] }, platform: "surfboard" },
      select: { userId: true, token: true },
    });
  });
});

describe("removeTokens", () => {
  it("does nothing for no tokens", async () => {
    expect(await removeTokens([])).toBe(0);
    expect(mockPrisma.deviceToken.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes the tokens named, whoever they belong to", async () => {
    mockPrisma.deviceToken.deleteMany.mockResolvedValue({ count: 2 });

    expect(await removeTokens(["a", "b"])).toBe(2);
    expect(mockPrisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ["a", "b"] } },
    });
  });
});
