import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/api/errors";

/**
 * Prisma mocked, no real database. Weighted toward getUserPropertyById's
 * email-match check (a resolved open question from the Phase 3 spec — the
 * source had no such check, unlike every other guest-data route in REVA)
 * and the documentsUrls/report redaction every general fetch applies now
 * (raw S3 URLs only ever come from the OTP-verified download endpoints —
 * see downloadOtpService.test.ts), since both are real access-control
 * surfaces for guest (unauthenticated) data.
 */

const mockPrisma = vi.hoisted(() => ({
  oneTimeUserProperty: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  property: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  revaUser: { findUnique: vi.fn() },
}));

const mockNotifyNewPropertyRequest = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/reva/services/notificationService", () => ({
  notifyNewPropertyRequest: mockNotifyNewPropertyRequest,
}));

const {
  getUserPropertyById,
  getOneTimeRequestByReference,
  getUserProperties,
  getUserContact,
} = await import("@/reva/services/propertyRequestService");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUserPropertyById", () => {
  it("returns the property when the email matches", async () => {
    mockPrisma.oneTimeUserProperty.findUnique.mockResolvedValue({
      id: "p1",
      email: "guest@test.com",
    });
    const result = await getUserPropertyById("p1", "guest@test.com");
    expect(result).toEqual({ id: "p1", email: "guest@test.com" });
  });

  it("throws NotFoundError when the email does not match — the resolved security gap", async () => {
    mockPrisma.oneTimeUserProperty.findUnique.mockResolvedValue({
      id: "p1",
      email: "guest@test.com",
    });
    await expect(
      getUserPropertyById("p1", "attacker@test.com")
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError (not a distinct error) when the id doesn't exist, so existence can't be probed", async () => {
    mockPrisma.oneTimeUserProperty.findUnique.mockResolvedValue(null);
    await expect(
      getUserPropertyById("missing", "anyone@test.com")
    ).rejects.toThrow(NotFoundError);
  });
});

describe("getOneTimeRequestByReference", () => {
  it("throws NotFoundError when reference+email don't jointly match", async () => {
    mockPrisma.oneTimeUserProperty.findFirst.mockResolvedValue(null);
    await expect(
      getOneTimeRequestByReference("REF1", "wrong@test.com")
    ).rejects.toThrow(NotFoundError);
  });
});

describe("getOneTimeRequestByReference redaction", () => {
  it("strips documentsUrls/report.directFileLink but keeps everything else on report", async () => {
    mockPrisma.oneTimeUserProperty.findFirst.mockResolvedValue({
      reference: "R1",
      email: "e@test.com",
      documentsUrls: [
        "https://bucket.s3.region.amazonaws.com/a.pdf",
        "https://bucket.s3.region.amazonaws.com/b.pdf",
      ],
      report: {
        isApproved: true,
        directFileLink: ["https://bucket.s3.region.amazonaws.com/report.pdf"],
      },
    });
    const result = await getOneTimeRequestByReference("R1", "e@test.com");
    expect(result).not.toHaveProperty("documentsUrls");
    expect(result.documentsCount).toBe(2);
    expect(result.report).toEqual({
      isApproved: true,
      downloadAvailable: true,
    });
    expect(JSON.stringify(result)).not.toContain("s3.region.amazonaws.com");
  });

  it("keeps structured Detailed-Form report fields intact — those aren't URLs, so redaction shouldn't touch them", async () => {
    mockPrisma.oneTimeUserProperty.findFirst.mockResolvedValue({
      reference: "R1",
      email: "e@test.com",
      documentsUrls: [],
      report: {
        isApproved: true,
        titleName: "Jane Doe",
        zoning: "Residential",
      },
    });
    const result = await getOneTimeRequestByReference("R1", "e@test.com");
    expect(result.report).toEqual({
      isApproved: true,
      titleName: "Jane Doe",
      zoning: "Residential",
      downloadAvailable: false,
    });
  });
});

describe("getUserProperties", () => {
  it("queries directly by userId, sorts descending by updatedAt, and redacts URLs", async () => {
    mockPrisma.property.findMany.mockResolvedValue([
      {
        id: "a",
        updatedAt: new Date("2026-01-01"),
        createdAt: new Date("2026-01-01"),
        documentsUrls: [],
        report: null,
      },
      {
        id: "b",
        updatedAt: new Date("2026-02-01"),
        createdAt: new Date("2026-01-01"),
        documentsUrls: ["https://bucket.s3.region.amazonaws.com/a.pdf"],
        report: { isApproved: false },
      },
    ]);
    const result = await getUserProperties("user-1");
    expect(mockPrisma.property.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", deleted: false },
    });
    expect(result.map((p: any) => p.id)).toEqual(["b", "a"]);
    expect(result[0]).not.toHaveProperty("documentsUrls");
    expect(result[0].documentsCount).toBe(1);
  });
});

describe("getUserContact", () => {
  it("throws NotFoundError when the user doesn't exist", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue(null);
    await expect(getUserContact("missing")).rejects.toThrow(NotFoundError);
  });
});
