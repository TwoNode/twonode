import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  gate: vi.fn(),
  rate: vi.fn(),
  close: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/auth/session", async (original) => ({
  ...(await original<typeof import("@/lib/auth/session")>()),
  getServerSession: mocks.session,
}));
vi.mock("@/lib/api/mobileApp", async (original) => ({
  ...(await original<typeof import("@/lib/api/mobileApp")>()),
  isMobileRequest: () => true,
  assertMobileClientAllowed: mocks.gate,
}));
vi.mock("@/lib/auth/rateLimit", () => ({ consumeRateLimit: mocks.rate }));
vi.mock("@/surfboard/services/accountClosureService", () => ({
  closeSurveyorAccount: mocks.close,
}));

const { POST } = await import("@/app/api/v1/auth/mobile/delete-account/route");
const { ApiError, ValidationError } = await import("@/lib/api/errors");

const post = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/v1/auth/mobile/delete-account", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      authorization: "Bearer token",
      "content-type": "application/json",
      "x-app-version": "1.0.0",
      "x-app-platform": "android",
    },
    body: JSON.stringify(body),
  });

const session = (over: Record<string, unknown> = {}) => ({
  sub: "user-1",
  role: "USER",
  platform: "surfboard",
  emailVerified: true,
  mustVerifyNow: false,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue(session());
  mocks.gate.mockResolvedValue(undefined);
  mocks.rate.mockResolvedValue(true);
  mocks.close.mockResolvedValue({ closed: true });
});

describe("POST /api/v1/auth/mobile/delete-account", () => {
  it("closes the signed-in person's own account, with the password they typed", async () => {
    const res = await POST(post({ platform: "surfboard", password: "pw" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await res.json()).data).toEqual({ closed: true });
    expect(mocks.close).toHaveBeenCalledWith("user-1", "pw");
  });

  it("takes whose account it is from the session, never from the body", async () => {
    await POST(
      post({
        platform: "surfboard",
        password: "pw",
        userId: "someone-else",
        id: "x",
      })
    );
    expect(mocks.close).toHaveBeenCalledWith("user-1", "pw");
  });

  it("is not open to a signed-out caller (401)", async () => {
    mocks.session.mockResolvedValue(null);
    const res = await POST(post({ platform: "surfboard", password: "pw" }));
    expect(res.status).toBe(401);
    expect(mocks.close).not.toHaveBeenCalled();
  });

  it("is refused to any role but a surveyor (403)", async () => {
    mocks.session.mockResolvedValue(session({ role: "ADMIN" }));
    const res = await POST(post({ platform: "surfboard", password: "pw" }));
    expect(res.status).toBe(403);
    expect(mocks.close).not.toHaveBeenCalled();
  });

  it("is allowed while the email is unverified (someone who just signed up may change their mind)", async () => {
    mocks.session.mockResolvedValue(
      session({ emailVerified: false, mustVerifyNow: true })
    );
    const res = await POST(post({ platform: "surfboard", password: "pw" }));
    expect(res.status).toBe(200);
  });

  it("counts every try per account before checking, and answers 429 over five an hour", async () => {
    await POST(post({ platform: "surfboard", password: "pw" }));
    expect(mocks.rate).toHaveBeenCalledWith("delete-account:user-1", "user-1", {
      max: 5,
      windowMs: 60 * 60 * 1000,
    });
    mocks.rate.mockResolvedValue(false);
    const res = await POST(post({ platform: "surfboard", password: "pw" }));
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("RATE_LIMITED");
    expect(mocks.close).toHaveBeenCalledTimes(1);
  });

  it("passes a wrong password on as a 400 naming `password`", async () => {
    mocks.close.mockRejectedValue(
      new ValidationError({ password: "Incorrect password" })
    );
    const res = await POST(post({ platform: "surfboard", password: "nope" }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.code).toBe("VALIDATION_ERROR");
    expect(json.details.password).toBe("Incorrect password");
  });

  it("passes a blocked closure on as 409 ACCOUNT_CLOSURE_BLOCKED with the reasons", async () => {
    mocks.close.mockRejectedValue(
      new ApiError(
        409,
        "ACCOUNT_CLOSURE_BLOCKED",
        "There is money in the wallet",
        {
          reasons: ["WALLET_BALANCE"],
        }
      )
    );
    const res = await POST(post({ platform: "surfboard", password: "pw" }));
    const json = await res.json();
    expect(res.status).toBe(409);
    expect(json.code).toBe("ACCOUNT_CLOSURE_BLOCKED");
    expect(json.details).toEqual({ reasons: ["WALLET_BALANCE"] });
  });

  it("passes a subscription that could not be cancelled on as 502", async () => {
    mocks.close.mockRejectedValue(
      new ApiError(502, "SUBSCRIPTION_CANCEL_FAILED", "not cancelled")
    );
    const res = await POST(post({ platform: "surfboard", password: "pw" }));
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe("SUBSCRIPTION_CANCEL_FAILED");
  });

  it.each([
    ["no password", { platform: "surfboard" }],
    ["a blank password", { platform: "surfboard", password: "" }],
    [
      "a password over 72 characters",
      { platform: "surfboard", password: "x".repeat(73) },
    ],
    ["another platform", { platform: "reva", password: "pw" }],
  ])(
    "refuses %s with 400 VALIDATION_ERROR before anything is counted or closed",
    async (_name, body) => {
      const res = await POST(post(body));
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("VALIDATION_ERROR");
      expect(mocks.close).not.toHaveBeenCalled();
    }
  );

  it("is told to update (426) before anything else when the build is too old", async () => {
    const { AppUpdateRequiredError } = await import("@/lib/api/errors");
    mocks.gate.mockRejectedValue(
      new AppUpdateRequiredError({
        platform: "android",
        minimumVersion: "2.0.0",
        storeUrl: "",
      })
    );
    const res = await POST(post({ platform: "surfboard", password: "pw" }));
    expect(res.status).toBe(426);
    expect(mocks.close).not.toHaveBeenCalled();
  });
});
