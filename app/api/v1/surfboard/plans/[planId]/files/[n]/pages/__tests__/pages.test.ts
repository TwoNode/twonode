import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  info: vi.fn(),
  page: vi.fn(),
  roles: [] as unknown[],
}));

vi.mock("@/lib/api/withAuth", () => ({
  withAuth: (
    handler: (
      req: NextRequest,
      ctx: unknown,
      route: unknown
    ) => Promise<Response>,
    options: { roles: unknown[] }
  ) => {
    mocks.roles.push(options.roles);
    return (req: NextRequest, route: unknown) =>
      handler(req, { session: { sub: "viewer-1" } }, route);
  },
}));
vi.mock("@/surfboard/services/protectedFileService", () => ({
  getProtectedFileInfo: mocks.info,
  getProtectedPage: mocks.page,
}));

const list =
  await import("@/app/api/v1/surfboard/plans/[planId]/files/[n]/pages/route");
const one =
  await import("@/app/api/v1/surfboard/plans/[planId]/files/[n]/pages/[p]/route");

const PLAN = "3f2b8c1e-9d4a-4e6b-8a7c-1d2e3f4a5b6c";
const call = (handler: unknown, params: Record<string, string>) =>
  (handler as (req: NextRequest, route: unknown) => Promise<Response>)(
    new NextRequest("http://localhost/x"),
    { params: Promise.resolve(params) }
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET .../files/{n}/pages", () => {
  it("answers the page count for the signed-in surveyor, and keeps nothing", async () => {
    mocks.info.mockResolvedValue({
      pages: 3,
      name: "LA_2026_0412.pdf",
      kind: "SURVEY_PLAN",
    });
    const res = await call(list.GET, { planId: PLAN, n: "0" });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: { pages: 3, name: "LA_2026_0412.pdf", kind: "SURVEY_PLAN" },
    });
    expect(mocks.info).toHaveBeenCalledWith("viewer-1", PLAN, "0");
  });
});

describe("GET .../files/{n}/pages/{p}", () => {
  it("answers the page as a JPEG that is shown in place and kept by nothing", async () => {
    mocks.page.mockResolvedValue(Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    const res = await call(one.GET, { planId: PLAN, n: "1", p: "2" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("content-disposition")).toBe("inline");
    expect(res.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0"
    );
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(
      new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
    );
    expect(mocks.page).toHaveBeenCalledWith("viewer-1", PLAN, "1", "2");
  });

  it("lets the service's refusal through (a plan not shared with the caller is a 404)", async () => {
    mocks.page.mockRejectedValue(new Error("File not found"));
    await expect(
      call(one.GET, { planId: PLAN, n: "0", p: "1" })
    ).rejects.toThrow("File not found");
  });
});

describe("who may call them", () => {
  it("both are for surveyors only (the USER role)", () => {
    expect(mocks.roles.length).toBeGreaterThanOrEqual(2);
    for (const roles of mocks.roles) expect(roles).toEqual(["USER"]);
  });
});
