import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import { ValidationError, NotFoundError } from "@/lib/api/errors";

/**
 * Prisma + S3 presigning + email all mocked, no real database or AWS call.
 * Covers the access-control surface: wrong email/userId never issues a
 * code, an expired/used/wrong code is rejected, wrong guesses lock out
 * after 5 attempts, and a resend supersedes the previous code (the
 * mechanic that makes "requested fresh every time" actually mean
 * something instead of just adding a second valid code).
 */

const mockPrisma = vi.hoisted(() => ({
  oneTimeUserProperty: { findFirst: vi.fn() },
  property: { findFirst: vi.fn() },
  revaUser: { findUnique: vi.fn() },
  downloadOtp: { create: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
}));

const mockGetPresignedDownloadUrl = vi.hoisted(() => vi.fn());
const mockSendDownloadOtpEmail = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true }));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/app/(projects)/(reva)/reva/actions/awsActions", () => ({
  getPresignedDownloadUrl: mockGetPresignedDownloadUrl,
}));
vi.mock("@/utils/email", () => ({ sendDownloadOtpEmail: mockSendDownloadOtpEmail }));

const { requestDownloadOtp, verifyDownloadOtpAndGetUrl } = await import("@/reva/services/downloadOtpService");

const APPROVED_REQUEST = {
  reference: "R1",
  email: "guest@test.com",
  documentsUrls: [],
  report: { isApproved: true, directFileLink: ["https://bucket.s3.region.amazonaws.com/report.pdf"] },
};

function hashOf(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPresignedDownloadUrl.mockResolvedValue("https://bucket.s3.region.amazonaws.com/report.pdf?X-Amz-Signature=...");
});

describe("requestDownloadOtp", () => {
  it("never creates a code for a wrong reference/email pair — same generic response either way", async () => {
    mockPrisma.oneTimeUserProperty.findFirst.mockResolvedValue(null);
    const result = await requestDownloadOtp({ reference: "R1", target: "report", email: "wrong@test.com" });
    expect(result.message).toMatch(/if that request is valid/i);
    expect(mockPrisma.downloadOtp.create).not.toHaveBeenCalled();
    expect(mockSendDownloadOtpEmail).not.toHaveBeenCalled();
  });

  it("never creates a code when the report isn't approved yet", async () => {
    mockPrisma.oneTimeUserProperty.findFirst.mockResolvedValue({ ...APPROVED_REQUEST, report: { isApproved: false } });
    await requestDownloadOtp({ reference: "R1", target: "report", email: "guest@test.com" });
    expect(mockPrisma.downloadOtp.create).not.toHaveBeenCalled();
  });

  it("supersedes any prior unused code for the same reference/target/email before creating a new one", async () => {
    mockPrisma.oneTimeUserProperty.findFirst.mockResolvedValue(APPROVED_REQUEST);
    await requestDownloadOtp({ reference: "R1", target: "report", email: "guest@test.com" });
    expect(mockPrisma.downloadOtp.updateMany).toHaveBeenCalledWith({
      where: { reference: "R1", target: "report", email: "guest@test.com", usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    expect(mockPrisma.downloadOtp.create).toHaveBeenCalledTimes(1);
    expect(mockSendDownloadOtpEmail).toHaveBeenCalledTimes(1);
  });
});

describe("verifyDownloadOtpAndGetUrl", () => {
  it("rejects when no active code exists", async () => {
    mockPrisma.oneTimeUserProperty.findFirst.mockResolvedValue(APPROVED_REQUEST);
    mockPrisma.downloadOtp.findFirst.mockResolvedValue(null);
    await expect(
      verifyDownloadOtpAndGetUrl({ reference: "R1", target: "report", email: "guest@test.com", code: "123456" })
    ).rejects.toThrow(ValidationError);
    expect(mockGetPresignedDownloadUrl).not.toHaveBeenCalled();
  });

  it("rejects an incorrect code and increments the attempt counter", async () => {
    mockPrisma.oneTimeUserProperty.findFirst.mockResolvedValue(APPROVED_REQUEST);
    mockPrisma.downloadOtp.findFirst.mockResolvedValue({
      id: "otp1",
      attempts: 0,
      codeHash: hashOf("999999"),
    });
    await expect(
      verifyDownloadOtpAndGetUrl({ reference: "R1", target: "report", email: "guest@test.com", code: "111111" })
    ).rejects.toThrow(ValidationError);
    expect(mockPrisma.downloadOtp.update).toHaveBeenCalledWith({
      where: { id: "otp1" },
      data: { attempts: { increment: 1 } },
    });
  });

  it("locks out after 5 attempts even with the right code hash", async () => {
    mockPrisma.oneTimeUserProperty.findFirst.mockResolvedValue(APPROVED_REQUEST);
    mockPrisma.downloadOtp.findFirst.mockResolvedValue({
      id: "otp1",
      attempts: 5,
      codeHash: hashOf("123456"),
    });
    await expect(
      verifyDownloadOtpAndGetUrl({ reference: "R1", target: "report", email: "guest@test.com", code: "123456" })
    ).rejects.toThrow(ValidationError);
  });

  it("returns a presigned URL on a correct, unused, unexpired code and marks it used", async () => {
    mockPrisma.oneTimeUserProperty.findFirst.mockResolvedValue(APPROVED_REQUEST);
    mockPrisma.downloadOtp.findFirst.mockResolvedValue({
      id: "otp1",
      attempts: 0,
      codeHash: hashOf("123456"),
    });

    const result = await verifyDownloadOtpAndGetUrl({
      reference: "R1",
      target: "report",
      email: "guest@test.com",
      code: "123456",
    });

    expect(result.url).toContain("X-Amz-Signature");
    expect(mockGetPresignedDownloadUrl).toHaveBeenCalledWith("https://bucket.s3.region.amazonaws.com/report.pdf");
    expect(mockPrisma.downloadOtp.update).toHaveBeenCalledWith({
      where: { id: "otp1" },
      data: { usedAt: expect.any(Date) },
    });
  });

  it("throws NotFoundError for a report target with no directFileLink (structured reports render client-side, not through this endpoint)", async () => {
    mockPrisma.oneTimeUserProperty.findFirst.mockResolvedValue({
      ...APPROVED_REQUEST,
      report: { isApproved: true, titleName: "Jane Doe" },
    });
    await expect(
      verifyDownloadOtpAndGetUrl({ reference: "R1", target: "report", email: "guest@test.com", code: "123456" })
    ).rejects.toThrow(NotFoundError);
  });
});
