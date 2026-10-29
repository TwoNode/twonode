import prisma from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";
import { removeTokensDeadSince } from "@/lib/push/deviceTokens";
import {
  EXPO_RECEIPT_BATCH_SIZE,
  getPushSender,
  type PushSender,
} from "@/lib/push/sender";

/**
 * Delivery receipts (TASK-0015 1I.6). The push service accepting a message
 * (the ticket) does not say Google or Apple took it. A receipt, available
 * about 15 minutes later and cleared after 24 hours, says that, and it is where
 * a phone that was uninstalled shows up as `DeviceNotRegistered`. Without it a
 * dead token is only ever found by sending to it again.
 *
 * `sendPush` keeps each accepted ticket (`recordTickets`); `checkPushReceipts`
 * runs on a schedule (`/api/cron/push-receipts`), reads the ones that are old
 * enough and deletes the tokens the receipts name.
 */

/** The push service asks for 15 minutes between a send and a receipt lookup. */
export const RECEIPT_MIN_AGE_MS = 15 * 60 * 1000;
/** Receipts are cleared after 24 hours; a ticket older than this with no receipt is given up on. */
export const RECEIPT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** Tickets looked at in one run; the rest wait for the next run. */
export const RECEIPT_RUN_LIMIT = 5000;

/** Receipt errors that mean the push set-up is wrong, not that one phone is gone. */
const SETUP_ERRORS = new Set(["InvalidCredentials", "MismatchSenderId"]);

export type PushTicketRecord = { ticketId: string; token: string };

/**
 * Keeps accepted tickets until their receipts are read. Never throws: a
 * notification must not break the action that caused it, and a missing row only
 * means one receipt is not looked at. Logs a count, never a token or an error
 * message (a database error can quote the values it was given).
 */
export async function recordTickets(
  entries: PushTicketRecord[]
): Promise<void> {
  if (entries.length === 0) return;
  try {
    await prisma.pushReceiptTicket.createMany({
      data: entries,
      skipDuplicates: true,
    });
  } catch (error) {
    logger.error("Push: could not keep tickets to look up their receipts", {
      count: entries.length,
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

export type ReceiptCheck = {
  /** Tickets old enough to look up that this run took. */
  checked: number;
  /** Receipts that said the phone makers took the message. */
  delivered: number;
  /** Receipts that said they did not. */
  failed: number;
  /** Tokens deleted because a receipt said the phone is gone. */
  removedTokens: number;
  /** Tickets with no receipt that are too old to ever get one. */
  expired: number;
  /** Tickets left for the next run: no receipt yet, or the push service could not be asked. */
  deferred: number;
};

/**
 * Reads the receipts of tickets at least 15 minutes old and acts on them:
 * a `DeviceNotRegistered` receipt deletes that token (unless the install
 * registered again after the message was sent), anything else is counted and
 * logged, and a ticket is forgotten once its receipt is read or it is too old
 * to have one. Does nothing when push is off. At-least-once: a failure in the
 * database throws before the tickets are forgotten, and the next run repeats
 * the work, which is safe to repeat.
 */
export async function checkPushReceipts(
  sender: PushSender = getPushSender(),
  now: Date = new Date()
): Promise<ReceiptCheck> {
  const result: ReceiptCheck = {
    checked: 0,
    delivered: 0,
    failed: 0,
    removedTokens: 0,
    expired: 0,
    deferred: 0,
  };
  if (!sender.enabled) return result;

  const pending = await prisma.pushReceiptTicket.findMany({
    where: { sentAt: { lte: new Date(now.getTime() - RECEIPT_MIN_AGE_MS) } },
    orderBy: { sentAt: "asc" },
    take: RECEIPT_RUN_LIMIT,
    select: { ticketId: true, token: true, sentAt: true },
  });
  result.checked = pending.length;
  const tooOld = now.getTime() - RECEIPT_MAX_AGE_MS;
  const errors = new Map<string, number>();

  for (let i = 0; i < pending.length; i += EXPO_RECEIPT_BATCH_SIZE) {
    const chunk = pending.slice(i, i + EXPO_RECEIPT_BATCH_SIZE);
    const answered = await sender.receipts(chunk.map((t) => t.ticketId));
    if (!answered) {
      // The push service is down or refusing: ask again next run, not for each chunk.
      result.deferred += pending.length - i;
      break;
    }

    const finished: string[] = [];
    const dead: { token: string; sentAt: Date }[] = [];
    for (const ticket of chunk) {
      const receipt = answered.get(ticket.ticketId);
      if (!receipt) {
        if (ticket.sentAt.getTime() < tooOld) {
          result.expired++;
          finished.push(ticket.ticketId);
        } else {
          result.deferred++;
        }
        continue;
      }
      finished.push(ticket.ticketId);
      if (receipt.status === "ok") {
        result.delivered++;
        continue;
      }
      result.failed++;
      errors.set(receipt.message, (errors.get(receipt.message) ?? 0) + 1);
      if (receipt.unregistered) {
        dead.push({ token: ticket.token, sentAt: ticket.sentAt });
      }
    }

    result.removedTokens += await removeTokensDeadSince(dead);
    if (finished.length > 0) {
      await prisma.pushReceiptTicket.deleteMany({
        where: { ticketId: { in: finished } },
      });
    }
  }

  for (const [error, count] of errors) {
    // A gone phone is ordinary churn and is counted in `removedTokens`; the rest are worth a line.
    if (error === "DeviceNotRegistered") continue;
    if (SETUP_ERRORS.has(error)) {
      logger.error("Push receipts: the push credentials are wrong", {
        error,
        count,
      });
    } else {
      logger.warn("Push receipts: messages were not delivered", {
        error,
        count,
      });
    }
  }
  if (result.checked > 0) logger.info("Push receipts checked", { ...result });
  return result;
}
