import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import { ValidationError, RateLimitError } from "@/lib/api/errors";

const mockPrisma = vi.hoisted(() => ({
  gBCTicket: { findFirst: vi.fn(), findMany: vi.fn() },
  gBCCertificateOtp: {
    create: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn(),
  },
  loginAttempt: {
    count: vi.fn(),
    create: vi.fn(),
  },
}));

const mockEmail = vi.hoisted(() => ({
  sendGBCCertificateOtpEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/gbc/utils/email", () => mockEmail);

const {
  normalizeEmail,
  requestCertificateOtp,
  verifyCertificateOtpAndIssueToken,
  createDownloadToken,
  verifyDownloadToken,
  GENERIC_OTP_RESPONSE,
} = await import("@/gbc/services/certificateOtpService");

const TEST_SECRET = "test-cert-otp-secret-12345";
process.env.CERTIFICATE_OTP_SECRET = TEST_SECRET;

function computeTestHmac(code: string): string {
  return crypto.createHmac("sha256", TEST_SECRET).update(code).digest("hex");
}

function computeTestSha256(val: string): string {
  return crypto.createHash("sha256").update(val).digest("hex");
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CERTIFICATE_OTP_SECRET = TEST_SECRET;
  mockPrisma.loginAttempt.count.mockResolvedValue(0);
  mockPrisma.loginAttempt.create.mockResolvedValue({});
});

describe("normalizeEmail", () => {
  it("trims and lowercases emails", () => {
    expect(normalizeEmail("  Attendee@Example.COM  ")).toBe(
      "attendee@example.com"
    );
    expect(normalizeEmail("")).toBe("");
  });
});

describe("requestCertificateOtp", () => {
  it("rejects invalid email formats with ValidationError", async () => {
    await expect(
      requestCertificateOtp({ email: "not-an-email", ip: "127.0.0.1" })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("returns generic response without sending email if email is locked out", async () => {
    mockPrisma.loginAttempt.count.mockResolvedValueOnce(10); // locked out
    const res = await requestCertificateOtp({
      email: "attendee@test.com",
      ip: "127.0.0.1",
    });

    expect(res.message).toBe(GENERIC_OTP_RESPONSE.message);
    expect(res.nonce).toBeDefined();
    expect(mockEmail.sendGBCCertificateOtpEmail).not.toHaveBeenCalled();
  });

  it("returns generic response without sending email if IP is rate limited", async () => {
    mockPrisma.loginAttempt.count
      .mockResolvedValueOnce(0) // not locked out
      .mockResolvedValueOnce(15); // ip limit hit

    const res = await requestCertificateOtp({
      email: "attendee@test.com",
      ip: "127.0.0.1",
    });

    expect(res.message).toBe(GENERIC_OTP_RESPONSE.message);
    expect(mockEmail.sendGBCCertificateOtpEmail).not.toHaveBeenCalled();
  });

  it("returns generic response if no issued ticket exists (anti-enumeration)", async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(0);
    mockPrisma.gBCTicket.findFirst.mockResolvedValue(null);

    const res = await requestCertificateOtp({
      email: "unknown@test.com",
      ip: "127.0.0.1",
    });

    expect(res.message).toBe(GENERIC_OTP_RESPONSE.message);
    expect(mockPrisma.gBCCertificateOtp.create).not.toHaveBeenCalled();
    expect(mockEmail.sendGBCCertificateOtpEmail).not.toHaveBeenCalled();
  });

  it("invalidates previous OTPs, stores new HMAC, and sends email when ticket is found", async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(0);
    mockPrisma.gBCTicket.findFirst.mockResolvedValue({
      id: "t1",
      email: "attendee@test.com",
      name: "Jane Doe",
      ticketNumber: "GBC2_TEST",
    });
    mockPrisma.gBCCertificateOtp.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.gBCCertificateOtp.create.mockResolvedValue({});

    const res = await requestCertificateOtp({
      email: "Attendee@Test.com",
      ip: "127.0.0.1",
    });

    expect(res.message).toBe(GENERIC_OTP_RESPONSE.message);
    expect(res.nonce).toBeDefined();

    // Previous active codes invalidated
    expect(mockPrisma.gBCCertificateOtp.updateMany).toHaveBeenCalledWith({
      where: { email: "attendee@test.com", usedAt: null },
      data: { usedAt: expect.any(Date) },
    });

    // New code created with HMAC and nonce hash
    expect(mockPrisma.gBCCertificateOtp.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "attendee@test.com",
        codeHmac: expect.any(String),
        nonceHash: expect.any(String),
        maxAttempts: 5,
      }),
    });

    // Email sent to stored address
    expect(mockEmail.sendGBCCertificateOtpEmail).toHaveBeenCalledWith({
      to: "attendee@test.com",
      name: "Jane Doe",
      code: expect.stringMatching(/^\d{6}$/),
    });
  });
});

describe("verifyCertificateOtpAndIssueToken", () => {
  const nonce = "test-session-nonce-123";
  const nonceHash = computeTestSha256(nonce);
  const correctCode = "123456";
  const codeHmac = computeTestHmac(correctCode);

  it("rejects non-6-digit codes with ValidationError", async () => {
    await expect(
      verifyCertificateOtpAndIssueToken({
        email: "a@test.com",
        code: "123",
        nonce,
        ip: "127.0.0.1",
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects missing nonce with ValidationError", async () => {
    await expect(
      verifyCertificateOtpAndIssueToken({
        email: "a@test.com",
        code: "123456",
        ip: "127.0.0.1",
        nonce: "",
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws RateLimitError if email is locked out", async () => {
    mockPrisma.loginAttempt.count.mockResolvedValueOnce(10); // locked out
    await expect(
      verifyCertificateOtpAndIssueToken({
        email: "a@test.com",
        code: "123456",
        nonce,
        ip: "127.0.0.1",
      })
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it("counts failures per email and IP, so one IP cannot lock out the holder", async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(0);
    mockPrisma.gBCCertificateOtp.findFirst.mockResolvedValue(null);

    await expect(
      verifyCertificateOtpAndIssueToken({
        email: "a@test.com",
        code: "123456",
        nonce,
        ip: "198.51.100.7",
      })
    ).rejects.toBeInstanceOf(ValidationError);

    expect(mockPrisma.loginAttempt.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          identifier: "cert_fail:a@test.com:198.51.100.7",
        }),
      })
    );
    expect(mockPrisma.loginAttempt.create).toHaveBeenCalledWith({
      data: { identifier: "cert_fail:a@test.com:198.51.100.7" },
    });
  });

  it("rejects when no active OTP exists", async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(0);
    mockPrisma.gBCCertificateOtp.findFirst.mockResolvedValue(null);

    await expect(
      verifyCertificateOtpAndIssueToken({
        email: "a@test.com",
        code: "123456",
        nonce,
        ip: "127.0.0.1",
      })
    ).rejects.toBeInstanceOf(ValidationError);

    expect(mockPrisma.loginAttempt.create).toHaveBeenCalledWith({
      data: { identifier: "cert_fail:a@test.com:127.0.0.1" },
    });
  });

  it("rejects when browser nonce does not match stored hash", async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(0);
    mockPrisma.gBCCertificateOtp.findFirst.mockResolvedValue({
      id: "otp1",
      email: "a@test.com",
      nonceHash: computeTestSha256("different-nonce"),
      codeHmac,
      maxAttempts: 5,
    });

    await expect(
      verifyCertificateOtpAndIssueToken({
        email: "a@test.com",
        code: correctCode,
        nonce,
        ip: "127.0.0.1",
      })
    ).rejects.toMatchObject({
      details: { code: expect.stringContaining("browser session") },
    });
  });

  it("rejects when maximum attempts are exceeded", async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(0);
    mockPrisma.gBCCertificateOtp.findFirst.mockResolvedValue({
      id: "otp1",
      email: "a@test.com",
      nonceHash,
      codeHmac,
      maxAttempts: 5,
    });
    mockPrisma.gBCCertificateOtp.updateMany.mockResolvedValueOnce({ count: 0 }); // attempt reservation failed

    await expect(
      verifyCertificateOtpAndIssueToken({
        email: "a@test.com",
        code: correctCode,
        nonce,
        ip: "127.0.0.1",
      })
    ).rejects.toMatchObject({
      details: { code: expect.stringContaining("Too many attempts") },
    });
  });

  it("rejects incorrect code and records failed attempt", async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(0);
    mockPrisma.gBCCertificateOtp.findFirst.mockResolvedValue({
      id: "otp1",
      email: "a@test.com",
      nonceHash,
      codeHmac,
      maxAttempts: 5,
    });
    mockPrisma.gBCCertificateOtp.updateMany.mockResolvedValueOnce({ count: 1 }); // attempt reserved

    await expect(
      verifyCertificateOtpAndIssueToken({
        email: "a@test.com",
        code: "999999",
        nonce,
        ip: "127.0.0.1",
      })
    ).rejects.toMatchObject({
      details: { code: expect.stringContaining("Incorrect code") },
    });

    expect(mockPrisma.loginAttempt.create).toHaveBeenCalledWith({
      data: { identifier: "cert_fail:a@test.com:127.0.0.1" },
    });
  });

  it("successfully verifies code, marks OTP used, and returns download token", async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(0);
    mockPrisma.gBCCertificateOtp.findFirst.mockResolvedValue({
      id: "otp1",
      email: "a@test.com",
      nonceHash,
      codeHmac,
      maxAttempts: 5,
    });
    mockPrisma.gBCCertificateOtp.updateMany
      .mockResolvedValueOnce({ count: 1 }) // attempt reserved
      .mockResolvedValueOnce({ count: 1 }); // used claim
    mockPrisma.gBCTicket.findMany.mockResolvedValue([
      { ticketNumber: "GBC2_TEST_1" },
    ]);

    const result = await verifyCertificateOtpAndIssueToken({
      email: "a@test.com",
      code: correctCode,
      nonce,
      ip: "127.0.0.1",
    });

    expect(result.ticketNumbers).toEqual(["GBC2_TEST_1"]);
    expect(result.token).toBeDefined();

    // Verify token can be unpacked
    const verified = verifyDownloadToken(result.token);
    expect(verified.ticketNumbers).toEqual(["GBC2_TEST_1"]);
  });
});

describe("downloadToken lifecycle", () => {
  it("creates and verifies a valid download token", () => {
    const token = createDownloadToken({
      ticketNumbers: ["GBC2_123", "GBC2_456"],
      exp: Date.now() + 60000,
    });

    const parsed = verifyDownloadToken(token);
    expect(parsed.ticketNumbers).toEqual(["GBC2_123", "GBC2_456"]);
  });

  it("rejects token with invalid signature", () => {
    const token = createDownloadToken({
      ticketNumbers: ["GBC2_123"],
      exp: Date.now() + 60000,
    });
    const [data] = token.split(".");
    const forgedToken = `${data}.tamperedSignature`;

    expect(() => verifyDownloadToken(forgedToken)).toThrow(ValidationError);
  });

  it("rejects expired token", () => {
    const expiredToken = createDownloadToken({
      ticketNumbers: ["GBC2_123"],
      exp: Date.now() - 1000, // expired 1s ago
    });

    expect(() => verifyDownloadToken(expiredToken)).toThrow(ValidationError);
  });

  it("rejects malformed token strings", () => {
    expect(() => verifyDownloadToken("invalid")).toThrow(ValidationError);
    expect(() => verifyDownloadToken("a.b.c")).toThrow(ValidationError);
  });
});
