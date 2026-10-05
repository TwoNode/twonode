import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPaystack = vi.hoisted(() => ({
  transaction: { verify: vi.fn() },
}));
const mockConfig = vi.hoisted(() => ({
  createPaystackInstance: vi.fn(),
  logPaystackEnvironment: vi.fn(),
  getPaystackSecretForWebhook: vi.fn(),
}));
const mockSubs = vi.hoisted(() => ({
  applyOneTimeSubscriptionPayment: vi.fn(),
  createOrUpdateSubscription: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/utils/paystackConfig", () => mockConfig);
vi.mock("@/surfboard/services/subscriptionService", () => mockSubs);

const {
  verifyOneTimeSubscription,
  initiateOneTimeSubscription,
  verifySubscription,
} = await import("@/surfboard/services/paystackSubscriptionService");
const { userIdFromOneTimeReference } =
  await import("@/surfboard/services/oneTimePayment");

const USER = "user-1";
const REF = `SURFBOARD_ONETIME_SUB_test_1_${USER}`;

const successfulTx = (over: Record<string, unknown> = {}) => ({
  data: {
    status: "success",
    reference: REF,
    amount: 16700 * 100,
    currency: "NGN",
    paid_at: "2026-10-04T10:00:00Z",
    customer: { id: 7, customer_code: "CUS_7" },
    authorization: { authorization_code: "AUTH_7" },
    ...over,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockConfig.createPaystackInstance.mockResolvedValue(mockPaystack);
  mockPaystack.transaction.verify.mockResolvedValue(successfulTx());
  mockSubs.applyOneTimeSubscriptionPayment.mockResolvedValue({
    status: "applied",
    subscription: { planName: "SURF_MONTHLY" },
  });
});

describe("verifyOneTimeSubscription", () => {
  it("applies a payment that covers the claimed plan and was issued to this user", async () => {
    const result = await verifyOneTimeSubscription(USER, REF, "monthly");

    expect(result.planName).toBe("SURF_MONTHLY");
    expect(mockSubs.applyOneTimeSubscriptionPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER,
        reference: REF,
        planId: "monthly",
        customerCode: "CUS_7",
        paidAt: "2026-10-04T10:00:00Z",
      })
    );
  });

  it("rejects a small payment claimed as the annual plan, and applies nothing", async () => {
    mockPaystack.transaction.verify.mockResolvedValue(
      successfulTx({ amount: 100 * 100 })
    );

    await expect(
      verifyOneTimeSubscription(USER, REF, "annually")
    ).rejects.toMatchObject({ status: 400, code: "UNDERPAID" });
    expect(mockSubs.applyOneTimeSubscriptionPayment).not.toHaveBeenCalled();
  });

  it("tells the payer what to do: the message includes the reference to quote to support", async () => {
    mockPaystack.transaction.verify.mockResolvedValue(
      successfulTx({ amount: 100 * 100 })
    );
    await expect(
      verifyOneTimeSubscription(USER, REF, "annually")
    ).rejects.toThrow(new RegExp(`contact support with reference ${REF}`));
  });

  it("refuses someone else's reference before calling Paystack at all", async () => {
    await expect(
      verifyOneTimeSubscription(
        "attacker",
        `SURFBOARD_ONETIME_SUB_test_1_victim`,
        "monthly"
      )
    ).rejects.toMatchObject({
      status: 403,
      code: "REFERENCE_NOT_ISSUED_TO_USER",
    });
    expect(mockConfig.createPaystackInstance).not.toHaveBeenCalled();
    expect(mockSubs.applyOneTimeSubscriptionPayment).not.toHaveBeenCalled();
  });

  it("refuses a reference that isn't one-time-shaped (e.g. a recurring or REVA payment's)", async () => {
    await expect(
      verifyOneTimeSubscription(USER, "REVA_123", "monthly")
    ).rejects.toMatchObject({ code: "REFERENCE_NOT_ISSUED_TO_USER" });
    expect(mockPaystack.transaction.verify).not.toHaveBeenCalled();
  });

  it("rejects a prototype key as the plan id", async () => {
    await expect(
      verifyOneTimeSubscription(USER, REF, "constructor")
    ).rejects.toMatchObject({ status: 400 });
    expect(mockPaystack.transaction.verify).not.toHaveBeenCalled();
  });

  it("rejects a transaction in another currency", async () => {
    mockPaystack.transaction.verify.mockResolvedValue(
      successfulTx({ currency: "USD" })
    );
    await expect(
      verifyOneTimeSubscription(USER, REF, "monthly")
    ).rejects.toMatchObject({ code: "WRONG_CURRENCY" });
  });

  it("does not grant anything for a transaction that isn't successful", async () => {
    mockPaystack.transaction.verify.mockResolvedValue(
      successfulTx({ status: "abandoned", gateway_response: "Abandoned" })
    );
    await expect(
      verifyOneTimeSubscription(USER, REF, "monthly")
    ).rejects.toThrow("Abandoned");
    expect(mockSubs.applyOneTimeSubscriptionPayment).not.toHaveBeenCalled();
  });

  it("answers 409 when the payment was already applied to another account", async () => {
    mockSubs.applyOneTimeSubscriptionPayment.mockResolvedValue({
      status: "used_by_another_account",
    });
    await expect(
      verifyOneTimeSubscription(USER, REF, "monthly")
    ).rejects.toMatchObject({ status: 409, code: "PAYMENT_ALREADY_USED" });
  });

  it("treats a repeat of an already-applied payment as success", async () => {
    mockSubs.applyOneTimeSubscriptionPayment.mockResolvedValue({
      status: "already_applied",
      subscription: { planName: "SURF_MONTHLY" },
    });
    await expect(
      verifyOneTimeSubscription(USER, REF, "monthly")
    ).resolves.toMatchObject({ planName: "SURF_MONTHLY" });
  });
});

describe("initiateOneTimeSubscription", () => {
  it("issues a reference bound to the user, which verify will then accept", async () => {
    // getOrCreatePaystackPlan talks to Paystack; stub the plan list so the
    // existing-plan branch returns without creating anything.
    (mockPaystack as any).plan = {
      list: vi.fn().mockResolvedValue({
        data: [
          {
            name: "SURF_MONTHLY",
            is_deleted: false,
            is_archived: false,
            interval: "monthly",
          },
        ],
      }),
    };

    const out = await initiateOneTimeSubscription(USER, "a@b.co", "monthly");

    expect(userIdFromOneTimeReference(out.reference)).toBe(USER);
    expect(out.amount).toBe(16700);
    await expect(
      initiateOneTimeSubscription(USER, "a@b.co", "constructor" as any)
    ).rejects.toMatchObject({ status: 400 });
  });

  it("does not return other customers' subscriptions from the Paystack plan", async () => {
    (mockPaystack as any).plan = {
      list: vi.fn().mockResolvedValue({
        data: [
          {
            id: 9,
            name: "SURF_MONTHLY",
            plan_code: "PLN_9",
            amount: 1670000,
            currency: "NGN",
            interval: "monthly",
            is_deleted: false,
            is_archived: false,
            subscriptions: [
              {
                subscription_code: "SUB_other",
                email_token: "secret-token",
                authorization: 123,
                customer: 55,
              },
            ],
            total_subscriptions_revenue: 999,
          },
        ],
      }),
    };

    const out = await initiateOneTimeSubscription(USER, "a@b.co", "monthly");

    expect(out.plan).toEqual({
      id: 9,
      name: "SURF_MONTHLY",
      plan_code: "PLN_9",
      amount: 1670000,
      interval: "monthly",
      currency: "NGN",
      description: undefined,
    });
    expect(JSON.stringify(out)).not.toMatch(/SUB_other|secret-token/);
  });
});

describe("verifySubscription (recurring) — reference ownership", () => {
  it("refuses a reference issued to another account without calling Paystack", async () => {
    mockPaystack.transaction.verify.mockClear();

    for (const reference of [
      "SURFBOARD_SUB_live_1700000000000_someone-else",
      "SURFBOARD_ONETIME_SUB_live_1700000000000_user-1",
      "abc",
      "",
    ]) {
      await expect(verifySubscription(USER, reference)).rejects.toMatchObject({
        status: 403,
        code: "REFERENCE_NOT_ISSUED_TO_USER",
      });
    }
    expect(mockPaystack.transaction.verify).not.toHaveBeenCalled();
  });

  it("goes on to verify with Paystack for the account's own reference", async () => {
    mockPaystack.transaction.verify.mockResolvedValue({
      data: { status: "abandoned", gateway_response: "not paid" },
    });

    await expect(
      verifySubscription(USER, `SURFBOARD_SUB_test_1700000000000_${USER}`)
    ).rejects.toThrow("not paid");
    expect(mockPaystack.transaction.verify).toHaveBeenCalledTimes(1);
  });
});
