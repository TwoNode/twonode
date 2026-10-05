import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  emailVerificationOtp: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
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

    it("reserves an attempt atomically before comparing, and does not mark the user verified on a wrong code", async () => {
      mockPrisma.emailVerificationOtp.findFirst.mockResolvedValueOnce({
        id: "otp-1",
        userId: "user-123",
        codeHash: sha256("654321"),
        attempts: 2,
        expiresAt: new Date(Date.now() + 60000),
      });
      mockPrisma.emailVerificationOtp.updateMany.mockResolvedValueOnce({
        count: 1,
      });

      await expect(
        verifyEmailOtp(Platform.SURFBOARD, "user-123", "111111")
      ).rejects.toMatchObject({
        status: 400,
        details: { code: "Incorrect code" },
      });

      // The increment is a conditional updateMany, never a bare update.
      expect(mockPrisma.emailVerificationOtp.updateMany).toHaveBeenCalledWith({
        where: {
          id: "otp-1",
          usedAt: null,
          expiresAt: { gt: expect.any(Date) },
          attempts: { lt: 5 },
        },
        data: { attempts: { increment: 1 } },
      });
      expect(mockPrisma.emailVerificationOtp.update).not.toHaveBeenCalled();
      expect(mockUserLookup.markEmailVerified).not.toHaveBeenCalled();
    });

    it("reports 'too many attempts' when the cap is hit between the read and the reservation", async () => {
      mockPrisma.emailVerificationOtp.findFirst.mockResolvedValueOnce({
        id: "otp-1",
        userId: "user-123",
        codeHash: sha256("654321"),
        attempts: 4,
        expiresAt: new Date(Date.now() + 60000),
      });
      mockPrisma.emailVerificationOtp.updateMany.mockResolvedValueOnce({
        count: 0,
      });
      mockPrisma.emailVerificationOtp.findUnique.mockResolvedValueOnce({
        id: "otp-1",
        usedAt: null,
        attempts: 5,
      });

      await expect(
        verifyEmailOtp(Platform.SURFBOARD, "user-123", "654321")
      ).rejects.toMatchObject({
        details: { code: expect.stringContaining("Too many attempts") },
      });
      // The correct code is NOT honoured once the cap is reached.
      expect(mockUserLookup.markEmailVerified).not.toHaveBeenCalled();
    });

    it("reports 'no active code' when the code was consumed between the read and the reservation", async () => {
      mockPrisma.emailVerificationOtp.findFirst.mockResolvedValueOnce({
        id: "otp-1",
        userId: "user-123",
        codeHash: sha256("654321"),
        attempts: 0,
        expiresAt: new Date(Date.now() + 60000),
      });
      mockPrisma.emailVerificationOtp.updateMany.mockResolvedValueOnce({
        count: 0,
      });
      mockPrisma.emailVerificationOtp.findUnique.mockResolvedValueOnce({
        id: "otp-1",
        usedAt: new Date(),
        attempts: 1,
      });

      await expect(
        verifyEmailOtp(Platform.SURFBOARD, "user-123", "654321")
      ).rejects.toMatchObject({
        details: {
          code: expect.stringContaining("No active verification code found"),
        },
      });
    });

    it("claims the code and sets emailVerified via OTP on a matching code", async () => {
      const validCode = "654321";
      mockPrisma.emailVerificationOtp.findFirst.mockResolvedValueOnce({
        id: "otp-1",
        userId: "user-123",
        codeHash: sha256(validCode),
        attempts: 1,
        expiresAt: new Date(Date.now() + 60000),
      });
      mockPrisma.emailVerificationOtp.updateMany.mockResolvedValue({
        count: 1,
      });

      const result = await verifyEmailOtp(
        Platform.SURFBOARD,
        "user-123",
        validCode
      );

      expect(result).toBe(true);
      expect(
        mockPrisma.emailVerificationOtp.updateMany
      ).toHaveBeenLastCalledWith({
        where: { id: "otp-1", usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      expect(mockUserLookup.markEmailVerified).toHaveBeenCalledWith(
        Platform.SURFBOARD,
        "user-123",
        "OTP"
      );
    });

    it("does not verify the user when a simultaneous request already consumed the correct code", async () => {
      mockPrisma.emailVerificationOtp.findFirst.mockResolvedValueOnce({
        id: "otp-1",
        userId: "user-123",
        codeHash: sha256("654321"),
        attempts: 0,
        expiresAt: new Date(Date.now() + 60000),
      });
      mockPrisma.emailVerificationOtp.updateMany
        .mockResolvedValueOnce({ count: 1 }) // attempt reserved
        .mockResolvedValueOnce({ count: 0 }); // claim lost

      await expect(
        verifyEmailOtp(Platform.SURFBOARD, "user-123", "654321")
      ).rejects.toMatchObject({ status: 400 });
      expect(mockUserLookup.markEmailVerified).not.toHaveBeenCalled();
    });

    describe("under a burst of parallel guesses (stateful fake of the DB's conditional updates)", () => {
      /**
       * Models just enough of the row for the atomic guards to matter:
       * `updateMany` evaluates its `where` and applies `data` with no
       * `await` in between — the property a real UPDATE ... WHERE has — while
       * `findFirst` returns a snapshot, exactly like a read that precedes the
       * writes. A read-then-increment implementation lets every request in
       * the burst see attempts = 0 and be compared.
       */
      const installRow = (codeHash: string) => {
        const row: {
          id: string;
          userId: string;
          codeHash: string;
          attempts: number;
          usedAt: Date | null;
          expiresAt: Date;
        } = {
          id: "otp-1",
          userId: "user-123",
          codeHash,
          attempts: 0,
          usedAt: null,
          expiresAt: new Date(Date.now() + 60000),
        };
        mockPrisma.emailVerificationOtp.findFirst.mockImplementation(
          async () => (row.usedAt ? null : { ...row })
        );
        mockPrisma.emailVerificationOtp.findUnique.mockImplementation(
          async () => ({ ...row })
        );
        mockPrisma.emailVerificationOtp.updateMany.mockImplementation(
          async ({ where, data }: any) => {
            if (where.usedAt === null && row.usedAt !== null)
              return { count: 0 };
            if (
              where.attempts?.lt !== undefined &&
              !(row.attempts < where.attempts.lt)
            )
              return { count: 0 };
            if (data.attempts?.increment)
              row.attempts += data.attempts.increment;
            if (data.usedAt) row.usedAt = data.usedAt;
            return { count: 1 };
          }
        );
        mockPrisma.emailVerificationOtp.update.mockImplementation(
          async ({ data }: any) => {
            // The old, non-atomic implementation increments via a bare update.
            if (data.attempts?.increment)
              row.attempts += data.attempts.increment;
            if (data.usedAt) row.usedAt = data.usedAt;
            return { ...row };
          }
        );
        return row;
      };

      it("compares at most 5 wrong guesses out of 40 in flight, and never honours the right code once the cap is spent", async () => {
        const row = installRow(sha256("654321"));

        const guesses = Array.from({ length: 40 }, (_, i) =>
          verifyEmailOtp(
            Platform.SURFBOARD,
            "user-123",
            String(100000 + i)
          ).then(
            () => "ok",
            (e) => e.details?.code as string
          )
        );
        const results = await Promise.all(guesses);

        expect(results.filter((r) => r === "Incorrect code")).toHaveLength(5);
        expect(
          results.filter((r) => String(r).includes("Too many attempts"))
        ).toHaveLength(35);
        expect(row.attempts).toBe(5);

        // The cap is spent: even the correct code is now refused.
        await expect(
          verifyEmailOtp(Platform.SURFBOARD, "user-123", "654321")
        ).rejects.toMatchObject({
          details: { code: expect.stringContaining("Too many attempts") },
        });
        expect(mockUserLookup.markEmailVerified).not.toHaveBeenCalled();
      });

      it("lets only one of several simultaneous correct submissions consume the code", async () => {
        installRow(sha256("654321"));

        const results = await Promise.all(
          Array.from({ length: 10 }, () =>
            verifyEmailOtp(Platform.SURFBOARD, "user-123", "654321").then(
              () => "ok",
              () => "rejected"
            )
          )
        );

        expect(results.filter((r) => r === "ok")).toHaveLength(1);
        expect(mockUserLookup.markEmailVerified).toHaveBeenCalledTimes(1);
      });
    });
  });
});
