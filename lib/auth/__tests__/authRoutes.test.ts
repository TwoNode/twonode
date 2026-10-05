import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRate = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  checkRateLimit: vi.fn(),
  recordAttempt: vi.fn(),
  getClientIp: vi.fn(() => "1.2.3.4"),
}));
const mockPending = vi.hoisted(() => ({
  issuePendingRegistration: vi.fn(),
  resendPendingRegistration: vi.fn(),
  completePendingRegistration: vi.fn(),
}));
const mockSession = vi.hoisted(() => ({
  issueSession: vi.fn(),
  currentRefreshLifetimeSeconds: vi.fn(async () => 3600),
  getServerSession: vi.fn(),
  revokeUserSession: vi.fn(),
}));
const mockCookies = vi.hoisted(() => ({
  getAccessTokenCookie: vi.fn(),
  clearAuthCookies: vi.fn(),
}));

vi.mock("@/lib/auth/rateLimit", () => mockRate);
vi.mock("@/lib/auth/pendingRegistration", () => mockPending);
vi.mock("@/lib/auth/session", () => mockSession);
vi.mock("@/lib/auth/cookies", () => mockCookies);
vi.mock("@/utils/encryptedCookies", () => ({
  clearEncryptedUserCookie: vi.fn(async (res: unknown) => res),
}));

const { POST: sendOtp } =
  await import("@/app/api/v1/auth/register/send-otp/route");
const { POST: resendOtp } =
  await import("@/app/api/v1/auth/register/resend-otp/route");
const { POST: complete } = await import("@/app/api/v1/auth/register/route");
const { POST: logout } = await import("@/app/api/v1/auth/logout/route");
const { signAccessToken } = await import("@/lib/auth/jwt");
const { SignJWT } = await import("jose");

const post = (
  path: string,
  body: object,
  headers: Record<string, string> = {}
) =>
  new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

const signup = {
  platform: "surfboard",
  email: "New.User@Example.com",
  password: "Passw0rd!x",
  firstName: "New",
  lastName: "User",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRate.consumeRateLimit.mockResolvedValue(true);
  mockPending.issuePendingRegistration.mockResolvedValue({
    pendingRegistrationId: "p1",
    method: "OTP",
  });
});

describe("POST /register/send-otp", () => {
  it("counts the request even though it succeeds — against both the caller's IP and the TARGET address", async () => {
    const res = await sendOtp(post("/api/v1/auth/register/send-otp", signup));

    expect(res.status).toBe(200);
    expect(mockRate.consumeRateLimit).toHaveBeenCalledWith(
      "register-send:1.2.3.4"
    );
    expect(mockRate.consumeRateLimit).toHaveBeenCalledWith(
      "register-send-to:surfboard:new.user@example.com"
    );
    expect(mockRate.recordAttempt).not.toHaveBeenCalled();
  });

  it("429s before doing any work when the IP bucket is full (no bcrypt, no email)", async () => {
    mockRate.consumeRateLimit.mockResolvedValueOnce(false);
    const res = await sendOtp(post("/api/v1/auth/register/send-otp", signup));

    expect(res.status).toBe(429);
    expect(mockPending.issuePendingRegistration).not.toHaveBeenCalled();
  });

  it("429s when one address is being mailed too often, whichever IP it comes from", async () => {
    mockRate.consumeRateLimit
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const res = await sendOtp(post("/api/v1/auth/register/send-otp", signup));

    expect(res.status).toBe(429);
    expect(mockPending.issuePendingRegistration).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin request", async () => {
    const res = await sendOtp(
      post("/api/v1/auth/register/send-otp", signup, {
        origin: "https://evil.example",
      })
    );
    expect(res.status).toBe(403);
    expect(mockRate.consumeRateLimit).not.toHaveBeenCalled();
  });
});

describe("POST /register/resend-otp", () => {
  it("is limited per caller AND per pending registration", async () => {
    await resendOtp(
      post("/api/v1/auth/register/resend-otp", {
        platform: "surfboard",
        pendingRegistrationId: "p1",
      })
    );

    expect(mockRate.consumeRateLimit).toHaveBeenCalledWith(
      "register-resend:1.2.3.4"
    );
    expect(mockRate.consumeRateLimit).toHaveBeenCalledWith(
      "register-resend-for:p1"
    );
    expect(mockPending.resendPendingRegistration).toHaveBeenCalledWith(
      "surfboard",
      "p1"
    );
  });

  it("does not resend once the per-registration bucket is full", async () => {
    mockRate.consumeRateLimit
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const res = await resendOtp(
      post("/api/v1/auth/register/resend-otp", {
        platform: "surfboard",
        pendingRegistrationId: "p1",
      })
    );

    expect(res.status).toBe(429);
    expect(mockPending.resendPendingRegistration).not.toHaveBeenCalled();
  });
});

describe("POST /register (completion)", () => {
  const body = {
    platform: "surfboard",
    pendingRegistrationId: "p1",
    code: "654321",
    password: "Passw0rd!x",
  };

  it("passes the password through to the service and starts a session", async () => {
    mockPending.completePendingRegistration.mockResolvedValueOnce({
      id: "u1",
      email: "e@x.com",
      role: "USER",
      emailVerified: true,
    });
    const res = await complete(post("/api/v1/auth/register", body));

    expect(res.status).toBe(200);
    expect(mockPending.completePendingRegistration).toHaveBeenCalledWith(
      "surfboard",
      "p1",
      "654321",
      "Passw0rd!x"
    );
    expect(mockSession.issueSession).toHaveBeenCalled();
  });

  it("requires the password — a code alone is not enough", async () => {
    const { password: _omit, ...withoutPassword } = body;
    const res = await complete(post("/api/v1/auth/register", withoutPassword));

    expect(res.status).toBe(400);
    expect(mockPending.completePendingRegistration).not.toHaveBeenCalled();
  });

  it("counts every completion attempt (success or not) against the caller's bucket", async () => {
    mockPending.completePendingRegistration.mockResolvedValueOnce({
      id: "u1",
      email: "e",
      role: "USER",
      emailVerified: true,
    });
    await complete(post("/api/v1/auth/register", body));
    expect(mockRate.consumeRateLimit).toHaveBeenCalledWith(
      "register-complete:1.2.3.4"
    );
  });

  it("429s without touching the service when rate limited", async () => {
    mockRate.consumeRateLimit.mockResolvedValueOnce(false);
    const res = await complete(post("/api/v1/auth/register", body));
    expect(res.status).toBe(429);
    expect(mockPending.completePendingRegistration).not.toHaveBeenCalled();
  });
});

describe("POST /logout", () => {
  const logoutReq = () =>
    post("/api/v1/auth/logout", { platform: "surfboard" });

  it("a forged cookie naming a victim's id revokes NOTHING", async () => {
    const forged = await new SignJWT({ role: "USER", platform: "surfboard" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("victim-id")
      .setExpirationTime("-1h")
      .sign(new TextEncoder().encode("attacker-chosen-secret"));
    mockSession.getServerSession.mockResolvedValueOnce(null);
    mockCookies.getAccessTokenCookie.mockResolvedValueOnce(forged);

    const res = await logout(logoutReq());

    expect(res.status).toBe(200);
    expect(mockSession.revokeUserSession).toHaveBeenCalledWith(
      "surfboard",
      undefined
    );
  });

  it("a genuine but expired token still identifies the user, so their sessions are revoked", async () => {
    vi.useFakeTimers();
    const real = await signAccessToken({
      sub: "u1",
      role: "USER",
      platform: "surfboard" as never,
      emailVerified: true,
      mustVerifyNow: false,
    });
    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);
    mockSession.getServerSession.mockResolvedValueOnce(null);
    mockCookies.getAccessTokenCookie.mockResolvedValueOnce(real);

    await logout(logoutReq());
    vi.useRealTimers();

    expect(mockSession.revokeUserSession).toHaveBeenCalledWith(
      "surfboard",
      "u1"
    );
  });

  it("a genuine token minted for ANOTHER platform doesn't revoke here", async () => {
    const reva = await signAccessToken({
      sub: "u1",
      role: "USER",
      platform: "reva" as never,
      emailVerified: true,
      mustVerifyNow: false,
    });
    mockSession.getServerSession.mockResolvedValueOnce(null);
    mockCookies.getAccessTokenCookie.mockResolvedValueOnce(reva);

    await logout(logoutReq());

    expect(mockSession.revokeUserSession).toHaveBeenCalledWith(
      "surfboard",
      undefined
    );
  });

  it("an 'Origin: null' request is refused with 403, not a 500", async () => {
    const res = await logout(
      post("/api/v1/auth/logout", { platform: "surfboard" }, { origin: "null" })
    );
    expect(res.status).toBe(403);
  });
});
