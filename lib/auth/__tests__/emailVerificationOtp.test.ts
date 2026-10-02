import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  emailVerificationOtp: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}));

const mockEmail = vi.hoisted(() => ({
  sendEmailVerificationOtp: vi.fn(),
}));

const mockUserLookup = vi.hoisted(() => ({
  markEmailVerified: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/utils/email", () => mockEmail);
vi.mock("@/lib/auth/userLookup", () => mockUserLookup);

const { Platform } = await import("@/utils/platform");
const { issueAndSendVerificationOtp, verifyEmailOtp } =
  await import("@/lib/auth/emailVerificationOtp");

const sha256 = (v: string) =>
  crypto.createHash("sha256").update(v).digest("hex");

describe("emailVerificationOtp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("issueAndSendVerificationOtp", () => {
    it("invalidates prior unused codes, stores sha256 hash, and emails the raw 6-digit code", async () => {
      const user = {
        id: "user-123",
        email: "surveyor@example.com",
        firstName: "Jane",
      };

      await issueAndSendVerificationOtp(Platform.SURFBOARD, user);

      // Invalidate existing unused codes
      expect(mockPrisma.emailVerificationOtp.updateMany).toHaveBeenCalledWith({
        where: { userId: user.id, platform: Platform.SURFBOARD, usedAt: null },
        data: { usedAt: expect.any(Date) },
      });

      // Verify created OTP in DB
      expect(mockPrisma.emailVerificationOtp.create).toHaveBeenCalledWith({
        data: {
          userId: user.id,
          platform: Platform.SURFBOARD,
          codeHash: expect.any(String),
          expiresAt: expect.any(Date),
        },
      });

      // Verify email was dispatched
      expect(mockEmail.sendEmailVerificationOtp).toHaveBeenCalledWith({
        to: user.email,
        firstName: user.firstName,
        code: expect.stringMatching(/^\d{6}$/),
        platform: Platform.SURFBOARD,
      });

      const sentCode = mockEmail.sendEmailVerificationOtp.mock.calls[0][0].code;
      const storedHash =
        mockPrisma.emailVerificationOtp.create.mock.calls[0][0].data.codeHash;
      expect(sha256(sentCode)).toBe(storedHash);
    });
  });

  describe("verifyEmailOtp", () => {
    it("rejects non-6-digit codes before querying the DB", async () => {
      await expect(
        verifyEmailOtp(Platform.SURFBOARD, "user-123", "123")
      ).rejects.toMatchObject({
        status: 400,
        details: { code: "Code must be 6 digits" },
      });
      await expect(
        verifyEmailOtp(Platform.SURFBOARD, "user-123", "1234567")
      ).rejects.toMatchObject({
        status: 400,
        details: { code: "Code must be 6 digits" },
      });
      expect(mockPrisma.emailVerificationOtp.findFirst).not.toHaveBeenCalled();
    });

    it("throws if no active, unexpired, unused code exists", async () => {
      mockPrisma.emailVerificationOtp.findFirst.mockResolvedValueOnce(null);

      await expect(
        verifyEmailOtp(Platform.SURFBOARD, "user-123", "123456")
      ).rejects.toMatchObject({
        status: 400,
        details: {
          code: expect.stringContaining("No active verification code found"),
        },
      });
    });

    it("caps wrong attempts at 5", async () => {
      mockPrisma.emailVerificationOtp.findFirst.mockResolvedValueOnce({
        id: "otp-1",
        userId: "user-123",
        codeHash: sha256("654321"),
        attempts: 5,
        expiresAt: new Date(Date.now() + 60000),
      });

      await expect(
        verifyEmailOtp(Platform.SURFBOARD, "user-123", "123456")
      ).rejects.toMatchObject({
        status: 400,
        details: { code: expect.stringContaining("Too many attempts") },
      });
    });

    it("increments attempts on incorrect code", async () => {
      mockPrisma.emailVerificationOtp.findFirst.mockResolvedValueOnce({
        id: "otp-1",
        userId: "user-123",
        codeHash: sha256("654321"),
        attempts: 2,
        expiresAt: new Date(Date.now() + 60000),
      });

      await expect(
        verifyEmailOtp(Platform.SURFBOARD, "user-123", "111111")
      ).rejects.toMatchObject({
        status: 400,
        details: { code: "Incorrect code" },
      });

      expect(mockPrisma.emailVerificationOtp.update).toHaveBeenCalledWith({
        where: { id: "otp-1" },
        data: { attempts: { increment: 1 } },
      });
      expect(mockUserLookup.markEmailVerified).not.toHaveBeenCalled();
    });

    it("marks OTP used and sets user emailVerified via OTP on matching code", async () => {
      const validCode = "654321";
      mockPrisma.emailVerificationOtp.findFirst.mockResolvedValueOnce({
        id: "otp-1",
        userId: "user-123",
        codeHash: sha256(validCode),
        attempts: 1,
        expiresAt: new Date(Date.now() + 60000),
      });

      const result = await verifyEmailOtp(
        Platform.SURFBOARD,
        "user-123",
        validCode
      );

      expect(result).toBe(true);
      expect(mockPrisma.emailVerificationOtp.update).toHaveBeenCalledWith({
        where: { id: "otp-1" },
        data: { usedAt: expect.any(Date) },
      });
      expect(mockUserLookup.markEmailVerified).toHaveBeenCalledWith(
        Platform.SURFBOARD,
        "user-123",
        "OTP"
      );
    });
  });
});
