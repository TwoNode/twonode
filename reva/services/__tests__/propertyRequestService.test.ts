import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, ValidationError } from "@/lib/api/errors";

/**
 * Prisma mocked, no real database. Weighted toward getUserPropertyById's
 * email-match check (a resolved open question from the Phase 3 spec — the
 * source had no such check, unlike every other guest-data route in REVA)
 * and downloadOneTimeRequestReport's approval-gating logic, since both are
 * real access-control surfaces for guest (unauthenticated) data.
 */

const mockPrisma = vi.hoisted(() => ({
  oneTimeUserProperty: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
  property: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
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
  downloadOneTimeRequestReport,
  getUserProperties,
  getUserContact,
} = await import("@/reva/services/propertyRequestService");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUserPropertyById", () => {
  it("returns the property when the email matches", async () => {
    mockPrisma.oneTimeUserProperty.findUnique.mockResolvedValue({ id: "p1", email: "guest@test.com" });
    const result = await getUserPropertyById("p1", "guest@test.com");
    expect(result).toEqual({ id: "p1", email: "guest@test.com" });
  });

  it("throws NotFoundError when the email does not match — the resolved security gap", async () => {
    mockPrisma.oneTimeUserProperty.findUnique.mockResolvedValue({ id: "p1", email: "guest@test.com" });
    await expect(getUserPropertyById("p1", "attacker@test.com")).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError (not a distinct error) when the id doesn't exist, so existence can't be probed", async () => {
    mockPrisma.oneTimeUserProperty.findUnique.mockResolvedValue(null);
    await expect(getUserPropertyById("missing", "anyone@test.com")).rejects.toThrow(NotFoundError);
  });
});

describe("getOneTimeRequestByReference", () => {
  it("throws NotFoundError when reference+email don't jointly match", async () => {
    mockPrisma.oneTimeUserProperty.findFirst.mockResolvedValue(null);
    await expect(getOneTimeRequestByReference("REF1", "wrong@test.com")).rejects.toThrow(NotFoundError);
  });
});

describe("downloadOneTimeRequestReport", () => {
  it("throws ValidationError when reference or email is missing", async () => {
    await expect(downloadOneTimeRequestReport("", "e@test.com")).rejects.toThrow(ValidationError);
  });

  it("throws NotFoundError when no report exists yet", async () => {
    mockPrisma.oneTimeUserProperty.findFirst.mockResolvedValue({ reference: "R1", email: "e@test.com", report: null });
    await expect(downloadOneTimeRequestReport("R1", "e@test.com")).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError when the report exists but isn't approved yet", async () => {
    mockPrisma.oneTimeUserProperty.findFirst.mockResolvedValue({
      reference: "R1",
      email: "e@test.com",
      report: { isApproved: false },
    });
    await expect(downloadOneTimeRequestReport("R1", "e@test.com")).rejects.toThrow(ValidationError);
  });

  it("returns a redirect when the approved report has a directFileLink", async () => {
    mockPrisma.oneTimeUserProperty.findFirst.mockResolvedValue({
      reference: "R1",
      email: "e@test.com",
      report: { isApproved: true, directFileLink: "https://example.com/report.pdf" },
    });
    const result = await downloadOneTimeRequestReport("R1", "e@test.com");
    expect(result).toEqual({ type: "redirect", redirectUrl: "https://example.com/report.pdf" });
  });

  it("returns report data when approved with no direct link", async () => {
    mockPrisma.oneTimeUserProperty.findFirst.mockResolvedValue({
      reference: "R1",
      address: "1 Test St",
      email: "e@test.com",
      report: { isApproved: true, approvedAt: "2026-01-01", approvedBy: "admin1" },
    });
    const result = await downloadOneTimeRequestReport("R1", "e@test.com");
    expect(result).toMatchObject({ type: "data", reference: "R1", address: "1 Test St", approvedBy: "admin1" });
  });
});

describe("getUserProperties", () => {
  it("queries directly by userId and sorts descending by updatedAt", async () => {
    mockPrisma.property.findMany.mockResolvedValue([
      { id: "a", updatedAt: new Date("2026-01-01"), createdAt: new Date("2026-01-01") },
      { id: "b", updatedAt: new Date("2026-02-01"), createdAt: new Date("2026-01-01") },
    ]);
    const result = await getUserProperties("user-1");
    expect(mockPrisma.property.findMany).toHaveBeenCalledWith({ where: { userId: "user-1", deleted: false } });
    expect(result.map((p: any) => p.id)).toEqual(["b", "a"]);
  });
});

describe("getUserContact", () => {
  it("throws NotFoundError when the user doesn't exist", async () => {
    mockPrisma.revaUser.findUnique.mockResolvedValue(null);
    await expect(getUserContact("missing")).rejects.toThrow(NotFoundError);
  });
});
