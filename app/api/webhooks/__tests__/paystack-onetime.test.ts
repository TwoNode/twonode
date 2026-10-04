import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * One-time (non-recurring) Surfboard subscription payments through the
 * shared Paystack webhook. The checkout is popup-driven, so `metadata` and
 * the reference are client-chosen; only what Paystack reports (reference,
 * amount, currency) is trustworthy. A payment that doesn't cover the plan it
 * claims — or isn't tied to an account by a reference this app issued — is
 * REJECTED: recorded as `rejected` with the reason, acknowledged with 200 so
 * Paystack doesn't redeliver, and never applied.
 */

const ledger = vi.hoisted(() => ({
  rows: [] as Array<{ status: string; error: string | null }>,
}));

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
      const row = ledger.rows[Number(where.id.split("-")[1])];
      Object.assign(row, data);
      return row;
    }),
  },
  surfboardUser: { findUnique: vi.fn() },
}));
const mockApply = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/surfboard/services/subscriptionService", () => ({
  applyOneTimeSubscriptionPayment: mockApply,
  createOrUpdateSubscription: vi.fn(),
}));
vi.mock("@/reva/services/propertyRequestService", () => ({}));
vi.mock("@/reva/services/notificationService", () => ({}));
vi.mock("@/gbc/services/ticketService", () => ({ verifyPayment: vi.fn() }));
vi.mock("@/utils/email", () => ({}));
vi.mock("@/app/(projects)/(surfboard)/utils/computePeriod", () => ({
  computePeriodPerTimestamp: vi.fn(),
}));

process.env.PAYSTACK_SECRET_KEY = "sk_test_onetime";
const { POST } = await import("@/app/api/webhooks/paystack/route");

const USER = "user-1";
const REF = `SURFBOARD_ONETIME_SUB_live_1759000000000_${USER}`;

const charge = (
  over: Record<string, unknown> = {},
  meta: Record<string, unknown> = {}
) => ({
  event: "charge.success",
  data: {
    reference: REF,
    amount: 16700 * 100,
    currency: "NGN",
    paid_at: "2026-10-04T10:00:00Z",
    customer: { id: 9, customer_code: "CUS_9", email: "payer@example.com" },
    authorization: { authorization_code: "AUTH_9" },
    metadata: {
      type: "surfboard_onetime_subscription",
      platform: "surfboard",
      plan_id: "monthly",
      ...meta,
    },
    ...over,
  },
});

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

const lastLedger = () => ledger.rows[ledger.rows.length - 1];

beforeEach(() => {
  vi.clearAllMocks();
  ledger.rows.length = 0;
  mockPrisma.surfboardUser.findUnique.mockResolvedValue({ id: USER });
  mockApply.mockResolvedValue({ status: "applied", subscription: {} });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("one-time subscription webhook", () => {
  it("applies a full payment for the claimed plan to the account named in the reference", async () => {
    const res = await deliver(charge());

    expect(res.status).toBe(200);
    expect(mockApply).toHaveBeenCalledWith({
      userId: USER,
      reference: REF,
      planId: "monthly",
      customerCode: "CUS_9",
      customerId: "9",
      authorization: "AUTH_9",
      paidAt: "2026-10-04T10:00:00Z",
    });
    expect(lastLedger().status).toBe("ok");
  });

  it("rejects — and never applies — a ₦100 payment whose metadata claims the annual plan", async () => {
    const res = await deliver(
      charge({ amount: 100 * 100 }, { plan_id: "annually" })
    );

    expect(res.status).toBe(200); // acknowledged: a redelivery would be rejected again
    expect(await res.json()).toMatchObject({ rejected: true });
    expect(mockApply).not.toHaveBeenCalled();
    expect(lastLedger()).toMatchObject({ status: "rejected" });
    expect(lastLedger().error).toMatch(/UNDERPAID/);
  });

  it("rejects a payment that doesn't cover the plan by even one kobo", async () => {
    await deliver(charge({ amount: 16700 * 100 - 1 }));
    expect(mockApply).not.toHaveBeenCalled();
    expect(lastLedger().status).toBe("rejected");
  });

  it("takes the account from the reference, not the customer's email — typing someone's email can't redirect the credit", async () => {
    await deliver(
      charge({
        customer: {
          id: 9,
          customer_code: "CUS_9",
          email: "victim@example.com",
        },
      })
    );

    expect(mockApply).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER })
    );
    expect(mockPrisma.surfboardUser.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: USER } })
    );
  });

  it("rejects a charge flagged as one-time whose reference this app didn't issue", async () => {
    await deliver(charge({ reference: "PSK_attacker_chosen" }));
    expect(mockApply).not.toHaveBeenCalled();
    expect(lastLedger().status).toBe("rejected");
  });

  it("rejects a missing, invalid or prototype-key plan_id", async () => {
    for (const plan_id of [undefined, "weekly", "constructor", "__proto__"]) {
      ledger.rows.length = 0;
      await deliver(charge({}, { plan_id }));
      expect(lastLedger().status).toBe("rejected");
    }
    expect(mockApply).not.toHaveBeenCalled();
  });

  it("rejects a payment in another currency", async () => {
    await deliver(charge({ currency: "USD" }));
    expect(mockApply).not.toHaveBeenCalled();
    expect(lastLedger().error).toMatch(/WRONG_CURRENCY/);
  });

  it("rejects when the account named in the reference doesn't exist", async () => {
    mockPrisma.surfboardUser.findUnique.mockResolvedValue(null);
    await deliver(charge());
    expect(mockApply).not.toHaveBeenCalled();
    expect(lastLedger().status).toBe("rejected");
  });

  it("rejects a reference already applied to a different account", async () => {
    mockApply.mockResolvedValue({ status: "used_by_another_account" });
    const res = await deliver(charge());
    expect(res.status).toBe(200);
    expect(lastLedger().status).toBe("rejected");
  });

  it("treats a payment that was already applied (e.g. by the client's verify call) as done, not an error", async () => {
    mockApply.mockResolvedValue({
      status: "already_applied",
      subscription: {},
    });
    const res = await deliver(charge());
    expect(res.status).toBe(200);
    expect(lastLedger().status).toBe("ok");
  });

  it("still answers 500 — so Paystack retries — when applying a VALID payment fails transiently", async () => {
    mockApply.mockRejectedValue(new Error("connection reset"));
    const res = await deliver(charge());
    expect(res.status).toBe(500);
    expect(lastLedger()).toMatchObject({
      status: "error",
      error: "connection reset",
    });
  });
});
