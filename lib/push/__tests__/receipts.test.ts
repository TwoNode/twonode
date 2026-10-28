import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PushReceipt, PushSender } from "@/lib/push/sender";

const mockPrisma = vi.hoisted(() => ({
  pushReceiptTicket: {
    createMany: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}));
const mockTokens = vi.hoisted(() => ({ removeTokensDeadSince: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/push/deviceTokens", () => mockTokens);

const {
  RECEIPT_MAX_AGE_MS,
  RECEIPT_MIN_AGE_MS,
  RECEIPT_RUN_LIMIT,
  checkPushReceipts,
  recordTickets,
} = await import("@/lib/push/receipts");

const NOW = new Date("2026-10-29T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const T1 = "ExponentPushToken[token0000000001]";
const T2 = "ExponentPushToken[token0000000002]";
const T3 = "ExponentPushToken[token0000000003]";

type Ticket = { ticketId: string; token: string; sentAt: Date };
const ticket = (n: number, token = T1, sentAt = ago(HOUR)): Ticket => ({
  ticketId: `receipt-${n}`,
  token,
  sentAt,
});

const senderOf = (
  answer: (ids: string[]) => Map<string, PushReceipt> | null,
  enabled = true
) => {
  const receipts = vi.fn(async (ids: string[]) => answer(ids));
  const sender: PushSender = {
    enabled,
    send: vi.fn(),
    receipts,
  };
  return { sender, receipts };
};
const ok: PushReceipt = { status: "ok" };
const dead: PushReceipt = {
  status: "error",
  unregistered: true,
  message: "DeviceNotRegistered",
};
const failure = (message: string): PushReceipt => ({
  status: "error",
  unregistered: false,
  message,
});

let lines: { level: string; text: string }[];
beforeEach(() => {
  vi.resetAllMocks();
  mockPrisma.pushReceiptTicket.createMany.mockResolvedValue({ count: 0 });
  mockPrisma.pushReceiptTicket.findMany.mockResolvedValue([]);
  mockPrisma.pushReceiptTicket.deleteMany.mockResolvedValue({ count: 0 });
  mockTokens.removeTokensDeadSince.mockResolvedValue(0);
  lines = [];
  for (const level of ["log", "warn", "error"] as const) {
    vi.spyOn(console, level).mockImplementation((text) => {
      lines.push({ level, text: String(text) });
    });
  }
});
afterEach(() => vi.restoreAllMocks());

describe("recordTickets", () => {
  it("does nothing for no tickets", async () => {
    await recordTickets([]);
    expect(mockPrisma.pushReceiptTicket.createMany).not.toHaveBeenCalled();
  });

  it("keeps each ticket once, however many times it is recorded", async () => {
    const entries = [{ ticketId: "r1", token: T1 }];

    await recordTickets(entries);

    expect(mockPrisma.pushReceiptTicket.createMany).toHaveBeenCalledWith({
      data: entries,
      skipDuplicates: true,
    });
  });

  it("never throws, and logs a count without a token or the database's own words", async () => {
    mockPrisma.pushReceiptTicket.createMany.mockRejectedValue(
      new Error(`Invalid createMany() invocation: token: "${T1}"`)
    );

    await expect(
      recordTickets([{ ticketId: "r1", token: T1 }])
    ).resolves.toBeUndefined();

    expect(lines).toHaveLength(1);
    expect(lines[0].level).toBe("error");
    expect(lines[0].text).toContain('"count":1');
    expect(lines[0].text).not.toContain("ExponentPushToken");
  });
});

describe("checkPushReceipts", () => {
  it("does nothing, and reads nothing, when push is off", async () => {
    const { sender, receipts } = senderOf(() => new Map(), false);

    const result = await checkPushReceipts(sender, NOW);

    expect(result).toEqual({
      checked: 0,
      delivered: 0,
      failed: 0,
      removedTokens: 0,
      expired: 0,
      deferred: 0,
    });
    expect(mockPrisma.pushReceiptTicket.findMany).not.toHaveBeenCalled();
    expect(receipts).not.toHaveBeenCalled();
  });

  it("looks only at tickets at least 15 minutes old, oldest first, a limited number at a time", async () => {
    const { sender } = senderOf(() => new Map());

    await checkPushReceipts(sender, NOW);

    expect(RECEIPT_MIN_AGE_MS).toBe(15 * MINUTE);
    expect(mockPrisma.pushReceiptTicket.findMany).toHaveBeenCalledWith({
      where: { sentAt: { lte: ago(15 * MINUTE) } },
      orderBy: { sentAt: "asc" },
      take: RECEIPT_RUN_LIMIT,
      select: { ticketId: true, token: true, sentAt: true },
    });
  });

  it("asks nothing and logs nothing when there is nothing to look up", async () => {
    const { sender, receipts } = senderOf(() => new Map());

    expect((await checkPushReceipts(sender, NOW)).checked).toBe(0);

    expect(receipts).not.toHaveBeenCalled();
    expect(lines).toEqual([]);
  });

  it("forgets a delivered ticket and keeps its token", async () => {
    mockPrisma.pushReceiptTicket.findMany.mockResolvedValue([ticket(1)]);
    const { sender } = senderOf(() => new Map<string, PushReceipt>([["receipt-1", ok]]));

    const result = await checkPushReceipts(sender, NOW);

    expect(result).toMatchObject({ checked: 1, delivered: 1, failed: 0 });
    expect(mockTokens.removeTokensDeadSince).toHaveBeenCalledWith([]);
    expect(mockPrisma.pushReceiptTicket.deleteMany).toHaveBeenCalledWith({
      where: { ticketId: { in: ["receipt-1"] } },
    });
  });

  it("deletes the token of a phone the receipt says is gone, as of when the message was sent", async () => {
    const sentAt = ago(2 * HOUR);
    mockPrisma.pushReceiptTicket.findMany.mockResolvedValue([
      ticket(1, T1, sentAt),
      ticket(2, T2),
    ]);
    mockTokens.removeTokensDeadSince.mockResolvedValue(1);
    const { sender } = senderOf(
      () =>
        new Map<string, PushReceipt>([
          ["receipt-1", dead],
          ["receipt-2", ok],
        ])
    );

    const result = await checkPushReceipts(sender, NOW);

    expect(mockTokens.removeTokensDeadSince).toHaveBeenCalledWith([
      { token: T1, sentAt },
    ]);
    expect(result).toMatchObject({
      checked: 2,
      delivered: 1,
      failed: 1,
      removedTokens: 1,
    });
    expect(mockPrisma.pushReceiptTicket.deleteMany).toHaveBeenCalledWith({
      where: { ticketId: { in: ["receipt-1", "receipt-2"] } },
    });
  });

  it("counts any other failure, keeps the token, and says what happened without the token", async () => {
    mockPrisma.pushReceiptTicket.findMany.mockResolvedValue([
      ticket(1, T1),
      ticket(2, T2),
      ticket(3, T3),
    ]);
    const { sender } = senderOf(
      () =>
        new Map<string, PushReceipt>([
          ["receipt-1", failure("MessageRateExceeded")],
          ["receipt-2", failure("MessageRateExceeded")],
          ["receipt-3", failure("MessageTooBig")],
        ])
    );

    const result = await checkPushReceipts(sender, NOW);

    expect(result).toMatchObject({ failed: 3, removedTokens: 0 });
    expect(mockTokens.removeTokensDeadSince).toHaveBeenCalledWith([]);
    const warned = lines.filter((l) => l.level === "warn");
    expect(warned.map((l) => JSON.parse(l.text))).toMatchObject([
      { error: "MessageRateExceeded", count: 2 },
      { error: "MessageTooBig", count: 1 },
    ]);
    expect(JSON.stringify(lines)).not.toContain("ExponentPushToken");
  });

  it("calls a wrong credential an error, because every push is failing, not one phone", async () => {
    mockPrisma.pushReceiptTicket.findMany.mockResolvedValue([
      ticket(1),
      ticket(2),
    ]);
    const { sender } = senderOf(
      () =>
        new Map<string, PushReceipt>([
          ["receipt-1", failure("InvalidCredentials")],
          ["receipt-2", failure("MismatchSenderId")],
        ])
    );

    await checkPushReceipts(sender, NOW);

    const errors = lines.filter((l) => l.level === "error");
    expect(errors.map((l) => JSON.parse(l.text))).toMatchObject([
      { error: "InvalidCredentials", count: 1 },
      { error: "MismatchSenderId", count: 1 },
    ]);
  });

  it("does not log a gone phone as a problem: it is in the summary's removedTokens", async () => {
    mockPrisma.pushReceiptTicket.findMany.mockResolvedValue([ticket(1)]);
    const { sender } = senderOf(() => new Map<string, PushReceipt>([["receipt-1", dead]]));

    await checkPushReceipts(sender, NOW);

    expect(lines.filter((l) => l.level !== "log")).toEqual([]);
  });

  it("leaves a ticket with no receipt yet for the next run", async () => {
    mockPrisma.pushReceiptTicket.findMany.mockResolvedValue([
      ticket(1, T1, ago(20 * MINUTE)),
      ticket(2, T2, ago(23 * HOUR)),
    ]);
    const { sender } = senderOf(() => new Map());

    const result = await checkPushReceipts(sender, NOW);

    expect(result).toMatchObject({ checked: 2, deferred: 2, expired: 0 });
    expect(mockPrisma.pushReceiptTicket.deleteMany).not.toHaveBeenCalled();
  });

  it("gives up on a ticket older than the service keeps receipts for", async () => {
    mockPrisma.pushReceiptTicket.findMany.mockResolvedValue([
      ticket(1, T1, ago(RECEIPT_MAX_AGE_MS + MINUTE)),
      ticket(2, T2, ago(RECEIPT_MAX_AGE_MS - MINUTE)),
    ]);
    const { sender } = senderOf(() => new Map());

    const result = await checkPushReceipts(sender, NOW);

    expect(RECEIPT_MAX_AGE_MS).toBe(24 * HOUR);
    expect(result).toMatchObject({ expired: 1, deferred: 1 });
    expect(mockPrisma.pushReceiptTicket.deleteMany).toHaveBeenCalledWith({
      where: { ticketId: { in: ["receipt-1"] } },
    });
  });

  it("still reads a receipt that exists for a ticket past the usual age", async () => {
    mockPrisma.pushReceiptTicket.findMany.mockResolvedValue([
      ticket(1, T1, ago(30 * HOUR)),
    ]);
    const { sender } = senderOf(() => new Map<string, PushReceipt>([["receipt-1", dead]]));

    const result = await checkPushReceipts(sender, NOW);

    expect(result).toMatchObject({ failed: 1, expired: 0 });
    expect(mockTokens.removeTokensDeadSince).toHaveBeenCalledOnce();
  });

  it("forgets nothing, and asks once, when the push service cannot be asked", async () => {
    mockPrisma.pushReceiptTicket.findMany.mockResolvedValue(
      Array.from({ length: 2500 }, (_, i) => ticket(i))
    );
    const { sender, receipts } = senderOf(() => null);

    const result = await checkPushReceipts(sender, NOW);

    expect(receipts).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ checked: 2500, deferred: 2500, delivered: 0 });
    expect(mockPrisma.pushReceiptTicket.deleteMany).not.toHaveBeenCalled();
    expect(mockTokens.removeTokensDeadSince).not.toHaveBeenCalled();
  });

  it("asks for at most 1000 receipts at a time and counts across the batches", async () => {
    mockPrisma.pushReceiptTicket.findMany.mockResolvedValue(
      Array.from({ length: 2300 }, (_, i) => ticket(i))
    );
    const { sender, receipts } = senderOf(
      (ids) => new Map(ids.map((id): [string, PushReceipt] => [id, ok]))
    );

    const result = await checkPushReceipts(sender, NOW);

    expect(receipts.mock.calls.map(([ids]) => ids.length)).toEqual([
      1000, 1000, 300,
    ]);
    expect(result).toMatchObject({ checked: 2300, delivered: 2300 });
  });

  it("keeps the earlier batches' work when a later batch cannot be asked", async () => {
    mockPrisma.pushReceiptTicket.findMany.mockResolvedValue(
      Array.from({ length: 1500 }, (_, i) => ticket(i))
    );
    let call = 0;
    const { sender } = senderOf((ids) =>
      call++ === 0
        ? new Map(ids.map((id): [string, PushReceipt] => [id, ok]))
        : null
    );

    const result = await checkPushReceipts(sender, NOW);

    expect(result).toMatchObject({ delivered: 1000, deferred: 500 });
    expect(mockPrisma.pushReceiptTicket.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("does not forget tickets whose tokens could not be removed: the next run repeats the work", async () => {
    mockPrisma.pushReceiptTicket.findMany.mockResolvedValue([ticket(1)]);
    mockTokens.removeTokensDeadSince.mockRejectedValue(new Error("db down"));
    const { sender } = senderOf(() => new Map<string, PushReceipt>([["receipt-1", dead]]));

    await expect(checkPushReceipts(sender, NOW)).rejects.toThrow("db down");

    expect(mockPrisma.pushReceiptTicket.deleteMany).not.toHaveBeenCalled();
  });

  it("logs one summary line of counts, and nothing that could name a phone", async () => {
    mockPrisma.pushReceiptTicket.findMany.mockResolvedValue([
      ticket(1, T1),
      ticket(2, T2),
    ]);
    mockTokens.removeTokensDeadSince.mockResolvedValue(1);
    const { sender } = senderOf(
      () =>
        new Map<string, PushReceipt>([
          ["receipt-1", ok],
          ["receipt-2", dead],
        ])
    );

    await checkPushReceipts(sender, NOW);

    const summary = lines.filter((l) => l.level === "log");
    expect(summary).toHaveLength(1);
    expect(JSON.parse(summary[0].text)).toMatchObject({
      message: "Push receipts checked",
      checked: 2,
      delivered: 1,
      failed: 1,
      removedTokens: 1,
      expired: 0,
      deferred: 0,
    });
    expect(JSON.stringify(lines)).not.toContain("ExponentPushToken");
    expect(JSON.stringify(lines)).not.toContain("receipt-");
  });
});
