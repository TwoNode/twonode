import { Platform } from "@/utils/platform";
import { claimPushWindow } from "@/lib/push/cooldown";
import { removeTokens, tokensForUsers } from "@/lib/push/deviceTokens";
import { usersWhoWant } from "@/lib/push/preferences";
import { recordTickets } from "@/lib/push/receipts";
import {
  getPushSender,
  type PushMessage,
  type PushSender,
} from "@/lib/push/sender";

/**
 * The events that push to the app (TASK-0006 P6-D2) and the words they use.
 * **The text is fixed and generic** (P6-D3): a lock screen shows it to anyone
 * holding the phone, so it never carries a plan title, a reviewer's comment,
 * a place, a name or a number. The app opens the plan from `planId` and shows
 * the detail inside the app.
 */
export type PushKind =
  | "PLAN_QUERIED"
  | "READY_FOR_PHYSICAL"
  | "PLAN_SHARED"
  | "PLAN_LODGED"
  | "SUBSCRIPTION_ENDING"
  | "WITHDRAWAL_UPDATED";

export type PushEvent = {
  kind: PushKind;
  /** A plan's id (a uuid, not personal text), so a tap can open it. */
  planId?: string;
};

const COPY: Record<PushKind, { title: string; body: string }> = {
  PLAN_QUERIED: {
    title: "Surfboard",
    body: "A plan needs your attention. Open the app to see why.",
  },
  READY_FOR_PHYSICAL: {
    title: "Surfboard",
    body: "A plan is ready for physical submission.",
  },
  PLAN_SHARED: {
    title: "Surfboard",
    body: "A plan was shared with you.",
  },
  PLAN_LODGED: {
    title: "Surfboard",
    body: "A plan was lodged. Open the app to see it.",
  },
  SUBSCRIPTION_ENDING: {
    title: "Surfboard",
    body: "Your subscription ends soon. Open the app for the date.",
  },
  // One kind for a paid and a refused withdrawal: which one, and the amount, are shown in the app.
  WITHDRAWAL_UPDATED: {
    title: "Surfboard",
    body: "Your withdrawal request was updated. Open the app for the details.",
  },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildPushMessage(
  token: string,
  event: PushEvent
): PushMessage {
  const { title, body } = COPY[event.kind];
  const data: Record<string, string | number> = { v: 1, kind: event.kind };
  // Only a real uuid goes into the payload: anything else is dropped, never trusted.
  if (event.planId && UUID.test(event.planId)) data.planId = event.planId;
  return { to: token, title, body, data, channelId: "updates" };
}

/**
 * Sends a push to these people's installs. Best effort in every way: it never
 * throws (a notification must not break the action that caused it), does
 * nothing when push is off or nobody has registered, and deletes tokens the
 * push service says are dead. Leaves out a person who switched this kind off or
 * is in their quiet hours (TASK-0015 1I.5), and sends a person at most one push
 * of a kind in 5 minutes (1I.4: a batch of plans is one notification, not
 * twenty). Returns how many pushes it handed over.
 */
export async function sendPush(
  userIds: string[],
  event: PushEvent,
  sender: PushSender = getPushSender()
): Promise<number> {
  if (!sender.enabled) return 0;
  try {
    const wanting = await usersWhoWant(
      Array.from(new Set(userIds)),
      event.kind,
      Platform.SURFBOARD
    );
    if (wanting.length === 0) return 0;
    const withPhones = await tokensForUsers(wanting, Platform.SURFBOARD);
    if (withPhones.length === 0) return 0;
    // Claimed only for people who have a phone to send to, so a window is not spent on nobody.
    const free = await claimPushWindow(
      Array.from(new Set(withPhones.map((t) => t.userId))),
      event.kind
    );
    const targets = withPhones.filter((t) => free.has(t.userId));
    if (targets.length === 0) return 0;
    const messages = targets.map(({ token }) => buildPushMessage(token, event));
    const tickets = await sender.send(messages);
    const dead = tickets.flatMap((ticket, index) =>
      ticket.status === "error" && ticket.unregistered ? [targets[index].token] : []
    );
    await removeTokens(dead);
    // So the receipts can be read later (1I.6). Never throws.
    await recordTickets(
      tickets.flatMap((ticket, index) =>
        ticket.status === "ok" && ticket.id
          ? [{ ticketId: ticket.id, token: targets[index].token }]
          : []
      )
    );
    const failed = tickets.filter(
      (t) => t.status === "error" && !t.unregistered
    ).length;
    if (failed > 0) console.error(`Push: ${failed} of ${tickets.length} failed`);
    return tickets.filter((t) => t.status === "ok").length;
  } catch (error) {
    console.error("Push failed:", error instanceof Error ? error.message : error);
    return 0;
  }
}
