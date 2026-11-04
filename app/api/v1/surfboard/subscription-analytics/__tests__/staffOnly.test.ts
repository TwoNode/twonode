import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), analytics: vi.fn() }));

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
vi.mock("@/surfboard/services/subscriptionAnalyticsService", () => ({
  getSubscriptionAnalytics: mocks.analytics,
}));

const { SurfboardRole } = await import("@/utils/platform");

/**
 * GET subscription-analytics is for ADMIN and SUPERADMIN (I-052): its answer holds other people's
 * user ids and Paystack codes. Only the development widget, which signs in as a surveyor, may also
 * reach it, and only when NODE_ENV is "development".
 */
const load = async () => {
  vi.resetModules();
  return (await import("@/app/api/v1/surfboard/subscription-analytics/route"))
    .GET;
};

const as = (role: string) => ({
  sub: "u1",
  role,
  platform: "surfboard",
  emailVerified: true,
  mustVerifyNow: false,
});

const get = () =>
  new NextRequest("http://localhost/api/v1/surfboard/subscription-analytics", {
    headers: { authorization: "Bearer test-token" },
  });

const NOT_STAFF = [
  SurfboardRole.USER,
  SurfboardRole.CHARTING,
  SurfboardRole.ACCOUNTS,
  SurfboardRole.SURCON,
  SurfboardRole.RECORDS_I,
  SurfboardRole.INTAKE,
  SurfboardRole.RECORDS_II,
  SurfboardRole.MDA_SUPERADMIN,
  SurfboardRole.ARCHIVE,
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue(as(SurfboardRole.ADMIN));
  mocks.analytics.mockResolvedValue({ activeCount: 3 });
});
afterEach(() => vi.unstubAllEnvs());

describe("GET subscription-analytics (production)", () => {
  it("needs a session", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const GET = await load();
    mocks.session.mockResolvedValue(null);
    expect((await GET(get())).status).toBe(401);
    expect(mocks.analytics).not.toHaveBeenCalled();
  });

  it.each(NOT_STAFF)("is not for a %s account", async (role) => {
    vi.stubEnv("NODE_ENV", "production");
    const GET = await load();
    mocks.session.mockResolvedValue(as(role));
    expect((await GET(get())).status).toBe(403);
    expect(mocks.analytics).not.toHaveBeenCalled();
  });

  it.each([SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN])(
    "answers a %s",
    async (role) => {
      vi.stubEnv("NODE_ENV", "production");
      const GET = await load();
      mocks.session.mockResolvedValue(as(role));
      const res = await GET(get());
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        success: true,
        data: { activeCount: 3 },
      });
    }
  );
});

describe("GET subscription-analytics (development, for the debug widget)", () => {
  it("also answers a surveyor, because the widget signs in as one", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const GET = await load();
    mocks.session.mockResolvedValue(as(SurfboardRole.USER));
    expect((await GET(get())).status).toBe(200);
  });

  it.each(NOT_STAFF.filter((r) => r !== SurfboardRole.USER))(
    "still refuses a %s account",
    async (role) => {
      vi.stubEnv("NODE_ENV", "development");
      const GET = await load();
      mocks.session.mockResolvedValue(as(role));
      expect((await GET(get())).status).toBe(403);
    }
  );
});
