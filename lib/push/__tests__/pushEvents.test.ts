import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PushMessage, PushSender, PushTicket } from "@/lib/push/sender";

const mockTokens = vi.hoisted(() => ({
  tokensForUsers: vi.fn(),
  removeTokens: vi.fn(),
}));
vi.mock("@/lib/push/deviceTokens", () => mockTokens);
const mockReceipts = vi.hoisted(() => ({ recordTickets: vi.fn() }));
vi.mock("@/lib/push/receipts", () => mockReceipts);
const mockPrefs = vi.hoisted(() => ({ usersWhoWant: vi.fn() }));
vi.mock("@/lib/push/preferences", () => mockPrefs);
const mockCooldown = vi.hoisted(() => ({ claimPushWindow: vi.fn() }));
vi.mock("@/lib/push/cooldown", () => mockCooldown);

const { buildPushMessage, sendPush } = await import("@/lib/push/pushEvents");

const PLAN_ID = "3f2b8c1e-9d4a-4e6b-8a7c-1d2e3f4a5b6c";
const T1 = "ExponentPushToken[token0000000001]";
const T2 = "ExponentPushToken[token0000000002]";
const T3 = "ExponentPushToken[token0000000003]";

const senderOf = (
  tickets: (messages: PushMessage[]) => PushTicket[],
  enabled = true
) => {
  const send = vi.fn(async (messages: PushMessage[]) => tickets(messages));
  const receipts = vi.fn(async () => new Map());
  return { sender: { enabled, send, receipts } satisfies PushSender, send };
};
const allOk = (messages: PushMessage[]): PushTicket[] =>
  messages.map(() => ({ status: "ok" }));

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.resetAllMocks();
  mockTokens.tokensForUsers.mockResolvedValue([]);
  mockTokens.removeTokens.mockResolvedValue(0);
  mockReceipts.recordTickets.mockResolvedValue(undefined);
  // Everyone wants it and every window is free, unless a test says otherwise.
  mockPrefs.usersWhoWant.mockImplementation(async (ids: string[]) => ids);
  mockCooldown.claimPushWindow.mockImplementation(
    async (ids: string[]) => new Set(ids)
  );
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errorSpy.mockRestore());

describe("buildPushMessage", () => {
  it("uses fixed, generic words for each kind", () => {
    const queried = buildPushMessage(T1, { kind: "PLAN_QUERIED" });
    const ready = buildPushMessage(T1, { kind: "READY_FOR_PHYSICAL" });
    const shared = buildPushMessage(T1, { kind: "PLAN_SHARED" });

    expect(queried).toMatchObject({
      to: T1,
      title: "Surfboard",
      body: "A plan needs your attention. Open the app to see why.",
      channelId: "updates",
    });
    expect(ready.body).toBe("A plan is ready for physical submission.");
    expect(shared.body).toBe("A plan was shared with you.");
  });

  it("uses fixed, generic words for a lodged plan and an ending subscription", () => {
    expect(buildPushMessage(T1, { kind: "PLAN_LODGED" })).toMatchObject({
      title: "Surfboard",
      body: "A plan was lodged. Open the app to see it.",
      channelId: "updates",
    });
    expect(buildPushMessage(T1, { kind: "SUBSCRIPTION_ENDING" })).toMatchObject({
      title: "Surfboard",
      body: "Your subscription ends soon. Open the app for the date.",
      channelId: "updates",
    });
  });

  it("carries a lodged plan's id, and an ending subscription's kind alone", () => {
    expect(
      buildPushMessage(T1, { kind: "PLAN_LODGED", planId: PLAN_ID }).data
    ).toEqual({ v: 1, kind: "PLAN_LODGED", planId: PLAN_ID });
    expect(buildPushMessage(T1, { kind: "SUBSCRIPTION_ENDING" }).data).toEqual({
      v: 1,
      kind: "SUBSCRIPTION_ENDING",
    });
  });

  it("uses one fixed, generic push for a payout, paid or refused", () => {
    const message = buildPushMessage(T1, { kind: "WITHDRAWAL_UPDATED" });

    expect(message).toMatchObject({
      to: T1,
      title: "Surfboard",
      body: "Your withdrawal request was updated. Open the app for the details.",
      channelId: "updates",
    });
    expect(message.data).toEqual({ v: 1, kind: "WITHDRAWAL_UPDATED" });
  });

  it("never puts an amount, a bank or a reason into the payout push", () => {
    const event = {
      kind: "WITHDRAWAL_UPDATED",
      amount: 50000,
      bankName: "Example Bank",
      accountNumber: "0123456789",
      adminComment: "Rejected: name mismatch",
    } as unknown as Parameters<typeof buildPushMessage>[1];

    const message = buildPushMessage(T1, event);

    const text = JSON.stringify(message);
    for (const secret of ["50000", "Example Bank", "0123456789", "mismatch"]) {
      expect(text).not.toContain(secret);
    }
    expect(message.data).toEqual({ v: 1, kind: "WITHDRAWAL_UPDATED" });
  });

  it("never puts an amount, a date or a plan name into the subscription push", () => {
    const event = {
      kind: "SUBSCRIPTION_ENDING",
      daysLeft: 3,
      amount: 50000,
      expiresAt: "2026-11-01",
      planName: "SECRET-PLAN",
    } as unknown as Parameters<typeof buildPushMessage>[1];

    const json = JSON.stringify(buildPushMessage(T1, event));

    for (const leak of ["50000", "2026-11-01", "SECRET-PLAN", "daysLeft"]) {
      expect(json).not.toContain(leak);
    }
  });

  it("carries the kind, a version and a plan id, and nothing else", () => {
    expect(
      buildPushMessage(T1, { kind: "PLAN_QUERIED", planId: PLAN_ID }).data
    ).toEqual({ v: 1, kind: "PLAN_QUERIED", planId: PLAN_ID });
    expect(buildPushMessage(T1, { kind: "PLAN_SHARED" }).data).toEqual({
      v: 1,
      kind: "PLAN_SHARED",
    });
  });

  it("never lets a title, a comment, a place or a name into what the lock screen shows", () => {
    // A caller handing more than it should (the types forbid it) still cannot leak it.
    const event = {
      kind: "PLAN_QUERIED",
      planId: PLAN_ID,
      title: "SECRET-TITLE",
      comment: "SECRET-COMMENT",
      place: "SECRET-PLACE",
      planNumber: "LA/2026/SECRET",
      queriedBy: "SECRET-NAME",
    } as unknown as Parameters<typeof buildPushMessage>[1];

    const json = JSON.stringify(buildPushMessage(T1, event));

    expect(json).not.toContain("SECRET");
    expect(Object.keys(JSON.parse(json).data).sort()).toEqual([
      "kind",
      "planId",
      "v",
    ]);
  });

  it("accepts a plan id in either case", () => {
    const upper = PLAN_ID.toUpperCase();
    expect(
      buildPushMessage(T1, { kind: "PLAN_SHARED", planId: upper }).data.planId
    ).toBe(upper);
  });

  it.each([
    ["a plan number", "LA/2026/0412"],
    ["a path", "../../etc/passwd"],
    ["an empty string", ""],
    ["a uuid with text after it", `${PLAN_ID}?x=1`],
    ["a uuid with text before it", `x${PLAN_ID}`],
    ["a uuid without dashes", PLAN_ID.replace(/-/g, "")],
    ["a script", "<script>alert(1)</script>"],
  ])("drops a plan id that is %s", (_name, planId) => {
    const { data } = buildPushMessage(T1, { kind: "PLAN_SHARED", planId });
    expect(data).not.toHaveProperty("planId");
  });
});

describe("sendPush", () => {
  it("does nothing, and looks nobody up, when push is off", async () => {
    const { sender, send } = senderOf(allOk, false);

    expect(await sendPush(["u1"], { kind: "PLAN_SHARED" }, sender)).toBe(0);
    expect(mockTokens.tokensForUsers).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("does nothing when nobody has registered a phone", async () => {
    const { sender, send } = senderOf(allOk);

    expect(await sendPush(["u1"], { kind: "PLAN_SHARED" }, sender)).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it("looks up each person once, on Surfboard", async () => {
    const { sender } = senderOf(allOk);

    await sendPush(["u1", "u2", "u1"], { kind: "PLAN_SHARED" }, sender);

    expect(mockTokens.tokensForUsers).toHaveBeenCalledWith(
      ["u1", "u2"],
      "surfboard"
    );
  });

  it("sends one push to each phone and counts the ones the service took", async () => {
    mockTokens.tokensForUsers.mockResolvedValue([
      { userId: "u1", token: T1 },
      { userId: "u1", token: T2 },
      { userId: "u2", token: T3 },
    ]);
    const { sender, send } = senderOf((messages) =>
      messages.map((m, i): PushTicket =>
        i === 1
          ? { status: "error", unregistered: false, message: "boom" }
          : { status: "ok" }
      )
    );

    const handed = await sendPush(
      ["u1", "u2"],
      { kind: "PLAN_QUERIED", planId: PLAN_ID },
      sender
    );

    expect(handed).toBe(2);
    const sent = send.mock.calls[0][0];
    expect(sent.map((m) => m.to)).toEqual([T1, T2, T3]);
    expect(sent.every((m) => m.data.planId === PLAN_ID)).toBe(true);
  });

  it("deletes only the tokens the service says are dead", async () => {
    mockTokens.tokensForUsers.mockResolvedValue([
      { userId: "u1", token: T1 },
      { userId: "u1", token: T2 },
      { userId: "u2", token: T3 },
    ]);
    const { sender } = senderOf(() => [
      { status: "ok" },
      { status: "error", unregistered: true, message: "DeviceNotRegistered" },
      { status: "error", unregistered: false, message: "MessageRateExceeded" },
    ]);

    await sendPush(["u1", "u2"], { kind: "PLAN_SHARED" }, sender);

    expect(mockTokens.removeTokens).toHaveBeenCalledWith([T2]);
  });

  it("reports failures that are not dead tokens, without the tokens", async () => {
    mockTokens.tokensForUsers.mockResolvedValue([{ userId: "u1", token: T1 }]);
    const { sender } = senderOf(() => [
      { status: "error", unregistered: false, message: "boom" },
    ]);

    expect(await sendPush(["u1"], { kind: "PLAN_SHARED" }, sender)).toBe(0);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0])).not.toContain(T1);
  });

  describe("preferences and the cool-down", () => {
    it("asks who wants this kind of push, among the people named, once each", async () => {
      const { sender } = senderOf(allOk);

      await sendPush(["u1", "u2", "u1"], { kind: "PLAN_LODGED" }, sender);

      expect(mockPrefs.usersWhoWant).toHaveBeenCalledWith(
        ["u1", "u2"],
        "PLAN_LODGED",
        "surfboard"
      );
    });

    it("looks up the phones only of the people who want it", async () => {
      mockPrefs.usersWhoWant.mockResolvedValue(["u2"]);
      const { sender } = senderOf(allOk);

      await sendPush(["u1", "u2"], { kind: "PLAN_LODGED" }, sender);

      expect(mockTokens.tokensForUsers).toHaveBeenCalledWith(["u2"], "surfboard");
    });

    it("looks nobody's phone up, and sends nothing, when nobody wants it", async () => {
      mockPrefs.usersWhoWant.mockResolvedValue([]);
      const { sender, send } = senderOf(allOk);

      expect(await sendPush(["u1"], { kind: "PLAN_LODGED" }, sender)).toBe(0);

      expect(mockTokens.tokensForUsers).not.toHaveBeenCalled();
      expect(mockCooldown.claimPushWindow).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    });

    it("claims the window only for people who have a phone, once each", async () => {
      mockTokens.tokensForUsers.mockResolvedValue([
        { userId: "u1", token: T1 },
        { userId: "u1", token: T2 },
      ]);
      const { sender } = senderOf(allOk);

      await sendPush(["u1", "u2"], { kind: "PLAN_QUERIED" }, sender);

      expect(mockCooldown.claimPushWindow).toHaveBeenCalledWith(
        ["u1"],
        "PLAN_QUERIED"
      );
    });

    it("sends a person with two phones both pushes, from one claim", async () => {
      mockTokens.tokensForUsers.mockResolvedValue([
        { userId: "u1", token: T1 },
        { userId: "u1", token: T2 },
      ]);
      const { sender, send } = senderOf(allOk);

      expect(await sendPush(["u1"], { kind: "PLAN_QUERIED" }, sender)).toBe(2);

      expect(send.mock.calls[0][0].map((m) => m.to)).toEqual([T1, T2]);
    });

    it("leaves out a person who was already sent this kind in the window", async () => {
      mockTokens.tokensForUsers.mockResolvedValue([
        { userId: "u1", token: T1 },
        { userId: "u2", token: T2 },
      ]);
      mockCooldown.claimPushWindow.mockResolvedValue(new Set(["u2"]));
      const { sender, send } = senderOf(allOk);

      expect(await sendPush(["u1", "u2"], { kind: "PLAN_QUERIED" }, sender)).toBe(1);

      expect(send.mock.calls[0][0].map((m) => m.to)).toEqual([T2]);
    });

    it("sends nothing when every window was taken", async () => {
      mockTokens.tokensForUsers.mockResolvedValue([{ userId: "u1", token: T1 }]);
      mockCooldown.claimPushWindow.mockResolvedValue(new Set());
      const { sender, send } = senderOf(allOk);

      expect(await sendPush(["u1"], { kind: "PLAN_QUERIED" }, sender)).toBe(0);

      expect(send).not.toHaveBeenCalled();
    });

    it("sends nothing, and does not throw, when the preferences cannot be read", async () => {
      mockPrefs.usersWhoWant.mockRejectedValue(new Error("db down"));
      const { sender, send } = senderOf(allOk);

      await expect(
        sendPush(["u1"], { kind: "PLAN_LODGED" }, sender)
      ).resolves.toBe(0);
      expect(send).not.toHaveBeenCalled();
    });

    it("sends nothing, and does not throw, when the cool-down cannot be checked", async () => {
      mockTokens.tokensForUsers.mockResolvedValue([{ userId: "u1", token: T1 }]);
      mockCooldown.claimPushWindow.mockRejectedValue(new Error("db down"));
      const { sender, send } = senderOf(allOk);

      await expect(
        sendPush(["u1"], { kind: "PLAN_LODGED" }, sender)
      ).resolves.toBe(0);
      expect(send).not.toHaveBeenCalled();
    });
  });

  it("keeps the receipt ids of the messages the service took, with their tokens", async () => {
    mockTokens.tokensForUsers.mockResolvedValue([
      { userId: "u1", token: T1 },
      { userId: "u1", token: T2 },
      { userId: "u2", token: T3 },
    ]);
    const { sender } = senderOf(() => [
      { status: "ok", id: "receipt-1" },
      { status: "error", unregistered: false, message: "boom" },
      { status: "ok", id: "receipt-3" },
    ]);

    await sendPush(["u1", "u2"], { kind: "PLAN_SHARED" }, sender);

    expect(mockReceipts.recordTickets).toHaveBeenCalledWith([
      { ticketId: "receipt-1", token: T1 },
      { ticketId: "receipt-3", token: T3 },
    ]);
  });

  it("keeps nothing for an accepted message the service gave no receipt id for", async () => {
    mockTokens.tokensForUsers.mockResolvedValue([{ userId: "u1", token: T1 }]);
    const { sender } = senderOf(allOk);

    expect(await sendPush(["u1"], { kind: "PLAN_SHARED" }, sender)).toBe(1);

    expect(mockReceipts.recordTickets).toHaveBeenCalledWith([]);
  });

  it("keeps nothing when push is off or nobody has registered", async () => {
    await sendPush(["u1"], { kind: "PLAN_SHARED" }, senderOf(allOk, false).sender);
    await sendPush(["u1"], { kind: "PLAN_SHARED" }, senderOf(allOk).sender);

    expect(mockReceipts.recordTickets).not.toHaveBeenCalled();
  });

  describe("never throws", () => {
    it("when the push service throws", async () => {
      mockTokens.tokensForUsers.mockResolvedValue([{ userId: "u1", token: T1 }]);
      const sender: PushSender = {
        enabled: true,
        send: vi.fn().mockRejectedValue(new Error("down")),
        receipts: vi.fn(),
      };
      await expect(
        sendPush(["u1"], { kind: "PLAN_SHARED" }, sender)
      ).resolves.toBe(0);
    });

    it("when the tokens cannot be read", async () => {
      mockTokens.tokensForUsers.mockRejectedValue(new Error("db down"));
      const { sender } = senderOf(allOk);
      await expect(
        sendPush(["u1"], { kind: "PLAN_SHARED" }, sender)
      ).resolves.toBe(0);
    });

    it("when dead tokens cannot be removed", async () => {
      mockTokens.tokensForUsers.mockResolvedValue([{ userId: "u1", token: T1 }]);
      mockTokens.removeTokens.mockRejectedValue(new Error("db down"));
      const { sender } = senderOf(() => [
        { status: "error", unregistered: true, message: "DeviceNotRegistered" },
      ]);
      await expect(
        sendPush(["u1"], { kind: "PLAN_SHARED" }, sender)
      ).resolves.toBe(0);
    });
  });
});
