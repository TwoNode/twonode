import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  getPresignedDownloadUrl: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    surfboardPlan: { findUnique: mocks.findUnique },
  },
}));

vi.mock("@/surfboard/services/awsService", () => ({
  getPresignedDownloadUrl: mocks.getPresignedDownloadUrl,
}));

global.fetch = mocks.fetch as any;

const { downloadPlanPdfAsBase64 } =
  await import("@/surfboard/services/verificationService");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("downloadPlanPdfAsBase64", () => {
  it("generates a signed download URL and fetches the private S3 PDF", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "plan-1",
      redCopyFileUrl:
        "https://bucket.s3.amazonaws.com/surfboard/u1/p1/redcopy/plan.pdf",
    });
    mocks.getPresignedDownloadUrl.mockResolvedValue(
      "https://bucket.s3.amazonaws.com/surfboard/u1/p1/redcopy/plan.pdf?signed=1"
    );
    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => Buffer.from("%PDF-1.4 test"),
    });

    const base64 = await downloadPlanPdfAsBase64("plan-1");

    expect(mocks.getPresignedDownloadUrl).toHaveBeenCalledWith(
      "https://bucket.s3.amazonaws.com/surfboard/u1/p1/redcopy/plan.pdf",
      300
    );
    expect(mocks.fetch).toHaveBeenCalledWith(
      "https://bucket.s3.amazonaws.com/surfboard/u1/p1/redcopy/plan.pdf?signed=1"
    );
    expect(base64).toBe(Buffer.from("%PDF-1.4 test").toString("base64"));
  });

  it("throws NotFoundError if plan has no redCopyFileUrl", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "plan-2",
      redCopyFileUrl: null,
    });

    await expect(downloadPlanPdfAsBase64("plan-2")).rejects.toThrow(
      "PDF URL not found"
    );
  });
});
