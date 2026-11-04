import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/**
 * withAuth meets the mobile version gate before it reads a session. The gate
 * and its rules are in mobileApp.test.ts; here the settings are real values
 * and only the order and the reach are pinned: an old app is told to update
 * whatever its session, and a website request never meets the gate.
 */

const mockSettings = vi.hoisted(() => ({
  DEFAULT_MOBILE_APP_SETTINGS: {
    minimumAndroidVersion: "",
    minimumIosVersion: "",
    androidStoreUrl: "",
    iosStoreUrl: "",
    signInEnabled: true,
  },
  getMobileAppSettings: vi.fn(),
}));
const mockSession = vi.hoisted(() => ({ getServerSession: vi.fn() }));

vi.mock("@/surfboard/services/settingsService", () => mockSettings);
vi.mock("@/lib/auth/session", () => mockSession);
vi.mock("@/lib/observability/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { withAuth } = await import("@/lib/api/withAuth");
const { resetMobileControlsCache } = await import("@/lib/api/mobileApp");
const { Platform } = await import("@/utils/platform");
const { logger } = await import("@/lib/observability/logger");

const handler = vi.fn(async () => NextResponse.json({ success: true }));
const route = withAuth(handler, { platform: Platform.SURFBOARD });

const request = (headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost:3000/api/v1/surfboard/me", { headers });

const session = {
  sub: "u1",
  role: "USER",
  platform: Platform.SURFBOARD,
  emailVerified: true,
  mustVerifyNow: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  resetMobileControlsCache();
  mockSession.getServerSession.mockResolvedValue(session);
  mockSettings.getMobileAppSettings.mockResolvedValue({
    ...mockSettings.DEFAULT_MOBILE_APP_SETTINGS,
    minimumAndroidVersion: "1.2.0",
    androidStoreUrl: "https://play.example/x",
  });
});

describe("withAuth and the mobile version gate", () => {
  it("answers 426 to an old app before it reads the session", async () => {
    const res = await route(
      request({
        authorization: "Bearer token",
        "x-app-platform": "android",
        "x-app-version": "1.1.0",
      })
    );

    expect(res.status).toBe(426);
    expect(await res.json()).toMatchObject({
      success: false,
      code: "APP_UPDATE_REQUIRED",
      details: {
        platform: "android",
        minimumVersion: "1.2.0",
        storeUrl: "https://play.example/x",
      },
    });
    expect(mockSession.getServerSession).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it("answers 426 to an old app that has no session at all, not 401", async () => {
    mockSession.getServerSession.mockResolvedValue(null);

    const res = await route(
      request({ "x-app-platform": "android", "x-app-version": "1.1.0" })
    );

    expect(res.status).toBe(426);
  });

  it("lets an up-to-date app through to its session and the handler", async () => {
    const res = await route(
      request({
        authorization: "Bearer token",
        "x-app-platform": "android",
        "x-app-version": "1.2.0",
      })
    );

    expect(res.status).toBe(200);
    expect(mockSession.getServerSession).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("never asks a website request (no bearer, no X-App-Platform) for a version", async () => {
    const res = await route(request({ cookie: "session=1" }));

    expect(res.status).toBe(200);
    expect(mockSettings.getMobileAppSettings).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("still answers 401 to an up-to-date app with no session", async () => {
    mockSession.getServerSession.mockResolvedValue(null);

    const res = await route(
      request({ "x-app-platform": "android", "x-app-version": "1.2.0" })
    );

    expect(res.status).toBe(401);
  });

  it("lets everything through while no minimum is set", async () => {
    mockSettings.getMobileAppSettings.mockResolvedValue(
      mockSettings.DEFAULT_MOBILE_APP_SETTINGS
    );

    const res = await route(
      request({
        authorization: "Bearer token",
        "x-app-platform": "android",
        "x-app-version": "0.0.1",
      })
    );

    expect(res.status).toBe(200);
  });
});

describe("withAuth log tags (TASK-0015 1J.1)", () => {
  it("tags a refused mobile request with the app's store and version", async () => {
    mockSession.getServerSession.mockResolvedValue(null);
    await route(
      request({
        authorization: "Bearer token",
        "x-app-platform": "android",
        "x-app-version": "1.2.3",
      })
    );

    expect(logger.warn).toHaveBeenCalledWith(
      "Not signed in",
      expect.objectContaining({
        code: "UNAUTHENTICATED",
        status: 401,
        appPlatform: "android",
        appVersion: "1.2.3",
      })
    );
  });

  it("adds nothing for a website request", async () => {
    mockSession.getServerSession.mockResolvedValue(null);
    await route(request());

    const context = vi.mocked(logger.warn).mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(context).not.toHaveProperty("appVersion");
    expect(context).not.toHaveProperty("appPlatform");
  });
});
