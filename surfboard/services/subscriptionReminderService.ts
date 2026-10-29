import prisma from "@/lib/prisma";
import { sendMail } from "@/utils/email";
import { sendWhatsAppSubscriptionExpiryReminder } from "@/lib/whatsapp";
import { getSiteUrl } from "@/lib/siteUrl";
import { expiryReminderEmail } from "@/surfboard/utils/subscriptionEmails";
import { sendPush } from "@/lib/push/pushEvents";

const REMINDER_WINDOW_DAYS = 3;

/**
 * Finds Subscriptions expiring within REMINDER_WINDOW_DAYS (including
 * already-expired-today) that haven't been reminded about yet for their
 * *current* expiry date, and sends an email + best-effort WhatsApp nudge.
 * expiryReminderSentAt is stamped afterward so a renewal (which bumps
 * currentEnd forward) naturally re-arms the reminder for the new cycle.
 *
 * Intended to run daily via a scheduled job — see
 * app/api/cron/subscription-expiry-reminders/route.ts.
 */
export async function sendExpiringSubscriptionReminders(): Promise<{
  checked: number;
  reminded: number;
  failed: number;
}> {
  const now = new Date();
  const windowEnd = new Date(
    now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: "active",
      platform: "surfboard",
      currentEnd: { lte: windowEnd },
    },
    include: {
      user: { select: { email: true, firstName: true, phoneNumber: true } },
    },
  });

  let reminded = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    if (!sub.currentEnd) continue;
    // Already reminded for this exact expiry cycle — skip until it renews
    // (which bumps currentEnd forward, making this comparison false again).
    if (sub.expiryReminderSentAt && sub.expiryReminderSentAt >= sub.currentEnd)
      continue;

    // The push goes out only with the first reminder of this expiry cycle (the cycle's window opens
    // REMINDER_WINDOW_DAYS before currentEnd), however many more days the email and WhatsApp
    // reminders repeat. A renewal moves currentEnd forward, so the next cycle pushes again.
    const windowStart = new Date(
      sub.currentEnd.getTime() - REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );
    const firstOfCycle =
      !sub.expiryReminderSentAt || sub.expiryReminderSentAt < windowStart;

    const daysLeft = Math.ceil(
      (sub.currentEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    try {
      const renewUrl = `${getSiteUrl()}/surfboard/dashboard/subscription`;
      const email = expiryReminderEmail({
        firstName: sub.user.firstName,
        daysLeft,
        expiresAt: sub.currentEnd,
        renewUrl,
      });
      await sendMail({
        to: sub.user.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
        fromName: "Surfboard · TwoNode Technologies",
      });

      if (sub.user.phoneNumber) {
        await sendWhatsAppSubscriptionExpiryReminder(
          sub.user.phoneNumber,
          sub.planName,
          daysLeft
        ).catch(() => {});
      }

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { expiryReminderSentAt: now },
      });
      reminded++;

      // After the stamp, so a failure to stamp cannot push twice. Best effort: sendPush never
      // throws, and does nothing when push is off or no phone is registered.
      if (firstOfCycle) {
        await sendPush([sub.userId], { kind: "SUBSCRIPTION_ENDING" });
      }
    } catch (error) {
      console.error(
        `Failed to send expiry reminder for subscription ${sub.id}:`,
        error
      );
      failed++;
    }
  }

  return { checked: subscriptions.length, reminded, failed };
}
