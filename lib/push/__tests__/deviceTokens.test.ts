import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  refreshToken: { findFirst: vi.fn(), findMany: vi.fn() },
  deviceToken: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
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
  removeTokensDeadSince,
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

describe("registerDeviceToken when registrations overlap (I-059)", () => {
  const unique = () =>
    Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

  it("counts a registration that lost to this install's own as kept, and only touches the row", async () => {
    mockPrisma.$transaction.mockRejectedValueOnce(unique());
    mockPrisma.deviceToken.updateMany.mockResolvedValue({ count: 1 });

    expect(await registerDeviceToken("u1", Platform.SURFBOARD, INPUT)).toBe(
      true
    );
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    const call = mockPrisma.deviceToken.updateMany.mock.calls[0][0];
    // Only a row that is this very install's counts as "already registered".
    expect(call.where).toEqual({
      token: INPUT.token,
      userId: "u1",
      platform: "surfboard",
      deviceId: "device-abcdef01",
    });
    expect(call.data).toMatchObject({ os: "android", appVersion: "1.0.0" });
    expect(call.data.lastSeenAt).toBeInstanceOf(Date);
  });

  it("writes the pair again when the row that got there first is someone else's, then succeeds", async () => {
    mockPrisma.$transaction
      .mockRejectedValueOnce(unique())
      .mockResolvedValueOnce([]);
    mockPrisma.deviceToken.updateMany.mockResolvedValue({ count: 0 });

    expect(await registerDeviceToken("u2", Platform.SURFBOARD, INPUT)).toBe(
      true
    );
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it("gives up with the original error after three tries, so a real conflict is still seen", async () => {
    const error = unique();
    mockPrisma.$transaction.mockRejectedValue(error);
    mockPrisma.deviceToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      registerDeviceToken("u2", Platform.SURFBOARD, INPUT)
    ).rejects.toBe(error);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it("does not retry any other error", async () => {
    const error = Object.assign(new Error("connection lost"), {
      code: "P1001",
    });
    mockPrisma.$transaction.mockRejectedValue(error);

    await expect(
      registerDeviceToken("u1", Platform.SURFBOARD, INPUT)
    ).rejects.toBe(error);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.deviceToken.updateMany).not.toHaveBeenCalled();
  });

  it("is not asked to touch anything when the first try works", async () => {
    await registerDeviceToken("u1", Platform.SURFBOARD, INPUT);
    expect(mockPrisma.deviceToken.updateMany).not.toHaveBeenCalled();
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
  const row = (over: Record<string, unknown> = {}) => ({
    id: "t1",
    userId: "u1",
    deviceId: "device-abcdef01",
    token: "ExponentPushToken[abcdefgh12345678]",
    ...over,
  });

  beforeEach(() => {
    mockPrisma.deviceToken.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("looks up nothing for nobody", async () => {
    expect(await tokensForUsers([], Platform.SURFBOARD)).toEqual([]);
    expect(mockPrisma.deviceToken.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.refreshToken.findMany).not.toHaveBeenCalled();
  });

  it("asks for the platform's tokens of these people, and checks no session when there are none", async () => {
    mockPrisma.deviceToken.findMany.mockResolvedValue([]);

    expect(await tokensForUsers(["u1", "u2"], Platform.SURFBOARD)).toEqual([]);

    expect(mockPrisma.deviceToken.findMany).toHaveBeenCalledWith({
      where: { userId: { in: ["u1", "u2"] }, platform: "surfboard" },
      select: { id: true, userId: true, deviceId: true, token: true },
    });
    expect(mockPrisma.refreshToken.findMany).not.toHaveBeenCalled();
  });

  it("returns only the user and the token, never the device or the row id", async () => {
    mockPrisma.deviceToken.findMany.mockResolvedValue([row()]);
    mockPrisma.refreshToken.findMany.mockResolvedValue([
      { userId: "u1", deviceId: "device-abcdef01" },
    ]);

    const rows = await tokensForUsers(["u1", "u2"], Platform.SURFBOARD);

    expect(rows).toEqual([
      { userId: "u1", token: "ExponentPushToken[abcdefgh12345678]" },
    ]);
    expect(mockPrisma.deviceToken.deleteMany).not.toHaveBeenCalled();
  });

  it("counts only a session that is not revoked and not expired, of these people, on this platform, for these devices", async () => {
    mockPrisma.deviceToken.findMany.mockResolvedValue([
      row(),
      row({
        id: "t2",
        userId: "u2",
        deviceId: "device-zzzzzz02",
        token: "ExponentPushToken[zzzzzzzz22222222]",
      }),
    ]);
    mockPrisma.refreshToken.findMany.mockResolvedValue([]);

    await tokensForUsers(["u1", "u2"], Platform.SURFBOARD);

    const args = mockPrisma.refreshToken.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      userId: { in: ["u1", "u2"] },
      platform: "surfboard",
      deviceId: { in: ["device-abcdef01", "device-zzzzzz02"] },
      revokedAt: null,
    });
    expect(args.where.expiresAt.gt).toBeInstanceOf(Date);
    expect(args.select).toEqual({ userId: true, deviceId: true });
  });

  it("does not return a token whose session ended, and deletes it by its row id", async () => {
    mockPrisma.deviceToken.findMany.mockResolvedValue([
      row(),
      row({
        id: "t2",
        userId: "u2",
        deviceId: "device-zzzzzz02",
        token: "ExponentPushToken[zzzzzzzz22222222]",
      }),
    ]);
    // Only u2's device still has a session.
    mockPrisma.refreshToken.findMany.mockResolvedValue([
      { userId: "u2", deviceId: "device-zzzzzz02" },
    ]);

    const rows = await tokensForUsers(["u1", "u2"], Platform.SURFBOARD);

    expect(rows).toEqual([
      { userId: "u2", token: "ExponentPushToken[zzzzzzzz22222222]" },
    ]);
    expect(mockPrisma.deviceToken.deleteMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["t1"] } },
    });
  });

  it("does not let another person's session on the same phone keep this person's token alive", async () => {
    mockPrisma.deviceToken.findMany.mockResolvedValue([row({ userId: "u1" })]);
    // u2 is signed in on the same device id; u1 is not.
    mockPrisma.refreshToken.findMany.mockResolvedValue([
      { userId: "u2", deviceId: "device-abcdef01" },
    ]);

    expect(await tokensForUsers(["u1", "u2"], Platform.SURFBOARD)).toEqual([]);
    expect(mockPrisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["t1"] } },
    });
  });

  it("does not let the same person's session on another device keep a token alive", async () => {
    mockPrisma.deviceToken.findMany.mockResolvedValue([row()]);
    mockPrisma.refreshToken.findMany.mockResolvedValue([
      { userId: "u1", deviceId: "device-other001" },
    ]);

    expect(await tokensForUsers(["u1"], Platform.SURFBOARD)).toEqual([]);
  });

  it("returns every live token of a person with two phones", async () => {
    mockPrisma.deviceToken.findMany.mockResolvedValue([
      row(),
      row({
        id: "t2",
        deviceId: "device-zzzzzz02",
        token: "ExponentPushToken[zzzzzzzz22222222]",
      }),
    ]);
    mockPrisma.refreshToken.findMany.mockResolvedValue([
      { userId: "u1", deviceId: "device-abcdef01" },
      { userId: "u1", deviceId: "device-zzzzzz02" },
    ]);

    const rows = await tokensForUsers(["u1"], Platform.SURFBOARD);

    expect(rows.map((r) => r.token)).toEqual([
      "ExponentPushToken[abcdefgh12345678]",
      "ExponentPushToken[zzzzzzzz22222222]",
    ]);
  });

  it("still returns the live tokens when dropping the ended ones fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockPrisma.deviceToken.findMany.mockResolvedValue([
      row(),
      row({
        id: "t2",
        userId: "u2",
        deviceId: "device-zzzzzz02",
        token: "ExponentPushToken[zzzzzzzz22222222]",
      }),
    ]);
    mockPrisma.refreshToken.findMany.mockResolvedValue([
      { userId: "u2", deviceId: "device-zzzzzz02" },
    ]);
    mockPrisma.deviceToken.deleteMany.mockRejectedValue(new Error("db down"));

    const rows = await tokensForUsers(["u1", "u2"], Platform.SURFBOARD);

    expect(rows).toEqual([
      { userId: "u2", token: "ExponentPushToken[zzzzzzzz22222222]" },
    ]);
  });

  it("does not log the token when dropping fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockPrisma.deviceToken.findMany.mockResolvedValue([row()]);
    mockPrisma.refreshToken.findMany.mockResolvedValue([]);
    mockPrisma.deviceToken.deleteMany.mockRejectedValue(new Error("db down"));

    await tokensForUsers(["u1"], Platform.SURFBOARD);

    expect(spy).toHaveBeenCalled();
    expect(JSON.stringify(spy.mock.calls)).not.toContain("ExponentPushToken");
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

describe("removeTokensDeadSince", () => {
  const SENT = new Date("2026-10-29T09:00:00.000Z");

  it("does nothing for no tokens", async () => {
    expect(await removeTokensDeadSince([])).toBe(0);
    expect(mockPrisma.deviceToken.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes a token only if it was last seen no later than the send it was reported for", async () => {
    mockPrisma.deviceToken.deleteMany.mockResolvedValue({ count: 1 });
    const later = new Date("2026-10-29T09:30:00.000Z");

    expect(
      await removeTokensDeadSince([
        { token: "a", sentAt: SENT },
        { token: "b", sentAt: later },
      ])
    ).toBe(1);

    expect(mockPrisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { token: "a", lastSeenAt: { lte: SENT } },
          { token: "b", lastSeenAt: { lte: later } },
        ],
      },
    });
  });

  it("works through a long list in chunks and adds up what was deleted", async () => {
    mockPrisma.deviceToken.deleteMany.mockResolvedValue({ count: 3 });
    const dead = Array.from({ length: 1100 }, (_, i) => ({
      token: `token-${i}`,
      sentAt: SENT,
    }));

    expect(await removeTokensDeadSince(dead)).toBe(9);

    const sizes = mockPrisma.deviceToken.deleteMany.mock.calls.map(
      ([arg]) => arg.where.OR.length
    );
    expect(sizes).toEqual([500, 500, 100]);
  });
});
