import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTx = vi.hoisted(() => ({
  refreshToken: { updateMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
}));
const mockPrisma = vi.hoisted(() => ({
  refreshToken: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockTx)),
}));
const mockCookies = vi.hoisted(() => ({
  getAccessTokenCookie: vi.fn(),
  getRefreshTokenCookie: vi.fn(),
  setAuthCookies: vi.fn(),
  setAccessTokenCookie: vi.fn(),
  clearAuthCookies: vi.fn(),
}));
const mockBearer = vi.hoisted(() => ({ getRequestBearerToken: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/auth/cookies", () => mockCookies);
vi.mock("@/lib/auth/bearer", () => mockBearer);
vi.mock("@/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
  signAccessToken: vi.fn(async () => "access-jwt"),
}));
vi.mock("@/lib/auth/userLookup", () => ({ findUserById: vi.fn() }));
vi.mock("@/lib/auth/emailVerificationGate", () => ({
  computeMustVerifyNow: vi.fn(async () => false),
}));
vi.mock("@/utils/encryptedCookies", () => ({
  getEncryptedUserData: vi.fn(),
  getUserActiveSubscription: vi.fn(),
}));

const { getServerSession, issueMobileSession, rotateMobileRefreshToken } =
  await import("@/lib/auth/session");
const { verifyToken } = await import("@/lib/auth/jwt");
const { findUserById } = await import("@/lib/auth/userLookup");
const { Platform } = await import("@/utils/platform");

const sha256 = (v: string) =>
  crypto.createHash("sha256").update(v).digest("hex");
const activeUser = {
  id: "u1",
  role: "USER",
  isActive: true,
  emailVerified: true,
  createdAt: new Date(),
};
const future = () => new Date(Date.now() + 86_400_000);
const payload = (platform = "surfboard") => ({
  sub: "u1",
  role: "USER",
  platform,
  emailVerified: true,
  mustVerifyNow: false,
});

describe("getServerSession with a bearer token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBearer.getRequestBearerToken.mockResolvedValue(null);
  });

  it("authenticates from the bearer token and ignores cookies", async () => {
    mockBearer.getRequestBearerToken.mockResolvedValue("bearer-jwt");
    vi.mocked(verifyToken).mockResolvedValue(payload() as never);

    expect(await getServerSession(Platform.SURFBOARD)).toMatchObject({
      sub: "u1",
    });
    expect(verifyToken).toHaveBeenCalledWith("bearer-jwt");
    expect(mockCookies.getAccessTokenCookie).not.toHaveBeenCalled();
  });

  it("an invalid bearer token is a failure — it never falls back to a valid cookie", async () => {
    mockBearer.getRequestBearerToken.mockResolvedValue("forged");
    mockCookies.getAccessTokenCookie.mockResolvedValue("good-cookie-jwt");
    vi.mocked(verifyToken).mockImplementation(async (t: string) =>
      t === "good-cookie-jwt" ? (payload() as never) : null
    );

    expect(await getServerSession(Platform.SURFBOARD)).toBeNull();
    expect(mockCookies.getAccessTokenCookie).not.toHaveBeenCalled();
  });

  it("a bearer token minted for another platform is rejected", async () => {
    mockBearer.getRequestBearerToken.mockResolvedValue("reva-jwt");
    vi.mocked(verifyToken).mockResolvedValue(payload("reva") as never);

    expect(await getServerSession(Platform.SURFBOARD)).toBeNull();
  });

  it("with no bearer header the cookie path is unchanged", async () => {
    mockCookies.getAccessTokenCookie.mockResolvedValue("cookie-jwt");
    vi.mocked(verifyToken).mockResolvedValue(payload() as never);

    expect(await getServerSession(Platform.SURFBOARD)).toMatchObject({
      sub: "u1",
    });
    expect(verifyToken).toHaveBeenCalledWith("cookie-jwt");
  });
});

describe("issueMobileSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.refreshToken.create.mockResolvedValue({});
    vi.mocked(findUserById).mockResolvedValue(activeUser as never);
  });

  it("returns the pair instead of setting cookies, and tags the family with the device", async () => {
    const session = await issueMobileSession(
      "u1",
      "USER",
      Platform.SURFBOARD,
      {
        deviceId: "device-123456",
        deviceLabel: "Pixel 8",
        appVersion: "1.0.0",
      },
      { emailVerified: true, createdAt: new Date() }
    );

    expect(session.accessToken).toBe("access-jwt");
    expect(session.accessExpiresIn).toBe(900);
    expect(mockCookies.setAuthCookies).not.toHaveBeenCalled();

    const data = mockPrisma.refreshToken.create.mock.calls[0][0].data;
    expect(data.tokenHash).toBe(sha256(session.refreshToken));
    expect(data).toMatchObject({
      userId: "u1",
      platform: "surfboard",
      deviceId: "device-123456",
      deviceLabel: "Pixel 8",
      appVersion: "1.0.0",
    });
    // A 30-day session, like the browser default.
    expect(
      Math.round((data.expiresAt.getTime() - Date.now()) / 86_400_000)
    ).toBe(30);
    expect(session.refreshExpiresAt).toEqual(data.expiresAt);
  });
});

describe("rotateMobileRefreshToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findUserById).mockResolvedValue(activeUser as never);
  });

  describe("a normal rotation", () => {
    beforeEach(() => {
      mockTx.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockTx.refreshToken.findUnique.mockResolvedValue({
        id: "t1",
        userId: "u1",
        familyId: "fam1",
        expiresAt: future(),
        deviceId: "device-123456",
        deviceLabel: "Pixel 8",
        appVersion: "1.0.0",
      });
    });

    it("returns the new pair in the result and sets no cookies", async () => {
      const result = await rotateMobileRefreshToken(Platform.SURFBOARD, "old");

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const created = mockTx.refreshToken.create.mock.calls[0][0].data;
      expect(created.tokenHash).toBe(sha256(result.session.refreshToken));
      expect(result.session.accessToken).toBe("access-jwt");
      expect(mockCookies.setAuthCookies).not.toHaveBeenCalled();
      expect(mockCookies.clearAuthCookies).not.toHaveBeenCalled();
    });

    it("the successor stays on the same device and family, and keeps the expiry", async () => {
      await rotateMobileRefreshToken(Platform.SURFBOARD, "old");
      const created = mockTx.refreshToken.create.mock.calls[0][0].data;
      expect(created).toMatchObject({
        familyId: "fam1",
        deviceId: "device-123456",
        deviceLabel: "Pixel 8",
        appVersion: "1.0.0",
      });
      expect(created.lastUsedAt).toBeInstanceOf(Date);
    });
  });

  describe("a token that was already rotated", () => {
    beforeEach(() => {
      mockTx.refreshToken.updateMany.mockResolvedValue({ count: 0 });
    });
    const rotated = (over: Record<string, unknown> = {}) => ({
      platform: "surfboard",
      familyId: "fam1",
      revokedAt: new Date(Date.now() - 2_000),
      replacedBy: "successor-hash",
      ...over,
    });
    const liveSuccessor = {
      tokenHash: "successor-hash",
      userId: "u1",
      familyId: "fam1",
      revokedAt: null,
      expiresAt: future(),
      deviceId: "device-123456",
      deviceLabel: "Pixel 8",
      appVersion: "1.0.0",
    };

    it("within 30s (the response was lost): revokes the live successor and returns a FULL new pair", async () => {
      mockPrisma.refreshToken.findUnique
        .mockResolvedValueOnce(rotated())
        .mockResolvedValueOnce(liveSuccessor);
      mockTx.refreshToken.updateMany
        .mockResolvedValueOnce({ count: 0 }) // failed claim of the old token
        .mockResolvedValueOnce({ count: 1 }); // successor revoked by the re-rotation

      const result = await rotateMobileRefreshToken(Platform.SURFBOARD, "old");

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // First updateMany is the failed claim of the old token; the second
      // (inside the re-rotation) revokes the successor.
      const revoke = mockTx.refreshToken.updateMany.mock.calls[1][0];
      expect(revoke.where).toMatchObject({
        tokenHash: "successor-hash",
        revokedAt: null,
      });
      const created = mockTx.refreshToken.create.mock.calls[0][0].data;
      expect(created.tokenHash).toBe(revoke.data.replacedBy);
      expect(created.tokenHash).toBe(sha256(result.session.refreshToken));
      expect(created).toMatchObject({
        familyId: "fam1",
        deviceId: "device-123456",
      });
      // No theft response: the family is not revoked.
      expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it("if the successor was rotated by someone else in between: conflict, and the family is NOT revoked", async () => {
      mockPrisma.refreshToken.findUnique
        .mockResolvedValueOnce(rotated())
        .mockResolvedValueOnce(liveSuccessor);
      mockTx.refreshToken.updateMany
        .mockResolvedValueOnce({ count: 0 }) // failed claim of the old token
        .mockResolvedValueOnce({ count: 0 }); // successor already gone

      expect(await rotateMobileRefreshToken(Platform.SURFBOARD, "old")).toEqual(
        { ok: false, reason: "conflict" }
      );
      expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it("older than 30s: reuse — the whole family is revoked", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(
        rotated({ revokedAt: new Date(Date.now() - 31_000) })
      );

      expect(await rotateMobileRefreshToken(Platform.SURFBOARD, "old")).toEqual(
        { ok: false, reason: "invalid" }
      );
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: "fam1" },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it("no re-rotation when the successor was revoked (sign-out or theft response)", async () => {
      mockPrisma.refreshToken.findUnique
        .mockResolvedValueOnce(rotated())
        .mockResolvedValueOnce({ ...liveSuccessor, revokedAt: new Date() });

      expect(
        await rotateMobileRefreshToken(Platform.SURFBOARD, "old")
      ).toMatchObject({ ok: false, reason: "invalid" });
      expect(mockTx.refreshToken.create).not.toHaveBeenCalled();
    });

    it("a token minted for another platform never gets the grace pass", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(
        rotated({ platform: "reva" })
      );
      expect(
        await rotateMobileRefreshToken(Platform.SURFBOARD, "old")
      ).toMatchObject({ ok: false });
      expect(mockTx.refreshToken.create).not.toHaveBeenCalled();
    });

    it("an unknown token fails without revoking anything", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(null);
      expect(
        await rotateMobileRefreshToken(Platform.SURFBOARD, "garbage")
      ).toEqual({ ok: false, reason: "invalid" });
      expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });

  it("an inactive account gets no session and the new token is revoked", async () => {
    mockTx.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    mockTx.refreshToken.findUnique.mockResolvedValue({
      userId: "u1",
      familyId: "fam1",
      expiresAt: future(),
    });
    vi.mocked(findUserById).mockResolvedValueOnce({
      ...activeUser,
      isActive: false,
    } as never);

    expect(await rotateMobileRefreshToken(Platform.SURFBOARD, "old")).toEqual({
      ok: false,
      reason: "inactive",
    });
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledTimes(1);
  });
});
