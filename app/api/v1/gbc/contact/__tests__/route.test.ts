import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockService = vi.hoisted(() => ({ submitContactForm: vi.fn() }));
const mockRate = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "203.0.113.7"),
}));
vi.mock("@/gbc/services/contactService", () => mockService);
vi.mock("@/lib/auth/rateLimit", () => mockRate);

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
