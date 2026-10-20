import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockSession = vi.hoisted(() => ({ getServerSession: vi.fn() }));
const mockRate = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "1.2.3.4"),
}));
const mockLookup = vi.hoisted(() => ({ findUserById: vi.fn() }));
const mockOtp = vi.hoisted(() => ({
  verifyEmailOtp: vi.fn(),
  issueAndSendVerificationOtp: vi.fn(),
}));
const mockLink = vi.hoisted(() => ({ issueAndSendVerificationEmail: vi.fn() }));
const mockSettings = vi.hoisted(() => ({
  getEmailVerificationSettings: vi.fn(),
}));
const mockGate = vi.hoisted(() => ({
  computeMustVerifyNow: vi.fn(),
  computeVerificationGraceEndsAt: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => mockSession);
vi.mock("@/lib/auth/rateLimit", () => mockRate);
vi.mock("@/lib/auth/userLookup", () => mockLookup);
vi.mock("@/lib/auth/emailVerification", () => mockLink);
vi.mock("@/lib/auth/emailVerificationSettings", () => mockSettings);
vi.mock("@/lib/auth/emailVerificationGate", () => mockGate);
// verifyEmailOtp is mocked; the real rejection class is kept so the route's
// instanceof check sees the same one the service throws.
vi.mock("@/lib/auth/emailVerificationOtp", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/emailVerificationOtp")>()),
  ...mockOtp,
}));

const { POST: verify } =
  await import("@/app/api/v1/auth/mobile/verify-email/route");
const { POST: resend } =
  await import("@/app/api/v1/auth/mobile/resend-verification/route");
const { GET: me } = await import("@/app/api/v1/auth/me/route");
const { OtpRejectedError } = await import("@/lib/auth/emailVerificationOtp");

const BEARER = { authorization: "Bearer access-token" };

const post = (
  path: string,
  body?: Record<string, unknown>,
  headers: Record<string, string> = BEARER
) =>
  new NextRequest(`http://localhost:3000/api/v1/auth/mobile/${path}`, {
    method: "POST",
    // No Origin or Referer, as a native app sends: a bearer request needs none.
    headers: {
      host: "localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const verifyBody = (over: Record<string, unknown> = {}) => ({
  platform: "surfboard",
  code: "123456",
  ...over,
});

/** A surveyor the server is holding at the verification gate. */
const blocked = {
  sub: "u1",
  role: "USER",
  platform: "surfboard",
  emailVerified: false,
  mustVerifyNow: true,
};
const user = {
  id: "u1",
  email: "surveyor@example.com",
  firstName: "Ada",
  lastName: "Obi",
  role: "USER",
  isActive: true,
  emailVerified: false,
  emailVerifiedVia: null as string | null,
  createdAt: new Date("2026-10-15T00:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.getServerSession.mockResolvedValue(blocked);
  mockRate.consumeRateLimit.mockResolvedValue(true);
  mockLookup.findUserById.mockResolvedValue(user);
  mockOtp.verifyEmailOtp.mockResolvedValue(true);
  mockOtp.issueAndSendVerificationOtp.mockResolvedValue(undefined);
  mockLink.issueAndSendVerificationEmail.mockResolvedValue(undefined);
  mockSettings.getEmailVerificationSettings.mockResolvedValue({
    enabled: true,
    method: "OTP",
    gracePeriodDays: 30,
    enforcedSince: "2026-10-01T00:00:00.000Z",
  });
});

describe("POST /api/v1/auth/mobile/verify-email", () => {
  it("verifies the signed-in surveyor, even though verification is what is outstanding", async () => {
    const res = await verify(post("verify-email", verifyBody()));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      data: { verified: true },
    });
    expect(mockOtp.verifyEmailOtp).toHaveBeenCalledWith(
      "surfboard",
      "u1",
      "123456"
    );
  });

  it("sets no cookie and starts no session: the app asks for a fresh token itself", async () => {
    const res = await verify(post("verify-email", verifyBody()));

    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("cache-control")).toBe("no-store");
    // The session module is mocked with getServerSession only: had the route
    // reached for issueSession it would have thrown, not answered 200.
    expect(res.status).toBe(200);
  });

  it("is a 401 without a session, and does nothing", async () => {
    mockSession.getServerSession.mockResolvedValue(null);

    const res = await verify(post("verify-email", verifyBody()));

    expect(res.status).toBe(401);
    expect(mockRate.consumeRateLimit).not.toHaveBeenCalled();
    expect(mockOtp.verifyEmailOtp).not.toHaveBeenCalled();
  });

  it("is a 403 for an account type the app does not serve", async () => {
    mockSession.getServerSession.mockResolvedValue({
      ...blocked,
      role: "ADMIN",
    });

    const res = await verify(post("verify-email", verifyBody()));

    expect(res.status).toBe(403);
    expect(mockOtp.verifyEmailOtp).not.toHaveBeenCalled();
  });

  it("verifies the SESSION's account, whoever the body names", async () => {
    await verify(
      post("verify-email", verifyBody({ userId: "victim", id: "victim" }))
    );

    expect(mockOtp.verifyEmailOtp).toHaveBeenCalledWith(
      "surfboard",
      "u1",
      "123456"
    );
  });

  it("treats an account that is already verified as done, without spending a guess", async () => {
    mockLookup.findUserById.mockResolvedValue({ ...user, emailVerified: true });

    const res = await verify(post("verify-email", verifyBody()));

    expect(await res.json()).toEqual({
      success: true,
      data: { verified: true },
    });
    expect(mockRate.consumeRateLimit).not.toHaveBeenCalled();
    expect(mockOtp.verifyEmailOtp).not.toHaveBeenCalled();
  });

  it("is a 401 for an account that is gone or switched off", async () => {
    mockLookup.findUserById.mockResolvedValue({ ...user, isActive: false });
    expect((await verify(post("verify-email", verifyBody()))).status).toBe(401);
    mockLookup.findUserById.mockResolvedValue(null);
    expect((await verify(post("verify-email", verifyBody()))).status).toBe(401);
    expect(mockOtp.verifyEmailOtp).not.toHaveBeenCalled();
  });

  it("is limited per account, on the website's key, and never by address", async () => {
    await verify(post("verify-email", verifyBody()));

    expect(mockRate.consumeRateLimit).toHaveBeenCalledTimes(1);
    expect(mockRate.consumeRateLimit).toHaveBeenCalledWith(
      "verify-otp-user:surfboard:u1",
      "u1"
    );
    expect(mockRate.getClientIp).not.toHaveBeenCalled();
  });

  it("is a 429 when the limiter refuses, without comparing the code", async () => {
    mockRate.consumeRateLimit.mockResolvedValue(false);

    const res = await verify(post("verify-email", verifyBody()));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.code).toBe("RATE_LIMITED");
    expect(mockOtp.verifyEmailOtp).not.toHaveBeenCalled();
  });

  it.each([
    ["INCORRECT", "VERIFICATION_CODE_INCORRECT"],
    ["NO_ACTIVE_CODE", "VERIFICATION_CODE_EXPIRED"],
    ["TOO_MANY_ATTEMPTS", "VERIFICATION_CODE_LOCKED"],
    ["MALFORMED", "VERIFICATION_CODE_INVALID"],
  ] as const)(
    "says a %s code with the stable code %s",
    async (reason, code) => {
      mockOtp.verifyEmailOtp.mockRejectedValue(
        new OtpRejectedError(reason, "server words")
      );

      const res = await verify(post("verify-email", verifyBody()));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({ success: false, code });
    }
  );

  it("does not hide a real failure behind a code message", async () => {
    mockOtp.verifyEmailOtp.mockRejectedValue(new Error("database down"));

    const res = await verify(post("verify-email", verifyBody()));

    expect(res.status).toBe(500);
  });

  it.each([
    ["a five-digit code", { code: "12345" }],
    ["a seven-digit code", { code: "1234567" }],
    ["no code", { code: undefined }],
    ["another product", { platform: "reva" }],
  ])("refuses %s", async (_name, over) => {
    const res = await verify(post("verify-email", verifyBody(over)));

    expect(res.status).toBe(400);
    expect(mockOtp.verifyEmailOtp).not.toHaveBeenCalled();
  });

  it("refuses a browser's cookie request from another site, but not an app's bearer request", async () => {
    const crossSite = await verify(
      post("verify-email", verifyBody(), {
        origin: "https://evil.test",
        cookie: "session=1",
      })
    );
    expect(crossSite.status).toBe(403);
    expect(mockOtp.verifyEmailOtp).not.toHaveBeenCalled();

    const app = await verify(post("verify-email", verifyBody()));
    expect(app.status).toBe(200);
  });
});

describe("POST /api/v1/auth/mobile/resend-verification", () => {
  it("sends a code to the signed-in surveyor when the platform uses codes", async () => {
    const res = await resend(post("resend-verification"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      data: { sent: true, method: "OTP" },
    });
    expect(mockOtp.issueAndSendVerificationOtp).toHaveBeenCalledWith(
      "surfboard",
      user
    );
    expect(mockLink.issueAndSendVerificationEmail).not.toHaveBeenCalled();
  });

  it("sends a link when the platform uses links", async () => {
    mockSettings.getEmailVerificationSettings.mockResolvedValue({
      enabled: true,
      method: "LINK",
      gracePeriodDays: 30,
      enforcedSince: "2026-10-01T00:00:00.000Z",
    });

    const res = await resend(post("resend-verification"));

    expect(await res.json()).toEqual({
      success: true,
      data: { sent: true, method: "LINK" },
    });
    expect(mockLink.issueAndSendVerificationEmail).toHaveBeenCalledWith(
      "surfboard",
      user
    );
    expect(mockOtp.issueAndSendVerificationOtp).not.toHaveBeenCalled();
  });

  it("works while verification is outstanding, and sets no cookie", async () => {
    const res = await resend(post("resend-verification"));

    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("is a 401 without a session, and sends nothing", async () => {
    mockSession.getServerSession.mockResolvedValue(null);

    const res = await resend(post("resend-verification"));

    expect(res.status).toBe(401);
    expect(mockOtp.issueAndSendVerificationOtp).not.toHaveBeenCalled();
  });

  it("is a 403 for an account type the app does not serve", async () => {
    mockSession.getServerSession.mockResolvedValue({
      ...blocked,
      role: "ADMIN",
    });

    expect((await resend(post("resend-verification"))).status).toBe(403);
    expect(mockOtp.issueAndSendVerificationOtp).not.toHaveBeenCalled();
  });

  it("says an account that no longer needs it is done, and sends nothing", async () => {
    mockLookup.findUserById.mockResolvedValue({ ...user, emailVerified: true });

    const res = await resend(post("resend-verification"));

    expect(await res.json()).toEqual({
      success: true,
      data: { sent: false, alreadyVerified: true },
    });
    expect(mockRate.consumeRateLimit).not.toHaveBeenCalled();
    expect(mockOtp.issueAndSendVerificationOtp).not.toHaveBeenCalled();
  });

  it("allows five a quarter hour per account, never by address", async () => {
    await resend(post("resend-verification"));

    expect(mockRate.consumeRateLimit).toHaveBeenCalledWith(
      "mobile-resend-verification:u1",
      "u1",
      { max: 5, windowMs: 15 * 60 * 1000 }
    );
    expect(mockRate.getClientIp).not.toHaveBeenCalled();
  });

  it("is a 429 when the limiter refuses, and sends nothing", async () => {
    mockRate.consumeRateLimit.mockResolvedValue(false);

    const res = await resend(post("resend-verification"));

    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("RATE_LIMITED");
    expect(mockOtp.issueAndSendVerificationOtp).not.toHaveBeenCalled();
  });

  it("refuses a cookie request from another site, but not an app's bearer request", async () => {
    const crossSite = await resend(
      post("resend-verification", undefined, {
        origin: "https://evil.test",
        cookie: "session=1",
      })
    );
    expect(crossSite.status).toBe(403);
    expect(mockOtp.issueAndSendVerificationOtp).not.toHaveBeenCalled();

    expect((await resend(post("resend-verification"))).status).toBe(200);
  });
});

describe("GET /api/v1/auth/me", () => {
  const get = () =>
    new NextRequest("http://localhost:3000/api/v1/auth/me?platform=surfboard", {
      headers: { ...BEARER },
    });

  beforeEach(() => {
    mockSettings.getEmailVerificationSettings.mockResolvedValue({
      enabled: true,
      method: "OTP",
      gracePeriodDays: 30,
      enforcedSince: "2026-10-01T00:00:00.000Z",
    });
    mockGate.computeMustVerifyNow.mockResolvedValue(true);
    mockGate.computeVerificationGraceEndsAt.mockResolvedValue(null);
  });

  it("gives the app the surveyor's name, so a restored session has more than the email", async () => {
    const res = await me(get());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toMatchObject({
      id: "u1",
      email: "surveyor@example.com",
      firstName: "Ada",
      lastName: "Obi",
      role: "user",
      emailVerified: false,
      mustVerifyNow: true,
      verificationMethod: "OTP",
    });
  });

  it("still gives the verification state the app's gate reads", async () => {
    mockGate.computeMustVerifyNow.mockResolvedValue(false);
    mockGate.computeVerificationGraceEndsAt.mockResolvedValue(
      "2026-11-01T00:00:00.000Z"
    );

    const json = await (await me(get())).json();

    expect(json.data).toMatchObject({
      mustVerifyNow: false,
      verificationGraceEndsAt: "2026-11-01T00:00:00.000Z",
    });
  });
});
