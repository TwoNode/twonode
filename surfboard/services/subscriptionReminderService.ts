import prisma from "@/lib/prisma";
import { sendMail } from "@/utils/email";
import { sendWhatsAppSubscriptionExpiryReminder } from "@/lib/whatsapp";

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

    const daysLeft = Math.ceil(
      (sub.currentEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    try {
      await sendMail({
        to: sub.user.email,
        subject: `Your ${sub.planName} subscription is expiring soon`,
        text: `Hi ${sub.user.firstName || ""},\n\nYour "${sub.planName}" subscription ${daysLeft <= 0 ? "expires today" : `expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`} (${sub.currentEnd.toDateString()}). Renew now to keep uninterrupted access.\n\n— Surfboard`,
        fromName: "Surfboard",
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
