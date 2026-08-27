import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Weighted toward the two things this migration actually changed behavior
 * on: getAnyRequestByReferenceForAdmin's table-resolution (new — the source
 * had two separate lookup functions, callers had to know which table a
 * reference belonged to) and approveOneTimeDueDiligenceReport's notification
 * wiring (the source's entire notification block was commented out for
 * OneTimeUserProperty; this is now real, via notifyReportReady/
 * notifySystemAlert).
 */

const mockPrisma = vi.hoisted(() => ({
  property: { findUnique: vi.fn(), update: vi.fn() },
  oneTimeUserProperty: { findUnique: vi.fn(), update: vi.fn() },
}));

const mockNotify = vi.hoisted(() => ({
  notifyReportReady: vi.fn(),
  notifySystemAlert: vi.fn(),
}));

const mockEmail = vi.hoisted(() => ({
  sendMail: vi.fn().mockResolvedValue({ success: true }),
  sendEmailToAllAdmins: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/reva/services/notificationService", () => mockNotify);
vi.mock("@/utils/email", () => mockEmail);
vi.mock("@/app/(projects)/reva/actions/awsActions", () => ({
  uploadToS3FromServer: vi.fn(),
  deleteManyFromS3: vi.fn(),
}));

const {
  getAnyRequestByReferenceForAdmin,
  uploadDueDiligenceReport,
  approveDueDiligenceReport,
  approveOneTimeDueDiligenceReport,
} = await import("@/reva/services/reportService");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAnyRequestByReferenceForAdmin", () => {
  it("returns the Property when found there", async () => {
    mockPrisma.property.findUnique.mockResolvedValue({ reference: "REVA_1" });
    const result = await getAnyRequestByReferenceForAdmin("REVA_1");
    expect(result).toEqual({ type: "property", data: { reference: "REVA_1" } });
    expect(mockPrisma.oneTimeUserProperty.findUnique).not.toHaveBeenCalled();
  });

  it("falls back to OneTimeUserProperty when not a Property", async () => {
    mockPrisma.property.findUnique.mockResolvedValue(null);
    mockPrisma.oneTimeUserProperty.findUnique.mockResolvedValue({ reference: "reva_1" });
    const result = await getAnyRequestByReferenceForAdmin("reva_1");
    expect(result).toEqual({ type: "oneTime", data: { reference: "reva_1" } });
  });

  it("throws NotFoundError when neither table has it", async () => {
    mockPrisma.property.findUnique.mockResolvedValue(null);
    mockPrisma.oneTimeUserProperty.findUnique.mockResolvedValue(null);
    await expect(getAnyRequestByReferenceForAdmin("nope")).rejects.toMatchObject({ status: 404 });
  });
});

describe("uploadDueDiligenceReport", () => {
  it("throws ValidationError when reference is missing", async () => {
    const formData = new FormData();
    await expect(uploadDueDiligenceReport(formData, "admin@test.com")).rejects.toMatchObject({ status: 400 });
  });
});

describe("approveDueDiligenceReport", () => {
  it("throws NotFoundError when the property has no report yet", async () => {
    mockPrisma.property.findUnique.mockResolvedValue({ reference: "R1", report: null });
    await expect(approveDueDiligenceReport("R1", true, "admin@test.com")).rejects.toMatchObject({ status: 404 });
  });

  it("approved: notifies the owning user by id and echoes to admins", async () => {
    mockPrisma.property.findUnique.mockResolvedValue({
      reference: "R1",
      report: { titleStatus: "Clear" },
      user: { id: "user-1", email: "user@test.com", firstName: "Jane" },
    });
    mockPrisma.property.update.mockResolvedValue({ reference: "R1", status: "Available" });

    await approveDueDiligenceReport("R1", true, "admin@test.com");

    expect(mockNotify.notifyReportReady).toHaveBeenCalledWith(
      expect.objectContaining({ reference: "R1" }),
      "user-1"
    );
    expect(mockNotify.notifySystemAlert).toHaveBeenCalledWith("Report Approved", expect.stringContaining("R1"));
  });

  it("disapproved: skips notifyReportReady, still alerts admins", async () => {
    mockPrisma.property.findUnique.mockResolvedValue({
      reference: "R1",
      report: { titleStatus: "Clear" },
      user: { id: "user-1", email: "user@test.com", firstName: "Jane" },
    });
    mockPrisma.property.update.mockResolvedValue({ reference: "R1", status: "Processing" });

    await approveDueDiligenceReport("R1", false, "admin@test.com");

    expect(mockNotify.notifyReportReady).not.toHaveBeenCalled();
    expect(mockNotify.notifySystemAlert).toHaveBeenCalledWith("Report Disapproved", expect.stringContaining("R1"));
  });
});

describe("approveOneTimeDueDiligenceReport", () => {
  it("approved: wires the guest email-keyed notifyReportReady path (resolved Phase 3 decision — was entirely dead code in the source)", async () => {
    const updated = { reference: "R1", email: "guest@test.com", requester: "Guest", status: "Completed" };
    mockPrisma.oneTimeUserProperty.findUnique.mockResolvedValue({
      reference: "R1",
      email: "guest@test.com",
      requester: "Guest",
      report: { titleStatus: "Clear" },
    });
    mockPrisma.oneTimeUserProperty.update.mockResolvedValue(updated);

    await approveOneTimeDueDiligenceReport("R1", true, "admin@test.com");

    expect(mockNotify.notifyReportReady).toHaveBeenCalledWith(updated);
    expect(mockNotify.notifySystemAlert).not.toHaveBeenCalled();
  });

  it("disapproved: alerts admins instead of notifyReportReady", async () => {
    mockPrisma.oneTimeUserProperty.findUnique.mockResolvedValue({
      reference: "R1",
      email: "guest@test.com",
      requester: "Guest",
      report: { titleStatus: "Clear" },
    });
    mockPrisma.oneTimeUserProperty.update.mockResolvedValue({ reference: "R1", status: "Processing" });

    await approveOneTimeDueDiligenceReport("R1", false, "admin@test.com");

    expect(mockNotify.notifyReportReady).not.toHaveBeenCalled();
    expect(mockNotify.notifySystemAlert).toHaveBeenCalledWith(
      "OneTime Report Disapproved",
      expect.stringContaining("R1")
    );
  });
});
