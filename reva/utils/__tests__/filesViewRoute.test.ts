import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: { sub: "user-1", role: "USER" } as { sub: string; role: string },
  findMany: vi.fn(),
  sign: vi.fn(),
}));

vi.mock("@/lib/api/withAuth", () => ({
  withAuth:
    (handler: (req: NextRequest, ctx: unknown) => Promise<Response>) =>
    (req: NextRequest) =>
      handler(req, { session: mocks.session }),
}));
vi.mock("@/lib/prisma", () => ({
  default: { property: { findMany: mocks.findMany } },
}));
vi.mock("@/surfboard/services/awsService", () => ({
  getPresignedDownloadUrl: mocks.sign,
  extractS3KeyFromUrl: (v: string) => v.replace(/^https?:\/\/[^/]+\//, ""),
}));

const { GET } = await import("@/app/api/v1/reva/files/view/route");
const SIGNED = "https://signed.example/f?sig=1";
const get = (key: string, extra = "") =>
  (GET as unknown as (req: NextRequest) => Promise<Response>)(
    new NextRequest(
      `http://localhost/api/v1/reva/files/view?url=${encodeURIComponent(key)}${extra}`
    )
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session = { sub: "user-1", role: "USER" };
  mocks.findMany.mockResolvedValue([]);
  mocks.sign.mockResolvedValue(SIGNED);
});

describe("GET /api/v1/reva/files/view", () => {
  it("lets an admin open any REVA file", async () => {
    mocks.session = { sub: "a1", role: "ADMIN" };
    const res = await get("reva/uploads/1-doc.pdf");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(SIGNED);
    expect(res.headers.get("vary")).toBe("Cookie");
  });

  it("refuses keys outside the REVA folders, even for admins", async () => {
    mocks.session = { sub: "a1", role: "SUPERADMIN" };
    expect((await get("surfboard/u1/pdf/a.pdf")).status).toBe(400);
    expect((await get("reva/../surfboard/u1/a.pdf")).status).toBe(400);
  });

  it("lets a requester open their own site photo", async () => {
    mocks.findMany.mockResolvedValue([{ site_images: ["https://b.s3.x.amazonaws.com/reva/uploads/p1.jpg"] }]);
    expect((await get("reva/uploads/p1.jpg")).status).toBe(307);
  });

  it("refuses a requester's own documents (they stay behind the one-time code) and other people's photos", async () => {
    mocks.findMany.mockResolvedValue([{ site_images: ["https://b.s3.x.amazonaws.com/reva/uploads/p1.jpg"] }]);
    expect((await get("reva/uploads/doc.pdf")).status).toBe(403);
    expect((await get("reva/uploads/someone-else.jpg")).status).toBe(403);
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it("returns JSON and forces a download when asked", async () => {
    mocks.session = { sub: "a1", role: "ADMIN" };
    const json = await get("reva/uploads/a.pdf", "&format=json");
    expect(await json.json()).toEqual({ success: true, url: SIGNED });
    await get("reva/uploads/a.pdf", "&download=1&name=report.pdf");
    expect(mocks.sign).toHaveBeenLastCalledWith("reva/uploads/a.pdf", 300, { downloadName: "report.pdf" });
  });

  it("signs private/reva/ keys for admins and requesters", async () => {
    mocks.session = { sub: "a1", role: "ADMIN" };
    const res = await get("private/reva/REVA_123/17-report.pdf");
    expect(res.status).toBe(307);
    expect(mocks.sign).toHaveBeenCalledWith("private/reva/REVA_123/17-report.pdf", 300, { downloadName: undefined });

    mocks.session = { sub: "user-1", role: "USER" };
    mocks.findMany.mockResolvedValue([
      { site_images: ["https://b.s3.x.amazonaws.com/private/reva/REVA_123/site1.jpg"] },
    ]);
    const userRes = await get("private/reva/REVA_123/site1.jpg");
    expect(userRes.status).toBe(307);
    expect(mocks.sign).toHaveBeenCalledWith("private/reva/REVA_123/site1.jpg", 300, { downloadName: undefined });
  });
});
