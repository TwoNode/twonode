import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: { sub: "user-1", role: "USER" } as { sub: string; role: string },
  plan: vi.fn(),
  attachment: vi.fn(),
  batch: vi.fn(),
  sign: vi.fn(),
}));

vi.mock("@/lib/api/withAuth", () => ({
  withAuth:
    (handler: (req: NextRequest, ctx: unknown) => Promise<Response>) =>
    (req: NextRequest) =>
      handler(req, { session: mocks.session }),
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    surfboardPlan: { findFirst: mocks.plan },
    surfboardPlanViewerAttachment: { findFirst: mocks.attachment },
    certificateOfDepositBatch: { findFirst: mocks.batch },
  },
}));
vi.mock("@/surfboard/services/awsService", () => ({
  getPresignedDownloadUrl: mocks.sign,
  extractS3KeyFromUrl: (v: string) => v.replace(/^https?:\/\/[^/]+\//, ""),
}));

const { GET } = await import("@/app/api/v1/surfboard/files/view/route");

const SIGNED = "https://signed.example/file?sig=1";
const get = (key: string) =>
  (GET as unknown as (req: NextRequest) => Promise<Response>)(
    new NextRequest(
      `http://localhost/api/v1/surfboard/files/view?url=${encodeURIComponent(key)}`
    )
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session = { sub: "user-1", role: "USER" };
  mocks.plan.mockResolvedValue(null);
  mocks.attachment.mockResolvedValue(null);
  mocks.batch.mockResolvedValue(null);
  mocks.sign.mockResolvedValue(SIGNED);
});

describe("GET /api/v1/surfboard/files/view", () => {
  it("redirects a surveyor to a signed link for a file in their own folder, cached privately", async () => {
    const res = await get("surfboard/user-1/pdf/a.pdf");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(SIGNED);
    expect(res.headers.get("cache-control")).toMatch(/^private, max-age=\d+$/);
    expect(res.headers.get("vary")).toBe("Cookie");
  });

  it("keeps the cache shorter than the link lifetime", async () => {
    const res = await get("surfboard/user-1/pdf/a.pdf");
    const maxAge = Number(
      /max-age=(\d+)/.exec(res.headers.get("cache-control")!)![1]
    );
    const expiresIn = mocks.sign.mock.calls[0][1] as number;
    expect(maxAge).toBeLessThan(expiresIn);
  });

  it("refuses a surveyor another user's file", async () => {
    const res = await get("surfboard/user-2/pdf/a.pdf");
    expect(res.status).toBe(403);
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it("lets a surveyor open a payment receipt on a batch they submitted, even outside their folder", async () => {
    mocks.batch.mockResolvedValue({ id: "b1" });
    const res = await get("surfboard/staff-9/receipt/r.pdf");
    expect(res.status).toBe(307);
    expect(mocks.batch.mock.calls[0][0].where.submittedBy).toBe("user-1");
  });

  it("refuses a receipt that is not on the surveyor's own batch", async () => {
    mocks.batch.mockResolvedValue(null);
    const res = await get("surfboard/staff-9/receipt/r.pdf");
    expect(res.status).toBe(403);
  });

  it.each(["ARCHIVE", "MDA_SUPERADMIN", "RECORDS_II"])(
    "lets %s staff open any file without ownership checks",
    async (role) => {
      mocks.session = { sub: "staff-1", role };
      const res = await get("surfboard/user-2/redcopy/x.pdf");
      expect(res.status).toBe(307);
      expect(mocks.plan).not.toHaveBeenCalled();
    }
  );

  it("rejects an unsafe key", async () => {
    const res = await get("surfboard/user-1/../user-2/a.pdf");
    expect(res.status).toBe(400);
  });

  it("asks for a download name only when download=1", async () => {
    await get("surfboard/user-1/pdf/a.pdf");
    expect(mocks.sign.mock.calls[0][2]).toEqual({ downloadName: undefined });

    mocks.sign.mockClear();
    const res = await (
      GET as unknown as (req: NextRequest) => Promise<Response>
    )(
      new NextRequest(
        "http://localhost/api/v1/surfboard/files/view?url=surfboard%2Fuser-1%2Fpdf%2Fa.pdf&download=1&name=Plan.pdf"
      )
    );
    expect(res.status).toBe(307);
    expect(mocks.sign.mock.calls[0][2]).toEqual({ downloadName: "Plan.pdf" });
  });
});

describe("record copies stored under the plan number (I-023)", () => {
  const key = "surfboard/SAS/LA/1886/2023/A001/redcopy/1700000000000__ab12__x.pdf";

  it("lets the plan owner open their record copy", async () => {
    mocks.plan.mockResolvedValue({ id: "p1", userId: "user-1", planNumber: "SAS/LA/1886/2023/A001" });
    const res = await get(key);
    expect(res.status).toBe(307);
  });

  it("refuses a record copy filed under a different plan number", async () => {
    mocks.plan.mockResolvedValue({ id: "p1", userId: "user-1", planNumber: "SAS/LA/9999/2023/A001" });
    const res = await get(key);
    expect(res.status).toBe(403);
  });
});
