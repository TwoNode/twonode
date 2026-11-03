import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRate = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  recordAttempt: vi.fn(),
  getClientIp: vi.fn(() => "1.2.3.4"),
}));
const mockLookup = vi.hoisted(() => ({ findUserByEmail: vi.fn() }));

vi.mock("@/lib/auth/rateLimit", () => mockRate);
vi.mock("@/lib/auth/userLookup", () => mockLookup);
vi.mock("@/lib/auth/session", () => ({ issueSession: vi.fn() }));
// These tests are about the rate-limit key, not the password check: do not pay a real bcrypt hash per call.
const mockVerify = vi.hoisted(() => ({ verifyPassword: vi.fn() }));
vi.mock("@/lib/auth/passwordCheck", () => mockVerify);

const { POST: login } = await import("@/app/api/v1/auth/login/route");

const post = (email: string) =>
  new NextRequest("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify({ platform: "surfboard", email, password: "x" }),
  });

describe("POST /login rate-limit key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRate.checkRateLimit.mockResolvedValue(true);
    mockLookup.findUserByEmail.mockResolvedValue(null);
    mockVerify.verifyPassword.mockResolvedValue(false);
  });

  it("is the same for every casing of one address, so changing case can't reset the limit", async () => {
    await login(post("John@Example.com"));
    await login(post("JOHN@EXAMPLE.COM"));
    await login(post("john@example.com"));

    const keys = mockRate.checkRateLimit.mock.calls.map((c) => c[0]);
    expect(keys).toHaveLength(3);
    expect(new Set(keys)).toEqual(new Set(["1.2.3.4:john@example.com"]));
    expect(mockRate.recordAttempt).toHaveBeenCalledWith(
      "1.2.3.4:john@example.com",
      undefined
    );
  });

  it("looks the account up with the address as typed (the lookup itself is case-insensitive)", async () => {
    await login(post("John@Example.com"));
    expect(mockLookup.findUserByEmail).toHaveBeenCalledWith(
      "surfboard",
      "John@Example.com"
    );
  });
});

describe("POST /login password check (I-054)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRate.checkRateLimit.mockResolvedValue(true);
    mockVerify.verifyPassword.mockResolvedValue(false);
  });

  it("checks the password once whether the email is unknown, has no password, or is a real account", async () => {
    mockLookup.findUserByEmail.mockResolvedValueOnce(null);
    const unknown = await login(post("a@example.com"));
    mockLookup.findUserByEmail.mockResolvedValueOnce({
      id: "u2",
      passwordHash: null,
    });
    const kindeOnly = await login(post("b@example.com"));
    mockLookup.findUserByEmail.mockResolvedValueOnce({
      id: "u3",
      passwordHash: "stored-hash",
    });
    const wrong = await login(post("c@example.com"));

    expect(mockVerify.verifyPassword.mock.calls).toEqual([
      ["x", undefined],
      ["x", null],
      ["x", "stored-hash"],
    ]);
    for (const res of [unknown, kindeOnly, wrong]) {
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({
        success: false,
        error: "Invalid email or password",
      });
    }
  });
});
