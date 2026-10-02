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
      const renewUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://surfboard.twonodes.com"}/surfboard/dashboard/subscription`;
      await sendMail({
        to: sub.user.email,
        subject: `Your ${sub.planName} subscription is expiring soon`,
        text: `Hi ${sub.user.firstName || ""},\n\nYour "${sub.planName}" subscription ${daysLeft <= 0 ? "expires today" : `expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`} (${sub.currentEnd.toDateString()}). Renew now to keep uninterrupted access.\n\n— Surfboard`,
        fromName: "Surfboard · TwoNode Technologies",
        html: `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Subscription Expiring Soon</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; color: #1a1a1a;">
              <div style="max-width: 520px; margin: 0 auto; padding: 24px 20px;">
                <!-- Brand Header -->
                <div style="padding: 20px 0 16px; border-bottom: 3px solid #233dff;">
                  <span style="font-size: 16px; font-weight: 700; color: #141c4d; letter-spacing: .02em;">Surfboard</span>
                  <span style="font-size: 13px; color: #888888; margin-left: 8px;">by TwoNode Technologies</span>
                </div>

                <!-- Body -->
                <div style="padding: 28px 0 20px;">
                  <p style="margin: 0 0 16px; font-size: 15px; color: #111827; font-weight: 500;">
                    Hi ${sub.user.firstName || "there"},
                  </p>
                  <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #111827;">
                    Your ${sub.planName} subscription is expiring soon
                  </h2>
                  <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #374151;">
                    Your <strong>${sub.planName}</strong> subscription ${daysLeft <= 0 ? "expires today" : `expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`} on <strong>${sub.currentEnd.toDateString()}</strong>. Renew now to maintain uninterrupted access to all your survey plans and features.
                  </p>
                  
                  <div style="margin: 28px 0;">
                    <a href="${renewUrl}" style="background-color: #233dff; background-image: linear-gradient(135deg, #233dff, #141c4d); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                      Renew Subscription
                    </a>
                  </div>
                </div>

                <!-- Footer -->
                <div style="padding: 20px 0; border-top: 1px solid #e5e5e5; color: #888888; font-size: 12px; line-height: 1.6;">
                  <a href="https://www.twonodetechnologies.com" style="color: #141c4d; text-decoration: none; font-weight: 600;">TwoNode Technologies</a>
                  &nbsp;&middot;&nbsp;
                  <a href="mailto:info@twonodetechnologies.com" style="color: #888888; text-decoration: none;">info@twonodetechnologies.com</a>
                  <p style="margin: 6px 0 0; color: #9ca3af; font-size: 11px;">
                    This is an automated notification from Surfboard. Please do not reply directly to this email.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
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
