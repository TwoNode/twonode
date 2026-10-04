import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockPrisma = vi.hoisted(() => ({
  loginAttempt: { create: vi.fn(), count: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

const { validateCSRF } = await import("@/lib/auth/csrf");
const { consumeRateLimit, checkRateLimit } =
  await import("@/lib/auth/rateLimit");

const req = (headers: Record<string, string>) =>
  new NextRequest("http://localhost:3000/api/x", { method: "POST", headers });

describe("validateCSRF", () => {
  it("accepts a same-host Origin", () => {
    expect(
      validateCSRF(
        req({ host: "localhost:3000", origin: "http://localhost:3000" })
      )
    ).toBe(true);
  });

  it("rejects a cross-host Origin", () => {
    expect(
      validateCSRF(
        req({ host: "localhost:3000", origin: "https://evil.example" })
      )
    ).toBe(false);
  });

  it("returns false (not a thrown TypeError -> 500) for 'Origin: null'", () => {
    expect(() =>
      validateCSRF(req({ host: "localhost:3000", origin: "null" }))
    ).not.toThrow();
    expect(validateCSRF(req({ host: "localhost:3000", origin: "null" }))).toBe(
      false
    );
  });

  it("falls back to Referer, and rejects when both headers are missing", () => {
    expect(
      validateCSRF(
        req({ host: "localhost:3000", referer: "http://localhost:3000/a" })
      )
    ).toBe(true);
    expect(validateCSRF(req({ host: "localhost:3000" }))).toBe(false);
  });
});

describe("consumeRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.loginAttempt.create.mockResolvedValue({});
  });

  it("records the attempt BEFORE counting, so successes and parallel bursts are counted", async () => {
    mockPrisma.loginAttempt.count.mockResolvedValueOnce(1);
    await consumeRateLimit("register-send:1.2.3.4");
    expect(
      mockPrisma.loginAttempt.create.mock.invocationCallOrder[0]
    ).toBeLessThan(mockPrisma.loginAttempt.count.mock.invocationCallOrder[0]);
  });

  it("allows 5 attempts in the window and blocks the 6th (same threshold as checkRateLimit)", async () => {
    mockPrisma.loginAttempt.count.mockResolvedValueOnce(5);
    expect(await consumeRateLimit("k")).toBe(true);
    mockPrisma.loginAttempt.count.mockResolvedValueOnce(6);
    expect(await consumeRateLimit("k")).toBe(false);

    mockPrisma.loginAttempt.count.mockResolvedValueOnce(4);
    expect(await checkRateLimit("k")).toBe(true);
    mockPrisma.loginAttempt.count.mockResolvedValueOnce(5);
    expect(await checkRateLimit("k")).toBe(false);
  });
});
