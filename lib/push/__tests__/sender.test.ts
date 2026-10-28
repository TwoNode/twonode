import { describe, expect, it, vi } from "vitest";
import {
  EXPO_BATCH_SIZE,
  EXPO_PUSH_URL,
  EXPO_TIMEOUT_MS,
  ExpoPushSender,
  NullPushSender,
  getPushSender,
  type PushMessage,
} from "@/lib/push/sender";

const message = (n: number): PushMessage => ({
  to: `ExponentPushToken[token${String(n).padStart(8, "0")}]`,
  title: "Surfboard",
  body: "A plan was shared with you.",
  data: { v: 1, kind: "PLAN_SHARED" },
  channelId: "updates",
});
const messages = (count: number) =>
  Array.from({ length: count }, (_, i) => message(i));

const reply = (data: unknown, init: ResponseInit = { status: 200 }) =>
  new Response(JSON.stringify({ data }), init);

describe("getPushSender", () => {
  it("is off unless PUSH_ENABLED is exactly 1", () => {
    for (const value of [undefined, "", "0", "true", "yes", "11", " 1"]) {
      const sender = getPushSender({ PUSH_ENABLED: value });
      expect(sender).toBeInstanceOf(NullPushSender);
      expect(sender.enabled).toBe(false);
    }
  });

  it("is on, through Expo, when PUSH_ENABLED is 1", () => {
    const sender = getPushSender({ PUSH_ENABLED: "1" });
    expect(sender).toBeInstanceOf(ExpoPushSender);
    expect(sender.enabled).toBe(true);
  });

  it("reads the process environment by default", () => {
    vi.stubEnv("PUSH_ENABLED", "1");
    try {
      expect(getPushSender().enabled).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
    expect(getPushSender().enabled).toBe(false);
  });
});

describe("NullPushSender", () => {
  it("sends nothing and says so", async () => {
    const sender = new NullPushSender();
    expect(sender.enabled).toBe(false);
    expect(await sender.send(messages(2))).toEqual([
      { status: "ok" },
      { status: "ok" },
    ]);
  });
});

describe("ExpoPushSender", () => {
  it("posts the messages to Expo's push endpoint as JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(reply([{ status: "ok" }]));
    const sent = messages(1);

    await new ExpoPushSender(undefined, fetchImpl).send(sent);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(EXPO_PUSH_URL);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual(sent);
  });

  it("sends the access token only when there is one", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => reply([{ status: "ok" }]));

    await new ExpoPushSender("secret-token", fetchImpl).send(messages(1));
    await new ExpoPushSender(undefined, fetchImpl).send(messages(1));

    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer secret-token"
    );
    expect(fetchImpl.mock.calls[1][1].headers).not.toHaveProperty(
      "Authorization"
    );
  });

  it("gives up on a slow push service instead of holding the caller", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(reply([{ status: "ok" }]));

    await new ExpoPushSender(undefined, fetchImpl).send(messages(1));

    const signal: AbortSignal = fetchImpl.mock.calls[0][1].signal;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
    expect(EXPO_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
  });

  it("sends at most 100 messages to a request and keeps the tickets in order", async () => {
    const answered: number[] = [];
    const fetchImpl = vi.fn().mockImplementation(async (_url, init) => {
      const batch = JSON.parse(init.body) as PushMessage[];
      answered.push(batch.length);
      // The first message of every batch is refused, so the order shows in the result.
      return reply(
        batch.map((_, i) =>
          i === 0
            ? { status: "error", details: { error: "DeviceNotRegistered" } }
            : { status: "ok" }
        )
      );
    });

    const tickets = await new ExpoPushSender(undefined, fetchImpl).send(
      messages(250)
    );

    expect(EXPO_BATCH_SIZE).toBe(100);
    expect(answered).toEqual([100, 100, 50]);
    expect(tickets).toHaveLength(250);
    const refused = tickets.flatMap((t, i) =>
      t.status === "error" ? [i] : []
    );
    expect(refused).toEqual([0, 100, 200]);
  });

  it("does not call Expo for no messages", async () => {
    const fetchImpl = vi.fn();
    expect(await new ExpoPushSender(undefined, fetchImpl).send([])).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("marks only DeviceNotRegistered as a dead token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      reply([
        { status: "ok" },
        { status: "error", details: { error: "DeviceNotRegistered" } },
        {
          status: "error",
          message: "Rate limited",
          details: { error: "MessageRateExceeded" },
        },
        { status: "error", message: "Something else" },
      ])
    );

    const tickets = await new ExpoPushSender(undefined, fetchImpl).send(
      messages(4)
    );

    expect(tickets).toEqual([
      { status: "ok" },
      { status: "error", unregistered: true, message: "DeviceNotRegistered" },
      { status: "error", unregistered: false, message: "MessageRateExceeded" },
      { status: "error", unregistered: false, message: "Something else" },
    ]);
  });

  it("counts a short answer as a failure for the messages it leaves out", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(reply([{ status: "ok" }]));

    const tickets = await new ExpoPushSender(undefined, fetchImpl).send(
      messages(3)
    );

    expect(tickets).toEqual([
      { status: "ok" },
      { status: "error", unregistered: false, message: "No ticket" },
      { status: "error", unregistered: false, message: "No ticket" },
    ]);
  });

  it("counts an answer that is not a list as a failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(reply({ not: "a list" }));

    const tickets = await new ExpoPushSender(undefined, fetchImpl).send(
      messages(2)
    );

    expect(tickets.map((t) => t.status)).toEqual(["error", "error"]);
  });

  it("fails every message of a batch the service refuses, without throwing", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("nope", { status: 503 }));

    const tickets = await new ExpoPushSender(undefined, fetchImpl).send(
      messages(2)
    );

    expect(tickets).toEqual([
      { status: "error", unregistered: false, message: "Push service answered 503" },
      { status: "error", unregistered: false, message: "Push service answered 503" },
    ]);
  });

  it("fails a batch whose request throws, and still sends the next batch", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValueOnce(reply([{ status: "ok" }]));

    const tickets = await new ExpoPushSender(undefined, fetchImpl).send(
      messages(EXPO_BATCH_SIZE + 1)
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(tickets).toHaveLength(EXPO_BATCH_SIZE + 1);
    expect(tickets.slice(0, EXPO_BATCH_SIZE)).toSatisfy((list: typeof tickets) =>
      list.every(
        (t) =>
          t.status === "error" && !t.unregistered && t.message === "socket hang up"
      )
    );
    expect(tickets[EXPO_BATCH_SIZE]).toEqual({ status: "ok" });
  });

  it("fails a batch whose answer is not JSON, without throwing", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("<html>", { status: 200 }));

    const tickets = await new ExpoPushSender(undefined, fetchImpl).send(
      messages(1)
    );

    expect(tickets).toHaveLength(1);
    expect(tickets[0].status).toBe("error");
  });
});
