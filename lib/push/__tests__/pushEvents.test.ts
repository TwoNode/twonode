import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PushMessage, PushSender, PushTicket } from "@/lib/push/sender";

const mockTokens = vi.hoisted(() => ({
  tokensForUsers: vi.fn(),
  removeTokens: vi.fn(),
}));
vi.mock("@/lib/push/deviceTokens", () => mockTokens);

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
  return { sender: { enabled, send } satisfies PushSender, send };
};
const allOk = (messages: PushMessage[]): PushTicket[] =>
  messages.map(() => ({ status: "ok" }));

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.resetAllMocks();
  mockTokens.tokensForUsers.mockResolvedValue([]);
  mockTokens.removeTokens.mockResolvedValue(0);
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

  describe("never throws", () => {
    it("when the push service throws", async () => {
      mockTokens.tokensForUsers.mockResolvedValue([{ userId: "u1", token: T1 }]);
      const sender: PushSender = {
        enabled: true,
        send: vi.fn().mockRejectedValue(new Error("down")),
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
