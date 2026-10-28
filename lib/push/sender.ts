/**
 * Sending a push (TASK-0015 1I.2). The rest of the server talks to the
 * `PushSender` interface only, so the push service can change (P6-D1: Expo's
 * first, FCM and APNs directly later) without touching a caller.
 *
 * Off unless `PUSH_ENABLED=1`: with it unset every send is a no-op, so merging
 * and deploying this changes nothing for anyone until the maintainer has
 * uploaded the push credentials to EAS and turned it on.
 */

export type PushMessage = {
  /** An Expo push token. */
  to: string;
  title: string;
  body: string;
  /** Read by the app when the notification is tapped. Never personal text. */
  data: Record<string, string | number>;
  /** Android channel the app creates (`updates`). */
  channelId?: string;
};

export type PushTicket =
  | { status: "ok" }
  /** `unregistered`: the token is dead and should be deleted; anything else is a failure to log. */
  | { status: "error"; unregistered: boolean; message: string };

export interface PushSender {
  /** False for the sender that does nothing, so a caller can skip looking anyone up. */
  readonly enabled: boolean;
  /** One ticket for each message, in the same order. Never throws. */
  send(messages: PushMessage[]): Promise<PushTicket[]>;
}

export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Expo accepts up to 100 messages in one request. */
export const EXPO_BATCH_SIZE = 100;

export class NullPushSender implements PushSender {
  readonly enabled = false;
  async send(messages: PushMessage[]): Promise<PushTicket[]> {
    return messages.map(() => ({ status: "ok" as const }));
  }
}

type ExpoTicket = {
  status?: string;
  message?: string;
  details?: { error?: string };
};

export class ExpoPushSender implements PushSender {
  readonly enabled = true;
  constructor(
    private readonly accessToken?: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async send(messages: PushMessage[]): Promise<PushTicket[]> {
    const tickets: PushTicket[] = [];
    for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
      const batch = messages.slice(i, i + EXPO_BATCH_SIZE);
      tickets.push(...(await this.sendBatch(batch)));
    }
    return tickets;
  }

  private async sendBatch(batch: PushMessage[]): Promise<PushTicket[]> {
    const failed = (message: string): PushTicket[] =>
      batch.map(() => ({ status: "error", unregistered: false, message }));
    try {
      const res = await this.fetchImpl(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(this.accessToken
            ? { Authorization: `Bearer ${this.accessToken}` }
            : {}),
        },
        body: JSON.stringify(batch),
      });
      if (!res.ok) return failed(`Push service answered ${res.status}`);
      const body = (await res.json()) as { data?: ExpoTicket[] };
      const data = Array.isArray(body.data) ? body.data : [];
      // A short answer is a failure for the messages it does not cover.
      return batch.map((_, index): PushTicket => {
        const ticket = data[index];
        if (ticket?.status === "ok") return { status: "ok" };
        return {
          status: "error",
          unregistered: ticket?.details?.error === "DeviceNotRegistered",
          message: ticket?.details?.error ?? ticket?.message ?? "No ticket",
        };
      });
    } catch (error) {
      return failed(error instanceof Error ? error.message : "Push failed");
    }
  }
}

/** The sender for this environment. `PUSH_ENABLED` must be exactly "1". */
export function getPushSender(
  env: Record<string, string | undefined> = process.env
): PushSender {
  if (env.PUSH_ENABLED !== "1") return new NullPushSender();
  return new ExpoPushSender(env.EXPO_ACCESS_TOKEN || undefined);
}
