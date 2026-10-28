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
  /** `id`: the receipt to look up later (see `PushSender.receipts`); absent when the service gave none. */
  | { status: "ok"; id?: string }
  /** `unregistered`: the token is dead and should be deleted; anything else is a failure to log. */
  | { status: "error"; unregistered: boolean; message: string };

/**
 * What the phone makers did with a message the push service accepted. A ticket
 * only says the push service has the message; the receipt, some minutes later,
 * says whether Google or Apple took it.
 */
export type PushReceipt =
  | { status: "ok" }
  /** `unregistered`: the phone is gone (uninstalled, or the token is stale) and its token should be deleted. */
  | { status: "error"; unregistered: boolean; message: string };

export interface PushSender {
  /** False for the sender that does nothing, so a caller can skip looking anyone up. */
  readonly enabled: boolean;
  /** One ticket for each message, in the same order. Never throws. */
  send(messages: PushMessage[]): Promise<PushTicket[]>;
  /**
   * The receipts for tickets' ids, at most `EXPO_RECEIPT_BATCH_SIZE` at a time.
   * An id with no entry has no receipt (not ready yet, or cleared). `null` means
   * the push service could not be asked, which says nothing about any id. Never throws.
   */
  receipts(ids: string[]): Promise<Map<string, PushReceipt> | null>;
}

export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
export const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
/** Expo accepts up to 100 messages in one request. */
export const EXPO_BATCH_SIZE = 100;
/** Expo answers for up to 1000 receipt ids in one request. */
export const EXPO_RECEIPT_BATCH_SIZE = 1000;
/** A slow push service must not hold up the action that caused the push. */
export const EXPO_TIMEOUT_MS = 5_000;

export class NullPushSender implements PushSender {
  readonly enabled = false;
  async send(messages: PushMessage[]): Promise<PushTicket[]> {
    return messages.map(() => ({ status: "ok" as const }));
  }
  async receipts(): Promise<Map<string, PushReceipt>> {
    return new Map();
  }
}

type ExpoTicket = {
  id?: string;
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

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(this.accessToken
        ? { Authorization: `Bearer ${this.accessToken}` }
        : {}),
    };
  }

  private async sendBatch(batch: PushMessage[]): Promise<PushTicket[]> {
    const failed = (message: string): PushTicket[] =>
      batch.map(() => ({ status: "error", unregistered: false, message }));
    try {
      const res = await this.fetchImpl(EXPO_PUSH_URL, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(batch),
        signal: AbortSignal.timeout(EXPO_TIMEOUT_MS),
      });
      if (!res.ok) return failed(`Push service answered ${res.status}`);
      const body = (await res.json()) as { data?: ExpoTicket[] };
      const data = Array.isArray(body.data) ? body.data : [];
      // A short answer is a failure for the messages it does not cover.
      return batch.map((_, index): PushTicket => {
        const ticket = data[index];
        if (ticket?.status === "ok") {
          return typeof ticket.id === "string"
            ? { status: "ok", id: ticket.id }
            : { status: "ok" };
        }
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

  async receipts(ids: string[]): Promise<Map<string, PushReceipt> | null> {
    if (ids.length === 0) return new Map();
    try {
      const res = await this.fetchImpl(EXPO_RECEIPTS_URL, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ ids }),
        signal: AbortSignal.timeout(EXPO_TIMEOUT_MS),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { data?: unknown };
      const data = body.data;
      // No `data` at all (an `errors` answer, say) is not "no receipts yet".
      if (typeof data !== "object" || data === null || Array.isArray(data)) {
        return null;
      }
      const answered = new Map<string, PushReceipt>();
      for (const id of ids) {
        if (!Object.prototype.hasOwnProperty.call(data, id)) continue;
        const receipt = (data as Record<string, ExpoTicket | undefined>)[id];
        if (!receipt) continue;
        answered.set(
          id,
          receipt.status === "ok"
            ? { status: "ok" }
            : {
                status: "error",
                unregistered: receipt.details?.error === "DeviceNotRegistered",
                message: receipt.details?.error ?? receipt.message ?? "No detail",
              }
        );
      }
      return answered;
    } catch {
      return null;
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
