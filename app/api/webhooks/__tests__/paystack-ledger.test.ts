import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * The webhook ledger (WebhookEvent) gives at-most-once processing per
 * delivery — but Paystack retries a failed delivery by re-sending the SAME
 * payload, i.e. the same signature. These tests pin the contract that a
 * retry of an event that did NOT complete is processed again, while true
 * duplicates are still skipped:
 *
 *   ok                      -> duplicate, handler not run
 *   error                   -> re-run (Paystack is retrying because we sent 500)
 *   pending, fresh          -> duplicate (another invocation is working on it)
 *   pending, stale (>5 min) -> re-run (that invocation died)
 *   several racing retries  -> exactly one wins the claim
 */

type Row = {
  id: string;
  signature: string;
  status: string;
  error: string | null;
  receivedAt: Date;
  processedAt: Date | null;
};

const store = vi.hoisted(() => ({ rows: new Map<string, any>(), seq: 0 }));

const mockPrisma = vi.hoisted(() => {
  const dupe = () =>
    Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
  return {
    webhookEvent: {
      create: vi.fn(async ({ data }: any) => {
        for (const r of store.rows.values())
          if (r.signature === data.signature) throw dupe();
        const id = `evt-${++store.seq}`;
        store.rows.set(id, {
          id,
          signature: data.signature,
          status: data.status,
          error: null,
          receivedAt: data.receivedAt,
          processedAt: null,
        });
        return { id };
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        for (const r of store.rows.values())
          if (r.signature === where.signature) return { ...r };
        return null;
      }),
      findFirst: vi.fn(async () => null),
      // Evaluated and applied with no `await` in between — the property a
      // real conditional UPDATE has, and what the claim relies on.
      updateMany: vi.fn(async ({ where, data }: any) => {
        const r = store.rows.get(where.id);
        if (!r) return { count: 0 };
        if (where.status !== undefined && r.status !== where.status)
          return { count: 0 };
        if (where.receivedAt?.lt && !(r.receivedAt < where.receivedAt.lt))
          return { count: 0 };
        Object.assign(r, data);
        return { count: 1 };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const r = store.rows.get(where.id);
        Object.assign(r, data);
        return { ...r };
      }),
    },
    property: { findUnique: vi.fn() },
    oneTimeUserProperty: { findUnique: vi.fn() },
    certificateOfDepositBatch: { findFirst: vi.fn(), update: vi.fn() },
  };
});

const mockUpdateOneTime = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/reva/services/propertyRequestService", () => ({
  updatePropertyTransactionStatus: vi.fn(),
  updateOneTimeTransactionStatus: mockUpdateOneTime,
}));
vi.mock("@/reva/services/notificationService", () => ({
  notifyPaymentReceived: vi.fn(),
}));
vi.mock("@/gbc/services/ticketService", () => ({ verifyPayment: vi.fn() }));
vi.mock("@/surfboard/services/subscriptionService", () => ({
  createOrUpdateSubscription: vi.fn(),
}));
vi.mock("@/utils/email", () => ({}));
vi.mock("@/app/(projects)/(surfboard)/utils/computePeriod", () => ({
  computePeriodPerTimestamp: vi.fn(),
}));

process.env.PAYSTACK_SECRET_KEY = "sk_test_ledger";

const { POST, STALE_PENDING_MS } =
  await import("@/app/api/webhooks/paystack/route");

const payload = {
  event: "charge.success",
  data: {
    reference: "REVA_LEDGER_1",
    amount: 50000,
    metadata: { platform: "reva" },
  },
};
const raw = JSON.stringify(payload);
const signature = crypto
  .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
  .update(raw, "utf8")
  .digest("hex");

const deliver = () =>
  POST(
    new NextRequest("http://localhost:3000/api/webhooks/paystack", {
      method: "POST",
      headers: { "x-paystack-signature": signature },
      body: raw,
    })
  );

const onlyRow = (): Row => {
  expect(store.rows.size).toBe(1);
  return [...store.rows.values()][0];
};

beforeEach(() => {
  vi.clearAllMocks();
  store.rows.clear();
  store.seq = 0;
  mockPrisma.oneTimeUserProperty.findUnique.mockResolvedValue({
    reference: "REVA_LEDGER_1",
    totalCost: 500,
    paymentStatus: "Unpaid",
  });
  mockUpdateOneTime.mockResolvedValue({
    reference: "REVA_LEDGER_1",
    paymentStatus: "Paid",
  });
});

describe("webhook ledger — redelivery", () => {
  it("processes a first delivery and skips an exact repeat of a completed one", async () => {
    expect((await deliver()).status).toBe(200);
    expect(mockUpdateOneTime).toHaveBeenCalledTimes(1);
    expect(onlyRow().status).toBe("ok");

    const repeat = await deliver();
    expect(repeat.status).toBe(200);
    expect(await repeat.json()).toMatchObject({ duplicate: true });
    expect(mockUpdateOneTime).toHaveBeenCalledTimes(1);
  });

  it("re-runs the handler when Paystack retries an event whose first attempt failed", async () => {
    mockUpdateOneTime.mockRejectedValueOnce(new Error("connection reset"));

    const first = await deliver();
    expect(first.status).toBe(500);
    expect(onlyRow()).toMatchObject({
      status: "error",
      error: "connection reset",
    });

    // Same body, same signature — what Paystack's retry sends.
    const retry = await deliver();
    expect(retry.status).toBe(200);
    expect(await retry.json()).not.toHaveProperty("duplicate");
    expect(mockUpdateOneTime).toHaveBeenCalledTimes(2);
    expect(onlyRow()).toMatchObject({ status: "ok", error: null });

    // Now it is complete, so a further repeat is a true duplicate.
    expect(await (await deliver()).json()).toMatchObject({ duplicate: true });
    expect(mockUpdateOneTime).toHaveBeenCalledTimes(2);
  });

  it("keeps retrying while the failure persists, and records the latest error", async () => {
    mockUpdateOneTime
      .mockRejectedValueOnce(new Error("db down"))
      .mockRejectedValueOnce(new Error("db still down"));

    expect((await deliver()).status).toBe(500);
    expect((await deliver()).status).toBe(500);
    expect(onlyRow()).toMatchObject({
      status: "error",
      error: "db still down",
    });
    expect((await deliver()).status).toBe(200);
    expect(mockUpdateOneTime).toHaveBeenCalledTimes(3);
  });

  it("lets exactly one of several simultaneous retries re-run a failed event", async () => {
    mockUpdateOneTime.mockRejectedValueOnce(new Error("blip"));
    expect((await deliver()).status).toBe(500);
    mockUpdateOneTime.mockClear();

    const results = await Promise.all(Array.from({ length: 6 }, deliver));
    const bodies = await Promise.all(results.map((r) => r.json()));

    expect(mockUpdateOneTime).toHaveBeenCalledTimes(1);
    expect(bodies.filter((b) => b.duplicate)).toHaveLength(5);
  });

  it("treats a recent `pending` row as being worked on (duplicate), but re-runs one abandoned for longer than the lease", async () => {
    // Another invocation claimed it 1 minute ago and hasn't reported back.
    store.rows.set("evt-x", {
      id: "evt-x",
      signature,
      status: "pending",
      error: null,
      receivedAt: new Date(Date.now() - 60 * 1000),
      processedAt: null,
    });
    const concurrent = await deliver();
    expect(await concurrent.json()).toMatchObject({ duplicate: true });
    expect(mockUpdateOneTime).not.toHaveBeenCalled();

    // Same row, but that invocation died long ago.
    store.rows.get("evt-x")!.receivedAt = new Date(
      Date.now() - STALE_PENDING_MS - 1000
    );
    const recovered = await deliver();
    expect(recovered.status).toBe(200);
    expect(mockUpdateOneTime).toHaveBeenCalledTimes(1);
    expect(store.rows.get("evt-x")!.status).toBe("ok");
  });

  it("lets only one of several simultaneous retries recover an abandoned `pending` row", async () => {
    store.rows.set("evt-x", {
      id: "evt-x",
      signature,
      status: "pending",
      error: null,
      receivedAt: new Date(Date.now() - STALE_PENDING_MS - 1000),
      processedAt: null,
    });

    await Promise.all(Array.from({ length: 6 }, deliver));

    expect(mockUpdateOneTime).toHaveBeenCalledTimes(1);
  });

  it("does not run any handler for a delivery with a bad signature", async () => {
    const res = await POST(
      new NextRequest("http://localhost:3000/api/webhooks/paystack", {
        method: "POST",
        headers: { "x-paystack-signature": "00".repeat(64) },
        body: raw,
      })
    );
    expect(res.status).toBe(401);
    expect(store.rows.size).toBe(0);
    expect(mockUpdateOneTime).not.toHaveBeenCalled();
  });
});

describe("Certificate of Deposit payment — failures are no longer swallowed", () => {
  const certRaw = JSON.stringify({
    event: "charge.success",
    data: {
      reference: "SurfCoDRef_1",
      amount: 100000,
      paid_at: "2026-10-04T10:00:00Z",
      metadata: { platform: "surfboard_cod", type: "certificate_of_deposit" },
    },
  });
  const certSig = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(certRaw, "utf8")
    .digest("hex");
  const deliverCert = () =>
    POST(
      new NextRequest("http://localhost:3000/api/webhooks/paystack", {
        method: "POST",
        headers: { "x-paystack-signature": certSig },
        body: certRaw,
      })
    );

  it("answers 500 when marking the batch paid fails, then applies it on Paystack's retry", async () => {
    mockPrisma.certificateOfDepositBatch.findFirst.mockResolvedValue({
      id: "batch-1",
      batchCode: "B-1",
      totalAmount: 1000,
      paymentStatus: "PENDING",
    });
    mockPrisma.certificateOfDepositBatch.update
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({});

    expect((await deliverCert()).status).toBe(500);
    expect(mockPrisma.certificateOfDepositBatch.update).toHaveBeenCalledTimes(
      1
    );

    expect((await deliverCert()).status).toBe(200);
    expect(mockPrisma.certificateOfDepositBatch.update).toHaveBeenCalledTimes(
      2
    );
    expect(
      mockPrisma.certificateOfDepositBatch.update
    ).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: "batch-1" },
        data: expect.objectContaining({ paymentStatus: "LASG_PAID" }),
      })
    );
  });
});
