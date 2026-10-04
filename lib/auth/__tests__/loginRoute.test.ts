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
