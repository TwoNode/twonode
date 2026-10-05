import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * applyPaymentPeriod is where a payment buys subscription time, for every
 * path (client verify, renewal webhook, one-time payment). These tests run it
 * against a small stateful fake of the database that models what the
 * implementation relies on from Postgres: rows that persist, and
 * `pg_advisory_xact_lock` — a lock that serialises transactions asking for the
 * same key and is released when the transaction ends. Reads yield to the event
 * loop so that, without the locks, concurrent calls WOULD interleave.
 */

type Sub = Record<string, any>;
const db = vi.hoisted(() => ({
  subs: new Map<string, any>(),
  history: [] as any[],
  lockLog: [] as string[],
  tails: new Map<string, Promise<void>>(),
}));

const yieldTurn = () => new Promise<void>((r) => setTimeout(r, 0));

const makeTx = (releases: Array<() => void>) => ({
  $executeRaw: async (_strings: TemplateStringsArray, key: string) => {
    db.lockLog.push(key);
    const prev = db.tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const mine = new Promise<void>((r) => (release = r));
    db.tails.set(
      key,
      prev.then(() => mine)
    );
    await prev;
    releases.push(release);
    return 0;
  },
  subscription: {
    findUnique: async ({ where }: any) => {
      await yieldTurn();
      const s = db.subs.get(where.userId);
      return s ? { ...s } : null;
    },
    upsert: async ({ where, update, create }: any) => {
      await yieldTurn();
      const existing = db.subs.get(where.userId);
      const stripUndefined = (o: any) =>
        Object.fromEntries(
          Object.entries(o).filter(([, v]) => v !== undefined)
        );
      const next = existing
        ? { ...existing, ...stripUndefined(update) }
        : { id: `sub-${db.subs.size + 1}`, ...create };
      db.subs.set(where.userId, next);
      return { ...next };
    },
  },
  subscriptionHistory: {
    findFirst: async ({ where }: any) => {
      await yieldTurn();
      const row = db.history.find(
        (h) =>
          h.reference === where.reference &&
          where.eventType.in.includes(h.eventType)
      );
      return row ? { userId: row.userId } : null;
    },
    create: async ({ data }: any) => {
      await yieldTurn();
      db.history.push({ ...data });
      return data;
    },
  },
});

const mockPrisma = vi.hoisted(() => ({
  $transaction: async (fn: (tx: any) => Promise<any>) => {
    const releases: Array<() => void> = [];
    try {
      return await fn((globalThis as any).__makeTx(releases));
    } finally {
      releases.forEach((r) => r());
    }
  },
}));
const mockPlan = vi.hoisted(() => ({ getOrCreatePaystackPlan: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/surfboard/services/paystackSubscriptionService", () => mockPlan);

(globalThis as any).__makeTx = makeTx;

const {
  applyPaymentPeriod,
  createOrUpdateSubscription,
  applyOneTimeSubscriptionPayment,
} = await import("@/surfboard/services/subscriptionService");

const at = (y: number, m: number, d: number, h = 0, mi = 0, s = 0) =>
  new Date(y, m - 1, d, h, mi, s);
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const PAID = new Date("2026-10-04T10:00:00Z");
const pay = (over: Record<string, any> = {}) =>
  applyPaymentPeriod({
    userId: "u1",
    reference: "REF_1",
    eventType: "subscription.success",
    paidAt: PAID,
    periodInterval: "monthly",
    row: {
      status: "active",
      provider: "paystack",
      planCode: "PLN_M",
      planName: "SURF_MONTHLY",
      interval: "monthly",
      amountKobo: 1_670_000,
      ...(over.row ?? {}),
    },
    ...Object.fromEntries(Object.entries(over).filter(([k]) => k !== "row")),
  });

const seedRunning = (end: Date, status = "active", userId = "u1") =>
  db.subs.set(userId, {
    id: "sub-seed",
    userId,
    status,
    planName: "OLD",
    interval: "annually",
    amount: 1,
    currentStart: at(2026, 1, 1),
    currentEnd: end,
  });

beforeEach(() => {
  vi.clearAllMocks();
  db.subs.clear();
  db.history.length = 0;
  db.lockLog.length = 0;
  db.tails.clear();
});

describe("applyPaymentPeriod", () => {
  it("credits a payment when nothing is running: a fresh period from the payment date, and a ledger row for it", async () => {
    const r = await pay();

    expect(r.status).toBe("applied");
    expect(db.subs.get("u1")).toMatchObject({
      status: "active",
      planName: "SURF_MONTHLY",
      amount: 1_670_000,
    });
    expect(db.history).toHaveLength(1);
    expect(db.history[0]).toMatchObject({
      userId: "u1",
      reference: "REF_1",
      eventType: "subscription.success",
      amount: 1_670_000, // kobo, like the webhook's rows (was plan.amount * 100 on the verify path)
      lastPaymentDate: PAID,
    });
    // fresh: the window is the whole period
    expect(db.history[0].startDate).toEqual(db.subs.get("u1").currentStart);
    expect(db.history[0].endDate).toEqual(db.subs.get("u1").currentEnd);
  });

  it("ADDS to a period that is still running instead of replacing it", async () => {
    seedRunning(at(2026, 12, 31, 23, 59, 59));

    await pay();

    const sub = db.subs.get("u1");
    expect(ymd(sub.currentEnd)).toBe("2027-01-31");
    expect(sub.currentStart).toEqual(at(2026, 1, 1)); // continuous coverage keeps its start
    // the ledger records only the stretch THIS payment bought
    expect(ymd(db.history[0].startDate)).toBe("2027-01-01");
    expect(ymd(db.history[0].endDate)).toBe("2027-01-31");
  });

  it("starts a fresh period when the old one has ended", async () => {
    seedRunning(at(2026, 6, 30, 23, 59, 59));

    await pay();

    const sub = db.subs.get("u1");
    expect(sub.currentEnd.getTime()).toBeGreaterThan(at(2026, 10, 1).getTime());
    expect(sub.currentStart.getTime()).toBeGreaterThan(
      at(2026, 9, 1).getTime()
    );
  });

  it("applies a payment at most once: a repeat of the same reference changes nothing", async () => {
    seedRunning(at(2026, 12, 31, 23, 59, 59));
    await pay();
    const afterFirst = { ...db.subs.get("u1") };

    const again = await pay();

    expect(again.status).toBe("already_applied");
    expect(db.subs.get("u1")).toEqual(afterFirst);
    expect(db.history).toHaveLength(1);
  });

  it("treats the two event types as the same ledger — the verify call (create) and the webhook (success) for one payment", async () => {
    seedRunning(at(2026, 12, 31, 23, 59, 59));
    await pay({ eventType: "subscription.create" });
    const afterVerify = { ...db.subs.get("u1") };

    const webhook = await pay({ eventType: "subscription.success" });

    expect(webhook.status).toBe("already_applied");
    expect(db.subs.get("u1")).toEqual(afterVerify);
  });

  it("refuses a reference already applied to a different account", async () => {
    await pay();
    const other = await pay({ userId: "u2" });

    expect(other).toEqual({
      status: "used_by_another_account",
      subscription: null,
    });
    expect(db.subs.has("u2")).toBe(false);
    expect(db.history).toHaveLength(1);
  });

  it("takes the reference lock, then the user lock — always in that order", async () => {
    await pay();
    expect(db.lockLog).toEqual([
      "subscription-payment-ref:REF_1",
      "subscription-payment-user:u1",
    ]);
  });

  describe("concurrency", () => {
    it("the verify call and the webhook racing for ONE payment credit it once", async () => {
      seedRunning(at(2026, 12, 31, 23, 59, 59));

      const results = await Promise.all(
        Array.from({ length: 6 }, (_, i) =>
          pay({
            eventType: i % 2 ? "subscription.create" : "subscription.success",
          })
        )
      );

      expect(results.filter((r) => r.status === "applied")).toHaveLength(1);
      expect(
        results.filter((r) => r.status === "already_applied")
      ).toHaveLength(5);
      expect(db.history).toHaveLength(1);
      expect(ymd(db.subs.get("u1").currentEnd)).toBe("2027-01-31"); // one month added, not six
    });

    it("two DIFFERENT payments for one account at the same moment both count — no lost update", async () => {
      seedRunning(at(2026, 12, 31, 23, 59, 59));

      await Promise.all([
        pay({ reference: "REF_A" }),
        pay({ reference: "REF_B" }),
      ]);

      // Dec 31 + 2 months. Without the per-user lock both would read the same
      // end and each extend from it, leaving 2027-01-31.
      expect(ymd(db.subs.get("u1").currentEnd)).toBe("2027-02-28");
      expect(db.history.map((h) => h.reference).sort()).toEqual([
        "REF_A",
        "REF_B",
      ]);
    });

    it("one reference submitted by two accounts at once is credited to exactly one", async () => {
      const results = await Promise.all([
        pay({ userId: "u1" }),
        pay({ userId: "u2" }),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([
        "applied",
        "used_by_another_account",
      ]);
      expect(db.history).toHaveLength(1);
      expect(db.subs.size).toBe(1);
    });
  });
});

describe("createOrUpdateSubscription (verify call / one-time payments)", () => {
  const plan = {
    plan_code: "PLN_M",
    name: "SURF_MONTHLY",
    interval: "monthly" as const,
    amount: 1_670_000,
    currency: "NGN",
  };
  const call = (over: Record<string, any> = {}) =>
    createOrUpdateSubscription({
      userId: "u1",
      planId: "monthly",
      reference: "REF_V",
      customerCode: "CUS_1",
      customerId: "1",
      authorization: "AUTH_1",
      emailToken: "",
      paidAt: PAID.toISOString(),
      ...over,
    });

  beforeEach(() => {
    mockPlan.getOrCreatePaystackPlan.mockResolvedValue(plan);
  });

  it("extends a running period, records the payment in kobo, and returns the subscription row", async () => {
    seedRunning(at(2026, 12, 31, 23, 59, 59));

    const sub = await call({ provider: "paystack_onetime" });

    expect(sub.provider).toBe("paystack_onetime");
    expect(ymd(sub.currentEnd)).toBe("2027-01-31");
    expect(db.history[0]).toMatchObject({
      reference: "REF_V",
      eventType: "subscription.create",
      amount: 1_670_000,
    });
  });

  it("is idempotent — the second of verify + webhook returns the subscription unchanged", async () => {
    seedRunning(at(2026, 12, 31, 23, 59, 59));
    const first = await call();
    const second = await call();

    expect(second.currentEnd).toEqual(first.currentEnd);
    expect(db.history).toHaveLength(1);
  });

  it("ignores the deprecated skipHistory flag — the ledger row is what makes a payment apply once", async () => {
    await call({ skipHistory: true });
    expect(db.history).toHaveLength(1);
  });

  it("answers 409 for a reference that already paid for another account", async () => {
    await call();
    await expect(call({ userId: "u2" })).rejects.toMatchObject({
      status: 409,
      code: "PAYMENT_ALREADY_USED",
    });
  });
});

describe("applyOneTimeSubscriptionPayment (a VERIFIED one-time payment)", () => {
  const plan = {
    plan_code: "PLN_M",
    name: "SURF_MONTHLY",
    interval: "monthly" as const,
    amount: 1_670_000,
    currency: "NGN",
  };
  const apply = (over: Record<string, any> = {}) =>
    applyOneTimeSubscriptionPayment({
      userId: "u1",
      reference: "SURFBOARD_ONETIME_SUB_live_1_u1",
      planId: "monthly",
      customerCode: "CUS_1",
      customerId: "1",
      authorization: "AUTH_1",
      paidAt: PAID.toISOString(),
      ...over,
    });

  beforeEach(() => {
    mockPlan.getOrCreatePaystackPlan.mockResolvedValue(plan);
  });

  it("applies a new payment as a one-time subscription and records its reference (kobo) in the ledger", async () => {
    const r = await apply();

    expect(r.status).toBe("applied");
    expect(db.subs.get("u1")).toMatchObject({
      provider: "paystack_onetime",
      status: "active",
      planName: "SURF_MONTHLY",
    });
    expect(db.history).toEqual([
      expect.objectContaining({
        reference: "SURFBOARD_ONETIME_SUB_live_1_u1",
        eventType: "subscription.create",
        amount: 1_670_000,
      }),
    ]);
  });

  it("adds to paid time that remains — a one-time payment made early loses no days", async () => {
    seedRunning(at(2026, 12, 31, 23, 59, 59));

    await apply();

    expect(ymd(db.subs.get("u1").currentEnd)).toBe("2027-01-31");
  });

  it("does not apply the same reference twice — a replay, or the late webhook, can't rewrite a newer period", async () => {
    await apply();
    const after = { ...db.subs.get("u1") };

    const again = await apply();

    expect(again.status).toBe("already_applied");
    expect(db.subs.get("u1")).toEqual(after);
    expect(db.history).toHaveLength(1);
  });

  it("refuses a reference that was already applied to a different account", async () => {
    await apply();

    const other = await apply({ userId: "u2" });

    expect(other.status).toBe("used_by_another_account");
    expect(db.subs.has("u2")).toBe(false);
  });

  it("the client's verify call and the webhook racing for the same payment credit it once", async () => {
    const results = await Promise.all(Array.from({ length: 4 }, () => apply()));

    expect(results.filter((r) => r.status === "applied")).toHaveLength(1);
    expect(db.history).toHaveLength(1);
  });
});
