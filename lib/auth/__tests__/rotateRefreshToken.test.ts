import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTx = vi.hoisted(() => ({
  refreshToken: { updateMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
}));
const mockPrisma = vi.hoisted(() => ({
  refreshToken: { findUnique: vi.fn(), updateMany: vi.fn() },
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockTx)),
}));
const mockCookies = vi.hoisted(() => ({
  getAccessTokenCookie: vi.fn(),
  setAuthCookies: vi.fn(),
  setAccessTokenCookie: vi.fn(),
  clearAuthCookies: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/auth/cookies", () => mockCookies);
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

const { rotateRefreshToken } = await import("@/lib/auth/session");
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

describe("rotateRefreshToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findUserById).mockResolvedValue(activeUser as never);
  });

  describe("the claim", () => {
    beforeEach(() => {
      mockTx.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockTx.refreshToken.findUnique.mockResolvedValue({
        id: "t1",
        userId: "u1",
        familyId: "fam1",
        expiresAt: future(),
      });
    });

    it("records the successor on the old token IN THE SAME UPDATE that revokes it", async () => {
      const result = await rotateRefreshToken(Platform.SURFBOARD, "old-raw");
      expect(result).toEqual({ ok: true });

      const claim = mockTx.refreshToken.updateMany.mock.calls[0][0];
      expect(claim.where).toMatchObject({
        tokenHash: sha256("old-raw"),
        platform: "surfboard",
        revokedAt: null,
      });
      expect(claim.data.revokedAt).toBeInstanceOf(Date);
      // No window where the old token is revoked but has no recorded successor.
      expect(claim.data.replacedBy).toEqual(expect.any(String));
    });

    it("creates exactly the successor it named, in the same family, inheriting the expiry — and hands the browser that same token", async () => {
      await rotateRefreshToken(Platform.SURFBOARD, "old-raw");

      const claim = mockTx.refreshToken.updateMany.mock.calls[0][0];
      const created = mockTx.refreshToken.create.mock.calls[0][0].data;
      const [, , rawSentToBrowser] = mockCookies.setAuthCookies.mock.calls[0];

      expect(created.tokenHash).toBe(claim.data.replacedBy);
      expect(created.tokenHash).toBe(sha256(rawSentToBrowser));
      expect(created.familyId).toBe("fam1");
      expect(created.userId).toBe("u1");
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("an inactive account gets no usable session: the new token is revoked and cookies cleared", async () => {
      vi.mocked(findUserById).mockResolvedValueOnce({
        ...activeUser,
        isActive: false,
      } as never);

      expect(await rotateRefreshToken(Platform.SURFBOARD, "old-raw")).toEqual({
        ok: false,
        reason: "inactive",
      });
      const revoked = mockPrisma.refreshToken.updateMany.mock.calls[0][0];
      expect(revoked.where).toEqual({
        tokenHash: mockTx.refreshToken.create.mock.calls[0][0].data.tokenHash,
      });
      expect(mockCookies.clearAuthCookies).toHaveBeenCalledWith("surfboard");
      expect(mockCookies.setAuthCookies).not.toHaveBeenCalled();
    });
  });

  describe("a token that lost the claim (already rotated)", () => {
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
      userId: "u1",
      revokedAt: null,
      expiresAt: future(),
    };

    it("within 30s with a live successor: re-issues an access token only — no family revoke, no cookie wipe", async () => {
      mockPrisma.refreshToken.findUnique
        .mockResolvedValueOnce(rotated())
        .mockResolvedValueOnce(liveSuccessor);

      expect(await rotateRefreshToken(Platform.SURFBOARD, "old-raw")).toEqual({
        ok: true,
      });
      expect(mockCookies.setAccessTokenCookie).toHaveBeenCalledWith(
        "surfboard",
        "access-jwt"
      );
      expect(mockCookies.setAuthCookies).not.toHaveBeenCalled();
      expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(mockCookies.clearAuthCookies).not.toHaveBeenCalled();
    });

    it("older than 30s: treated as reuse — whole family revoked, cookies cleared", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(
        rotated({ revokedAt: new Date(Date.now() - 31_000) })
      );

      expect(await rotateRefreshToken(Platform.SURFBOARD, "old-raw")).toEqual({
        ok: false,
        reason: "invalid",
      });
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: "fam1" },
        data: { revokedAt: expect.any(Date) },
      });
      expect(mockCookies.clearAuthCookies).toHaveBeenCalledWith("surfboard");
    });

    it("a token minted for another platform never gets the grace pass", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(
        rotated({ platform: "reva" })
      );

      expect(
        await rotateRefreshToken(Platform.SURFBOARD, "old-raw")
      ).toMatchObject({ ok: false });
      expect(mockCookies.setAccessTokenCookie).not.toHaveBeenCalled();
    });

    it("no grace when the successor was itself revoked (e.g. by logout or a theft response)", async () => {
      mockPrisma.refreshToken.findUnique
        .mockResolvedValueOnce(rotated())
        .mockResolvedValueOnce({ ...liveSuccessor, revokedAt: new Date() });

      expect(
        await rotateRefreshToken(Platform.SURFBOARD, "old-raw")
      ).toMatchObject({ ok: false });
      expect(mockCookies.setAccessTokenCookie).not.toHaveBeenCalled();
    });

    it("no grace for a token revoked WITHOUT a successor (logout / explicit revocation)", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(
        rotated({ replacedBy: null })
      );

      expect(
        await rotateRefreshToken(Platform.SURFBOARD, "old-raw")
      ).toMatchObject({ ok: false });
      expect(mockCookies.setAccessTokenCookie).not.toHaveBeenCalled();
    });

    it("an unknown token just fails: cookies cleared, no family to revoke", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(null);

      expect(await rotateRefreshToken(Platform.SURFBOARD, "garbage")).toEqual({
        ok: false,
        reason: "invalid",
      });
      expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(mockCookies.clearAuthCookies).toHaveBeenCalledWith("surfboard");
    });
  });
});
