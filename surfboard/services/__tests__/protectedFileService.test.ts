import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  sign: vi.fn(),
  limit: vi.fn(),
  count: vi.fn(),
  render: vi.fn(),
  fetch: vi.fn(),
}));

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
vi.mock("@/lib/auth/rateLimit", () => ({ consumeRateLimit: mocks.limit }));
vi.mock("@/surfboard/services/protectedPageRenderer", () => ({
  countPages: mocks.count,
  renderPage: mocks.render,
  MAX_PAGES: 100,
}));

const { getProtectedFileInfo, getProtectedPage, PAGE_LIMIT, clearKeptFiles } =
  await import("@/surfboard/services/protectedFileService");
const { NotFoundError } = await import("@/lib/api/errors");

const PLAN_ID = "3f2b8c1e-9d4a-4e6b-8a7c-1d2e3f4a5b6c";
const RECORD_COPY =
  "https://bucket.s3.amazonaws.com/surfboard/LA/2026/0412/redcopy/rc.pdf";
const PDF = "https://bucket.s3.amazonaws.com/surfboard/owner-1/pdf/1700-a.pdf";
const DWG = "https://bucket.s3.amazonaws.com/surfboard/owner-1/cad/1700-b.DWG";
const CERT = "https://bucket.s3.amazonaws.com/surfboard/owner-1/cert/c.pdf";
const SIGNED = "https://bucket.s3.amazonaws.com/signed?X-Amz-Signature=abc";
const JPEG = Buffer.from([0xff, 0xd8, 0xff]);

const row = (over: Record<string, unknown> = {}) => ({
  userId: "owner-1",
  planNumber: "LA/2026/0412",
  redCopyFileUrl: RECORD_COPY,
  pdfFilePaths: [PDF],
  cadFilePaths: [DWG],
  certificateFilePaths: [CERT],
  user: { surconRegNumber: "SURCON_A1B2C" },
  ...over,
});

const bytes = new Uint8Array([37, 80, 68, 70]);

beforeEach(() => {
  vi.resetAllMocks();
  clearKeptFiles();
  mocks.findFirst.mockResolvedValue(row());
  mocks.sign.mockResolvedValue(SIGNED);
  mocks.limit.mockResolvedValue(true);
  mocks.count.mockResolvedValue(3);
  mocks.render.mockResolvedValue(JPEG);
  // A fresh answer each time: a body can be read only once.
  mocks.fetch.mockImplementation(
    async () =>
      new Response(bytes, {
        status: 200,
        headers: { "content-length": String(bytes.length) },
      })
  );
  vi.stubGlobal("fetch", mocks.fetch);
});

describe("which plan and which file", () => {
  it("looks only at a plan shared with the caller, never the trash", async () => {
    await getProtectedFileInfo("viewer-1", PLAN_ID, "0");
    expect(mocks.findFirst.mock.calls[0][0].where).toEqual({
      id: PLAN_ID,
      deleted: false,
      sharedTo: { has: "viewer-1" },
    });
  });

  it("is not found for a plan that is not shared with the caller", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(
      getProtectedFileInfo("viewer-1", PLAN_ID, "0")
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("is not found for the owner: they open their own files directly", async () => {
    await expect(
      getProtectedFileInfo("owner-1", PLAN_ID, "0")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it.each(["not-a-uuid", "", "../etc"])(
    "does not ask the database for a plan id of %j",
    async (id) => {
      await expect(
        getProtectedFileInfo("viewer-1", id, "0")
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(mocks.findFirst).not.toHaveBeenCalled();
    }
  );

  it.each(["-1", "1.5", "abc", "", "99999"])(
    "is not found for a file number of %j",
    async (n) => {
      await expect(
        getProtectedFileInfo("viewer-1", PLAN_ID, n)
      ).rejects.toBeInstanceOf(NotFoundError);
    }
  );

  it("serves the survey plan (0) and the Certificate (1), never the drawing or the record copy", async () => {
    // For a recipient the list is [survey plan, certificate]: the drawing and the record copy are not in it.
    expect((await getProtectedFileInfo("viewer-1", PLAN_ID, "0")).kind).toBe(
      "SURVEY_PLAN"
    );
    expect((await getProtectedFileInfo("viewer-1", PLAN_ID, "1")).kind).toBe(
      "CERTIFICATE"
    );
    for (const n of ["2", "3"]) {
      await expect(
        getProtectedFileInfo("viewer-1", PLAN_ID, n)
      ).rejects.toBeInstanceOf(NotFoundError);
    }
    expect(mocks.sign).not.toHaveBeenCalledWith(DWG, expect.anything());
    expect(mocks.sign).not.toHaveBeenCalledWith(RECORD_COPY, expect.anything());
  });

  it("refuses a drawing-type file even when it sits in the survey plan list", async () => {
    mocks.findFirst.mockResolvedValue(
      row({ pdfFilePaths: [DWG], certificateFilePaths: [] })
    );
    await expect(
      getProtectedFileInfo("viewer-1", PLAN_ID, "0")
    ).rejects.toMatchObject({
      status: 422,
      code: "FILE_NOT_VIEWABLE",
    });
  });

  it("refuses a file in another person's folder (the owner could have edited the field)", async () => {
    mocks.findFirst.mockResolvedValue(
      row({
        pdfFilePaths: [
          "https://bucket.s3.amazonaws.com/surfboard/someone-else/pdf/x.pdf",
        ],
      })
    );
    await expect(
      getProtectedFileInfo("viewer-1", PLAN_ID, "0")
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

describe("getProtectedFileInfo", () => {
  it("says how many pages there are and what the file is called", async () => {
    const info = await getProtectedFileInfo("viewer-1", PLAN_ID, "0");
    expect(info).toEqual({
      pages: 3,
      name: "LA_2026_0412.pdf",
      kind: "SURVEY_PLAN",
    });
    expect(mocks.sign).toHaveBeenCalledWith(PDF, 60);
  });

  it("refuses a file with more pages than any survey plan has", async () => {
    mocks.count.mockResolvedValue(101);
    await expect(
      getProtectedFileInfo("viewer-1", PLAN_ID, "0")
    ).rejects.toMatchObject({
      status: 422,
    });
  });

  it("refuses a file that is too large to hold, by its declared size and by what arrives", async () => {
    mocks.fetch.mockResolvedValueOnce(
      new Response(bytes, {
        headers: { "content-length": String(61 * 1024 * 1024) },
      })
    );
    await expect(
      getProtectedFileInfo("viewer-1", PLAN_ID, "1")
    ).rejects.toMatchObject({
      status: 422,
    });
    expect(mocks.count).not.toHaveBeenCalled();
  });

  it("is not found when storage no longer has the file", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response("", { status: 404 }));
    await expect(
      getProtectedFileInfo("viewer-1", PLAN_ID, "0")
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("getProtectedPage", () => {
  it("renders the page with Draft_ and the SHARING surveyor's SURCON number", async () => {
    const out = await getProtectedPage("viewer-1", PLAN_ID, "0", "2");
    expect(out).toBe(JPEG);
    expect(mocks.render).toHaveBeenCalledWith(
      bytes,
      "pdf",
      2,
      "Draft_SURCON_A1B2C"
    );
  });

  it("still marks the page when the surveyor has no SURCON number on file", async () => {
    mocks.findFirst.mockResolvedValue(row({ user: { surconRegNumber: null } }));
    await getProtectedPage("viewer-1", PLAN_ID, "0", "1");
    expect(mocks.render.mock.calls[0][3]).toBe("Draft_SURCON");
  });

  it.each(["0", "-1", "1.5", "abc", "", "1000"])(
    "is not found for page %j",
    async (page) => {
      await expect(
        getProtectedPage("viewer-1", PLAN_ID, "0", page)
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(mocks.render).not.toHaveBeenCalled();
    }
  );

  it("does not render for someone the plan is not shared with", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(
      getProtectedPage("viewer-1", PLAN_ID, "0", "1")
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.render).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

describe("the hourly allowance", () => {
  it("is spent before any file is fetched, and refuses with 429 when it is gone", async () => {
    mocks.limit.mockResolvedValue(false);
    await expect(
      getProtectedPage("viewer-1", PLAN_ID, "0", "1")
    ).rejects.toMatchObject({
      status: 429,
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.limit.mock.calls[0][0]).toBe("file-page:viewer-1");
    expect(mocks.limit.mock.calls[0][2]).toMatchObject({ max: PAGE_LIMIT });
  });

  it("is not spent on a request that is refused before it (not found)", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await getProtectedPage("viewer-1", PLAN_ID, "0", "1").catch(
      () => undefined
    );
    expect(mocks.limit).not.toHaveBeenCalled();
  });
});

describe("the short memory of fetched files", () => {
  it("fetches a file once for the pages read one after the other", async () => {
    await getProtectedFileInfo("viewer-1", PLAN_ID, "0");
    await getProtectedPage("viewer-1", PLAN_ID, "0", "1");
    await getProtectedPage("viewer-1", PLAN_ID, "0", "2");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("still checks who is asking on every request, so a kept file is never served to someone else", async () => {
    await getProtectedPage("viewer-1", PLAN_ID, "0", "1");
    mocks.findFirst.mockResolvedValue(null);
    await expect(
      getProtectedPage("viewer-2", PLAN_ID, "0", "1")
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.render).toHaveBeenCalledTimes(1);
  });
});
