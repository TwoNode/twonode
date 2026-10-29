import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/** The receipts cron fails closed when CRON_SECRET is not configured (like I-017's reminder cron). */

const check = vi.hoisted(() => vi.fn());
const prune = vi.hoisted(() => vi.fn());
vi.mock("@/lib/push/receipts", () => ({ checkPushReceipts: check }));
vi.mock("@/lib/push/cooldown", () => ({ prunePushCooldowns: prune }));

const { GET } = await import("../route");

const call = (auth?: string) =>
  GET(
    new NextRequest("http://localhost/api/cron/push-receipts", {
      headers: auth ? { authorization: auth } : {},
    })
  );

const RESULT = {
  checked: 2,
  delivered: 1,
  failed: 1,
  removedTokens: 1,
  expired: 0,
  deferred: 0,
};

describe("push-receipts cron", () => {
  const original = process.env.CRON_SECRET;
  beforeEach(() => {
    check.mockReset().mockResolvedValue(RESULT);
    prune.mockReset().mockResolvedValue(3);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("refuses everyone when no secret is configured", async () => {
    delete process.env.CRON_SECRET;
    expect((await call()).status).toBe(401);
    expect((await call("Bearer undefined")).status).toBe(401);
    expect(check).not.toHaveBeenCalled();
    expect(prune).not.toHaveBeenCalled();
  });

  it("refuses a wrong or missing token", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect((await call()).status).toBe(401);
    expect((await call("Bearer nope")).status).toBe(401);
    expect(check).not.toHaveBeenCalled();
  });

  it("runs for the right token and returns the counts", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await call("Bearer s3cret");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      data: { ...RESULT, prunedCooldowns: 3 },
    });
    expect(check).toHaveBeenCalledOnce();
  });

  it("deletes the day-old cool-down rows in the same run", async () => {
    process.env.CRON_SECRET = "s3cret";

    await call("Bearer s3cret");

    expect(prune).toHaveBeenCalledOnce();
  });

  it("answers 500, not a crash, when the check fails", async () => {
    process.env.CRON_SECRET = "s3cret";
    check.mockRejectedValue(new Error("db down"));

    const res = await call("Bearer s3cret");

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, error: "db down" });
  });

  it("answers 500 too when the clean-up fails, after the receipts were read", async () => {
    process.env.CRON_SECRET = "s3cret";
    prune.mockRejectedValue(new Error("db down"));

    const res = await call("Bearer s3cret");

    expect(check).toHaveBeenCalledOnce();
    expect(res.status).toBe(500);
  });
});
