import crypto from "crypto";
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTx = vi.hoisted(() => ({
  pendingRegistration: { updateMany: vi.fn() },
}));

const mockPrisma = vi.hoisted(() => ({
  pendingRegistration: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  // Runs the callback against the tx stub, like prisma's interactive transaction.
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockTx)),
}));

const mockEmail = vi.hoisted(() => ({
  sendEmailVerificationOtp: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

const mockUserLookup = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  createNativeUser: vi.fn(),
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

const sha256 = (v: string) =>
  crypto.createHash("sha256").update(v).digest("hex");

describe("pendingRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("issuePendingRegistration", () => {
    it("throws ConflictError if email is already registered", async () => {
      mockUserLookup.findUserByEmail.mockResolvedValueOnce({
        id: "u_1",
        email: "existing@example.com",
      });

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
      mockSettings.getEmailVerificationSettings.mockResolvedValueOnce({
        method: "OTP",
      });
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
        where: {
          platform_email: {
            platform: Platform.SURFBOARD,
            email: "new@example.com",
          },
        },
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
    const CODE = "654321";
    const PASSWORD = "Passw0rd!x";
    const passwordHash = bcrypt.hashSync(PASSWORD, 4);

    const baseRow = () => ({
      id: "preg_1",
      platform: Platform.SURFBOARD,
      email: "user@example.com",
      firstName: "Jane",
      lastName: "Doe",
      passwordHash,
      method: "OTP",
      codeHash: sha256(CODE),
      attempts: 0,
      expiresAt: new Date(Date.now() + 60000),
      usedAt: null as Date | null,
    });

    beforeEach(() => {
      mockPrisma.pendingRegistration.updateMany.mockResolvedValue({ count: 1 });
      mockTx.pendingRegistration.updateMany.mockResolvedValue({ count: 1 });
    });

    it("rejects code shorter than 6 chars", async () => {
      await expect(
        completePendingRegistration(
          Platform.SURFBOARD,
          "preg_1",
          "123",
          PASSWORD
        )
      ).rejects.toMatchObject({
        status: 400,
        details: { code: "Invalid verification code" },
      });
    });

    it("rejects an expired registration and one belonging to another platform", async () => {
      mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce({
        ...baseRow(),
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(
        completePendingRegistration(
          Platform.SURFBOARD,
          "preg_1",
          CODE,
          PASSWORD
        )
      ).rejects.toMatchObject({ status: 400 });

      mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce({
        ...baseRow(),
        platform: Platform.REVA,
      });
      await expect(
        completePendingRegistration(
          Platform.SURFBOARD,
          "preg_1",
          CODE,
          PASSWORD
        )
      ).rejects.toMatchObject({ status: 400 });
      expect(mockUserLookup.createNativeUser).not.toHaveBeenCalled();
    });

    it("creates the account born-verified in the same transaction that claims the row", async () => {
      mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce(
        baseRow()
      );
      mockUserLookup.createNativeUser.mockResolvedValueOnce({
        id: "usr_1",
        email: "user@example.com",
        role: "USER",
        emailVerified: true,
      });

      const user = await completePendingRegistration(
        Platform.SURFBOARD,
        "preg_1",
        CODE,
        PASSWORD
      );

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.pendingRegistration.updateMany).toHaveBeenCalledWith({
        where: { id: "preg_1", usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      // Born verified in ONE write, using the tx client — no follow-up
      // markEmailVerified that a crash could skip.
      expect(mockUserLookup.createNativeUser).toHaveBeenCalledWith(
        Platform.SURFBOARD,
        {
          email: "user@example.com",
          passwordHash,
          firstName: "Jane",
          lastName: "Doe",
          emailVerifiedVia: "OTP",
        },
        mockTx
      );
      expect(user.emailVerified).toBe(true);
    });

    it("reserves an attempt atomically (conditional on attempts < cap) before comparing the code", async () => {
      mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce(
        baseRow()
      );
      mockUserLookup.createNativeUser.mockResolvedValueOnce({
        id: "u",
        email: "e",
        role: "USER",
      });

      await completePendingRegistration(
        Platform.SURFBOARD,
        "preg_1",
        CODE,
        PASSWORD
      );

      expect(mockPrisma.pendingRegistration.updateMany).toHaveBeenCalledWith({
        where: { id: "preg_1", usedAt: null, attempts: { lt: 5 } },
        data: { attempts: { increment: 1 } },
      });
    });

    it("a wrong code is rejected without creating anything", async () => {
      mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce(
        baseRow()
      );

      await expect(
        completePendingRegistration(
          Platform.SURFBOARD,
          "preg_1",
          "000000",
          PASSWORD
        )
      ).rejects.toMatchObject({
        status: 400,
        details: { code: "Incorrect or expired code" },
      });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockUserLookup.createNativeUser).not.toHaveBeenCalled();
    });

    it("once the cap is reached even the CORRECT code is refused", async () => {
      mockPrisma.pendingRegistration.findUnique
        .mockResolvedValueOnce({ ...baseRow(), attempts: 5 })
        .mockResolvedValueOnce({ ...baseRow(), attempts: 5 });
      mockPrisma.pendingRegistration.updateMany.mockResolvedValueOnce({
        count: 0,
      });

      await expect(
        completePendingRegistration(
          Platform.SURFBOARD,
          "preg_1",
          CODE,
          PASSWORD
        )
      ).rejects.toMatchObject({
        details: { code: "Too many attempts — please request a new code" },
      });
      expect(mockUserLookup.createNativeUser).not.toHaveBeenCalled();
    });

    it("a burst of 40 parallel guesses gets exactly 5 comparisons, not 40", async () => {
      // Stateful stand-in for the DB's conditional UPDATE: it admits one
      // increment per call until attempts reaches the cap, then matches nothing.
      let attempts = 0;
      mockPrisma.pendingRegistration.findUnique.mockImplementation(
        async () => ({
          ...baseRow(),
          attempts,
        })
      );
      mockPrisma.pendingRegistration.updateMany.mockImplementation(async () => {
        if (attempts < 5) {
          attempts++;
          return { count: 1 };
        }
        return { count: 0 };
      });

      const guesses = Array.from({ length: 40 }, (_, i) => String(100000 + i));
      const results = await Promise.allSettled(
        guesses.map((g) =>
          completePendingRegistration(Platform.SURFBOARD, "preg_1", g, PASSWORD)
        )
      );
      const msgs = results.map((r) =>
        r.status === "rejected"
          ? (r.reason as { details?: { code?: string } }).details?.code
          : "OK"
      );
      expect(
        msgs.filter((m) => m === "Incorrect or expired code")
      ).toHaveLength(5);
      expect(
        msgs.filter((m) => /Too many attempts/.test(m ?? ""))
      ).toHaveLength(35);
      expect(mockUserLookup.createNativeUser).not.toHaveBeenCalled();
    });

    it("refuses a correct code paired with the WRONG password and does not claim the row", async () => {
      mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce(
        baseRow()
      );

      await expect(
        completePendingRegistration(
          Platform.SURFBOARD,
          "preg_1",
          CODE,
          "AttackerPass1!"
        )
      ).rejects.toMatchObject({
        status: 400,
        details: { password: expect.any(String) },
      });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockUserLookup.createNativeUser).not.toHaveBeenCalled();
    });

    it("the loser of a concurrent completion gets the winner's committed account, not an error", async () => {
      mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce(
        baseRow()
      );
      mockTx.pendingRegistration.updateMany.mockResolvedValueOnce({ count: 0 });
      mockUserLookup.findUserByEmail.mockResolvedValueOnce({
        id: "usr_1",
        email: "user@example.com",
        role: "USER",
        emailVerified: true,
      });

      const user = await completePendingRegistration(
        Platform.SURFBOARD,
        "preg_1",
        CODE,
        PASSWORD
      );

      expect(user.id).toBe("usr_1");
      expect(mockUserLookup.createNativeUser).not.toHaveBeenCalled();
    });

    it("a unique-constraint failure (address registered meanwhile) consumes the row and returns 409", async () => {
      mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce(
        baseRow()
      );
      mockUserLookup.createNativeUser.mockRejectedValueOnce(
        Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
      );

      await expect(
        completePendingRegistration(
          Platform.SURFBOARD,
          "preg_1",
          CODE,
          PASSWORD
        )
      ).rejects.toMatchObject({ status: 409 });
      expect(mockPrisma.pendingRegistration.update).toHaveBeenCalledWith({
        where: { id: "preg_1" },
        data: { usedAt: expect.any(Date) },
      });
    });

    it("any other creation failure propagates and leaves the row claimable (the claim rolls back with the transaction)", async () => {
      mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce(
        baseRow()
      );
      mockUserLookup.createNativeUser.mockRejectedValueOnce(
        new Error("db down")
      );

      await expect(
        completePendingRegistration(
          Platform.SURFBOARD,
          "preg_1",
          CODE,
          PASSWORD
        )
      ).rejects.toThrow("db down");
      expect(mockPrisma.pendingRegistration.update).not.toHaveBeenCalled();
    });

    it("idempotent retry: a just-completed row returns the user for the matching secret AND password", async () => {
      mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce({
        ...baseRow(),
        usedAt: new Date(Date.now() - 5000),
      });
      mockUserLookup.findUserByEmail.mockResolvedValueOnce({
        id: "usr_1",
        email: "user@example.com",
        role: "USER",
        emailVerified: true,
      });

      const user = await completePendingRegistration(
        Platform.SURFBOARD,
        "preg_1",
        CODE,
        PASSWORD
      );

      expect(user.email).toBe("user@example.com");
      expect(mockUserLookup.createNativeUser).not.toHaveBeenCalled();
    });

    it("idempotent retry still demands the password", async () => {
      mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce({
        ...baseRow(),
        usedAt: new Date(Date.now() - 5000),
      });

      await expect(
        completePendingRegistration(
          Platform.SURFBOARD,
          "preg_1",
          CODE,
          "wrong-password"
        )
      ).rejects.toMatchObject({ status: 400 });
      expect(mockUserLookup.findUserByEmail).not.toHaveBeenCalled();
    });

    it("a row completed long ago can't be replayed", async () => {
      mockPrisma.pendingRegistration.findUnique.mockResolvedValueOnce({
        ...baseRow(),
        usedAt: new Date(Date.now() - 5 * 60 * 1000),
      });

      await expect(
        completePendingRegistration(
          Platform.SURFBOARD,
          "preg_1",
          CODE,
          PASSWORD
        )
      ).rejects.toMatchObject({ status: 400 });
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
