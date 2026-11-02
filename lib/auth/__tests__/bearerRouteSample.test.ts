import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * TASK-0015 1A.10: the bearer token is read by `withAuth` for every route, so this
 * sends REAL signed tokens (nothing about the session is mocked) to a sample of
 * real route handlers across the Surfboard API, the staff routes and a REVA route,
 * with only each route's service replaced. It checks what a phone relies on (a
 * valid token is served as that surveyor) and what protects the account (a bad,
 * expired, unsigned or other-product token is refused, a bad bearer token never
 * falls back to a cookie, and a cookie session still needs the CSRF check).
 */
const mocks = vi.hoisted(() => ({
  incoming: new Headers(),
  cookieToken: null as string | null,
  planSummaries: vi.fn(),
  planStats: vi.fn(),
  walletSummary: vi.fn(),
  subscriptionSummary: vi.fn(),
  profileSummary: vi.fn(),
  notifications: vi.fn(),
  pushPreferences: vi.fn(),
  updatePushPreferences: vi.fn(),
  adminPlans: vi.fn(),
  revaProfile: vi.fn(),
  devices: vi.fn(),
}));

// What `headers()` would give the handler for the request being tested.
vi.mock("next/headers", () => ({ headers: async () => mocks.incoming }));
vi.mock("@/lib/auth/cookies", () => ({
  getAccessTokenCookie: async () => mocks.cookieToken,
  getRefreshTokenCookie: async () => null,
  setAuthCookies: vi.fn(),
  setAccessTokenCookie: vi.fn(),
  clearAuthCookies: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/observability/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
// The version gate reads the database; it is covered in withAuthMobileGate.test.ts.
vi.mock("@/lib/api/mobileApp", async (original) => ({
  ...(await original<typeof import("@/lib/api/mobileApp")>()),
  assertMobileClientAllowed: vi.fn(),
}));
vi.mock("@/surfboard/services/planSummaryService", () => ({
  getPlanSummaries: mocks.planSummaries,
}));
vi.mock("@/surfboard/services/planStatsService", () => ({
  getPlanStats: mocks.planStats,
}));
vi.mock("@/surfboard/services/qrEarningsService", () => ({
  getWalletSummary: mocks.walletSummary,
}));
vi.mock("@/surfboard/services/subscriptionService", () => ({
  getSubscriptionSummary: mocks.subscriptionSummary,
}));
vi.mock("@/surfboard/services/profileService", () => ({
  getProfileSummary: mocks.profileSummary,
}));
vi.mock("@/surfboard/services/notificationService", () => ({
  getUserNotifications: mocks.notifications,
  getUserNotificationsPaginated: vi.fn(),
  createNotification: vi.fn(),
}));
vi.mock("@/lib/push/preferences", async (original) => ({
  ...(await original<typeof import("@/lib/push/preferences")>()),
  getPushPreferences: mocks.pushPreferences,
  updatePushPreferences: mocks.updatePushPreferences,
}));
vi.mock("@/surfboard/services/planService", () => ({
  getAdminSurfPlansPaginated: mocks.adminPlans,
}));
vi.mock("@/reva/services/profileService", () => ({
  getProfile: mocks.revaProfile,
  updateProfile: vi.fn(),
}));
vi.mock("@/lib/auth/deviceSessions", () => ({
  listDeviceSessions: mocks.devices,
}));

const { signAccessToken } = await import("@/lib/auth/jwt");
const { GET: summary } =
  await import("@/app/api/v1/surfboard/plans/summary/route");
const { GET: stats } = await import("@/app/api/v1/surfboard/plans/stats/route");
const { GET: wallet } =
  await import("@/app/api/v1/surfboard/qr/wallet-summary/route");
const { GET: subscription } =
  await import("@/app/api/v1/surfboard/subscription/summary/route");
const { GET: profile } =
  await import("@/app/api/v1/surfboard/profile/summary/route");
const { GET: notifications } =
  await import("@/app/api/v1/surfboard/notifications/route");
const { GET: prefs, PATCH: patchPrefs } =
  await import("@/app/api/v1/surfboard/push/preferences/route");
const { GET: adminPlans } =
  await import("@/app/api/v1/surfboard/admin/plans/route");
const { GET: revaProfile } = await import("@/app/api/v1/reva/profile/route");
const { GET: devices } = await import("@/app/api/v1/auth/mobile/devices/route");

const surveyor = {
  sub: "u1",
  role: "USER",
  platform: "surfboard" as never,
  emailVerified: true,
  mustVerifyNow: false,
};
const routes = [
  { name: "plans/summary", GET: summary, service: mocks.planSummaries },
  { name: "plans/stats", GET: stats, service: mocks.planStats },
  { name: "qr/wallet-summary", GET: wallet, service: mocks.walletSummary },
  {
    name: "subscription/summary",
    GET: subscription,
    service: mocks.subscriptionSummary,
  },
  { name: "profile/summary", GET: profile, service: mocks.profileSummary },
  // No role list: any signed-in Surfboard account.
  { name: "notifications", GET: notifications, service: mocks.notifications },
  { name: "push/preferences", GET: prefs, service: mocks.pushPreferences },
];

/** Calls a handler the way the platform does: the request's headers are what `headers()` returns. */
function call(
  handler: (req: NextRequest, ctx?: unknown) => Promise<Response>,
  {
    method = "GET",
    token,
    cookie,
    headers = {},
    body,
  }: {
    method?: string;
    token?: string;
    cookie?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
) {
  const h: Record<string, string> = {
    host: "localhost:3000",
    "content-type": "application/json",
    ...headers,
  };
  if (token) h.authorization = `Bearer ${token}`;
  mocks.cookieToken = cookie ?? null;
  const req = new NextRequest("http://localhost:3000/api/v1/x", {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  mocks.incoming = new Headers(req.headers);
  return handler(req, {});
}

const tokenFor = (over: Record<string, unknown> = {}) =>
  signAccessToken({ ...surveyor, ...over } as never);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.incoming = new Headers();
  mocks.cookieToken = null;
  for (const r of routes) r.service.mockResolvedValue({ ok: true });
  mocks.adminPlans.mockResolvedValue({ plans: [] });
  mocks.revaProfile.mockResolvedValue({ id: "r1" });
  mocks.devices.mockResolvedValue([]);
  mocks.updatePushPreferences.mockResolvedValue({ ok: true });
});
afterEach(() => vi.useRealTimers());

describe.each(routes)("GET $name with a bearer token", ({ GET, service }) => {
  it("answers 401 with no credentials at all", async () => {
    expect((await call(GET)).status).toBe(401);
    expect(service).not.toHaveBeenCalled();
  });

  it("serves a valid token as that surveyor", async () => {
    const res = await call(GET, { token: await tokenFor() });
    expect(res.status).toBe(200);
    expect(service.mock.calls[0][0]).toBe("u1");
  });

  it("refuses a token signed with another secret", async () => {
    const forged = await new SignJWT({ ...surveyor })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(new TextEncoder().encode("not-the-servers-secret-at-all-0123456"));
    expect((await call(GET, { token: forged })).status).toBe(401);
    expect(service).not.toHaveBeenCalled();
  });

  it("refuses a token whose signature was altered", async () => {
    const good = await tokenFor();
    const bad = good.slice(0, -3) + (good.endsWith("AAA") ? "BBB" : "AAA");
    expect((await call(GET, { token: bad })).status).toBe(401);
    expect(service).not.toHaveBeenCalled();
  });

  it("refuses a token that says it is unsigned (alg none)", async () => {
    const b64 = (o: object) =>
      Buffer.from(JSON.stringify(o)).toString("base64url");
    const unsigned = `${b64({ alg: "none", typ: "JWT" })}.${b64({
      ...surveyor,
      exp: Math.floor(Date.now() / 1000) + 600,
    })}.`;
    expect((await call(GET, { token: unsigned })).status).toBe(401);
    expect(service).not.toHaveBeenCalled();
  });

  it("refuses a token after its 15 minutes are up", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const token = await tokenFor();
    vi.setSystemTime(Date.now() + 16 * 60 * 1000);
    expect((await call(GET, { token })).status).toBe(401);
    expect(service).not.toHaveBeenCalled();
  });

  it("refuses a token that was issued for another product", async () => {
    const reva = await tokenFor({ platform: "reva" });
    expect((await call(GET, { token: reva })).status).toBe(401);
    expect(service).not.toHaveBeenCalled();
  });

  it("does not fall back to a cookie when the bearer token is bad", async () => {
    const cookie = await tokenFor();
    const res = await call(GET, { token: "garbage", cookie });
    expect(res.status).toBe(401);
    expect(service).not.toHaveBeenCalled();
  });

  it("still serves the website's cookie session when there is no bearer header", async () => {
    const res = await call(GET, { cookie: await tokenFor() });
    expect(res.status).toBe(200);
    expect(service.mock.calls[0][0]).toBe("u1");
  });
});

describe("roles and products", () => {
  it("keeps a surveyor's bearer token out of the staff routes", async () => {
    const res = await call(adminPlans, { token: await tokenFor() });
    expect(res.status).toBe(403);
    expect(mocks.adminPlans).not.toHaveBeenCalled();
  });

  it.each(["ADMIN", "SUPERADMIN"])(
    "lets a %s bearer token in",
    async (role) => {
      const res = await call(adminPlans, { token: await tokenFor({ role }) });
      expect(res.status).toBe(200);
    }
  );

  it("keeps a Surfboard bearer token out of a REVA route, and lets a REVA one in", async () => {
    expect((await call(revaProfile, { token: await tokenFor() })).status).toBe(
      401
    );
    expect(mocks.revaProfile).not.toHaveBeenCalled();
    const reva = await tokenFor({ platform: "reva" });
    expect((await call(revaProfile, { token: reva })).status).toBe(200);
  });
});

describe("an account that has not verified its email", () => {
  const unverified = { emailVerified: false, mustVerifyNow: true };

  it("is told to verify on an ordinary route", async () => {
    const res = await call(summary, { token: await tokenFor(unverified) });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("EMAIL_VERIFICATION_REQUIRED");
    expect(mocks.planSummaries).not.toHaveBeenCalled();
  });

  it("can still manage its signed-in devices", async () => {
    const res = await call(devices, { token: await tokenFor(unverified) });
    expect(res.status).toBe(200);
  });

  it("is not stopped while the grace period has not ended (mustVerifyNow false)", async () => {
    const token = await tokenFor({
      emailVerified: false,
      mustVerifyNow: false,
    });
    expect((await call(summary, { token })).status).toBe(200);
  });
});

describe("PATCH push/preferences and the CSRF check", () => {
  const body = { categories: { PLAN_SHARED: false } };

  it("lets a native app change its preferences with a bearer token and no Origin", async () => {
    const res = await call(patchPrefs, {
      method: "PATCH",
      token: await tokenFor(),
      body,
    });
    expect(res.status).toBe(200);
    expect(mocks.updatePushPreferences).toHaveBeenCalledTimes(1);
  });

  it("refuses the same change from a cookie session with no Origin or Referer", async () => {
    const res = await call(patchPrefs, {
      method: "PATCH",
      cookie: await tokenFor(),
      body,
    });
    expect(res.status).toBe(403);
    expect(mocks.updatePushPreferences).not.toHaveBeenCalled();
  });

  it("refuses a cookie session from another origin", async () => {
    const res = await call(patchPrefs, {
      method: "PATCH",
      cookie: await tokenFor(),
      headers: { origin: "https://evil.example" },
      body,
    });
    expect(res.status).toBe(403);
    expect(mocks.updatePushPreferences).not.toHaveBeenCalled();
  });

  it("accepts a cookie session from the site's own origin", async () => {
    const res = await call(patchPrefs, {
      method: "PATCH",
      cookie: await tokenFor(),
      headers: { origin: "http://localhost:3000" },
      body,
    });
    expect(res.status).toBe(200);
  });

  it("a bad bearer token with a good cookie and no Origin is refused as 401, not let through by the bearer exemption", async () => {
    const res = await call(patchPrefs, {
      method: "PATCH",
      token: "garbage",
      cookie: await tokenFor(),
      body,
    });
    expect(res.status).toBe(401);
    expect(mocks.updatePushPreferences).not.toHaveBeenCalled();
  });
});
