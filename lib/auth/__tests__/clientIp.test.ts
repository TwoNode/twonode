import { describe, it, expect } from "vitest";
import { getClientIp } from "../rateLimit";

const req = (h: Record<string, string>) => ({
  headers: { get: (n: string) => h[n.toLowerCase()] ?? null },
});

describe("getClientIp", () => {
  it("prefers the platform header over a caller-supplied x-forwarded-for", () => {
    expect(
      getClientIp(
        req({
          "x-vercel-forwarded-for": "203.0.113.5",
          "x-forwarded-for": "1.2.3.4, 203.0.113.5",
        })
      )
    ).toBe("203.0.113.5");
  });
  it("then x-real-ip, then the first x-forwarded-for value", () => {
    expect(
      getClientIp(
        req({ "x-real-ip": "198.51.100.2", "x-forwarded-for": "9.9.9.9" })
      )
    ).toBe("198.51.100.2");
    expect(getClientIp(req({ "x-forwarded-for": "9.9.9.9, 8.8.8.8" }))).toBe(
      "9.9.9.9"
    );
  });
  it("falls back to loopback when nothing is set or the header is empty", () => {
    expect(getClientIp(req({}))).toBe("127.0.0.1");
    expect(getClientIp(req({ "x-forwarded-for": "" }))).toBe("127.0.0.1");
  });
});
