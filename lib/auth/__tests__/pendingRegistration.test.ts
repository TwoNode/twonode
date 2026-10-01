import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  pendingRegistration: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
}));

const mockEmail = vi.hoisted(() => ({
  sendEmailVerificationOtp: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

const mockUserLookup = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  createNativeUser: vi.fn(),
  markEmailVerified: vi.fn(),
}));

const mockSettings = vi.hoisted(() => ({
  getEmailVerificationSettings: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/utils/email", () => mockEmail);
vi.mock("@/lib/auth/userLookup", () => mockUserLookup);
vi.mock("@/lib/auth/emailVerificationSettings", () => mockSettings);

const { Platform } = await import("@/utils/platform");
const {
  issuePendingRegistration,
  resendPendingRegistration,
  completePendingRegistration,
} = await import("@/lib/auth/pendingRegistration");

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

describe("pendingRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("issuePendingRegistration", () => {
    it("throws ConflictError if email is already registered", async () => {
      mockUserLookup.findUserByEmail.mockResolvedValueOnce({ id: "u_1", email: "existing@example.com" });

      await expect(
        issuePendingRegistration(Platform.SURFBOARD, {
          email: "existing@example.com",
          password: "password123",
          firstName: "John",
          lastName: "Doe",
        })
      ).rejects.toMatchObject({
        status: 409,
      });
    });

    it("upserts pendingRegistration with hashed secret and sends OTP when method is OTP", async () => {
      mockUserLookup.findUserByEmail.mockResolvedValueOnce(null);
      mockSettings.getEmailVerificationSettings.mockResolvedValueOnce({ method: "OTP" });
      mockPrisma.pendingRegistration.upsert.mockResolvedValueOnce({
        id: "preg_1",
        email: "new@example.com",
        firstName: "John",
        lastName: "Doe",
        method: "OTP",
      });

      const res = await issuePendingRegistration(Platform.SURFBOARD, {
        email: "  New@Example.com  ",
        password: "password123",
        firstName: "  John  ",
        lastName: "  Doe  ",
      });

      expect(res).toEqual({ pendingRegistrationId: "preg_1", method: "OTP" });

      expect(mockPrisma.pendingRegistration.upsert).toHaveBeenCalledWith({
        where: { platform_email: { platform: Platform.SURFBOARD, email: "new@example.com" } },
        update: expect.objectContaining({
          firstName: "John",
          lastName: "Doe",
          method: "OTP",
          codeHash: expect.any(String),
          attempts: 0,
        }),
        create: expect.objectContaining({
          platform: Platform.SURFBOARD,
          email: "new@example.com",
          firstName: "John",
          lastName: "Doe",
          method: "OTP",
          codeHash: expect.any(String),
        }),
      });

      expect(mockEmail.sendEmailVerificationOtp).toHaveBeenCalledWith({
        to: "new@example.com",
        firstName: "John",
        code: expect.stringMatching(/^\d{6}$/),
        platform: Platform.SURFBOARD,
      });
    });
  });

  describe("completePendingRegistration", () => {
    it("rejects code shorter than 6 chars", async () => {
      await expect(
        completePendingRegistration(Platform.SURFBOARD, "preg_1", "123")
      ).rejects.toMatchObject({
        status: 400,
        details: { code: "Invalid verification code" },
      });
    });

    it("creates user, marks verified, stamps usedAt on valid code", async () => {
      const validCode = "654321";
      mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce({
        id: "preg_1",
        platform: Platform.SURFBOARD,
        email: "user@example.com",
        firstName: "Jane",
        lastName: "Doe",
        passwordHash: "hashed_pw",
        method: "OTP",
        codeHash: sha256(validCode),
        attempts: 0,
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
      });

      mockUserLookup.findUserByEmail.mockResolvedValueOnce(null);
      mockUserLookup.createNativeUser.mockResolvedValueOnce({
        id: "usr_1",
        email: "user@example.com",
        role: "USER",
        emailVerified: false,
      });

      const user = await completePendingRegistration(Platform.SURFBOARD, "preg_1", validCode);

      expect(mockUserLookup.createNativeUser).toHaveBeenCalledWith(Platform.SURFBOARD, {
        email: "user@example.com",
        passwordHash: "hashed_pw",
        firstName: "Jane",
        lastName: "Doe",
      });
      expect(mockUserLookup.markEmailVerified).toHaveBeenCalledWith(
        Platform.SURFBOARD,
        "usr_1",
        "OTP"
      );
      expect(mockPrisma.pendingRegistration.update).toHaveBeenCalledWith({
        where: { id: "preg_1" },
        data: { usedAt: expect.any(Date) },
      });
      expect(user.emailVerified).toBe(true);
    });

    it("handles idempotent completion if completed recently with matching code", async () => {
      const validCode = "654321";
      mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce({
        id: "preg_1",
        platform: Platform.SURFBOARD,
        email: "user@example.com",
        codeHash: sha256(validCode),
        method: "OTP",
        expiresAt: new Date(Date.now() + 60000),
        usedAt: new Date(Date.now() - 5000), // 5 seconds ago
      });

      mockUserLookup.findUserByEmail.mockResolvedValueOnce({
        id: "usr_1",
        email: "user@example.com",
        role: "USER",
        emailVerified: true,
      });

      const user = await completePendingRegistration(Platform.SURFBOARD, "preg_1", validCode);

      expect(user.email).toBe("user@example.com");
      expect(mockUserLookup.createNativeUser).not.toHaveBeenCalled();
    });

    it("increments attempts on wrong code", async () => {
      mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce({
        id: "preg_1",
        platform: Platform.SURFBOARD,
        email: "user@example.com",
        codeHash: sha256("999999"),
        attempts: 1,
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
      });

      await expect(
        completePendingRegistration(Platform.SURFBOARD, "preg_1", "000000")
      ).rejects.toMatchObject({
        status: 400,
        details: { code: "Incorrect or expired code" },
      });

      expect(mockPrisma.pendingRegistration.update).toHaveBeenCalledWith({
        where: { id: "preg_1" },
        data: { attempts: { increment: 1 } },
      });
    });
  });

  describe("resendPendingRegistration", () => {
    it("updates codeHash and dispatches fresh secret", async () => {
      mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce({
        id: "preg_1",
        platform: Platform.SURFBOARD,
        email: "user@example.com",
        firstName: "Jane",
        method: "OTP",
        usedAt: null,
      });

      await resendPendingRegistration(Platform.SURFBOARD, "preg_1");

      expect(mockPrisma.pendingRegistration.update).toHaveBeenCalledWith({
        where: { id: "preg_1" },
        data: expect.objectContaining({
          codeHash: expect.any(String),
          attempts: 0,
          expiresAt: expect.any(Date),
        }),
      });

      expect(mockEmail.sendEmailVerificationOtp).toHaveBeenCalled();
    });
  });
});
