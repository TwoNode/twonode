import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  issue: vi.fn(),
  complete: vi.fn(),
  resend: vi.fn(),
  issueMobileSession: vi.fn(),
  assertMobileClientAllowed: vi.fn(),
  assertMobileSignInEnabled: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/utils/email", () => ({
  sendEmailVerificationOtp: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));
vi.mock("@/lib/auth/rateLimit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));
vi.mock("@/lib/auth/session", () => ({
  MOBILE_ALLOWED_ROLES: ["USER"],
  issueMobileSession: mocks.issueMobileSession,
}));
vi.mock("@/lib/api/mobileApp", () => ({
  assertMobileClientAllowed: mocks.assertMobileClientAllowed,
  assertMobileSignInEnabled: mocks.assertMobileSignInEnabled,
}));
// The real class (the verify route reads its `reason`), with the three operations replaced.
vi.mock("@/lib/auth/pendingRegistration", async (original) => ({
  ...(await original<typeof import("@/lib/auth/pendingRegistration")>()),
  issuePendingRegistration: mocks.issue,
  completePendingRegistration: mocks.complete,
  resendPendingRegistration: mocks.resend,
}));

const { POST: start } =
  await import("@/app/api/v1/auth/mobile/register/start/route");
const { POST: verify } =
  await import("@/app/api/v1/auth/mobile/register/verify/route");
const { POST: resend } =
  await import("@/app/api/v1/auth/mobile/register/resend/route");
const { GET: legal } = await import("@/app/api/v1/auth/mobile/legal/route");
const { PendingRegistrationRejectedError } =
  await import("@/lib/auth/pendingRegistration");
const {
  ConflictError,
  ValidationError,
  AppUpdateRequiredError,
  MobileSignInDisabledError,
} = await import("@/lib/api/errors");
const { LEGAL_VERSION } = await import("@/lib/legal/surfboard");

const post = (path: string, body: unknown) =>
  new NextRequest(`http://localhost:3000/api/v1/auth/mobile/${path}`, {
    method: "POST",
    // No Origin or Referer, as a native app sends: no CSRF check applies.
    headers: { host: "localhost:3000", "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const startBody = (over: Record<string, unknown> = {}) => ({
  platform: "surfboard",
  email: "Ada@Example.com",
  password: "a-long-password",
  firstName: "Ada",
  lastName: "Obi",
  acceptedLegalVersion: LEGAL_VERSION,
  deviceId: "device-123456",
  ...over,
});
const verifyBody = (over: Record<string, unknown> = {}) => ({
  platform: "surfboard",
  pendingRegistrationId: "preg_1",
  code: "123456",
  password: "a-long-password",
  deviceId: "device-123456",
  deviceLabel: "Pixel 8",
  appVersion: "1.0.0",
  ...over,
});

const created = {
  id: "u1",
  email: "ada@example.com",
  firstName: "Ada",
  lastName: "Obi",
  passwordHash: "never-in-an-answer",
  role: "USER",
  isActive: true,
  emailVerified: true,
  createdAt: new Date("2026-11-18T09:00:00Z"),
};
const pair = {
  accessToken: "access",
  refreshToken: "refresh-raw",
  accessExpiresIn: 900,
  refreshExpiresAt: new Date("2026-12-18T00:00:00Z"),
  emailVerified: true,
  mustVerifyNow: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.assertMobileClientAllowed.mockResolvedValue(undefined);
  mocks.assertMobileSignInEnabled.mockResolvedValue(undefined);
  mocks.consumeRateLimit.mockResolvedValue(true);
  mocks.issue.mockResolvedValue({
    pendingRegistrationId: "preg_1",
    method: "OTP",
  });
  mocks.complete.mockResolvedValue(created);
  mocks.resend.mockResolvedValue(undefined);
  mocks.issueMobileSession.mockResolvedValue(pair);
});

describe("POST /api/v1/auth/mobile/register/start", () => {
  it("holds the details and says where to send the code, always asking for a six-digit code", async () => {
    const res = await start(post("register/start", startBody()));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(json.data).toEqual({
      pendingRegistrationId: "preg_1",
      method: "OTP",
      codeExpiresInSeconds: 600,
    });
    expect(mocks.issue).toHaveBeenCalledWith(
      "surfboard",
      {
        email: "Ada@Example.com",
        password: "a-long-password",
        firstName: "Ada",
        lastName: "Obi",
        acceptedLegalVersion: LEGAL_VERSION,
      },
      // A phone cannot follow a link into a form, so whatever the website uses, the app gets a code.
      { method: "OTP" }
    );
    // Never echoes the password.
    expect(JSON.stringify(json)).not.toContain("a-long-password");
  });

  it("is limited per email and per device, never per IP address", async () => {
    await start(post("register/start", startBody()));
    const keys = mocks.consumeRateLimit.mock.calls.map((c) => c[0]);
    expect(keys).toEqual([
      "mobile-register-device:device-123456",
      "mobile-register-email:ada@example.com",
    ]);
  });

  it("answers 429 RATE_LIMITED and sends nothing when over the limit", async () => {
    mocks.consumeRateLimit.mockResolvedValue(false);
    const res = await start(post("register/start", startBody()));
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("RATE_LIMITED");
    expect(mocks.issue).not.toHaveBeenCalled();
  });

  it("says EMAIL_ALREADY_REGISTERED (409) for an address that has an account", async () => {
    mocks.issue.mockRejectedValue(
      new ConflictError("Email address is already registered")
    );
    const res = await start(post("register/start", startBody()));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("EMAIL_ALREADY_REGISTERED");
  });

  it("passes the server's refusal of a missing or old Terms version on as a 400 naming `legal`", async () => {
    mocks.issue.mockRejectedValue(
      new ValidationError({
        legal: "Please agree to the Terms of Use and the Privacy Policy.",
      })
    );
    const res = await start(
      post("register/start", startBody({ acceptedLegalVersion: "1999" }))
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_ERROR");
    expect(json.details.legal).toBeTruthy();
  });

  it.each([
    ["a bad email", { email: "nope" }],
    ["a password under 8 characters", { password: "short" }],
    [
      "a password over 72 characters (bcrypt reads no more)",
      { password: "x".repeat(73) },
    ],
    ["a blank first name", { firstName: "   " }],
    ["a blank last name", { lastName: "" }],
    ["no Terms version", { acceptedLegalVersion: undefined }],
    ["a device id that is too short", { deviceId: "short" }],
    ["another platform", { platform: "reva" }],
  ])(
    "refuses %s with 400 VALIDATION_ERROR and never reaches the database",
    async (_name, over) => {
      const res = await start(post("register/start", startBody(over)));
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("VALIDATION_ERROR");
      expect(mocks.issue).not.toHaveBeenCalled();
    }
  );

  it("is told to update (426) before the details are looked at, and refused (503) while sign-in is paused", async () => {
    mocks.assertMobileClientAllowed.mockRejectedValueOnce(
      new AppUpdateRequiredError({
        platform: "android",
        minimumVersion: "2.0.0",
        storeUrl: "",
      })
    );
    expect((await start(post("register/start", startBody()))).status).toBe(426);

    mocks.assertMobileSignInEnabled.mockRejectedValueOnce(
      new MobileSignInDisabledError()
    );
    expect((await start(post("register/start", startBody()))).status).toBe(503);
    expect(mocks.issue).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/auth/mobile/register/verify", () => {
  it("creates the account and signs the person in: the same answer as login, no cookies", async () => {
    const res = await verify(post("register/verify", verifyBody()));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(json.data).toMatchObject({
      accessToken: "access",
      refreshToken: "refresh-raw",
      accessExpiresIn: 900,
      refreshExpiresAt: "2026-12-18T00:00:00.000Z",
      user: {
        id: "u1",
        email: "ada@example.com",
        firstName: "Ada",
        role: "user",
        emailVerified: true,
        mustVerifyNow: false,
      },
    });
    expect(JSON.stringify(json)).not.toContain("never-in-an-answer");
    expect(mocks.complete).toHaveBeenCalledWith(
      "surfboard",
      "preg_1",
      "123456",
      "a-long-password"
    );
  });

  it("tags the new session with the device", async () => {
    await verify(post("register/verify", verifyBody()));
    expect(mocks.issueMobileSession).toHaveBeenCalledWith(
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

  it.each([
    ["MALFORMED", "VERIFICATION_CODE_INVALID"],
    ["INCORRECT", "VERIFICATION_CODE_INCORRECT"],
    ["EXPIRED", "VERIFICATION_CODE_EXPIRED"],
    ["TOO_MANY_ATTEMPTS", "VERIFICATION_CODE_LOCKED"],
  ] as const)(
    "turns a rejected %s into a 400 %s the app can word itself",
    async (reason, code) => {
      mocks.complete.mockRejectedValue(
        new PendingRegistrationRejectedError(reason, {
          code: "words for a developer",
        })
      );
      const res = await verify(post("register/verify", verifyBody()));
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe(code);
      expect(mocks.issueMobileSession).not.toHaveBeenCalled();
    }
  );

  it("calls a wrong password a plain 400 VALIDATION_ERROR naming `password`", async () => {
    mocks.complete.mockRejectedValue(
      new PendingRegistrationRejectedError("WRONG_PASSWORD", {
        password: "not the one",
      })
    );
    const res = await verify(post("register/verify", verifyBody()));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_ERROR");
    expect(json.details.password).toBeTruthy();
  });

  it("does not hide a failure that is not a rejection (the database is down): 500, no session", async () => {
    mocks.complete.mockRejectedValue(new Error("database is down"));
    const res = await verify(post("register/verify", verifyBody()));
    expect(res.status).toBe(500);
    expect(mocks.issueMobileSession).not.toHaveBeenCalled();
  });

  it("is limited per registration and per device, and answers 429 without checking the code", async () => {
    mocks.consumeRateLimit.mockResolvedValue(false);
    const res = await verify(post("register/verify", verifyBody()));
    expect(res.status).toBe(429);
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.consumeRateLimit.mock.calls.map((c) => c[0])[0]).toBe(
      "mobile-register-verify-device:device-123456"
    );
  });

  it("refuses an account that is not a surveyor (cannot happen for a new one; a guard)", async () => {
    mocks.complete.mockResolvedValue({ ...created, role: "ADMIN" });
    const res = await verify(post("register/verify", verifyBody()));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("ACCOUNT_TYPE_NOT_SUPPORTED");
    expect(mocks.issueMobileSession).not.toHaveBeenCalled();
  });

  it.each([
    ["a code that is not six characters", { code: "12345" }],
    ["a blank registration id", { pendingRegistrationId: "" }],
    ["no password", { password: "" }],
    ["a short device id", { deviceId: "x" }],
  ])("refuses %s with 400 VALIDATION_ERROR", async (_name, over) => {
    const res = await verify(post("register/verify", verifyBody(over)));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it("trims spaces around the code before counting its length", async () => {
    const res = await verify(
      post("register/verify", verifyBody({ code: " 123456 " }))
    );
    expect(res.status).toBe(200);
    expect(mocks.complete.mock.calls[0][2]).toBe("123456");
  });

  it("is refused while sign-in is paused, and told to update when the build is too old", async () => {
    mocks.assertMobileSignInEnabled.mockRejectedValueOnce(
      new MobileSignInDisabledError()
    );
    expect((await verify(post("register/verify", verifyBody()))).status).toBe(
      503
    );
    mocks.assertMobileClientAllowed.mockRejectedValueOnce(
      new AppUpdateRequiredError({
        platform: "ios",
        minimumVersion: "2.0.0",
        storeUrl: "",
      })
    );
    expect((await verify(post("register/verify", verifyBody()))).status).toBe(
      426
    );
    expect(mocks.complete).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/auth/mobile/register/resend", () => {
  const body = (over: Record<string, unknown> = {}) => ({
    platform: "surfboard",
    pendingRegistrationId: "preg_1",
    deviceId: "device-123456",
    ...over,
  });

  it("asks for a new code and always answers the same 200", async () => {
    const res = await resend(post("register/resend", body()));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({});
    expect(mocks.resend).toHaveBeenCalledWith("surfboard", "preg_1");
  });

  it("answers the same for a registration that does not exist (nothing to find out)", async () => {
    // resendPendingRegistration does nothing for an unknown, used or foreign id.
    mocks.resend.mockResolvedValue(undefined);
    const res = await resend(
      post("register/resend", body({ pendingRegistrationId: "ghost" }))
    );
    expect(res.status).toBe(200);
  });

  it("is limited per registration and per device", async () => {
    await resend(post("register/resend", body()));
    expect(mocks.consumeRateLimit.mock.calls.map((c) => c[0])).toEqual([
      "mobile-register-resend-device:device-123456",
      "mobile-register-resend:preg_1",
    ]);
    mocks.consumeRateLimit.mockResolvedValue(false);
    const res = await resend(post("register/resend", body()));
    expect(res.status).toBe(429);
    expect(mocks.resend).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a blank id", { pendingRegistrationId: "" }],
    ["a short device id", { deviceId: "x" }],
  ])("refuses %s", async (_name, over) => {
    const res = await resend(post("register/resend", body(over)));
    expect(res.status).toBe(400);
  });

  it("does not need sign-in to be open (a person already part-way through can still get a code)", async () => {
    mocks.assertMobileSignInEnabled.mockRejectedValue(
      new MobileSignInDisabledError()
    );
    const res = await resend(post("register/resend", body()));
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/auth/mobile/legal", () => {
  const get = () =>
    new NextRequest("http://localhost:3000/api/v1/auth/mobile/legal", {
      headers: { host: "localhost:3000" },
    });

  it("gives the version to agree to and where to read the two texts", async () => {
    const res = await legal(get());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.version).toBe(LEGAL_VERSION);
    expect(json.data.termsUrl).toMatch(/\/surfboard\/terms$/);
    expect(json.data.privacyUrl).toMatch(/\/surfboard\/privacy$/);
    expect(json.data.termsUrl.startsWith("http")).toBe(true);
  });

  it("is told to update when the build is too old", async () => {
    mocks.assertMobileClientAllowed.mockRejectedValueOnce(
      new AppUpdateRequiredError({
        platform: "android",
        minimumVersion: "2.0.0",
        storeUrl: "",
      })
    );
    expect((await legal(get())).status).toBe(426);
  });
});
