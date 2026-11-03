import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  getPresignedDownloadUrl: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    surfboardPlan: { findFirst: mocks.findFirst },
  },
}));

vi.mock("@/surfboard/services/awsService", () => ({
  getPresignedDownloadUrl: mocks.getPresignedDownloadUrl,
}));

global.fetch = mocks.fetch as any;

const { downloadPlanPdfAsBase64 } =
  await import("@/surfboard/services/verificationService");
const { SurfboardRole } = await import("@/utils/platform");

const PDF_URL =
  "https://bucket.s3.amazonaws.com/surfboard/u1/p1/redcopy/plan.pdf";

function serveThePdf() {
  mocks.findFirst.mockResolvedValue({ id: "plan-1", redCopyFileUrl: PDF_URL });
  mocks.getPresignedDownloadUrl.mockResolvedValue(`${PDF_URL}?signed=1`);
  mocks.fetch.mockResolvedValue({
    ok: true,
    status: 200,
    arrayBuffer: async () => Buffer.from("%PDF-1.4 test"),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("downloadPlanPdfAsBase64", () => {
  it("generates a signed download URL and fetches the private S3 PDF", async () => {
    serveThePdf();

    const base64 = await downloadPlanPdfAsBase64(
      "u1",
      SurfboardRole.USER,
      "plan-1"
    );

    expect(mocks.getPresignedDownloadUrl).toHaveBeenCalledWith(PDF_URL, 300);
    expect(mocks.fetch).toHaveBeenCalledWith(`${PDF_URL}?signed=1`);
    expect(base64).toBe(Buffer.from("%PDF-1.4 test").toString("base64"));
  });

  it("throws NotFoundError if plan has no redCopyFileUrl", async () => {
    mocks.findFirst.mockResolvedValue({ id: "plan-2", redCopyFileUrl: null });

    await expect(
      downloadPlanPdfAsBase64("u1", SurfboardRole.USER, "plan-2")
    ).rejects.toThrow("PDF URL not found");
  });
});

describe("whose record copy it is (I-046)", () => {
  it("looks the plan up by its owner for a surveyor", async () => {
    serveThePdf();
    await downloadPlanPdfAsBase64("u1", SurfboardRole.USER, "plan-1");
    expect(mocks.findFirst.mock.calls[0][0].where).toEqual({
      id: "plan-1",
      userId: "u1",
    });
  });

  it("refuses someone else's plan without signing a link or fetching anything", async () => {
    // The plan exists and has a PDF, but the owner filter finds nothing for this caller.
    mocks.findFirst.mockResolvedValue(null);

    await expect(
      downloadPlanPdfAsBase64("stranger", SurfboardRole.USER, "plan-1")
    ).rejects.toThrow("Plan (or access denied) not found");
    expect(mocks.getPresignedDownloadUrl).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("answers a stranger the same whether the plan has a PDF or not", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const first = await downloadPlanPdfAsBase64(
      "stranger",
      SurfboardRole.USER,
      "plan-with-pdf"
    ).catch((e) => e);
    const second = await downloadPlanPdfAsBase64(
      "stranger",
      SurfboardRole.USER,
      "no-such-plan"
    ).catch((e) => e);
    expect(first.message).toBe(second.message);
    expect(first.status).toBe(404);
  });

  it.each([SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN])(
    "lets a %s read any plan's record copy",
    async (role) => {
      serveThePdf();
      await downloadPlanPdfAsBase64("staff-1", role, "plan-1");
      expect(mocks.findFirst.mock.calls[0][0].where).toEqual({ id: "plan-1" });
    }
  );

  it.each([
    SurfboardRole.CHARTING,
    SurfboardRole.ACCOUNTS,
    SurfboardRole.SURCON,
    SurfboardRole.RECORDS_I,
    SurfboardRole.INTAKE,
    SurfboardRole.RECORDS_II,
    SurfboardRole.MDA_SUPERADMIN,
    SurfboardRole.ARCHIVE,
  ])("treats a %s like anyone else: only a plan of their own", async (role) => {
    serveThePdf();
    await downloadPlanPdfAsBase64("u9", role, "plan-1");
    expect(mocks.findFirst.mock.calls[0][0].where).toEqual({
      id: "plan-1",
      userId: "u9",
    });
  });
});
