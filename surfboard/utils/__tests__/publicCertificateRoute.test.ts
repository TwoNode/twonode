import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ key: vi.fn(), sign: vi.fn() }));

vi.mock("@/surfboard/services/qrEarningsService", () => ({
  getPaidCertificateKey: mocks.key,
}));
vi.mock("@/surfboard/services/awsService", () => ({
  getPresignedDownloadUrl: mocks.sign,
}));

const { GET } = await import(
  "@/app/api/v1/surfboard/plans/[planId]/public/certificate/route"
);
const call = (qs: string) =>
  GET(
    new NextRequest(`http://localhost/api/v1/surfboard/plans/p1/public/certificate${qs}`),
    { params: Promise.resolve({ planId: "p1" }) }
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.key.mockResolvedValue("surfboard/u1/certificate/PLAN.pdf");
  mocks.sign.mockResolvedValue("https://signed.example/c?sig=1");
});

describe("GET /plans/[planId]/public/certificate", () => {
  it("redirects to a signed link for a paid session, never cached", async () => {
    const res = await call("?token=t&index=1");
    expect(mocks.key).toHaveBeenCalledWith("p1", "t", 1);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://signed.example/c?sig=1");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns JSON and forces a download when asked", async () => {
    const json = await call("?token=t&format=json");
    expect(await json.json()).toEqual({ success: true, url: "https://signed.example/c?sig=1" });
    await call("?token=t&download=1&name=Certificate.pdf");
    expect(mocks.sign).toHaveBeenLastCalledWith("surfboard/u1/certificate/PLAN.pdf", 300, {
      downloadName: "Certificate.pdf",
    });
  });

  it("signs nothing when the session is not a paid certificate session", async () => {
    const { NotFoundError } = await import("@/lib/api/errors");
    mocks.key.mockRejectedValue(new NotFoundError("Certificate"));
    const res = await call("?token=bad");
    expect(res.status).toBe(404);
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it("rejects a bad index", async () => {
    expect((await call("?token=t&index=-1")).status).toBe(400);
    expect((await call("?token=t&index=abc")).status).toBe(400);
    expect(mocks.key).not.toHaveBeenCalled();
  });
});
