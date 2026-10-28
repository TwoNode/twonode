import { Platform } from "@/utils/platform";
import { removeTokens, tokensForUsers } from "@/lib/push/deviceTokens";
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
  | "SUBSCRIPTION_ENDING";

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
 * push service says are dead. Returns how many pushes it handed over.
 */
export async function sendPush(
  userIds: string[],
  event: PushEvent,
  sender: PushSender = getPushSender()
): Promise<number> {
  if (!sender.enabled) return 0;
  try {
    const targets = await tokensForUsers(
      Array.from(new Set(userIds)),
      Platform.SURFBOARD
    );
    if (targets.length === 0) return 0;
    const messages = targets.map(({ token }) => buildPushMessage(token, event));
    const tickets = await sender.send(messages);
    const dead = tickets.flatMap((ticket, index) =>
      ticket.status === "error" && ticket.unregistered ? [targets[index].token] : []
    );
    await removeTokens(dead);
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
