import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPaystackSecret, isPaystackLive } from "@/lib/paystackMode";

const KEYS = [
  "PAYSTACK_MODE",
  "VERCEL_ENV",
  "PAYSTACK_SECRET_KEY",
  "PAYSTACK_LIVE_SECRET",
  "PAYSTACK_TEST_SECRET",
  "NEXT_PUBLIC_PAYSTACK_SECRET_KEY",
];

describe("paystackMode", () => {
  beforeEach(() => {
    for (const k of KEYS) vi.stubEnv(k, "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is live in production and test elsewhere", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isPaystackLive()).toBe(true);
    vi.stubEnv("NODE_ENV", "development");
    expect(isPaystackLive()).toBe(false);
  });

  it("is test on a Vercel preview even though NODE_ENV is production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(isPaystackLive()).toBe(false);
  });

  it("lets PAYSTACK_MODE override both ways", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("PAYSTACK_MODE", "live");
    expect(isPaystackLive()).toBe(true);
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("PAYSTACK_MODE", "TEST");
    expect(isPaystackLive()).toBe(false);
  });

  it("picks the secret that matches the mode", () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_live_a");
    vi.stubEnv("PAYSTACK_TEST_SECRET", "sk_test_b");
    vi.stubEnv("PAYSTACK_MODE", "live");
    expect(getPaystackSecret()).toBe("sk_live_a");
    vi.stubEnv("PAYSTACK_MODE", "test");
    expect(getPaystackSecret()).toBe("sk_test_b");
  });

  it("falls back to PAYSTACK_SECRET_KEY in test mode when no test secret is set", () => {
    vi.stubEnv("PAYSTACK_MODE", "test");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_only");
    expect(getPaystackSecret()).toBe("sk_test_only");
  });
});
