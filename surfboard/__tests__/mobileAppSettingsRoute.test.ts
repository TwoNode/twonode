import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * GET and PATCH /api/v1/surfboard/settings/mobile-app. The session and role
 * checks of withAuth are replaced by a pass-through that records the access
 * options, so the tests pin who is let in and what a PATCH may carry.
 */

const mockService = vi.hoisted(() => ({
  getMobileAppSettings: vi.fn(),
  updateMobileAppSettings: vi.fn(),
}));
const mockGate = vi.hoisted(() => ({ resetMobileControlsCache: vi.fn() }));
const mockCsrf = vi.hoisted(() => ({ validateCSRF: vi.fn() }));
const withAuthOpts = vi.hoisted(
  () => [] as Array<{ platform: string; roles: string[] }>
);

vi.mock("@/surfboard/services/settingsService", () => mockService);
vi.mock("@/lib/auth/csrf", () => mockCsrf);
vi.mock("@/lib/api/mobileApp", async () => ({
  resetMobileControlsCache: mockGate.resetMobileControlsCache,
  // The real parser: the route must accept exactly what the gate can compare.
  parseAppVersion: (
    await vi.importActual<typeof import("@/lib/api/mobileApp")>(
      "@/lib/api/mobileApp"
    )
  ).parseAppVersion,
}));
vi.mock("@/lib/api/withAuth", () => ({
  withAuth: (
    handler: (req: NextRequest, ctx: unknown) => Promise<Response>,
    opts: { platform: string; roles: string[] }
  ) => {
    withAuthOpts.push(opts);
    return async (req: NextRequest) => {
      const { handleApiError } = await import("@/lib/api/errors");
      try {
        return await handler(req, { session: { sub: "admin-1" } });
      } catch (err) {
        return handleApiError(err);
      }
    };
  },
}));

const { GET, PATCH } =
  await import("@/app/api/v1/surfboard/settings/mobile-app/route");
const { Platform, SurfboardRole } = await import("@/utils/platform");

const stored = {
  minimumAndroidVersion: "1.2.0",
  minimumIosVersion: "",
  androidStoreUrl: "https://play.example/x",
  iosStoreUrl: "",
  signInEnabled: true,
};

const patch = (body: unknown) =>
  new NextRequest(
    "http://localhost:3000/api/v1/surfboard/settings/mobile-app",
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockCsrf.validateCSRF.mockReturnValue(true);
  mockService.getMobileAppSettings.mockResolvedValue(stored);
  mockService.updateMobileAppSettings.mockResolvedValue(stored);
});

describe("access", () => {
  it("lets only a Surfboard ADMIN or SUPERADMIN in, on both methods", () => {
    expect(withAuthOpts).toEqual([
      {
        platform: Platform.SURFBOARD,
        roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN],
      },
      {
        platform: Platform.SURFBOARD,
        roles: [SurfboardRole.ADMIN, SurfboardRole.SUPERADMIN],
      },
    ]);
  });
});

describe("GET", () => {
  it("returns the stored controls", async () => {
    const res = await GET(
      new NextRequest(
        "http://localhost:3000/api/v1/surfboard/settings/mobile-app"
      )
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: stored });
  });
});

describe("PATCH", () => {
  it("saves the keys sent, as the signed-in admin, and forgets the cached copy", async () => {
    const res = await PATCH(
      patch({
        minimumAndroidVersion: "1.3.0",
        androidStoreUrl: "https://play.google.com/store/apps/details?id=x",
        signInEnabled: false,
      })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: stored });
    expect(mockService.updateMobileAppSettings).toHaveBeenCalledWith(
      "admin-1",
      {
        minimumAndroidVersion: "1.3.0",
        androidStoreUrl: "https://play.google.com/store/apps/details?id=x",
        signInEnabled: false,
      }
    );
    expect(mockGate.resetMobileControlsCache).toHaveBeenCalledTimes(1);
  });

  it("accepts an empty string to clear a minimum or a store address", async () => {
    const res = await PATCH(patch({ minimumIosVersion: "", iosStoreUrl: "" }));

    expect(res.status).toBe(200);
    expect(mockService.updateMobileAppSettings).toHaveBeenCalledWith(
      "admin-1",
      { minimumIosVersion: "", iosStoreUrl: "" }
    );
  });

  it("trims what it is given", async () => {
    await PATCH(patch({ minimumAndroidVersion: " 1.2.0 " }));

    expect(mockService.updateMobileAppSettings).toHaveBeenCalledWith(
      "admin-1",
      { minimumAndroidVersion: "1.2.0" }
    );
  });

  it.each([
    ["an empty body", {}],
    ["no body", ""],
    ["a body that is not JSON", "{nope"],
    ["a key it does not know", { minimumAndroidVersion: "1.0.0", extra: 1 }],
    ["a version that is not a version", { minimumAndroidVersion: "latest" }],
    ["a version with a suffix", { minimumIosVersion: "1.2.3-beta" }],
    ["a version with four parts", { minimumIosVersion: "1.2.3.4" }],
    ["a number for a version", { minimumAndroidVersion: 2 }],
    ["an http store address", { androidStoreUrl: "http://play.example/x" }],
    ["a custom-scheme store address", { iosStoreUrl: "itms-apps://x" }],
    ["a javascript: address", { iosStoreUrl: "javascript:alert(1)" }],
    ["text for a store address", { androidStoreUrl: "play store" }],
    [
      "a very long store address",
      { iosStoreUrl: "https://x.example/" + "a".repeat(2100) },
    ],
    ["a string for the switch", { signInEnabled: "false" }],
  ])("refuses %s with a 400 and saves nothing", async (_name, body) => {
    const res = await PATCH(patch(body));

    expect(res.status).toBe(400);
    expect(mockService.updateMobileAppSettings).not.toHaveBeenCalled();
    expect(mockGate.resetMobileControlsCache).not.toHaveBeenCalled();
  });

  it("refuses a cross-origin request before reading the body", async () => {
    mockCsrf.validateCSRF.mockReturnValue(false);

    const res = await PATCH(patch({ signInEnabled: false }));

    expect(res.status).toBe(403);
    expect(mockService.updateMobileAppSettings).not.toHaveBeenCalled();
  });
});
