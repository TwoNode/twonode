import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), clear: vi.fn() }));

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
  clearUserSubscription: mocks.clear,
}));

const { POST } =
  await import("@/app/api/v1/surfboard/subscription/clear/route");
const { SurfboardRole } = await import("@/utils/platform");

/**
 * POST subscription/clear deletes the caller's own subscription and history without telling
 * Paystack (I-053). It is a development tool: on a deployed site (NODE_ENV "production") it is 404
 * for everybody, whoever they are and whether or not they are signed in.
 */
const as = (role: string) => ({
  sub: "u1",
  role,
  platform: "surfboard",
  emailVerified: true,
  mustVerifyNow: false,
});

const post = () =>
  new NextRequest("http://localhost/api/v1/surfboard/subscription/clear", {
    method: "POST",
    headers: { authorization: "Bearer test-token" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue(as(SurfboardRole.USER));
  mocks.clear.mockResolvedValue({ deletedCount: 1 });
});
afterEach(() => vi.unstubAllEnvs());

describe("POST subscription/clear on a deployed site", () => {
  it.each([
    SurfboardRole.USER,
    SurfboardRole.ADMIN,
    SurfboardRole.SUPERADMIN,
    SurfboardRole.CHARTING,
  ])("is 404 for a %s and deletes nothing", async (role) => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.session.mockResolvedValue(as(role));
    const res = await POST(post());
    expect(res.status).toBe(404);
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it("is 404 with no session too, not a 401 that hints a route is there", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.session.mockResolvedValue(null);
    expect((await POST(post())).status).toBe(404);
    expect(mocks.session).not.toHaveBeenCalled();
  });
});

describe("POST subscription/clear on a development server", () => {
  it("needs a session", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.session.mockResolvedValue(null);
    expect((await POST(post())).status).toBe(401);
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it("clears the signed-in account's own subscription", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = await POST(post());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      data: { deletedCount: 1 },
    });
    expect(mocks.clear).toHaveBeenCalledWith("u1");
  });
});
