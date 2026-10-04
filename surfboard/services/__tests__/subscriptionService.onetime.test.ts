import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  subscription: { findUnique: vi.fn(), upsert: vi.fn() },
  subscriptionHistory: { findFirst: vi.fn(), create: vi.fn() },
}));
const mockPlan = vi.hoisted(() => ({
  getOrCreatePaystackPlan: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/surfboard/services/paystackSubscriptionService", () => mockPlan);

const { applyOneTimeSubscriptionPayment } =
  await import("@/surfboard/services/subscriptionService");

const base = {
  userId: "user-1",
  reference: "SURFBOARD_ONETIME_SUB_live_1_user-1",
  planId: "monthly" as const,
  customerCode: "CUS_1",
  customerId: "1",
  authorization: "AUTH_1",
  paidAt: "2026-10-04T10:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPlan.getOrCreatePaystackPlan.mockResolvedValue({
    plan_code: "PLN_1",
    name: "SURF_MONTHLY",
    interval: "monthly",
    amount: 1670000,
    currency: "NGN",
  });
  mockPrisma.subscription.upsert.mockResolvedValue({
    userId: "user-1",
    planName: "SURF_MONTHLY",
  });
});

describe("applyOneTimeSubscriptionPayment", () => {
  it("applies a new payment and records its reference in the history ledger", async () => {
    mockPrisma.subscriptionHistory.findFirst
      .mockResolvedValueOnce(null) // single-use check
      .mockResolvedValueOnce(null); // createOrUpdateSubscription's own dedupe

    const result = await applyOneTimeSubscriptionPayment(base);

    expect(result.status).toBe("applied");
    expect(mockPrisma.subscription.upsert).toHaveBeenCalledTimes(1);
    expect(
      mockPrisma.subscription.upsert.mock.calls[0][0].update
    ).toMatchObject({ provider: "paystack_onetime", status: "active" });
    expect(mockPrisma.subscriptionHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        reference: base.reference,
        eventType: "subscription.create",
      }),
    });
  });

  it("does not apply the same reference twice for the same user — a replay or a late webhook can't rewrite a newer period", async () => {
    mockPrisma.subscriptionHistory.findFirst.mockResolvedValueOnce({
      userId: "user-1",
    });
    mockPrisma.subscription.findUnique.mockResolvedValueOnce({
      userId: "user-1",
      planName: "SURF_MONTHLY",
    });

    const result = await applyOneTimeSubscriptionPayment(base);

    expect(result.status).toBe("already_applied");
    expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.subscriptionHistory.create).not.toHaveBeenCalled();
  });

  it("refuses a reference that was already applied to a different account", async () => {
    mockPrisma.subscriptionHistory.findFirst.mockResolvedValueOnce({
      userId: "user-2",
    });

    const result = await applyOneTimeSubscriptionPayment(base);

    expect(result).toEqual({ status: "used_by_another_account" });
    expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled();
  });
});
