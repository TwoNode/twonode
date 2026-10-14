import prisma from "@/lib/prisma";
import { sendMail } from "@/utils/email";
import { getSiteUrl } from "@/lib/siteUrl";
import { subscriptionThanksEmail } from "@/surfboard/utils/subscriptionEmails";

/**
 * The thank-you email after a payment that bought subscription time (a new
 * subscription or a renewal). Called once per payment by applyPaymentPeriod,
 * which applies each payment reference at most once, so the user is thanked
 * once. Never throws: a mail problem must not undo or fail a payment.
 */
export async function sendSubscriptionThanks(userId: string): Promise<void> {
  try {
    const user = await prisma.surfboardUser.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });
    if (!user?.email) return;
    const mail = subscriptionThanksEmail({
      firstName: user.firstName,
      dashboardUrl: `${getSiteUrl()}/surfboard/dashboard`,
    });
    await sendMail({
      to: user.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      fromName: "Surfboard · TwoNode Technologies",
    });
  } catch (error) {
    console.error("Failed to send the subscription thank-you email:", error);
  }
}
