import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  getPlanStats: vi.fn(),
  getWalletSummary: vi.fn(),
  getSubscriptionSummary: vi.fn(),
  getProfileSummary: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getServerSession: mocks.session }));
vi.mock("@/surfboard/services/planStatsService", () => ({
  getPlanStats: mocks.getPlanStats,
}));
vi.mock("@/surfboard/services/qrEarningsService", () => ({
  getWalletSummary: mocks.getWalletSummary,
}));
vi.mock("@/surfboard/services/subscriptionService", () => ({
  getSubscriptionSummary: mocks.getSubscriptionSummary,
}));
vi.mock("@/surfboard/services/profileService", () => ({
  getProfileSummary: mocks.getProfileSummary,
}));

const { GET: planStats } =
  await import("@/app/api/v1/surfboard/plans/stats/route");
const { GET: walletSummary } =
  await import("@/app/api/v1/surfboard/qr/wallet-summary/route");
const { GET: subscriptionSummary } =
  await import("@/app/api/v1/surfboard/subscription/summary/route");
const { GET: profileSummary } =
  await import("@/app/api/v1/surfboard/profile/summary/route");
const { NotFoundError } = await import("@/lib/api/errors");

type Handler = (req: NextRequest) => Promise<Response>;
const call = (handler: unknown, path: string) =>
  (handler as Handler)(
    new NextRequest(`http://localhost/api/v1/surfboard/${path}`)
  );

const session = (over: Record<string, unknown> = {}) => ({
  sub: "user-1",
  role: "USER",
  platform: "surfboard",
  emailVerified: true,
  mustVerifyNow: false,
  ...over,
});

const routes: [string, unknown, string][] = [
  ["plans/stats", planStats, "plans/stats"],
  ["qr/wallet-summary", walletSummary, "qr/wallet-summary"],
  ["subscription/summary", subscriptionSummary, "subscription/summary"],
  ["profile/summary", profileSummary, "profile/summary"],
];

beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue(session());
  mocks.getPlanStats.mockResolvedValue({ total: 3 });
  mocks.getWalletSummary.mockResolvedValue({ currency: "NGN" });
  mocks.getSubscriptionSummary.mockResolvedValue({ state: "NONE" });
  mocks.getProfileSummary.mockResolvedValue({ firstName: "Ada" });
});

describe.each(routes)("GET %s", (_name, handler, path) => {
  it("needs a signed-in session", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await call(handler, path)).status).toBe(401);
  });

  it.each([
    "ADMIN",
    "SUPERADMIN",
    "ACCOUNTS",
    "CHARTING",
    "SURCON",
    "RECORDS_I",
    "INTAKE",
    "RECORDS_II",
    "ARCHIVE",
    "MDA_SUPERADMIN",
  ])("is for surveyors only: %s is refused", async (role) => {
    mocks.session.mockResolvedValue(session({ role }));
    expect((await call(handler, path)).status).toBe(403);
  });

  it("waits for email verification when the platform enforces it", async () => {
    mocks.session.mockResolvedValue(
      session({ emailVerified: false, mustVerifyNow: true })
    );
    const res = await call(handler, path);
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("EMAIL_VERIFICATION_REQUIRED");
  });
});

describe("GET plans/stats", () => {
  it("returns the figures in the usual envelope, for the caller's own plans", async () => {
    const res = await call(planStats, "plans/stats");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { total: 3 } });
    expect(mocks.getPlanStats).toHaveBeenCalledWith("user-1", {
      dateFrom: undefined,
      dateTo: undefined,
    });
  });

  it("counts within a survey plan date range, read the way the plans list reads it", async () => {
    await call(planStats, "plans/stats?dateFrom=2026-01-01&dateTo=2026-03-31");
    expect(mocks.getPlanStats).toHaveBeenCalledWith("user-1", {
      dateFrom: new Date("2026-01-01T00:00:00.000Z"),
      dateTo: new Date("2026-03-31T23:59:59.999Z"),
    });
  });

  it("never reads a plan on a bad range: a 400 naming the field", async () => {
    for (const query of [
      "dateFrom=not-a-date",
      "dateTo=2026-02-31",
      "dateFrom=2026-10-19&dateTo=2026-01-01",
    ]) {
      const res = await call(planStats, `plans/stats?${query}`);
      expect(res.status, query).toBe(400);
      expect((await res.json()).code).toBe("VALIDATION_ERROR");
    }
    expect(mocks.getPlanStats).not.toHaveBeenCalled();
  });

  it("takes the user from the session, never from the query", async () => {
    await call(planStats, "plans/stats?userId=someone-else");
    expect(mocks.getPlanStats.mock.calls[0][0]).toBe("user-1");
  });
});

describe("GET qr/wallet-summary", () => {
  it("returns the caller's wallet summary", async () => {
    const res = await call(walletSummary, "qr/wallet-summary");
    expect(await res.json()).toEqual({
      success: true,
      data: { currency: "NGN" },
    });
    expect(mocks.getWalletSummary).toHaveBeenCalledWith("user-1");
  });
});

describe("GET subscription/summary", () => {
  it("returns the caller's subscription summary", async () => {
    const res = await call(subscriptionSummary, "subscription/summary");
    expect(await res.json()).toEqual({
      success: true,
      data: { state: "NONE" },
    });
    expect(mocks.getSubscriptionSummary).toHaveBeenCalledWith("user-1");
  });
});

describe("GET profile/summary", () => {
  it("returns the caller's profile summary", async () => {
    const res = await call(profileSummary, "profile/summary");
    expect(await res.json()).toEqual({
      success: true,
      data: { firstName: "Ada" },
    });
    expect(mocks.getProfileSummary).toHaveBeenCalledWith("user-1");
  });

  it("answers 404 when the account is gone", async () => {
    mocks.getProfileSummary.mockRejectedValue(new NotFoundError("User"));
    expect((await call(profileSummary, "profile/summary")).status).toBe(404);
  });
});
