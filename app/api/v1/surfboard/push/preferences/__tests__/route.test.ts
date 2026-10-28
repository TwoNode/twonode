import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockSession = vi.hoisted(() => ({ getServerSession: vi.fn() }));
const mockPrefs = vi.hoisted(() => ({
  getPushPreferences: vi.fn(),
  updatePushPreferences: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => mockSession);
// The real change schema is kept: the route's checks use it.
vi.mock("@/lib/push/preferences", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/push/preferences")>()),
  ...mockPrefs,
}));

const { GET, PATCH } = await import(
  "@/app/api/v1/surfboard/push/preferences/route"
);

const URL = "http://localhost:3000/api/v1/surfboard/push/preferences";
const BEARER = { authorization: "Bearer access-token" };
const PREFS = {
  categories: {
    PLANS_NEED_YOU: true,
    PLAN_LODGED: true,
    PLAN_SHARED: false,
    SUBSCRIPTION: true,
    WITHDRAWALS: true,
  },
  quietHours: {
    enabled: true,
    start: "22:00",
    end: "07:00",
    timeZone: "Africa/Lagos",
  },
};

const request = (
  method: "GET" | "PATCH",
  body?: unknown,
  headers: Record<string, string> = BEARER
) =>
  new NextRequest(URL, {
    method,
    headers: {
      host: "localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const session = (over: Record<string, unknown> = {}) => ({
  sub: "u1",
  role: "USER",
  platform: "surfboard",
  emailVerified: true,
  mustVerifyNow: false,
  ...over,
});

const get = (headers?: Record<string, string>) =>
  GET(request("GET", undefined, headers), { params: Promise.resolve({}) });
const patch = (body: unknown, headers?: Record<string, string>) =>
  PATCH(request("PATCH", body, headers), { params: Promise.resolve({}) });

beforeEach(() => {
  vi.resetAllMocks();
  mockSession.getServerSession.mockResolvedValue(session());
  mockPrefs.getPushPreferences.mockResolvedValue(PREFS);
  mockPrefs.updatePushPreferences.mockResolvedValue(PREFS);
});

describe("GET /api/v1/surfboard/push/preferences", () => {
  it("answers the caller's own preferences", async () => {
    const res = await get();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: PREFS });
    expect(mockPrefs.getPushPreferences).toHaveBeenCalledWith("u1", "surfboard");
  });

  it("answers 401 with no session", async () => {
    mockSession.getServerSession.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
    expect(mockPrefs.getPushPreferences).not.toHaveBeenCalled();
  });

  it("answers 403 to a role that is not a surveyor's", async () => {
    mockSession.getServerSession.mockResolvedValue(session({ role: "ADMIN" }));
    expect((await get()).status).toBe(403);
    expect(mockPrefs.getPushPreferences).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/v1/surfboard/push/preferences", () => {
  it("changes what was sent for the caller and answers everything as it now stands", async () => {
    const res = await patch({ categories: { PLAN_SHARED: false } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: PREFS });
    expect(mockPrefs.updatePushPreferences).toHaveBeenCalledWith(
      "u1",
      "surfboard",
      { categories: { PLAN_SHARED: false } }
    );
  });

  it("takes the person from the session, never from the body", async () => {
    const res = await patch({ userId: "someone-else", categories: { PLAN_SHARED: false } });

    expect(res.status).toBe(400);
    expect(mockPrefs.updatePushPreferences).not.toHaveBeenCalled();
  });

  it.each([
    ["no body", undefined],
    ["an empty change", {}],
    ["a switch that does not exist", { categories: { NOPE: true } }],
    ["a time that is not HH:MM", { quietHours: { start: "7pm" } }],
    ["a time zone that does not exist", { quietHours: { timeZone: "Mars/Olympus" } }],
    ["a switch that is not a boolean", { categories: { PLAN_SHARED: "off" } }],
  ])("answers 400 and changes nothing for %s", async (_name, body) => {
    const res = await patch(body);

    expect(res.status).toBe(400);
    expect(mockPrefs.updatePushPreferences).not.toHaveBeenCalled();
  });

  it("answers 400 when the service refuses quiet hours that start and end together", async () => {
    const { ValidationError } = await import("@/lib/api/errors");
    mockPrefs.updatePushPreferences.mockRejectedValue(
      new ValidationError("Quiet hours must start and end at different times")
    );

    const res = await patch({ quietHours: { start: "07:00" } });

    expect(res.status).toBe(400);
  });

  it("answers 401 with no session", async () => {
    mockSession.getServerSession.mockResolvedValue(null);
    expect((await patch({ categories: { PLAN_SHARED: false } })).status).toBe(401);
    expect(mockPrefs.updatePushPreferences).not.toHaveBeenCalled();
  });

  it("answers 403 to a role that is not a surveyor's", async () => {
    mockSession.getServerSession.mockResolvedValue(session({ role: "ADMIN" }));
    expect((await patch({ categories: { PLAN_SHARED: false } })).status).toBe(403);
    expect(mockPrefs.updatePushPreferences).not.toHaveBeenCalled();
  });

  it("blocks a browser request that came from another site", async () => {
    const res = await patch(
      { categories: { PLAN_SHARED: false } },
      { origin: "https://evil.example" }
    );

    expect(res.status).toBe(403);
    expect(mockPrefs.updatePushPreferences).not.toHaveBeenCalled();
  });

  it("blocks a cookie request that names no origin at all", async () => {
    const res = await patch({ categories: { PLAN_SHARED: false } }, {});

    expect(res.status).toBe(403);
    expect(mockPrefs.updatePushPreferences).not.toHaveBeenCalled();
  });

  it("holds an unverified account at the gate", async () => {
    mockSession.getServerSession.mockResolvedValue(
      session({ emailVerified: false, mustVerifyNow: true })
    );

    const res = await patch({ categories: { PLAN_SHARED: false } });

    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("EMAIL_VERIFICATION_REQUIRED");
    expect(mockPrefs.updatePushPreferences).not.toHaveBeenCalled();
  });
});
