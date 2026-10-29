import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRate = vi.hoisted(() => ({ consumeRateLimit: vi.fn() }));
const mockLookup = vi.hoisted(() => ({ findUserByEmail: vi.fn() }));
const mockSession = vi.hoisted(() => ({
  MOBILE_ALLOWED_ROLES: ["USER"],
  issueMobileSession: vi.fn(),
  rotateMobileRefreshToken: vi.fn(),
}));
const mockDevices = vi.hoisted(() => ({
  revokeFamilyByRefreshToken: vi.fn(),
  listDeviceSessions: vi.fn(),
  revokeDeviceSession: vi.fn(),
}));
const mockBcrypt = vi.hoisted(() => ({ compare: vi.fn() }));
const mockGate = vi.hoisted(() => ({
  assertMobileClientAllowed: vi.fn(),
  assertMobileSignInEnabled: vi.fn(),
}));

vi.mock("@/lib/auth/rateLimit", () => mockRate);
vi.mock("@/lib/auth/userLookup", () => mockLookup);
vi.mock("@/lib/auth/session", () => mockSession);
vi.mock("@/lib/auth/deviceSessions", () => mockDevices);
vi.mock("bcryptjs", () => ({ default: mockBcrypt }));
vi.mock("@/lib/api/mobileApp", () => mockGate);

const { POST: login } = await import("@/app/api/v1/auth/mobile/login/route");
const { POST: refresh } =
  await import("@/app/api/v1/auth/mobile/refresh/route");
const { POST: logout } = await import("@/app/api/v1/auth/mobile/logout/route");
const { AppUpdateRequiredError, MobileSignInDisabledError } =
  await import("@/lib/api/errors");

const post = (path: string, body: unknown) =>
  new NextRequest(`http://localhost:3000/api/v1/auth/mobile/${path}`, {
    method: "POST",
    // No Origin or Referer, as a native app sends: no CSRF check applies.
    headers: { host: "localhost:3000", "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const loginBody = (over: Record<string, unknown> = {}) => ({
  platform: "surfboard",
  email: "Surveyor@Example.com",
  password: "secret",
  deviceId: "device-123456",
  deviceLabel: "Pixel 8",
  appVersion: "1.0.0",
  ...over,
});
const user = {
  id: "u1",
  email: "surveyor@example.com",
  firstName: "Ada",
  lastName: "Obi",
  passwordHash: "hash",
  role: "USER",
  isActive: true,
  emailVerified: true,
  createdAt: new Date(),
};
const pair = {
  accessToken: "access",
  refreshToken: "refresh-raw",
  accessExpiresIn: 900,
  refreshExpiresAt: new Date("2026-12-01T00:00:00Z"),
  emailVerified: true,
  mustVerifyNow: false,
};

describe("POST /api/v1/auth/mobile/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGate.assertMobileClientAllowed.mockResolvedValue(undefined);
    mockGate.assertMobileSignInEnabled.mockResolvedValue(undefined);
    mockRate.consumeRateLimit.mockResolvedValue(true);
    mockLookup.findUserByEmail.mockResolvedValue(user);
    mockBcrypt.compare.mockResolvedValue(true);
    mockSession.issueMobileSession.mockResolvedValue(pair);
  });

  it("returns the session in the body and sets no cookies", async () => {
    const res = await login(post("login", loginBody()));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(json.data).toMatchObject({
      accessToken: "access",
      refreshToken: "refresh-raw",
      accessExpiresIn: 900,
      refreshExpiresAt: "2026-12-01T00:00:00.000Z",
      user: {
        id: "u1",
        email: "surveyor@example.com",
        role: "user",
        emailVerified: true,
        mustVerifyNow: false,
      },
    });
    // Never echoes the password hash.
    expect(JSON.stringify(json)).not.toContain("hash");
  });

  it("tags the session with the device", async () => {
    await login(post("login", loginBody()));
    expect(mockSession.issueMobileSession).toHaveBeenCalledWith(
      "u1",
      "USER",
      "surfboard",
      {
        deviceId: "device-123456",
        deviceLabel: "Pixel 8",
        appVersion: "1.0.0",
      },
      expect.objectContaining({ emailVerified: true })
    );
  });

  it("a wrong password is a 401 with no session", async () => {
    mockBcrypt.compare.mockResolvedValue(false);
    const res = await login(post("login", loginBody()));
    expect(res.status).toBe(401);
    expect(mockSession.issueMobileSession).not.toHaveBeenCalled();
  });

  it("an unknown email and a Kinde-only account fail exactly like a wrong password", async () => {
    mockLookup.findUserByEmail.mockResolvedValueOnce(null);
    const unknown = await login(post("login", loginBody()));
    mockLookup.findUserByEmail.mockResolvedValueOnce({
      ...user,
      passwordHash: null,
    });
    const kindeOnly = await login(post("login", loginBody()));
    mockBcrypt.compare.mockResolvedValue(false);
    const wrong = await login(post("login", loginBody()));

    for (const res of [unknown, kindeOnly, wrong]) {
      expect(res.status).toBe(401);
    }
    expect(await unknown.json()).toEqual(await wrong.json());
    expect(await kindeOnly.json()).toEqual(
      await login(post("login", loginBody())).then((r) => r.json())
    );
  });

  it.each(["ADMIN", "SUPERADMIN", "ACCOUNTS", "MDA_SUPERADMIN"])(
    "a %s account is refused on mobile with no session (staff stay on the web)",
    async (role) => {
      mockLookup.findUserByEmail.mockResolvedValue({ ...user, role });
      const res = await login(post("login", loginBody()));
      expect(res.status).toBe(403);
      expect((await res.json()).code).toBe("ACCOUNT_TYPE_NOT_SUPPORTED");
      expect(mockSession.issueMobileSession).not.toHaveBeenCalled();
    }
  );

  it("an inactive account is a 403 with no session", async () => {
    mockLookup.findUserByEmail.mockResolvedValue({ ...user, isActive: false });
    const res = await login(post("login", loginBody()));
    expect(res.status).toBe(403);
    expect(mockSession.issueMobileSession).not.toHaveBeenCalled();
  });

  it("rate limits per email and per device — never per IP — and checks the password only when allowed", async () => {
    await login(post("login", loginBody()));
    const keys = mockRate.consumeRateLimit.mock.calls.map((c) => c[0]);
    expect(keys).toEqual([
      "mobile-login:surveyor@example.com:device-123456",
      "mobile-login-email:surveyor@example.com",
    ]);

    mockRate.consumeRateLimit.mockResolvedValue(false);
    mockBcrypt.compare.mockClear();
    const res = await login(post("login", loginBody()));
    expect(res.status).toBe(429);
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
  });

  it("a fresh device id does not reset the per-email limit", async () => {
    mockRate.consumeRateLimit
      .mockResolvedValueOnce(true) // new device: under its own limit
      .mockResolvedValueOnce(false); // but the email is over its limit
    const res = await login(
      post("login", loginBody({ deviceId: "brand-new-device" }))
    );
    expect(res.status).toBe(429);
  });

  it("answers 426 to an app that is too old before anything else is looked at", async () => {
    mockGate.assertMobileClientAllowed.mockRejectedValue(
      new AppUpdateRequiredError({
        platform: "android",
        minimumVersion: "1.2.0",
        storeUrl: "https://play.example/x",
      })
    );
    const res = await login(post("login", loginBody()));

    expect(res.status).toBe(426);
    expect(await res.json()).toMatchObject({
      code: "APP_UPDATE_REQUIRED",
      details: { minimumVersion: "1.2.0" },
    });
    expect(mockRate.consumeRateLimit).not.toHaveBeenCalled();
    expect(mockLookup.findUserByEmail).not.toHaveBeenCalled();
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
    expect(mockSession.issueMobileSession).not.toHaveBeenCalled();
  });

  it("answers 503 while the emergency switch is off, with no password check and no session", async () => {
    mockGate.assertMobileSignInEnabled.mockRejectedValue(
      new MobileSignInDisabledError()
    );
    const res = await login(post("login", loginBody()));

    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("MOBILE_SIGN_IN_DISABLED");
    expect(mockRate.consumeRateLimit).not.toHaveBeenCalled();
    expect(mockLookup.findUserByEmail).not.toHaveBeenCalled();
    expect(mockSession.issueMobileSession).not.toHaveBeenCalled();
  });

  it("rejects other platforms and malformed bodies", async () => {
    expect(
      (await login(post("login", loginBody({ platform: "reva" })))).status
    ).toBe(400);
    expect(
      (await login(post("login", loginBody({ deviceId: "x" })))).status
    ).toBe(400);
    expect(
      (await login(post("login", loginBody({ email: "nope" })))).status
    ).toBe(400);
  });
});

describe("POST /api/v1/auth/mobile/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGate.assertMobileClientAllowed.mockResolvedValue(undefined);
    mockRate.consumeRateLimit.mockResolvedValue(true);
  });
  const body = { platform: "surfboard", refreshToken: "a".repeat(64) };

  it("returns the rotated pair and sets no cookies", async () => {
    mockSession.rotateMobileRefreshToken.mockResolvedValue({
      ok: true,
      session: pair,
    });
    const res = await refresh(post("refresh", body));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect((await res.json()).data).toMatchObject({
      accessToken: "access",
      refreshToken: "refresh-raw",
    });
  });

  it.each([
    ["invalid", 401, "SESSION_INVALID"],
    ["inactive", 403, "ACCOUNT_INACTIVE"],
    ["conflict", 409, "REFRESH_CONFLICT"],
    ["role", 403, "ACCOUNT_TYPE_NOT_SUPPORTED"],
  ])("%s -> %i %s", async (reason, status, code) => {
    mockSession.rotateMobileRefreshToken.mockResolvedValue({
      ok: false,
      reason,
    });
    const res = await refresh(post("refresh", body));
    expect(res.status).toBe(status);
    expect((await res.json()).code).toBe(code);
  });

  it("answers 426 to an app that is too old and does not touch the token", async () => {
    mockGate.assertMobileClientAllowed.mockRejectedValue(
      new AppUpdateRequiredError({
        platform: "android",
        minimumVersion: "1.2.0",
        storeUrl: "",
      })
    );
    const res = await refresh(post("refresh", body));

    expect(res.status).toBe(426);
    expect((await res.json()).code).toBe("APP_UPDATE_REQUIRED");
    expect(mockRate.consumeRateLimit).not.toHaveBeenCalled();
    expect(mockSession.rotateMobileRefreshToken).not.toHaveBeenCalled();
  });

  it("is not stopped by the emergency switch: an open session carries on", async () => {
    mockGate.assertMobileSignInEnabled.mockRejectedValue(
      new MobileSignInDisabledError()
    );
    mockSession.rotateMobileRefreshToken.mockResolvedValue({
      ok: true,
      session: pair,
    });
    const res = await refresh(post("refresh", body));

    expect(res.status).toBe(200);
    expect(mockGate.assertMobileSignInEnabled).not.toHaveBeenCalled();
  });

  it("is rate limited by the token, not the IP address", async () => {
    mockSession.rotateMobileRefreshToken.mockResolvedValue({
      ok: true,
      session: pair,
    });
    await refresh(post("refresh", body));
    const key = mockRate.consumeRateLimit.mock.calls[0][0] as string;
    expect(key).toMatch(/^mobile-refresh:[0-9a-f]{16}$/);
    expect(key).not.toContain(body.refreshToken);

    mockRate.consumeRateLimit.mockResolvedValue(false);
    const res = await refresh(post("refresh", body));
    expect(res.status).toBe(429);
  });
});

describe("POST /api/v1/auth/mobile/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGate.assertMobileClientAllowed.mockResolvedValue(undefined);
    mockGate.assertMobileSignInEnabled.mockResolvedValue(undefined);
  });
  const body = { platform: "surfboard", refreshToken: "a".repeat(64) };

  it("revokes the device's family and always answers success (reveals nothing about the token)", async () => {
    mockDevices.revokeFamilyByRefreshToken.mockResolvedValueOnce(true);
    expect((await logout(post("logout", body))).status).toBe(200);
    mockDevices.revokeFamilyByRefreshToken.mockResolvedValueOnce(false);
    const res = await logout(post("logout", body));
    expect(res.status).toBe(200);
    expect(mockDevices.revokeFamilyByRefreshToken).toHaveBeenCalledWith(
      "surfboard",
      body.refreshToken
    );
  });

  it("works for an app that is too old, or while sign-in is paused: signing out is always allowed", async () => {
    mockGate.assertMobileClientAllowed.mockRejectedValue(
      new AppUpdateRequiredError({
        platform: "android",
        minimumVersion: "9.0.0",
        storeUrl: "",
      })
    );
    mockGate.assertMobileSignInEnabled.mockRejectedValue(
      new MobileSignInDisabledError()
    );
    mockDevices.revokeFamilyByRefreshToken.mockResolvedValue(true);

    const res = await logout(post("logout", body));

    expect(res.status).toBe(200);
    expect(mockGate.assertMobileClientAllowed).not.toHaveBeenCalled();
    expect(mockGate.assertMobileSignInEnabled).not.toHaveBeenCalled();
    expect(mockDevices.revokeFamilyByRefreshToken).toHaveBeenCalled();
  });
});

describe("what the sign-in and refresh routes write to the log (TASK-0015 1J.1)", () => {
  const withApp = (path: string, body: unknown) =>
    new NextRequest(`http://localhost:3000/api/v1/auth/mobile/${path}`, {
      method: "POST",
      headers: {
        host: "localhost:3000",
        "content-type": "application/json",
        "x-app-platform": "android",
        "x-app-version": "1.4.2",
      },
      body: JSON.stringify(body),
    });

  let lines: Record<string, unknown>[];
  let raw: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGate.assertMobileClientAllowed.mockResolvedValue(undefined);
    mockGate.assertMobileSignInEnabled.mockResolvedValue(undefined);
    mockRate.consumeRateLimit.mockResolvedValue(true);
    mockLookup.findUserByEmail.mockResolvedValue(user);
    mockBcrypt.compare.mockResolvedValue(true);
    mockSession.issueMobileSession.mockResolvedValue(pair);
    lines = [];
    raw = "";
    const keep = (value: unknown) => {
      raw += `${String(value)}\n`;
      lines.push(JSON.parse(String(value)));
    };
    vi.spyOn(console, "log").mockImplementation(keep);
    vi.spyOn(console, "warn").mockImplementation(keep);
    vi.spyOn(console, "error").mockImplementation(keep);
  });
  afterEach(() => vi.restoreAllMocks());

  const event = (name: string) => lines.filter((l) => l.event === name);

  it("a sign-in is one info line with the build, a short device hash and the person's id", async () => {
    await login(withApp("login", loginBody()));

    expect(event("mobile.login")).toEqual([
      expect.objectContaining({
        level: "info",
        outcome: "ok",
        appPlatform: "android",
        appVersion: "1.4.2",
        userId: "u1",
        deviceHash: expect.stringMatching(/^[0-9a-f]{12}$/),
      }),
    ]);
  });

  it("never writes the email, the password, a token or the device id", async () => {
    await login(withApp("login", loginBody()));
    mockBcrypt.compare.mockResolvedValue(false);
    await login(withApp("login", loginBody()));

    for (const secret of [
      "surveyor@example.com",
      "Surveyor@Example.com",
      "secret",
      "refresh-raw",
      "access",
      "device-123456",
    ]) {
      expect(raw, secret).not.toContain(secret);
    }
  });

  it.each([
    ["a wrong password", "invalid_credentials", false],
    ["an inactive account", "inactive", true],
    [
      "an account type the app does not serve",
      "account_type_not_supported",
      true,
    ],
    ["too many tries", "rate_limited", false],
  ])("%s is a warn line (%s)", async (name, outcome, hasUser) => {
    if (outcome === "invalid_credentials")
      mockBcrypt.compare.mockResolvedValue(false);
    if (outcome === "inactive")
      mockLookup.findUserByEmail.mockResolvedValue({
        ...user,
        isActive: false,
      });
    if (outcome === "account_type_not_supported")
      mockLookup.findUserByEmail.mockResolvedValue({ ...user, role: "ADMIN" });
    if (outcome === "rate_limited")
      mockRate.consumeRateLimit.mockResolvedValue(false);

    await login(withApp("login", loginBody()));

    const [line] = event("mobile.login");
    expect(line, name).toMatchObject({
      level: "warn",
      outcome,
      appVersion: "1.4.2",
    });
    // A wrong password does not say whether the address has an account.
    expect("userId" in line).toBe(hasUser);
  });

  it("a refused refresh is a warn line with the reason and the code, and no token", async () => {
    mockSession.rotateMobileRefreshToken.mockResolvedValue({
      ok: false,
      reason: "invalid",
    });
    const body = { platform: "surfboard", refreshToken: "a".repeat(64) };

    await refresh(withApp("refresh", body));

    expect(event("mobile.refresh")).toEqual([
      expect.objectContaining({
        level: "warn",
        outcome: "invalid",
        code: "SESSION_INVALID",
        appPlatform: "android",
        appVersion: "1.4.2",
      }),
    ]);
    expect(raw).not.toContain("a".repeat(64));
  });

  it("a refresh that works writes no event line (it happens every few minutes per phone)", async () => {
    mockSession.rotateMobileRefreshToken.mockResolvedValue({
      ok: true,
      session: pair,
    });

    await refresh(
      withApp("refresh", {
        platform: "surfboard",
        refreshToken: "a".repeat(64),
      })
    );

    expect(event("mobile.refresh")).toEqual([]);
  });

  it("an app that is told to update is logged by the shared handler with its build", async () => {
    mockGate.assertMobileClientAllowed.mockRejectedValue(
      new AppUpdateRequiredError({
        platform: "android",
        minimumVersion: "2.0.0",
        storeUrl: "",
      })
    );

    await login(withApp("login", loginBody()));

    expect(lines).toContainEqual(
      expect.objectContaining({
        level: "warn",
        code: "APP_UPDATE_REQUIRED",
        status: 426,
        route: "/api/v1/auth/mobile/login",
        appPlatform: "android",
        appVersion: "1.4.2",
      })
    );
  });
});
