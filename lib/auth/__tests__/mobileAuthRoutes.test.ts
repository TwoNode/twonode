import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRate = vi.hoisted(() => ({ consumeRateLimit: vi.fn() }));
const mockLookup = vi.hoisted(() => ({ findUserByEmail: vi.fn() }));
const mockSession = vi.hoisted(() => ({
  issueMobileSession: vi.fn(),
  rotateMobileRefreshToken: vi.fn(),
}));
const mockDevices = vi.hoisted(() => ({
  revokeFamilyByRefreshToken: vi.fn(),
  listDeviceSessions: vi.fn(),
  revokeDeviceSession: vi.fn(),
}));
const mockBcrypt = vi.hoisted(() => ({ compare: vi.fn() }));

vi.mock("@/lib/auth/rateLimit", () => mockRate);
vi.mock("@/lib/auth/userLookup", () => mockLookup);
vi.mock("@/lib/auth/session", () => mockSession);
vi.mock("@/lib/auth/deviceSessions", () => mockDevices);
vi.mock("bcryptjs", () => ({ default: mockBcrypt }));

const { POST: login } = await import("@/app/api/v1/auth/mobile/login/route");
const { POST: refresh } =
  await import("@/app/api/v1/auth/mobile/refresh/route");
const { POST: logout } = await import("@/app/api/v1/auth/mobile/logout/route");

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
  ])("%s -> %i %s", async (reason, status, code) => {
    mockSession.rotateMobileRefreshToken.mockResolvedValue({
      ok: false,
      reason,
    });
    const res = await refresh(post("refresh", body));
    expect(res.status).toBe(status);
    expect((await res.json()).code).toBe(code);
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
  beforeEach(() => vi.clearAllMocks());
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
});
