import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), sign: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  default: { surfboardPlan: { findFirst: mocks.findFirst } },
}));
vi.mock("@/surfboard/services/analyticsService", () => ({
  PROVISIONAL_TYPES: [],
}));
vi.mock("@/surfboard/services/planSearchService", () => ({
  findPillarMatchIds: vi.fn(),
}));
vi.mock("@/surfboard/services/awsService", async () => {
  const { extractKeyFromUrl } = await import("@/lib/storage/utils");
  return {
    getPresignedDownloadUrl: mocks.sign,
    extractS3KeyFromUrl: extractKeyFromUrl,
  };
});

const { getPlanFileLink, FILE_LINK_SECONDS } =
  await import("@/surfboard/services/planFileLinkService");
const { NotFoundError } = await import("@/lib/api/errors");

const PLAN_ID = "3f2b8c1e-9d4a-4e6b-8a7c-1d2e3f4a5b6c";
const RECORD_COPY =
  "https://bucket.s3.amazonaws.com/surfboard/LA/2026/0412/redcopy/rc.pdf";
const PDF = "https://bucket.s3.amazonaws.com/surfboard/owner-1/pdf/1700-a.pdf";
const DWG = "https://bucket.s3.amazonaws.com/surfboard/owner-1/cad/1700-b.DWG";
const CERT = "https://bucket.s3.amazonaws.com/surfboard/owner-1/cert/c.png";
const SIGNED = "https://bucket.s3.amazonaws.com/signed?X-Amz-Signature=abc";

const row = (over: Record<string, unknown> = {}) => ({
  userId: "owner-1",
  planNumber: "LA/2026/0412",
  redCopyFileUrl: RECORD_COPY,
  pdfFilePaths: [PDF],
  cadFilePaths: [DWG],
  certificateFilePaths: [CERT],
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findFirst.mockResolvedValue(row());
  mocks.sign.mockResolvedValue(SIGNED);
});

describe("getPlanFileLink: which plan", () => {
  it("looks only at the caller's own and shared plans, never the trash", async () => {
    await getPlanFileLink("owner-1", PLAN_ID, "1");
    expect(mocks.findFirst.mock.calls[0][0].where).toEqual({
      id: PLAN_ID,
      deleted: false,
      OR: [{ userId: "owner-1" }, { sharedTo: { has: "owner-1" } }],
    });
  });

  it("is not found for a plan that is not the caller's or not there", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(getPlanFileLink("owner-1", PLAN_ID, "1")).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it.each(["not-a-uuid", "", "../etc"])(
    "does not even ask the database for a plan id of %j",
    async (planId) => {
      await expect(getPlanFileLink("owner-1", planId, "0")).rejects.toBeInstanceOf(
        NotFoundError
      );
      expect(mocks.findFirst).not.toHaveBeenCalled();
    }
  );
});

describe("getPlanFileLink: which file", () => {
  it("numbers the files as the plan's own list does: record copy, survey plans, drawings, certificates", async () => {
    await getPlanFileLink("owner-1", PLAN_ID, "0");
    await getPlanFileLink("owner-1", PLAN_ID, "1");
    await getPlanFileLink("owner-1", PLAN_ID, "3");
    expect(mocks.sign.mock.calls.map((c) => c[0])).toEqual([RECORD_COPY, PDF, CERT]);
  });

  it.each(["4", "99", "-1", "1.5", "abc", "", "00000", " 1"])(
    "is not found for a file number of %j, signing nothing",
    async (n) => {
      await expect(getPlanFileLink("owner-1", PLAN_ID, n)).rejects.toBeInstanceOf(
        NotFoundError
      );
      expect(mocks.sign).not.toHaveBeenCalled();
    }
  );

  it("answers the name and format the website shows, and the address with when it stops working", async () => {
    const before = Date.now();
    const link = await getPlanFileLink("owner-1", PLAN_ID, "1");
    expect(link).toEqual({
      url: SIGNED,
      expiresAt: expect.any(String),
      name: "LA_2026_0412.pdf",
      format: "pdf",
    });
    const stops = Date.parse(link.expiresAt);
    expect(stops).toBeGreaterThanOrEqual(before + FILE_LINK_SECONDS * 1000);
    expect(stops).toBeLessThanOrEqual(Date.now() + FILE_LINK_SECONDS * 1000);
    expect(mocks.sign).toHaveBeenCalledWith(PDF, FILE_LINK_SECONDS);
  });

  it("keeps a drawing off a phone with FILE_NOT_VIEWABLE, signing nothing", async () => {
    await expect(getPlanFileLink("owner-1", PLAN_ID, "2")).rejects.toMatchObject({
      status: 422,
      code: "FILE_NOT_VIEWABLE",
    });
    expect(mocks.sign).not.toHaveBeenCalled();
  });
});

describe("getPlanFileLink: someone the plan is shared with", () => {
  beforeEach(() => {
    mocks.findFirst.mockResolvedValue(row());
  });

  it("never gets the record copy: the file numbers start at the survey plan", async () => {
    await getPlanFileLink("viewer-1", PLAN_ID, "0");
    expect(mocks.sign).toHaveBeenCalledWith(PDF, FILE_LINK_SECONDS);
  });

  it("finds nothing at the record copy's old number when it was the last file", async () => {
    mocks.findFirst.mockResolvedValue(row({ pdfFilePaths: [], certificateFilePaths: [] }));
    // Owner: 0 = record copy, 1 = drawing. Shared: 0 = drawing, and nothing after it.
    await expect(getPlanFileLink("viewer-1", PLAN_ID, "1")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("still opens the plan's survey plans and certificates", async () => {
    await getPlanFileLink("viewer-1", PLAN_ID, "2");
    expect(mocks.sign).toHaveBeenCalledWith(CERT, FILE_LINK_SECONDS);
  });
});

describe("getPlanFileLink: a stored reference the owner could have edited (ADR-0012)", () => {
  const OTHERS = "https://bucket.s3.amazonaws.com/surfboard/someone-else/pdf/x.pdf";

  it("refuses a file in another person's folder", async () => {
    mocks.findFirst.mockResolvedValue(row({ pdfFilePaths: [OTHERS] }));
    await expect(getPlanFileLink("owner-1", PLAN_ID, "1")).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it("opens an unscoped folder, as the gateway does", async () => {
    const UNSCOPED = "https://bucket.s3.amazonaws.com/surfboard/pdf/x-1.pdf";
    mocks.findFirst.mockResolvedValue(row({ pdfFilePaths: [UNSCOPED] }));
    await getPlanFileLink("owner-1", PLAN_ID, "1");
    expect(mocks.sign).toHaveBeenCalledWith(UNSCOPED, FILE_LINK_SECONDS);
  });

  it("refuses a record copy that is not under the plan's own number", async () => {
    mocks.findFirst.mockResolvedValue(
      row({
        redCopyFileUrl:
          "https://bucket.s3.amazonaws.com/surfboard/LA/2026/9999/redcopy/rc.pdf",
      })
    );
    await expect(getPlanFileLink("owner-1", PLAN_ID, "0")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it.each(["surfboard/owner-1/pdf/../../other/x.pdf", "surfboard/owner-1/pdf/./x.pdf", "a.pdf"])(
    "refuses an unsafe reference %j",
    async (ref) => {
      mocks.findFirst.mockResolvedValue(row({ pdfFilePaths: [ref] }));
      await expect(getPlanFileLink("owner-1", PLAN_ID, "1")).rejects.toBeInstanceOf(
        NotFoundError
      );
      expect(mocks.sign).not.toHaveBeenCalled();
    }
  );

  it("does not let the record copy's own-number rule open a survey plan under someone else's folder", async () => {
    mocks.findFirst.mockResolvedValue(
      row({
        pdfFilePaths: ["https://bucket.s3.amazonaws.com/surfboard/LA/2026/0412/redcopy/x.pdf"],
      })
    );
    await expect(getPlanFileLink("owner-1", PLAN_ID, "1")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});

describe("getPlanFileLink: a failure of the storage service", () => {
  it("is passed on, not turned into an address", async () => {
    mocks.sign.mockRejectedValue(new Error("storage down"));
    await expect(getPlanFileLink("owner-1", PLAN_ID, "1")).rejects.toThrow("storage down");
  });
});
