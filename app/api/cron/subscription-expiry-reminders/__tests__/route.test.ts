import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/** I-017: the cron route fails closed when CRON_SECRET is not configured. */

const send = vi.hoisted(() => vi.fn());
vi.mock("@/surfboard/services/subscriptionReminderService", () => ({
  sendExpiringSubscriptionReminders: send,
}));

const { GET } = await import("../route");

const call = (auth?: string) =>
  GET(
    new NextRequest("http://localhost/api/cron/subscription-expiry-reminders", {
      headers: auth ? { authorization: auth } : {},
    })
  );

describe("subscription-expiry-reminders cron", () => {
  const original = process.env.CRON_SECRET;
  beforeEach(() => send.mockReset().mockResolvedValue({ sent: 0 }));
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("refuses everyone when no secret is configured", async () => {
    delete process.env.CRON_SECRET;
    expect((await call()).status).toBe(401);
    expect((await call("Bearer undefined")).status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a wrong or missing token", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect((await call()).status).toBe(401);
    expect((await call("Bearer nope")).status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it("runs for the right token", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect((await call("Bearer s3cret")).status).toBe(200);
    expect(send).toHaveBeenCalledOnce();
  });
});
