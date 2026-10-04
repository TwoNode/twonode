import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRate = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "1.2.3.4"),
}));
const mockSession = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  issueSession: vi.fn(),
}));
const mockLookup = vi.hoisted(() => ({ findUserById: vi.fn() }));
const mockOtp = vi.hoisted(() => ({ verifyEmailOtp: vi.fn() }));

vi.mock("@/lib/auth/rateLimit", () => mockRate);
vi.mock("@/lib/auth/session", () => mockSession);
vi.mock("@/lib/auth/userLookup", () => mockLookup);
vi.mock("@/lib/auth/emailVerificationOtp", () => mockOtp);

const { POST } = await import("@/app/api/v1/auth/verify-email-otp/route");

const post = (body: Record<string, unknown>) =>
  new NextRequest("http://localhost:3000/api/v1/auth/verify-email-otp", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify({ platform: "surfboard", code: "123456", ...body }),
  });

describe("POST /verify-email-otp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRate.consumeRateLimit.mockResolvedValue(true);
    mockOtp.verifyEmailOtp.mockResolvedValue(true);
    mockLookup.findUserById.mockResolvedValue({
      id: "me",
      role: "USER",
      emailVerified: true,
      createdAt: new Date(),
    });
  });

  it("requires a session: without one it is 401 and neither the limiter nor the verifier runs", async () => {
    mockSession.getServerSession.mockResolvedValue(null);

    const res = await POST(post({}));

    expect(res.status).toBe(401);
    expect(mockOtp.verifyEmailOtp).not.toHaveBeenCalled();
    expect(mockRate.consumeRateLimit).not.toHaveBeenCalled();
  });

  it("ignores a body-supplied userId — an unauthenticated caller can't aim guesses at another account", async () => {
    mockSession.getServerSession.mockResolvedValue(null);

    const res = await POST(post({ userId: "victim" }));

    expect(res.status).toBe(401);
    expect(mockOtp.verifyEmailOtp).not.toHaveBeenCalled();
  });

  it("verifies the SESSION's user even when the body names someone else", async () => {
    mockSession.getServerSession.mockResolvedValue({
      sub: "me",
      role: "USER",
    });

    const res = await POST(post({ userId: "victim" }));

    expect(res.status).toBe(200);
    expect(mockOtp.verifyEmailOtp).toHaveBeenCalledWith(
      "surfboard",
      "me",
      "123456"
    );
  });

  it("is 429 when the limiter refuses, without comparing the code", async () => {
    mockSession.getServerSession.mockResolvedValue({
      sub: "me",
      role: "USER",
    });
    mockRate.consumeRateLimit.mockResolvedValue(false);

    const res = await POST(post({}));

    expect(res.status).toBe(429);
    expect(mockOtp.verifyEmailOtp).not.toHaveBeenCalled();
  });

  it("re-issues the session after a successful verification so the gate lifts without a re-login", async () => {
    mockSession.getServerSession.mockResolvedValue({
      sub: "me",
      role: "USER",
    });

    await POST(post({}));

    expect(mockSession.issueSession).toHaveBeenCalledWith(
      "me",
      "USER",
      "surfboard",
      expect.any(Number),
      expect.objectContaining({ id: "me" })
    );
  });
});
