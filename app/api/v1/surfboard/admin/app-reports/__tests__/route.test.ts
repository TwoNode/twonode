import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  list: vi.fn(),
  options: vi.fn(),
}));

vi.mock("@/lib/observability/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/auth/session", async (original) => ({
  ...(await original<typeof import("@/lib/auth/session")>()),
  getServerSession: mocks.session,
}));
vi.mock("@/lib/api/mobileApp", async (original) => ({
  ...(await original<typeof import("@/lib/api/mobileApp")>()),
  isMobileRequest: () => false,
  assertMobileClientAllowed: vi.fn(),
}));
vi.mock("@/lib/diagnostics/appReports", () => ({
  listAppReports: mocks.list,
  getAppReportFilterOptions: mocks.options,
}));

const { GET: list } =
  await import("@/app/api/v1/surfboard/admin/app-reports/route");
const { GET: filters } =
  await import("@/app/api/v1/surfboard/admin/app-reports/filters/route");

const as = (role: string) => ({
  sub: "admin-1",
  role,
  platform: "surfboard",
  emailVerified: true,
  mustVerifyNow: false,
});
const get = (path = "") =>
  new NextRequest(`http://localhost/api/v1/surfboard/admin/app-reports${path}`);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue(as("SUPERADMIN"));
  mocks.list.mockResolvedValue({
    data: [],
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
  });
  mocks.options.mockResolvedValue({
    kinds: [],
    platforms: [],
    appVersions: [],
  });
});

describe("the superadmin App Reports routes", () => {
  it.each([
    ["list", () => list(get())],
    ["filters", () => filters(get("/filters"))],
  ])(
    "%s: superadmin only (an ADMIN, a USER or no one is refused)",
    async (_n, call) => {
      mocks.session.mockResolvedValue(as("ADMIN"));
      expect((await call()).status).toBe(403);
      mocks.session.mockResolvedValue(as("USER"));
      expect((await call()).status).toBe(403);
      mocks.session.mockResolvedValue(null);
      expect((await call()).status).toBe(401);
      expect(mocks.list).not.toHaveBeenCalled();
      expect(mocks.options).not.toHaveBeenCalled();
    }
  );

  it("list passes the page and the filters on, and answers the page", async () => {
    const res = await list(
      get(
        "?page=2&pageSize=5&kind=caught-error&platform=ios&appVersion=1.0.0&search=map"
      )
    );
    expect(res.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith({
      page: 2,
      pageSize: 5,
      kind: "caught-error",
      platform: "ios",
      appVersion: "1.0.0",
      search: "map",
    });
    expect((await res.json()).success).toBe(true);
  });

  it("list treats an empty filter as no filter, and clamps the page size", async () => {
    await list(get("?kind=&pageSize=100000"));
    expect(mocks.list.mock.calls[0][0]).toMatchObject({
      kind: undefined,
      pageSize: 100,
    });
  });

  it("filters answers what the drop-downs offer", async () => {
    mocks.options.mockResolvedValue({
      kinds: ["caught-error"],
      platforms: ["ios"],
      appVersions: ["1.0.0"],
    });
    const res = await filters(get("/filters"));
    expect((await res.json()).data.appVersions).toEqual(["1.0.0"]);
  });
});
