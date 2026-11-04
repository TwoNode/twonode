import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
const mockLogger = vi.hoisted(() => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/surfboard/services/settingsService", () => mockSettings);
vi.mock("@/lib/observability/logger", () => mockLogger);

const {
  MOBILE_CONTROLS_TTL_MS,
  assertMobileClientAllowed,
  assertMobileSignInEnabled,
  compareAppVersions,
  getMobileControls,
  isMobileRequest,
  parseAppVersion,
  resetMobileControlsCache,
} = await import("@/lib/api/mobileApp");
const { AppUpdateRequiredError, MobileSignInDisabledError } =
  await import("@/lib/api/errors");

const defaults = mockSettings.DEFAULT_MOBILE_APP_SETTINGS;
const settings = (over: Record<string, unknown> = {}) => ({
  ...defaults,
  ...over,
});
const req = (headers: Record<string, string> = {}) => ({
  headers: new Headers(headers),
});

/** The thrown error, so a test can look at its status, code and details. */
async function refusal(request: ReturnType<typeof req>) {
  try {
    await assertMobileClientAllowed(request);
  } catch (err) {
    return err as InstanceType<typeof AppUpdateRequiredError>;
  }
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetMobileControlsCache();
  mockSettings.getMobileAppSettings.mockResolvedValue(settings());
});

afterEach(() => {
  vi.useRealTimers();
});

describe("parseAppVersion", () => {
  it.each([
    ["1.2.3", [1, 2, 3]],
    ["1.2", [1, 2, 0]],
    ["1", [1, 0, 0]],
    ["0.1.0", [0, 1, 0]],
    [" 1.2.3 ", [1, 2, 3]],
    ["10.20.30", [10, 20, 30]],
  ])("reads %j", (raw, expected) => {
    expect(parseAppVersion(raw)).toEqual(expected);
  });

  it.each([
    "",
    null,
    undefined,
    "abc",
    "v1.2.3",
    "1.2.3-beta",
    "1.2.3.4",
    "1..2",
    ".1",
    "-1",
    "1.2.x",
    "1234567",
  ])("refuses %j", (raw) => {
    expect(parseAppVersion(raw)).toBeNull();
  });
});

describe("compareAppVersions", () => {
  it("orders by number, not by text", () => {
    expect(compareAppVersions([1, 10, 0], [1, 9, 0])).toBeGreaterThan(0);
    expect(compareAppVersions([1, 9, 9], [1, 10, 0])).toBeLessThan(0);
    expect(compareAppVersions([2, 0, 0], [1, 99, 99])).toBeGreaterThan(0);
  });

  it("calls the same version equal", () => {
    expect(compareAppVersions([1, 2, 3], [1, 2, 3])).toBe(0);
    expect(compareAppVersions([1, 2], [1, 2, 0])).toBe(0);
  });
});

describe("isMobileRequest", () => {
  it("is true for a bearer token or an X-App-Platform header", () => {
    expect(isMobileRequest(req({ authorization: "Bearer abc" }))).toBe(true);
    expect(isMobileRequest(req({ "x-app-platform": "android" }))).toBe(true);
  });

  it("is false for a website request", () => {
    expect(isMobileRequest(req())).toBe(false);
    expect(isMobileRequest(req({ cookie: "session=1" }))).toBe(false);
    expect(isMobileRequest(req({ authorization: "Basic abc" }))).toBe(false);
  });
});

describe("assertMobileClientAllowed", () => {
  it("refuses nothing while no minimum is set, whatever the request says", async () => {
    expect(await refusal(req())).toBeNull();
    expect(
      await refusal(
        req({ "x-app-platform": "android", "x-app-version": "0.0.1" })
      )
    ).toBeNull();
  });

  describe("with an Android minimum of 1.2.0", () => {
    beforeEach(() => {
      mockSettings.getMobileAppSettings.mockResolvedValue(
        settings({
          minimumAndroidVersion: "1.2.0",
          androidStoreUrl: "https://play.google.com/store/apps/details?id=x",
          iosStoreUrl: "https://apps.apple.com/app/x",
        })
      );
    });

    const android = (version?: string) =>
      req({
        "x-app-platform": "android",
        ...(version === undefined ? {} : { "x-app-version": version }),
      });

    it("answers 426 APP_UPDATE_REQUIRED, with where to update, to an older app", async () => {
      const err = await refusal(android("1.1.9"));

      expect(err).toBeInstanceOf(AppUpdateRequiredError);
      expect(err).toMatchObject({
        status: 426,
        code: "APP_UPDATE_REQUIRED",
        details: {
          platform: "android",
          minimumVersion: "1.2.0",
          storeUrl: "https://play.google.com/store/apps/details?id=x",
        },
      });
    });

    it("lets the minimum itself and anything newer through", async () => {
      expect(await refusal(android("1.2.0"))).toBeNull();
      expect(await refusal(android("1.2.1"))).toBeNull();
      expect(await refusal(android("1.10.0"))).toBeNull();
      expect(await refusal(android("2"))).toBeNull();
    });

    it("compares numbers, so 1.9.0 is older than 1.10.0", async () => {
      mockSettings.getMobileAppSettings.mockResolvedValue(
        settings({ minimumAndroidVersion: "1.10.0" })
      );
      resetMobileControlsCache();
      expect(await refusal(android("1.9.0"))).toBeInstanceOf(
        AppUpdateRequiredError
      );
    });

    it("refuses a request whose version is missing or unreadable", async () => {
      for (const version of [undefined, "", "banana", "1.2.3-beta"]) {
        expect(await refusal(android(version))).toBeInstanceOf(
          AppUpdateRequiredError
        );
      }
    });

    it("refuses a request that does not say which store it came from", async () => {
      const err = await refusal(req({ "x-app-version": "9.9.9" }));
      expect(err).toMatchObject({
        status: 426,
        details: { platform: null, minimumVersion: "1.2.0", storeUrl: "" },
      });

      expect(
        await refusal(
          req({ "x-app-platform": "windows", "x-app-version": "9.9.9" })
        )
      ).toBeInstanceOf(AppUpdateRequiredError);
    });

    it("reads the store case-insensitively", async () => {
      expect(
        await refusal(
          req({ "x-app-platform": " Android ", "x-app-version": "1.2.0" })
        )
      ).toBeNull();
    });

    it("does not hold back a store that has no minimum of its own", async () => {
      expect(
        await refusal(
          req({ "x-app-platform": "ios", "x-app-version": "0.0.1" })
        )
      ).toBeNull();
    });
  });

  it("holds each store to its own minimum and sends it to its own store", async () => {
    mockSettings.getMobileAppSettings.mockResolvedValue(
      settings({
        minimumAndroidVersion: "1.0.0",
        minimumIosVersion: "2.0.0",
        androidStoreUrl: "https://play.example/x",
        iosStoreUrl: "https://apps.example/x",
      })
    );

    expect(
      await refusal(
        req({ "x-app-platform": "android", "x-app-version": "1.0.0" })
      )
    ).toBeNull();
    expect(
      await refusal(req({ "x-app-platform": "ios", "x-app-version": "1.5.0" }))
    ).toMatchObject({
      status: 426,
      details: {
        platform: "ios",
        minimumVersion: "2.0.0",
        storeUrl: "https://apps.example/x",
      },
    });
  });

  it("ignores a minimum that is not a version, and says so once", async () => {
    mockSettings.getMobileAppSettings.mockResolvedValue(
      settings({ minimumAndroidVersion: "latest" })
    );
    const old = req({ "x-app-platform": "android", "x-app-version": "0.0.1" });

    expect(await refusal(old)).toBeNull();
    expect(await refusal(old)).toBeNull();
    expect(mockLogger.logger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("not a version"),
      { store: "android", minimumVersion: "latest" }
    );
  });

  it("still enforces the other store's valid minimum beside a bad one", async () => {
    mockSettings.getMobileAppSettings.mockResolvedValue(
      settings({ minimumAndroidVersion: "latest", minimumIosVersion: "2.0.0" })
    );

    expect(
      await refusal(
        req({ "x-app-platform": "android", "x-app-version": "0.0.1" })
      )
    ).toBeNull();
    expect(
      await refusal(req({ "x-app-platform": "ios", "x-app-version": "1.0.0" }))
    ).toBeInstanceOf(AppUpdateRequiredError);
  });
});

describe("assertMobileSignInEnabled", () => {
  it("passes while the switch is on", async () => {
    await expect(assertMobileSignInEnabled()).resolves.toBeUndefined();
  });

  it("answers 503 MOBILE_SIGN_IN_DISABLED while the switch is off", async () => {
    mockSettings.getMobileAppSettings.mockResolvedValue(
      settings({ signInEnabled: false })
    );

    await expect(assertMobileSignInEnabled()).rejects.toBeInstanceOf(
      MobileSignInDisabledError
    );
    await expect(assertMobileSignInEnabled()).rejects.toMatchObject({
      status: 503,
      code: "MOBILE_SIGN_IN_DISABLED",
    });
  });
});

describe("getMobileControls", () => {
  it("asks the database at most once a minute", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-25T10:00:00Z"));

    await getMobileControls();
    await getMobileControls();
    vi.advanceTimersByTime(MOBILE_CONTROLS_TTL_MS - 1);
    await getMobileControls();
    expect(mockSettings.getMobileAppSettings).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    await getMobileControls();
    expect(mockSettings.getMobileAppSettings).toHaveBeenCalledTimes(2);
  });

  it("reads again after a reset, so a change takes effect at once", async () => {
    await getMobileControls();
    mockSettings.getMobileAppSettings.mockResolvedValue(
      settings({ minimumAndroidVersion: "3.0.0" })
    );
    expect((await getMobileControls()).minimumAndroidVersion).toBe("");

    resetMobileControlsCache();
    expect((await getMobileControls()).minimumAndroidVersion).toBe("3.0.0");
  });

  it("fails open: when the settings cannot be read nothing is refused", async () => {
    mockSettings.getMobileAppSettings.mockRejectedValue(new Error("db down"));

    expect(await getMobileControls()).toEqual(defaults);
    expect(
      await refusal(
        req({ "x-app-platform": "android", "x-app-version": "0.0.1" })
      )
    ).toBeNull();
    await expect(assertMobileSignInEnabled()).resolves.toBeUndefined();
    expect(mockLogger.logger.error).toHaveBeenCalled();
  });

  it("does not remember a failed read: the next call tries again", async () => {
    mockSettings.getMobileAppSettings
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce(settings({ minimumAndroidVersion: "2.0.0" }));

    expect((await getMobileControls()).minimumAndroidVersion).toBe("");
    expect((await getMobileControls()).minimumAndroidVersion).toBe("2.0.0");
  });

  it("does not keep a stale minimum when a refresh fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-25T10:00:00Z"));
    mockSettings.getMobileAppSettings.mockResolvedValueOnce(
      settings({ minimumAndroidVersion: "2.0.0" })
    );
    await getMobileControls();

    vi.advanceTimersByTime(MOBILE_CONTROLS_TTL_MS);
    mockSettings.getMobileAppSettings.mockRejectedValueOnce(
      new Error("db down")
    );
    expect(await getMobileControls()).toEqual(defaults);
  });
});
