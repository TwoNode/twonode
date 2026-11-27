import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  limit: vi.fn(),
  store: vi.fn(),
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
vi.mock("@/lib/auth/rateLimit", () => ({ consumeRateLimit: mocks.limit }));
// The real schema and switch are kept; only the database write is replaced.
vi.mock("@/lib/diagnostics/appReports", async (original) => ({
  ...(await original<typeof import("@/lib/diagnostics/appReports")>()),
  storeAppReport: mocks.store,
}));

const { POST } =
  await import("@/app/api/v1/surfboard/diagnostics/reports/route");

const user = (over: Record<string, unknown> = {}) => ({
  sub: "account-7",
  role: "USER",
  platform: "surfboard",
  emailVerified: true,
  mustVerifyNow: false,
  ...over,
});
const report = (over: Record<string, unknown> = {}) => ({
  v: 1,
  kind: "unexpected-close",
  appVersion: "1.0.0",
  platform: "ios",
  screen: "Home",
  at: "2026-11-26T13:51:54.000Z",
  trail: ["13:51:54.100 map tap, zoom 18"],
  ...over,
});
const headers = {
  authorization: "Bearer test-token",
  "content-type": "application/json",
};
const post = (body: unknown, extra: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/v1/surfboard/diagnostics/reports", {
    method: "POST",
    headers: { ...headers, ...extra },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_REPORTS_ENABLED", "1");
  mocks.session.mockResolvedValue(user());
  mocks.limit.mockResolvedValue(true);
  mocks.store.mockResolvedValue(undefined);
});

describe("POST /api/v1/surfboard/diagnostics/reports", () => {
  it("stores a valid report and answers {} (nothing echoed)", async () => {
    const res = await POST(post(report()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: {} });
    expect(mocks.store).toHaveBeenCalledTimes(1);
  });

  it("never hands the account to the store: it sees only the report", async () => {
    await POST(post(report()));
    const [stored, ...rest] = mocks.store.mock.calls[0];
    expect(rest).toEqual([]);
    expect(JSON.stringify(stored)).not.toContain("account-7");
    expect(Object.keys(stored)).not.toContain("userId");
  });

  it("is off (404 NOT_FOUND) unless APP_REPORTS_ENABLED is 1, and stores and counts nothing", async () => {
    vi.stubEnv("APP_REPORTS_ENABLED", "");
    const res = await POST(post(report()));
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("NOT_FOUND");
    expect(mocks.store).not.toHaveBeenCalled();
    expect(mocks.limit).not.toHaveBeenCalled();
  });

  it("needs a signed-in account (401)", async () => {
    mocks.session.mockResolvedValue(null);
    const res = await POST(post(report()));
    expect(res.status).toBe(401);
    expect(mocks.store).not.toHaveBeenCalled();
  });

  it("lets an account that has not verified its email post (a crash on that screen is worth knowing)", async () => {
    mocks.session.mockResolvedValue(
      user({ emailVerified: false, mustVerifyNow: true })
    );
    expect((await POST(post(report()))).status).toBe(200);
  });

  it("blocks a cross-origin browser request with no bearer token (403)", async () => {
    const res = await POST(
      post(report(), {
        authorization: "",
        origin: "https://evil.example",
        host: "localhost",
      })
    );
    expect(res.status).toBe(403);
    expect(mocks.store).not.toHaveBeenCalled();
  });

  describe("the body", () => {
    it("is a 400 when it is not JSON, is empty, or is not an object", async () => {
      for (const body of ["not json", "", "[]", "null", '"x"']) {
        const res = await POST(post(body));
        expect(res.status, body).toBe(400);
        expect((await res.json()).code).toBe("VALIDATION_ERROR");
      }
      expect(mocks.store).not.toHaveBeenCalled();
    });

    it("is a 400 for an unknown key", async () => {
      const res = await POST(post(report({ userId: "u1" })));
      expect(res.status).toBe(400);
      expect(mocks.store).not.toHaveBeenCalled();
    });

    it("is a 400 for a field over its limit", async () => {
      const long = [
        { screen: "x".repeat(61) },
        { trail: Array.from({ length: 25 }, () => "a") },
        { trail: ["x".repeat(91)] },
        { kind: "crash" },
        { platform: "windows" },
      ];
      for (const over of long)
        expect((await POST(post(report(over)))).status).toBe(400);
    });

    it("is a 413 when the declared size is over 8 KB, before anything is read or counted", async () => {
      const res = await POST(post(report(), { "content-length": "9000" }));
      expect(res.status).toBe(413);
      expect((await res.json()).code).toBe("PAYLOAD_TOO_LARGE");
      expect(mocks.limit).not.toHaveBeenCalled();
      expect(mocks.store).not.toHaveBeenCalled();
    });

    it("is a 413 when what is actually sent is over 8 KB, whatever it declared", async () => {
      const big = report({ trail: [], padding: "x".repeat(9000) });
      const res = await POST(post(big, { "content-length": "100" }));
      expect(res.status).toBe(413);
      expect(mocks.store).not.toHaveBeenCalled();
    });

    it("counts bytes, not characters", async () => {
      // 3000 three-byte characters are 9000 bytes: over the cap although only 3000 long.
      const res = await POST(post(`{"v":1,"x":"${"€".repeat(3000)}"}`));
      expect(res.status).toBe(413);
    });
  });

  describe("the rate limit", () => {
    it("counts every post against the account: 10 an hour, key app-report:<account>", async () => {
      await POST(post(report()));
      expect(mocks.limit).toHaveBeenCalledWith(
        "app-report:account-7",
        "account-7",
        {
          max: 10,
          windowMs: 3_600_000,
        }
      );
    });

    it("is a 429 RATE_LIMITED past the allowance, and stores nothing", async () => {
      mocks.limit.mockResolvedValue(false);
      const res = await POST(post(report()));
      expect(res.status).toBe(429);
      expect((await res.json()).code).toBe("RATE_LIMITED");
      expect(mocks.store).not.toHaveBeenCalled();
    });

    it("the 11th report in an hour is refused and the first 10 are not", async () => {
      let used = 0;
      mocks.limit.mockImplementation(async () => ++used <= 10);
      const statuses: number[] = [];
      for (let i = 0; i < 11; i++)
        statuses.push((await POST(post(report()))).status);
      expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
      expect(statuses[10]).toBe(429);
      expect(mocks.store).toHaveBeenCalledTimes(10);
    });
  });
});
