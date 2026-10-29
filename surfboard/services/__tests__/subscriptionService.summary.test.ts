import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  subscription: { findUnique: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/surfboard/services/subscriptionThanksService", () => ({
  sendSubscriptionThanks: vi.fn(),
}));
vi.mock("@/surfboard/services/paystackSubscriptionService", () => ({
  getOrCreatePaystackPlan: vi.fn(),
}));

const { summariseSubscription, getSubscriptionSummary, isSubActiveOrGrace } =
  await import("@/surfboard/services/subscriptionService");

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-20T12:00:00Z");
const sub = (over: Record<string, unknown> = {}) => ({
  status: "active",
  planName: "Surfboard Monthly",
  interval: "monthly",
  currentEnd: new Date(NOW.getTime() + 10 * DAY),
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("summariseSubscription", () => {
  it("says NONE, with nothing else, for someone who never subscribed", () => {
    expect(summariseSubscription(null, NOW)).toEqual({
      state: "NONE",
      planName: null,
      interval: null,
      validUntil: null,
    });
  });

  it("is ACTIVE while the paid period runs", () => {
    expect(summariseSubscription(sub(), NOW)).toEqual({
      state: "ACTIVE",
      planName: "Surfboard Monthly",
      interval: "monthly",
      validUntil: "2026-10-30T12:00:00.000Z",
    });
  });

  it("treats a payment that failed but is still inside the period as ACTIVE", () => {
    expect(summariseSubscription(sub({ status: "past_due" }), NOW).state).toBe(
      "ACTIVE"
    );
  });

  it("is ENDING when it was cancelled but the paid period has not run out", () => {
    expect(summariseSubscription(sub({ status: "canceled" }), NOW).state).toBe(
      "ENDING"
    );
  });

  it("is GRACE for the day after the period ends, the same day the gate still lets the surveyor in", () => {
    const ended = sub({ currentEnd: new Date(NOW.getTime() - 0.5 * DAY) });
    expect(summariseSubscription(ended, NOW).state).toBe("GRACE");
    expect(isSubActiveOrGrace(ended.status, ended.currentEnd, NOW)).toBe(true);
  });

  it("is ENDED once the grace day is over, and still says when it ended", () => {
    const ended = sub({ currentEnd: new Date(NOW.getTime() - 2 * DAY) });
    expect(summariseSubscription(ended, NOW)).toMatchObject({
      state: "ENDED",
      validUntil: "2026-10-18T12:00:00.000Z",
    });
    expect(isSubActiveOrGrace(ended.status, ended.currentEnd, NOW)).toBe(false);
  });

  it("is ENDED for a subscription marked expired, even with a date ahead", () => {
    expect(summariseSubscription(sub({ status: "expired" }), NOW).state).toBe(
      "ENDED"
    );
  });

  it("is ACTIVE with no end date, as the gate treats it", () => {
    expect(summariseSubscription(sub({ currentEnd: null }), NOW)).toMatchObject(
      { state: "ACTIVE", validUntil: null }
    );
  });

  it("never carries a price, a card or a payment reference", () => {
    const json = JSON.stringify(
      summariseSubscription(
        {
          ...sub(),
          amount: 5000,
          authorization: "AUTH_secret",
          emailToken: "tok",
        } as never,
        NOW
      )
    );
    expect(json).not.toMatch(/5000|AUTH_secret|tok"/);
  });
});

describe("getSubscriptionSummary", () => {
  it("reads only the four columns it needs", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    await getSubscriptionSummary("u1");
    expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
      where: { userId: "u1" },
      select: {
        status: true,
        planName: true,
        interval: true,
        currentEnd: true,
      },
    });
  });
});
