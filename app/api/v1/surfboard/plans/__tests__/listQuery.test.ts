import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  own: vi.fn(),
  shared: vi.fn(),
  sharedWithMe: vi.fn(),
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
vi.mock("@/surfboard/services/planService", () => ({
  getPaginatedSurfPlans: mocks.own,
  getAllSharedSurfPlans: mocks.shared,
  getSharedWithMeSurfPlans: mocks.sharedWithMe,
  createSurfPlan: vi.fn(),
  getUserDisplayName: vi.fn(),
}));

const { GET: own } = await import("@/app/api/v1/surfboard/plans/route");
const { GET: shared } =
  await import("@/app/api/v1/surfboard/plans/shared/route");
const { GET: sharedWithMe } =
  await import("@/app/api/v1/surfboard/plans/shared-with-me/route");

/**
 * The website's three plan lists check their query string before it reaches the
 * database (I-044): an unknown sort column, a bad sort order or a bad date is a 400,
 * and the page size is at most 100. `plans` still honours `noPagination`, which the
 * dashboard and the map use.
 */
const lists = [
  { name: "plans", GET: own, service: mocks.own, path: "plans" },
  {
    name: "plans/shared",
    GET: shared,
    service: mocks.shared,
    path: "plans/shared",
  },
  {
    name: "plans/shared-with-me",
    GET: sharedWithMe,
    service: mocks.sharedWithMe,
    path: "plans/shared-with-me",
  },
];

/** What a list handed its service: `plans` takes one options object, the shared lists take positional arguments. */
const received = (service: ReturnType<typeof vi.fn>) => {
  const args = service.mock.calls[0];
  return service === mocks.own
    ? args[1]
    : { page: args[1], pageSize: args[2], filters: args[3], sort: args[4] };
};

const request = (path: string, query: string) =>
  new NextRequest(`http://localhost/api/v1/surfboard/${path}?${query}`, {
    headers: { authorization: "Bearer test-token" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({
    sub: "u1",
    role: "USER",
    platform: "surfboard",
    emailVerified: true,
    mustVerifyNow: false,
  });
  for (const l of lists) {
    l.service.mockResolvedValue({ plans: [], total: 0, totalPages: 0 });
  }
});

describe.each(lists)("GET $name", ({ GET, service, path }) => {
  it.each([
    "sortField=pillars&sortOrder=asc",
    "sortField=geometry&sortOrder=desc",
    "sortField=nope&sortOrder=asc",
    "sortField=status&sortOrder=sideways",
    "dateFrom=not-a-date",
    "dateTo=2026-02-31",
  ])("answers 400 and asks the database nothing for %s", async (query) => {
    const res = await GET(request(path, query), {});
    expect(res.status).toBe(400);
    expect(service).not.toHaveBeenCalled();
  });

  it("passes a good query on to the service for the signed-in surveyor", async () => {
    const res = await GET(
      request(
        path,
        "page=2&pageSize=20&search=PP&status=LODGED&sortField=planNumber&sortOrder=asc"
      ),
      {}
    );
    expect(res.status).toBe(200);
    expect(service.mock.calls[0][0]).toBe("u1");
    expect(received(service)).toMatchObject({
      page: 2,
      pageSize: 20,
      filters: { search: "PP", status: ["LODGED"] },
      sort: { field: "planNumber", order: "asc" },
    });
  });

  it("caps the page size at 100", async () => {
    await GET(request(path, "pageSize=100000"), {});
    expect(received(service).pageSize).toBe(100);
  });
});

describe("noPagination", () => {
  it("is still honoured on plans, for the dashboard and the map", async () => {
    await own(request("plans", "noPagination=true"), {});
    expect(mocks.own.mock.calls[0][1]).toMatchObject({ noPagination: true });
  });
});
