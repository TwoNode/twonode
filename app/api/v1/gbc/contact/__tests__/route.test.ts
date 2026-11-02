import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockService = vi.hoisted(() => ({ submitContactForm: vi.fn() }));
const mockRate = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "203.0.113.7"),
}));
const mockTurnstile = vi.hoisted(() => ({
  isTurnstileEnabled: vi.fn(() => false),
  verifyTurnstile: vi.fn(),
}));
vi.mock("@/gbc/services/contactService", () => mockService);
vi.mock("@/lib/auth/rateLimit", () => mockRate);
vi.mock("@/lib/security/turnstile", () => mockTurnstile);

const { POST } = await import("@/app/api/v1/gbc/contact/route");

const URL = "http://localhost:3000/api/v1/gbc/contact";
const GOOD = {
  name: "Jane Doe",
  email: "Jane@Example.com",
  subject: "Sponsorship question",
  message: "How do I become a sponsor this year?",
  type: "SPONSORSHIP",
  fax: "",
  fillTimeMs: 30_000,
};

const post = (body: unknown) =>
  new NextRequest(URL, {
    method: "POST",
    headers: { host: "localhost:3000", "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockRate.consumeRateLimit.mockResolvedValue(true);
  mockService.submitContactForm.mockResolvedValue({ id: "i1" });
  // Off unless a test turns it on, like an environment without the keys.
  mockTurnstile.isTurnstileEnabled.mockReturnValue(false);
  mockTurnstile.verifyTurnstile.mockResolvedValue({ ok: true });
});

describe("POST /api/v1/gbc/contact", () => {
  it("saves a normal submission, without the anti-abuse fields", async () => {
    const res = await POST(post(GOOD));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    const [data, opts] = mockService.submitContactForm.mock.calls[0];
    expect(data).not.toHaveProperty("fax");
    expect(data).not.toHaveProperty("fillTimeMs");
    expect(data.email).toBe("Jane@Example.com");
    expect(opts).toEqual({ sendConfirmation: true });
  });

  it("answers a filled honeypot as a success and saves and sends nothing", async () => {
    const res = await POST(post({ ...GOOD, fax: "555" }));

    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(mockService.submitContactForm).not.toHaveBeenCalled();
    expect(mockRate.consumeRateLimit).not.toHaveBeenCalled();
  });

  it("asks the sender to try again when the form was filled too fast", async () => {
    const res = await POST(post({ ...GOOD, fillTimeMs: 1800 }));

    expect(res.status).toBe(400);
    expect((await res.json()).success).toBe(false);
    expect(mockService.submitContactForm).not.toHaveBeenCalled();
  });

  it("rejects a submission with no fill time (a script posting straight to the API)", async () => {
    const { fillTimeMs: _drop, ...noTime } = GOOD;
    const res = await POST(post(noTime));

    expect(res.status).toBe(400);
    expect(mockService.submitContactForm).not.toHaveBeenCalled();
  });

  it("still rejects an invalid inquiry", async () => {
    const res = await POST(post({ ...GOOD, email: "not-an-email" }));

    expect(res.status).toBe(400);
    expect(mockService.submitContactForm).not.toHaveBeenCalled();
  });

  it("limits per client address: 5 an hour", async () => {
    mockRate.consumeRateLimit.mockImplementation(async (id: string) =>
      id.startsWith("contact-ip:") ? false : true
    );
    const res = await POST(post(GOOD));

    expect(res.status).toBe(429);
    expect(mockService.submitContactForm).not.toHaveBeenCalled();
    expect(mockRate.consumeRateLimit).toHaveBeenCalledWith(
      "contact-ip:203.0.113.7",
      undefined,
      { max: 5, windowMs: 3_600_000 }
    );
  });

  it("limits per sender address, ignoring letter case: 2 a day", async () => {
    mockRate.consumeRateLimit.mockImplementation(async (id: string) =>
      id.startsWith("contact-email:") ? false : true
    );
    const res = await POST(post(GOOD));

    expect(res.status).toBe(429);
    expect(mockService.submitContactForm).not.toHaveBeenCalled();
    expect(mockRate.consumeRateLimit).toHaveBeenCalledWith(
      "contact-email:jane@example.com",
      undefined,
      { max: 2, windowMs: 86_400_000 }
    );
  });

  it("past the overall limit it keeps the inquiry but skips the confirmation mail", async () => {
    mockRate.consumeRateLimit.mockImplementation(async (id: string) =>
      id === "contact-confirmation-all" ? false : true
    );
    const res = await POST(post(GOOD));

    expect(res.status).toBe(200);
    expect(mockService.submitContactForm).toHaveBeenCalledWith(
      expect.objectContaining({ email: "Jane@Example.com" }),
      { sendConfirmation: false }
    );
  });
});

describe("POST /api/v1/gbc/contact with Cloudflare Turnstile switched on (I-057)", () => {
  const WITH_TOKEN = { ...GOOD, turnstileToken: "XXXX.token.XXXX" };

  beforeEach(() => {
    mockTurnstile.isTurnstileEnabled.mockReturnValue(true);
  });

  it("checks the token for this form, the visitor's address and host, then saves the inquiry without the token", async () => {
    const res = await POST(post(WITH_TOKEN));

    expect(res.status).toBe(200);
    expect(mockTurnstile.verifyTurnstile).toHaveBeenCalledWith({
      token: "XXXX.token.XXXX",
      action: "contact",
      remoteIp: "203.0.113.7",
      requestHost: "localhost:3000",
    });
    const [data] = mockService.submitContactForm.mock.calls[0];
    expect(data).not.toHaveProperty("turnstileToken");
  });

  it("refuses a missing token with 403 and saves nothing", async () => {
    mockTurnstile.verifyTurnstile.mockResolvedValue({
      ok: false,
      reason: "missing-token",
    });
    const res = await POST(post(GOOD));

    expect(res.status).toBe(403);
    expect((await res.json()).success).toBe(false);
    expect(mockTurnstile.verifyTurnstile).toHaveBeenCalledWith(
      expect.objectContaining({ token: undefined })
    );
    expect(mockService.submitContactForm).not.toHaveBeenCalled();
  });

  it.each(["rejected", "wrong-action", "wrong-hostname"])(
    "refuses a token that fails as '%s' with 403 and saves nothing",
    async (reason) => {
      mockTurnstile.verifyTurnstile.mockResolvedValue({ ok: false, reason });
      const res = await POST(post(WITH_TOKEN));

      expect(res.status).toBe(403);
      expect(mockService.submitContactForm).not.toHaveBeenCalled();
    }
  );

  it("logs why a token was refused, and never the token itself", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockTurnstile.verifyTurnstile.mockResolvedValue({
      ok: false,
      reason: "rejected",
      codes: ["timeout-or-duplicate"],
    });
    await POST(post(WITH_TOKEN));

    expect(warn).toHaveBeenCalledWith(
      "[contact] Turnstile refused:",
      "rejected",
      ["timeout-or-duplicate"]
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain("XXXX.token.XXXX");
    warn.mockRestore();
  });

  it("answers 503, not 403, when Cloudflare cannot be reached, and saves nothing", async () => {
    mockTurnstile.verifyTurnstile.mockResolvedValue({
      ok: false,
      reason: "unavailable",
    });
    const res = await POST(post(WITH_TOKEN));

    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/temporarily unavailable/i);
    expect(mockService.submitContactForm).not.toHaveBeenCalled();
  });

  it("does not use up the sender's daily allowance when the token fails", async () => {
    mockTurnstile.verifyTurnstile.mockResolvedValue({
      ok: false,
      reason: "rejected",
    });
    await POST(post(WITH_TOKEN));

    const ids = mockRate.consumeRateLimit.mock.calls.map((c) => c[0]);
    expect(ids).toEqual(["contact-ip:203.0.113.7"]);
  });

  it("is not asked at all while the cheap checks fail first: honeypot, fill time, per-address limit", async () => {
    await POST(post({ ...WITH_TOKEN, fax: "555" }));
    await POST(post({ ...WITH_TOKEN, fillTimeMs: 1800 }));
    mockRate.consumeRateLimit.mockResolvedValue(false);
    await POST(post(WITH_TOKEN));

    expect(mockTurnstile.verifyTurnstile).not.toHaveBeenCalled();
  });

  it("is not asked, and no token is needed, while it is switched off", async () => {
    mockTurnstile.isTurnstileEnabled.mockReturnValue(false);
    const res = await POST(post(GOOD));

    expect(res.status).toBe(200);
    expect(mockTurnstile.verifyTurnstile).not.toHaveBeenCalled();
    expect(mockService.submitContactForm).toHaveBeenCalled();
  });

  it("never lets an over-long token through the schema", async () => {
    const res = await POST(post({ ...GOOD, turnstileToken: "x".repeat(2049) }));

    expect(res.status).toBe(400);
    expect(mockTurnstile.verifyTurnstile).not.toHaveBeenCalled();
    expect(mockService.submitContactForm).not.toHaveBeenCalled();
  });
});
