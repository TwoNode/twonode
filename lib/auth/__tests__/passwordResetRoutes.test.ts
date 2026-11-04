import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";

const mockPrisma = vi.hoisted(() => ({
  passwordResetToken: { create: vi.fn() },
}));
const mockRate = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  recordAttempt: vi.fn(),
  consumeRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "1.2.3.4"),
}));
const mockLookup = vi.hoisted(() => ({ findUserByEmail: vi.fn() }));
const mockEmail = vi.hoisted(() => ({ sendPasswordResetEmail: vi.fn() }));
const mockWhatsApp = vi.hoisted(() => ({ sendWhatsAppMessage: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/auth/rateLimit", () => mockRate);
vi.mock("@/lib/auth/userLookup", () => mockLookup);
vi.mock("@/utils/email", () => mockEmail);
vi.mock("@/lib/whatsapp", () => mockWhatsApp);
vi.mock("@/lib/siteUrl", () => ({ getSiteUrl: () => "https://site.test" }));

const { POST: webRequest } =
  await import("@/app/api/v1/auth/request-password-reset/route");
const { POST: mobileRequest } =
  await import("@/app/api/v1/auth/mobile/request-password-reset/route");

const GENERIC = {
  success: true,
  data: { message: "If that email is registered, we've sent a link to it." },
};

const user = {
  id: "u1",
  email: "surveyor@example.com",
  firstName: "Ada",
  lastName: "Obi",
  passwordHash: "hash",
  role: "USER",
  isActive: true,
  phone: null as string | null,
};

const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

/** The raw token the person is emailed: the only copy; the database keeps its hash. */
function emailedToken(): string {
  const { resetUrl } = mockEmail.sendPasswordResetEmail.mock.calls[0][0];
  return new URL(resetUrl).searchParams.get("token") as string;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRate.checkRateLimit.mockResolvedValue(true);
  mockRate.consumeRateLimit.mockResolvedValue(true);
  mockLookup.findUserByEmail.mockResolvedValue(user);
  mockWhatsApp.sendWhatsAppMessage.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// The website's route. It had no tests; these pin what it does so the shared
// helper both routes now use can be checked against it.
// ---------------------------------------------------------------------------
describe("POST /api/v1/auth/request-password-reset (the website)", () => {
  const post = (
    body: Record<string, unknown>,
    headers: Record<string, string> = {}
  ) =>
    new NextRequest(
      "http://localhost:3000/api/v1/auth/request-password-reset",
      {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
          "content-type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          platform: "surfboard",
          email: user.email,
          ...body,
        }),
      }
    );

  it("refuses a cross-origin request, before looking anything up", async () => {
    const res = await webRequest(post({}, { origin: "https://evil.test" }));
    expect(res.status).toBe(403);
    expect(mockLookup.findUserByEmail).not.toHaveBeenCalled();
    expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("emails a one-hour link to a registered, active account and stores only its hash", async () => {
    const before = Date.now();
    const res = await webRequest(post({}));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(GENERIC);

    const stored = mockPrisma.passwordResetToken.create.mock.calls[0][0].data;
    expect(stored).toMatchObject({ userId: "u1", platform: "surfboard" });
    expect(stored.tokenHash).toBe(sha256(emailedToken()));
    expect(stored.expiresAt.getTime() - before).toBeGreaterThan(59 * 60 * 1000);
    expect(stored.expiresAt.getTime() - before).toBeLessThan(61 * 60 * 1000);

    expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "surveyor@example.com",
        firstName: "Ada",
        isFirstTimeSetup: false,
        platform: "surfboard",
        resetUrl: expect.stringMatching(
          /^https:\/\/site\.test\/surfboard\/reset-password\?token=[0-9a-f]{64}$/
        ),
      })
    );
  });

  it("links each product's own reset page", async () => {
    await webRequest(post({ platform: "reva" }));
    expect(mockEmail.sendPasswordResetEmail.mock.calls[0][0].resetUrl).toMatch(
      /^https:\/\/site\.test\/reva\/reset-password\?token=/
    );
    mockEmail.sendPasswordResetEmail.mockClear();
    await webRequest(post({ platform: "gbc" }));
    expect(mockEmail.sendPasswordResetEmail.mock.calls[0][0].resetUrl).toMatch(
      /^https:\/\/site\.test\/gbc-restricted\/reset-password\?token=/
    );
  });

  it("tells an account with no password (a Google-only account) it is a first-time setup", async () => {
    mockLookup.findUserByEmail.mockResolvedValue({
      ...user,
      passwordHash: null,
    });
    await webRequest(post({}));
    expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({ isFirstTimeSetup: true })
    );
  });

  it("answers an unknown email, and an inactive account, exactly like a known one", async () => {
    mockLookup.findUserByEmail.mockResolvedValue(null);
    const unknown = await webRequest(post({}));
    mockLookup.findUserByEmail.mockResolvedValue({ ...user, isActive: false });
    const inactive = await webRequest(post({}));

    expect(await unknown.json()).toEqual(GENERIC);
    expect(await inactive.json()).toEqual(GENERIC);
    expect(unknown.status).toBe(200);
    expect(inactive.status).toBe(200);
    expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("is rate limited per address and email, and says nothing different when it is", async () => {
    mockRate.checkRateLimit.mockResolvedValue(false);
    const res = await webRequest(post({}));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(GENERIC);
    expect(mockRate.checkRateLimit).toHaveBeenCalledWith(
      "reset:1.2.3.4:surveyor@example.com"
    );
    expect(mockLookup.findUserByEmail).not.toHaveBeenCalled();
    expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("also sends the link to the phone on file, and a failed message never fails the request", async () => {
    mockLookup.findUserByEmail.mockResolvedValue({
      ...user,
      phone: "+2348012345678",
    });
    mockWhatsApp.sendWhatsAppMessage.mockRejectedValue(
      new Error("provider down")
    );

    const res = await webRequest(post({}));

    expect(res.status).toBe(200);
    expect(mockWhatsApp.sendWhatsAppMessage).toHaveBeenCalledWith(
      "+2348012345678",
      expect.stringContaining(emailedToken())
    );
  });
});

// ---------------------------------------------------------------------------
// The app's twin: "Forgot password?".
// ---------------------------------------------------------------------------
describe("POST /api/v1/auth/mobile/request-password-reset (the app)", () => {
  const post = (body: Record<string, unknown> = {}) =>
    new NextRequest(
      "http://localhost:3000/api/v1/auth/mobile/request-password-reset",
      {
        method: "POST",
        // No Origin or Referer, as a native app sends: the website's route
        // would answer 403, this one has no CSRF check.
        headers: { host: "localhost:3000", "content-type": "application/json" },
        body: JSON.stringify({
          platform: "surfboard",
          email: "Surveyor@Example.com",
          deviceId: "device-123456",
          ...body,
        }),
      }
    );

  it("works for a native call with no Origin or Referer", async () => {
    const res = await mobileRequest(post());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(GENERIC);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("emails the surveyor a one-hour link to the website's reset page, storing only its hash", async () => {
    await mobileRequest(post());

    const stored = mockPrisma.passwordResetToken.create.mock.calls[0][0].data;
    expect(stored).toMatchObject({ userId: "u1", platform: "surfboard" });
    expect(stored.tokenHash).toBe(sha256(emailedToken()));
    expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "surveyor@example.com",
        resetUrl: expect.stringMatching(
          /^https:\/\/site\.test\/surfboard\/reset-password\?token=[0-9a-f]{64}$/
        ),
      })
    );
  });

  it("looks the account up by the email as typed and limits it by the lower-cased one", async () => {
    await mobileRequest(post());

    expect(mockLookup.findUserByEmail).toHaveBeenCalledWith(
      "surfboard",
      "Surveyor@Example.com"
    );
    expect(mockRate.consumeRateLimit).toHaveBeenCalledWith(
      "mobile-reset:surveyor@example.com:device-123456",
      undefined,
      { max: 3, windowMs: 15 * 60 * 1000 }
    );
    expect(mockRate.consumeRateLimit).toHaveBeenCalledWith(
      "mobile-reset-email:surveyor@example.com",
      undefined,
      { max: 5, windowMs: 60 * 60 * 1000 }
    );
  });

  it("never limits by the caller's address (phones share one behind a carrier)", async () => {
    await mobileRequest(post());
    expect(mockRate.getClientIp).not.toHaveBeenCalled();
  });

  it("answers an unknown email, an inactive account and an account the app cannot serve exactly like a known one", async () => {
    const answers: unknown[] = [];

    mockLookup.findUserByEmail.mockResolvedValue(null);
    answers.push(await (await mobileRequest(post())).json());
    mockLookup.findUserByEmail.mockResolvedValue({ ...user, isActive: false });
    answers.push(await (await mobileRequest(post())).json());
    mockLookup.findUserByEmail.mockResolvedValue({ ...user, role: "ADMIN" });
    answers.push(await (await mobileRequest(post())).json());

    expect(answers).toEqual([GENERIC, GENERIC, GENERIC]);
    expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it.each([
    ["the device limit", [false]],
    ["the email limit", [true, false]],
  ])(
    "says nothing different when %s refuses, and sends nothing",
    async (_name, answers) => {
      answers.forEach((answer) =>
        mockRate.consumeRateLimit.mockResolvedValueOnce(answer)
      );

      const res = await mobileRequest(post());

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(GENERIC);
      expect(mockLookup.findUserByEmail).not.toHaveBeenCalled();
      expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["no device id", { deviceId: undefined }],
    ["a device id that is too short", { deviceId: "short" }],
    ["another product", { platform: "reva" }],
    ["something that is not an email", { email: "not-an-email" }],
    ["no email", { email: undefined }],
  ])("refuses %s", async (_name, over) => {
    const res = await mobileRequest(post(over));

    expect(res.status).toBe(400);
    expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});
