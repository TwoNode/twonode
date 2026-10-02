import prisma from "@/lib/prisma";
import { ValidationError } from "@/lib/api/errors";
import { sendGBCCertificateEmail } from "@/gbc/utils/email";

/**
 * Migrated from certificate-actions.ts. Note: the source `sendBulkCertificates`
 * had no requireAdmin() call at all (not a broken stub like the pre-hotfix
 * requireAdmin() — this function never had a check to begin with), so it was
 * a second, independent auth gap alongside the one the interim hotfix fixed.
 * Closed here the same way: gated by withAuth<GBCRole> at the route layer.
 * The public certificate page (gbc/certificate/[ticketNumber]) uses
 * ticketService.getTicketByNumber, not this service.
 */

export async function sendBulkCertificates(
  ticketNumbers: string[],
  emailBody: string
) {
  if (!ticketNumbers.length) {
    throw new ValidationError({ ticketNumbers: "No tickets selected" });
  }

  const tickets = await prisma.gBCTicket.findMany({
    where: { ticketNumber: { in: ticketNumbers } },
    include: { editionRef: true },
  });
  if (!tickets.length) {
    throw new ValidationError({ ticketNumbers: "No valid tickets found" });
  }

  let successCount = 0;
  let failCount = 0;

  for (const ticket of tickets) {
    const emailResult = await sendGBCCertificateEmail(ticket, emailBody);
    if (emailResult.success) {
      await prisma.gBCTicket.update({
        where: { id: ticket.id },
        data: { certificateSentCount: { increment: 1 } },
      });
      successCount++;
    } else {
      console.error(
        `Failed to send certificate to ${ticket.email}:`,
        emailResult.error
      );
      failCount++;
    }
  }

  return {
    sent: successCount,
    failed: failCount,
    message: `Sent ${successCount} certificate emails successfully.${failCount > 0 ? ` Failed to send ${failCount}.` : ""}`,
  };
}
