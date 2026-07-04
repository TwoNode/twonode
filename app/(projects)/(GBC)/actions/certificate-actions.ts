"use server";

import prisma from "@/lib/prisma";
import { sendGBCCertificateEmail } from "../utils/email";
import { revalidatePath } from "next/cache";

export async function sendBulkCertificates(ticketNumbers: string[], emailBody: string) {
  try {
    if (!ticketNumbers.length) {
      return { success: false, error: "No tickets selected." };
    }

    // Fetch the attendees
    const tickets = await prisma.gBCTicket.findMany({
      where: { ticketNumber: { in: ticketNumbers } },
    });

    if (!tickets.length) {
      return { success: false, error: "No valid tickets found." };
    }

    let successCount = 0;
    let failCount = 0;

    for (const ticket of tickets) {
      // Send the email
      const emailResult = await sendGBCCertificateEmail(
        ticket.name,
        ticket.email,
        ticket.ticketNumber,
        emailBody
      );

      if (emailResult.success) {
        // Update the sent count
        await prisma.gBCTicket.update({
          where: { id: ticket.id },
          data: {
            certificateSentCount: { increment: 1 },
          },
        });
        successCount++;
      } else {
        console.error(`Failed to send certificate to ${ticket.email}:`, emailResult.error);
        failCount++;
      }
    }

    revalidatePath("/gbc/restricted/certificates");

    return { 
      success: true, 
      message: `Sent ${successCount} certificate emails successfully.` + (failCount > 0 ? ` Failed to send ${failCount}.` : "") 
    };
  } catch (error) {
    console.error("Error sending bulk certificates:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
