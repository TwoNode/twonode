import crypto from "crypto";
import prisma from "@/lib/prisma";
import { ValidationError } from "@/lib/api/errors";
import { sendGBCCertificateEmail } from "@/gbc/utils/email";

// ADR-0008: Admin issues certificates and freezes edition details at issue time

/**
 * Issue certificates for tickets without necessarily sending an email right away.
 * Generates an unguessable 128-bit publicId, sets certificateIssued = true,
 * and snapshots edition details onto the ticket row so future edition edits
 * never alter issued certificates.
 */
export async function issueCertificates(ticketNumbers: string[]) {
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

  const now = new Date();
  for (const ticket of tickets) {
    const publicId = ticket.certificatePublicId || crypto.randomUUID();
    await prisma.gBCTicket.update({
      where: { id: ticket.id },
      data: {
        certificateIssued: true,
        certificateIssuedAt: ticket.certificateIssuedAt || now,
        certificatePublicId: publicId,
        certificateEventName:
          ticket.certificateEventName || ticket.editionRef?.name || "",
        certificateTheme:
          ticket.certificateTheme || ticket.editionRef?.theme || "",
        certificateSubTheme:
          ticket.certificateSubTheme || ticket.editionRef?.subTheme || "",
        certificateVenue:
          ticket.certificateVenue || ticket.editionRef?.venue || "",
        certificateStartDate:
          ticket.certificateStartDate || ticket.editionRef?.startDate || null,
        certificateEndDate:
          ticket.certificateEndDate || ticket.editionRef?.endDate || null,
      },
    });
  }

  return { count: tickets.length };
}

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
  const now = new Date();

  for (const ticket of tickets) {
    // Freeze content and mark issued if not already done
    const publicId = ticket.certificatePublicId || crypto.randomUUID();
    await prisma.gBCTicket.update({
      where: { id: ticket.id },
      data: {
        certificateIssued: true,
        certificateIssuedAt: ticket.certificateIssuedAt || now,
        certificatePublicId: publicId,
        certificateEventName:
          ticket.certificateEventName || ticket.editionRef?.name || "",
        certificateTheme:
          ticket.certificateTheme || ticket.editionRef?.theme || "",
        certificateSubTheme:
          ticket.certificateSubTheme || ticket.editionRef?.subTheme || "",
        certificateVenue:
          ticket.certificateVenue || ticket.editionRef?.venue || "",
        certificateStartDate:
          ticket.certificateStartDate || ticket.editionRef?.startDate || null,
        certificateEndDate:
          ticket.certificateEndDate || ticket.editionRef?.endDate || null,
      },
    });

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
