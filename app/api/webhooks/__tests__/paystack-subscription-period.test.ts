import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Surfboard recurring-subscription events through the shared Paystack
 * webhook. Time is bought by a PAYMENT and credited exactly once through
 * applyPaymentPeriod (keyed by the payment's reference):
 *   - charge.success credits the payment (a renewal, or a first charge that
 *     reaches the webhook before the client's verify call);
 *   - subscription.create carries no transaction reference, so it only syncs
 *     Paystack's identity/billing fields and never touches the paid period —
 *     otherwise one payment would be credited by both events.
 */

const ledger = vi.hoisted(() => ({ rows: [] as any[] }));

const mockPrisma = vi.hoisted(() => ({
  webhookEvent: {
    create: vi.fn(async () => {
      const row = {
        id: `evt-${ledger.rows.length}`,
        status: "pending",
        error: null,
      };
      ledger.rows.push(row);
      return { id: row.id };
    }),
    findFirst: vi.fn(async () => null),
    update: vi.fn(async ({ where, data }: any) => {
      Object.assign(ledger.rows[Number(where.id.split("-")[1])], data);
    }),
  },
  subscription: { findFirst: vi.fn(), upsert: vi.fn() },
  subscriptionHistory: { create: vi.fn() },
  surfboardUser: { findUnique: vi.fn() },
}));
const mockApply = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/surfboard/services/subscriptionService", () => ({
  applyPaymentPeriod: mockApply,
  createOrUpdateSubscription: vi.fn(),
}));
vi.mock("@/reva/services/propertyRequestService", () => ({}));
vi.mock("@/reva/services/notificationService", () => ({}));
vi.mock("@/gbc/services/ticketService", () => ({ verifyPayment: vi.fn() }));
vi.mock("@/utils/email", () => ({}));

process.env.PAYSTACK_SECRET_KEY = "sk_test_period";
const { POST } = await import("@/app/api/webhooks/paystack/route");

const deliver = (payload: unknown) => {
  const raw = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(raw, "utf8")
    .digest("hex");
  return POST(
    new NextRequest("http://localhost:3000/api/webhooks/paystack", {
      method: "POST",
      headers: { "x-paystack-signature": signature },
      body: raw,
    })
  );
};

const renewal = (over: Record<string, unknown> = {}) => ({
  event: "charge.success",
  data: {
    reference: "REF_RENEW_1",
    amount: 1_670_000,
    currency: "NGN",
    paid_at: "2026-11-01T08:00:00Z",
    customer: { id: 5, customer_code: "CUS_5", email: "s@example.com" },
    authorization: { authorization_code: "AUTH_5" },
    plan: {
      plan_code: "PLN_SURF_MONTHLY",
      name: "SURF_MONTHLY",
      interval: "monthly",
      amount: 1_670_000,
    },
    subscription: { next_payment_date: "2026-12-01T08:00:00Z" },
    metadata: { custom_fields: [] },
    ...over,
  },
});

const created = (over: Record<string, unknown> = {}) => ({
  event: "subscription.create",
  data: {
    status: "active",
    subscription_code: "SUB_abc",
    email_token: "tok",
    amount: 1_670_000,
    next_payment_date: "2026-12-01T08:00:00Z",
    customer: { id: 5, customer_code: "CUS_5", email: "s@example.com" },
    authorization: { authorization_code: "AUTH_5" },
    plan: {
      plan_code: "PLN_SURF_MONTHLY",
      name: "SURF_MONTHLY",
      interval: "monthly",
      amount: 1_670_000,
    },
    ...over,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  ledger.rows.length = 0;
  mockPrisma.subscription.findFirst.mockResolvedValue({ userId: "u1" });
  mockApply.mockResolvedValue({ status: "applied", subscription: {} });
  mockPrisma.subscription.upsert.mockResolvedValue({
    planCode: "PLN_SURF_MONTHLY",
    planName: "SURF_MONTHLY",
    amount: 1_670_000,
    interval: "monthly",
    status: "active",
    currentStart: new Date(),
    currentEnd: new Date(),
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("charge.success — a renewal (or first charge)", () => {
  it("credits the payment through applyPaymentPeriod, keyed by its reference", async () => {
    const res = await deliver(renewal());

    expect(res.status).toBe(200);
    expect(mockApply).toHaveBeenCalledTimes(1);
    const args = mockApply.mock.calls[0][0];
    expect(args).toMatchObject({
      userId: "u1",
      reference: "REF_RENEW_1",
      eventType: "subscription.success",
      periodInterval: "monthly",
    });
    expect(args.paidAt).toEqual(new Date("2026-11-01T08:00:00Z"));
    expect(args.row).toMatchObject({
      provider: "paystack",
      status: "active",
      planCode: "PLN_SURF_MONTHLY",
      amountKobo: 1_670_000,
      authorization: "AUTH_5",
      nextPaymentDate: new Date("2026-12-01T08:00:00Z"),
    });
    expect(ledger.rows[0].status).toBe("ok");
  });

  it("buys time by the plan's interval: a quarterly charge is a quarterly period", async () => {
    await deliver(
      renewal({
        plan: {
          plan_code: "SURF_Q",
          name: "SURF_QUARTERLY",
          interval: "quarterly",
          amount: 5_000_000,
        },
        amount: 5_000_000,
      })
    );
    expect(mockApply.mock.calls[0][0].periodInterval).toBe("quarterly");
  });

  it("doesn't fail when the payment was already credited (the client's verify call got there first)", async () => {
    mockApply.mockResolvedValue({
      status: "already_applied",
      subscription: {},
    });
    const res = await deliver(renewal());
    expect(res.status).toBe(200);
    expect(ledger.rows[0].status).toBe("ok");
  });

  it("acknowledges — doesn't retry — a payment already credited to a different account", async () => {
    mockApply.mockResolvedValue({
      status: "used_by_another_account",
      subscription: null,
    });
    const res = await deliver(renewal());
    expect(res.status).toBe(200);
  });

  it("answers 500 when crediting fails, so Paystack retries and the retry credits it once", async () => {
    mockApply.mockRejectedValueOnce(new Error("connection reset"));
    expect((await deliver(renewal())).status).toBe(500);
    expect(ledger.rows[0]).toMatchObject({ status: "error" });
  });

  it("skips a charge that isn't a Surfboard subscription charge", async () => {
    const res = await deliver(
      renewal({
        plan: { plan_code: "PLN_OTHER", name: "OTHER", interval: "monthly" },
      })
    );
    expect(res.status).toBe(200);
    expect(mockApply).not.toHaveBeenCalled();
  });
});

describe("subscription.create — identity sync only", () => {
  it("updates Paystack's fields on an existing row WITHOUT touching the paid period", async () => {
    await deliver(created());

    expect(mockPrisma.subscription.upsert).toHaveBeenCalledTimes(1);
    const { update } = mockPrisma.subscription.upsert.mock.calls[0][0];
    expect(update).toMatchObject({
      subCode: "SUB_abc",
      emailToken: "tok",
      customerCode: "CUS_5",
      provider: "paystack",
      planCode: "PLN_SURF_MONTHLY",
      nextPaymentDate: new Date("2026-12-01T08:00:00Z"),
    });
    expect(update).not.toHaveProperty("currentStart");
    expect(update).not.toHaveProperty("currentEnd");
  });

  it("creates a missing row with an EMPTY period (ending now) — the payment's own credit extends it", async () => {
    await deliver(created());

    const { create } = mockPrisma.subscription.upsert.mock.calls[0][0];
    expect(create.userId).toBe("u1");
    expect(create.currentEnd).toEqual(create.currentStart);
    expect(mockApply).not.toHaveBeenCalled();
  });

  it("never credits time itself — that would double-count the payment charge.success also credits", async () => {
    await deliver(created());
    expect(mockApply).not.toHaveBeenCalled();
  });

  it("records the event in the history log", async () => {
    await deliver(created());
    expect(mockPrisma.subscriptionHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u1",
        reference: "SUB_abc",
        eventType: "subscription.create",
      }),
    });
  });

  it("does nothing when the account can't be identified", async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null);
    const res = await deliver(created());
    expect(res.status).toBe(200);
    expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled();
  });
});

describe("a first charge in Paystack TEST mode (staging)", () => {
  // Real shape: the plan CODE differs from live (no "SURF_" in it and not in
  // the env vars), the platform is only inside metadata.custom_fields, and the
  // customer has no subscription row yet. Only the plan NAME and the
  // custom_fields identify it as Surfboard. It used to be skipped silently
  // (status "ok", nothing credited).
  const testModePlan = {
    plan_code: "PLN_j6fww9gsqn7f6us",
    name: "SURF_MONTHLY",
    interval: "monthly",
    amount: 1_670_000,
  };
  const customFields = [
    { variable_name: "platform", value: "surfboard" },
    { variable_name: "reference", value: "SURFBOARD_SUB_test_1_u9" },
  ];

  beforeEach(() => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null);
    mockPrisma.surfboardUser.findUnique.mockResolvedValue({ id: "u9" });
  });

  it("credits charge.success for a new subscriber identified only by custom_fields and plan name", async () => {
    await deliver(
      renewal({
        reference: "SURFBOARD_SUB_test_1_u9",
        plan: testModePlan,
        subscription: undefined,
        metadata: { custom_fields: customFields },
      })
    );

    expect(mockApply).toHaveBeenCalledTimes(1);
    expect(mockApply.mock.calls[0][0]).toMatchObject({
      userId: "u9",
      reference: "SURFBOARD_SUB_test_1_u9",
      periodInterval: "monthly",
    });
  });

  it("recognises the subscriber on subscription.create by plan name alone", async () => {
    await deliver(created({ plan: testModePlan }));

    expect(mockPrisma.surfboardUser.findUnique).toHaveBeenCalledWith({
      where: { email: "s@example.com" },
    });
    expect(mockPrisma.subscription.upsert).toHaveBeenCalledTimes(1);
  });

  it("still ignores a charge that is not a Surfboard plan", async () => {
    await deliver(
      renewal({
        reference: "OTHER_1",
        plan: {
          plan_code: "PLN_other",
          name: "SOMETHING_ELSE",
          interval: "monthly",
        },
        metadata: { custom_fields: [] },
      })
    );
    expect(mockApply).not.toHaveBeenCalled();
  });
});
