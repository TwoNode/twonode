"use server";

import { revalidatePath } from "next/cache";
import { uploadQRCode } from "../utils/aws-s3";
import { checkInSchema, ticketPurchaseSchema } from "../utils/validations";
import prisma from "@/lib/prisma";
import {
  initializeTicketPayment,
  koboToNaira,
  verifyPayment,
} from "../utils/paystack";
import { requireAdmin } from "../utils/auth";
import { calculateTicketPrice } from "../utils";
import { sendGBCTicketSMS } from "../utils/sms";
import { generateQRCodeBuffer } from "../utils/qr_code";
import { getAllGBCSettings } from "./settings-actions";
import { sendGBCTicketConfirmation } from "../utils/email";

export async function createGBCTicket(formData: FormData) {
  try {
    // Parse form data
    const phone = formData.get("phone") as string;
    const profession = formData.get("profession") as string;
    const otherProfession = formData.get("otherProfession") as string;

    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      ...(phone && { phone }), // Only include phone if it exists
      gender: formData.get("gender") as string,
      profession,
      ...(profession === "OTHER" && otherProfession && { otherProfession }),
      ticketType: formData.get("ticketType") as string,
    };

    // Validate input
    const validated = ticketPurchaseSchema.parse(data);

    // Check ticket availability
    const soldTickets = await prisma.gBCTicket.count({
      where: { paymentStatus: "COMPLETED" },
    });

    const settingsResult = await getAllGBCSettings();
    const settings = settingsResult.success ? settingsResult.data : null;

    if (settings?.tickets.pauseTicketReg) {
      return {
        success: false,
        error: "Ticket registration is currently paused.",
      };
    }

    const maxTickets = settings ? settings.tickets.maxCapacity : 150;

    if (soldTickets >= maxTickets) {
      return {
        success: false,
        error: "Sorry, all tickets are sold out",
      };
    }

    // Calculate price using settings
    const price = calculateTicketPrice(validated.ticketType, settings?.tickets);

    // Generate a temporary ticket number (will be replaced by database default)
    // const tempTicketNumber = `TEMP_${Date.now()}`;

    // Create ticket record first to get the real ticketNumber
    const ticket = await prisma.gBCTicket.create({
      data: {
        name: validated.name,
        email: validated.email,
        phone: validated.phone,
        gender: validated.gender,
        profession:
          validated.profession === "OTHER" && validated.otherProfession
            ? `Other: ${validated.otherProfession}`
            : validated.profession,
        ticketType: validated.ticketType,
        price,
        paymentStatus: "PENDING",
        // Use the temporary ticket number that will be replaced by the database default
        // ticketNumber: tempTicketNumber,
      },
    });

    // Initialize payment with the actual ticketNumber from the database
    const paymentResponse = await initializeTicketPayment(
      validated.email,
      price,
      ticket.ticketNumber, // Use the actual ticketNumber from the database
      validated.ticketType,
      {
        name: validated.name,
        phone: validated.phone,
        profession:
          validated.profession === "OTHER" && validated.otherProfession
            ? `Other: ${validated.otherProfession}`
            : validated.profession,
      }
    );

    // For COMPANY tickets created via createGBCTicket (shouldn't happen, but validate anyway)
    if (validated.ticketType === "COMPANY") {
      throw new Error(
        "COMPANY tickets should be created via createGBCGroupTicket function."
      );
    }

    console.log("\n\n\n\n\n\n\n");
    console.log(paymentResponse);
    console.log("\n\n\n\n\n\n\n");

    // Check if payment reference already exists
    const existingTickets = await prisma.gBCTicket.findMany({
      where: { paymentRef: paymentResponse.data.reference },
    });

    // For non-COMPANY tickets, payment reference must be unique
    if (existingTickets.length > 0) {
      throw new Error(
        "Payment reference already exists. Please try again or contact support."
      );
    }

    // Update ticket with payment reference
    await prisma.gBCTicket.update({
      where: { id: ticket.id },
      data: { paymentRef: paymentResponse.data.reference },
    });

    revalidatePath("/gbc/restricted/tickets");
    revalidatePath("/gbc/tickets");

    return {
      success: true,
      data: {
        ticket,
        reference: paymentResponse.data.reference,
        paymentUrl: paymentResponse.data.authorization_url,
      },
    };
  } catch (error) {
    console.error("Ticket creation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create ticket",
    };
  }
}

// Create group tickets for Company ticket type (5 attendees)
export async function createGBCGroupTicket(attendeesData: any[]) {
  try {
    // Validate that we have exactly 5 attendees
    if (!attendeesData || attendeesData.length !== 5) {
      return {
        success: false,
        error: "Group tickets require exactly 5 attendees",
      };
    }

    // Validate each attendee's data
    for (let i = 0; i < attendeesData.length; i++) {
      const attendee = attendeesData[i];
      const attendeeNum = i + 1;

      // Check required fields
      if (!attendee.name || attendee.name.trim() === "") {
        return {
          success: false,
          error: `Attendee ${attendeeNum}: Name is required`,
        };
      }

      if (!attendee.email || attendee.email.trim() === "") {
        return {
          success: false,
          error: `Attendee ${attendeeNum}: Email is required`,
        };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(attendee.email)) {
        return {
          success: false,
          error: `Attendee ${attendeeNum}: Invalid email format`,
        };
      }

      if (!attendee.gender || attendee.gender.trim() === "") {
        return {
          success: false,
          error: `Attendee ${attendeeNum}: Gender is required`,
        };
      }

      // Validate gender is one of the allowed values
      const validGenders = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"];
      if (!validGenders.includes(attendee.gender)) {
        return {
          success: false,
          error: `Attendee ${attendeeNum}: Invalid gender value`,
        };
      }

      if (!attendee.profession || attendee.profession.trim() === "") {
        return {
          success: false,
          error: `Attendee ${attendeeNum}: Profession is required`,
        };
      }

      // If profession is OTHER, validate otherProfession field
      if (
        attendee.profession === "OTHER" &&
        (!attendee.otherProfession || attendee.otherProfession.trim() === "")
      ) {
        return {
          success: false,
          error: `Attendee ${attendeeNum}: Please specify profession when selecting "Other"`,
        };
      }

      // Validate phone number format if provided
      if (attendee.phone && attendee.phone.trim() !== "") {
        const phoneRegex = /^[0-9]{11}$/;
        if (!phoneRegex.test(attendee.phone.replace(/\s/g, ""))) {
          return {
            success: false,
            error: `Attendee ${attendeeNum}: Phone number must be 11 digits`,
          };
        }
      }
    }

    // Check for duplicate emails among attendees
    const emails = attendeesData.map((a) => a.email.toLowerCase());
    const uniqueEmails = new Set(emails);
    if (uniqueEmails.size !== emails.length) {
      return {
        success: false,
        error: "Each attendee must have a unique email address",
      };
    }

    // Validate that exactly one attendee is marked as primary
    const primaryAttendees = attendeesData.filter((a) => a.isPrimary);
    if (primaryAttendees.length === 0) {
      return {
        success: false,
        error: "Please designate one attendee as the primary contact",
      };
    }
    if (primaryAttendees.length > 1) {
      return {
        success: false,
        error: "Only one attendee can be designated as the primary contact",
      };
    }

    const primaryAttendee = primaryAttendees[0];

    // Check ticket availability (need 5 seats)
    const soldTickets = await prisma.gBCTicket.count({
      where: { paymentStatus: "COMPLETED" },
    });

    const settingsResult = await getAllGBCSettings();
    const settings = settingsResult.success ? settingsResult.data : null;

    if (settings?.tickets.pauseTicketReg) {
      return {
        success: false,
        error: "Ticket registration is currently paused.",
      };
    }

    const maxTickets = settings ? settings.tickets.maxCapacity : 1000;

    if (soldTickets + 5 > maxTickets) {
      return {
        success: false,
        error: `Sorry, only ${
          maxTickets - soldTickets
        } tickets remaining. Not enough for a group purchase.`,
      };
    }

    // Get the price for company tickets using settings
    const price = calculateTicketPrice("COMPANY", settings?.tickets);

    // Create all 5 tickets
    const ticketPromises = attendeesData.map((attendee) => {
      const professionValue =
        attendee.profession === "OTHER" && attendee.otherProfession
          ? `Other: ${attendee.otherProfession}`
          : attendee.profession;

      return prisma.gBCTicket.create({
        data: {
          name: attendee.name,
          email: attendee.email,
          phone: attendee.phone || undefined,
          gender: attendee.gender,
          profession: professionValue,
          ticketType: "COMPANY",
          price: price / 5, // Split the price equally among attendees
          paymentStatus: "PENDING",
        },
      });
    });

    const tickets = await Promise.all(ticketPromises);

    // Use the primary attendee's email for payment (primary contact)
    const primaryEmail = primaryAttendee.email;
    const ticketNumbers = tickets.map((t) => t.ticketNumber);

    // Initialize payment for the group
    // Use the first ticket number for payment reference generation (to avoid invalid characters)
    // All ticket numbers are stored in metadata for reference
    const paymentResponse = await initializeTicketPayment(
      primaryEmail,
      price,
      ticketNumbers[0], // Use first ticket number to generate valid payment reference
      "COMPANY",
      {
        name: `Group Ticket (${attendeesData.length} attendees)`,
        phone: attendeesData[0].phone,
        profession: "GROUP_PURCHASE",
        ticketIds: tickets.map((t) => t.id),
        allTicketNumbers: ticketNumbers, // Store all ticket numbers in metadata
      }
    );

    // Update all tickets with the same payment reference
    await Promise.all(
      tickets.map((ticket) =>
        prisma.gBCTicket.update({
          where: { id: ticket.id },
          data: { paymentRef: paymentResponse.data.reference },
        })
      )
    );

    revalidatePath("/gbc/restricted/tickets");
    revalidatePath("/gbc/tickets");

    return {
      success: true,
      data: {
        tickets,
        reference: paymentResponse.data.reference,
        paymentUrl: paymentResponse.data.authorization_url,
      },
    };
  } catch (error) {
    console.error("Group ticket creation error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create group tickets",
    };
  }
}

/**
 * Verify GBC payment and update ticket status
 * @param reference - Payment reference from Paystack
 * @param sendEmail - Optional flag to force send email even if QR already exists
 */
export async function verifyGBCPayment(reference: string, sendEmail?: boolean) {
  try {
    console.log(
      "verifyGBCPayment called with reference:",
      reference,
      "type:",
      typeof reference,
      "sendEmail:",
      sendEmail
    );

    if (!reference) {
      console.error("Reference is falsy in verifyGBCPayment");
      throw new Error("Payment reference is required");
    }

    console.log("About to call verifyPayment with:", reference);
    // Verify payment with Paystack
    const verification = await verifyPayment(reference);

    if (!verification.status || verification.data.status !== "success") {
      throw new Error(verification.message || "Payment verification failed");
    }

    // Get all tickets using the reference (supports group purchases)
    const tickets = await prisma.gBCTicket.findMany({
      where: { paymentRef: reference },
    });

    if (!tickets || tickets.length === 0) {
      throw new Error("No tickets found for this payment");
    }

    // Validate ticket count based on ticket type
    const firstTicketType = tickets[0].ticketType;

    // Check if all tickets have the same type
    const allSameType = tickets.every((t) => t.ticketType === firstTicketType);
    if (!allSameType) {
      throw new Error(
        "Invalid payment: tickets with the same payment reference must have the same type"
      );
    }

    // Validate count for non-COMPANY tickets (should be exactly 1)
    if (firstTicketType !== "COMPANY" && tickets.length > 1) {
      throw new Error(
        `Invalid payment: non-COMPANY tickets should have only 1 ticket per payment reference, found ${tickets.length}`
      );
    }

    // Validate count for COMPANY tickets (should be exactly 5)
    if (firstTicketType === "COMPANY" && tickets.length !== 5) {
      throw new Error(
        `Invalid payment: COMPANY tickets require exactly 5 tickets, found ${tickets.length}`
      );
    }

    // Update all tickets status to completed
    const updatedTickets = await Promise.all(
      tickets.map((ticket) =>
        prisma.gBCTicket.update({
          where: { id: ticket.id },
          data: {
            paymentStatus: "COMPLETED",
            paymentDate: new Date(verification.data.paid_at),
            paymentMethod: "paystack",
            paymentDetails: JSON.stringify(verification.data),
          },
        })
      )
    );

    // Get settings for event information
    const settingsResult = await getAllGBCSettings();
    const settings = settingsResult.success ? settingsResult.data : null;

    const eventDate = settings?.event.date
      ? new Date(settings.event.date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : process.env.NEXT_PUBLIC_EVENT_DATE || "Event Day";

    const eventLocation =
      settings?.contact.city ||
      process.env.NEXT_PUBLIC_EVENT_LOCATION ||
      "Lagos, Nigeria";

    const eventVenue =
      settings?.event.venue ||
      process.env.NEXT_PUBLIC_EVENT_VENUE ||
      "Conference Center, Lagos";

    // Generate QR codes and send emails for all tickets
    await Promise.all(
      updatedTickets.map(async (ticket) => {
        let qrJustGenerated = false;
        let qrBuffer: Buffer | null = null;

        try {
          // Check if QR code already exists
          if (!ticket.qrCode || !ticket.qrCodeS3Key) {
            console.log(
              `Generating QR code for ticket ${ticket.ticketNumber} (not previously generated)`
            );

            qrBuffer = await generateQRCodeBuffer({
              ticketNumber: ticket.ticketNumber,
              name: ticket.name,
              email: ticket.email,
              ticketType: ticket.ticketType,
            });

            // Upload QR code to S3
            const { url: qrCodeUrl, key: qrCodeS3Key } = await uploadQRCode(
              qrBuffer,
              ticket.ticketNumber
            );

            // Update ticket with QR code info
            await prisma.gBCTicket.update({
              where: { id: ticket.id },
              data: {
                qrCode: qrCodeUrl,
                qrCodeS3Key,
              },
            });

            qrJustGenerated = true;
            console.log(
              `QR code generated and uploaded for ticket ${ticket.ticketNumber}`
            );
          } else {
            console.log(
              `QR code already exists for ticket ${ticket.ticketNumber}, skipping generation`
            );

            // If sendEmail is true, we need to regenerate the QR buffer for email
            if (sendEmail) {
              qrBuffer = await generateQRCodeBuffer({
                ticketNumber: ticket.ticketNumber,
                name: ticket.name,
                email: ticket.email,
                ticketType: ticket.ticketType,
              });
            }
          }

          // Send confirmation email only if QR was just generated OR sendEmail is true
          if (qrJustGenerated || sendEmail) {
            try {
              // Ensure we have a QR buffer for the email
              if (!qrBuffer) {
                console.log(
                  `Regenerating QR buffer for email to ${ticket.email}`
                );
                qrBuffer = await generateQRCodeBuffer({
                  ticketNumber: ticket.ticketNumber,
                  name: ticket.name,
                  email: ticket.email,
                  ticketType: ticket.ticketType,
                });
              }

              const qrCodeBase64 = `data:image/png;base64,${qrBuffer.toString(
                "base64"
              )}`;

              console.log(`📧 Attempting to send email to ${ticket.email}...`);
              console.log(`Email data:`, {
                name: ticket.name,
                email: ticket.email,
                ticketNumber: ticket.ticketNumber,
                ticketType: ticket.ticketType,
                price: ticket.price,
                eventDate,
                eventLocation,
                eventVenue,
                qrCodeSize: qrCodeBase64.length,
              });

              const emailResult = await sendGBCTicketConfirmation({
                name: ticket.name,
                email: ticket.email,
                phone: ticket.phone || undefined,
                ticketNumber: ticket.ticketNumber,
                ticketType: ticket.ticketType,
                price: ticket.price,
                qrCodeBase64,
                eventDate,
                eventLocation,
                eventVenue,
              });

              if (emailResult.success) {
                console.log(
                  `✅ Confirmation email sent successfully to ${
                    ticket.email
                  } for ticket ${ticket.ticketNumber} (MessageID: ${
                    emailResult.messageId
                  }) (${
                    qrJustGenerated ? "QR just generated" : "sendEmail=true"
                  })`
                );
              } else {
                console.error(
                  `❌ Failed to send email to ${ticket.email}:`,
                  emailResult.error
                );
              }
            } catch (emailError: any) {
              console.error(
                `❌ Error sending confirmation email for ticket ${ticket.ticketNumber}:`,
                emailError
              );
              console.error("Email error details:", {
                message: emailError.message,
                stack: emailError.stack,
                code: emailError.code,
              });
              // Don't fail the whole process if email sending fails
            }
          } else {
            console.log(
              `⏭️ Skipping email for ticket ${
                ticket.ticketNumber
              } (QR already exists: ${!!ticket.qrCode}, sendEmail: ${sendEmail})`
            );
          }
        } catch (qrError) {
          console.error(
            `Error generating QR code for ticket ${ticket.ticketNumber}:`,
            qrError
          );
          // Don't fail the whole process if QR code generation fails
        }
      })
    );

    return {
      success: true,
      data: {
        tickets: updatedTickets,
        count: updatedTickets.length,
        amount: koboToNaira(verification.data.amount),
      },
    };
  } catch (error) {
    console.error("GBC Payment verification error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Payment verification failed",
    };
  }
}

export async function getGBCTickets(filters?: {
  status?: string;
  search?: string;
  limit?: number;
}) {
  try {
    await requireAdmin();

    const where: any = {};

    if (filters?.status) {
      where.paymentStatus = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
        { ticketNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const tickets = await prisma.gBCTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 100,
    });

    return { success: true, data: tickets };
  } catch (error) {
    console.error("Get tickets error:", error);
    return {
      success: false,
      error: "Failed to fetch tickets",
    };
  }
}

export async function getGBCTicketById(id: string) {
  try {
    await requireAdmin();

    const ticket = await prisma.gBCTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    return { success: true, data: ticket };
  } catch (error) {
    console.error("Get ticket error:", error);
    return {
      success: false,
      error: "Failed to fetch ticket",
    };
  }
}

export async function checkInGBCTicket(ticketNumber: string) {
  try {
    const admin = await requireAdmin();

    // Validate input
    const validated = checkInSchema.parse({ ticketNumber });

    // Find ticket
    const ticket = await prisma.gBCTicket.findUnique({
      where: { ticketNumber: validated.ticketNumber },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    if (ticket.paymentStatus !== "COMPLETED") {
      return { success: false, error: "Ticket payment not completed" };
    }

    if (ticket.checkedIn) {
      return {
        success: false,
        error: `Ticket already checked in at ${ticket.checkedInAt?.toLocaleString()}`,
      };
    }

    // Check in ticket
    const updatedTicket = await prisma.gBCTicket.update({
      where: { id: ticket.id },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
        checkedInBy: admin.email,
      },
    });

    // Send SMS confirmation if phone available (don't fail check-in if SMS fails)
    if (ticket.phone) {
      try {
        await sendGBCTicketSMS(
          ticket.phone,
          ticket.name,
          ticket.ticketNumber,
          process.env.NEXT_PUBLIC_EVENT_DATE || "Event Day"
        );
      } catch (smsError) {
        console.error("SMS sending failed (non-critical):", smsError);
        // Continue - SMS failure shouldn't prevent check-in
      }
    }

    revalidatePath("/gbc/restricted/check-in");
    revalidatePath("/gbc/restricted/tickets");

    return {
      success: true,
      data: updatedTicket,
      message: `Welcome ${ticket.name}!`,
    };
  } catch (error: any) {
    console.error("Check-in error:", error);

    // Handle Zod validation errors
    if (error.name === "ZodError") {
      return {
        success: false,
        error: "Invalid ticket number format",
      };
    }

    // Handle Prisma errors
    if (error.code) {
      switch (error.code) {
        case "P2002":
          return {
            success: false,
            error: "Duplicate check-in detected",
          };
        case "P2025":
          return {
            success: false,
            error: "Ticket not found in database",
          };
        case "P2003":
          return {
            success: false,
            error: "Invalid ticket reference",
          };
        case "P1001":
        case "P1002":
        case "P1008":
          return {
            success: false,
            error: "Database connection error. Please try again",
          };
        default:
          // Log the actual Prisma error code for debugging
          console.error("Unhandled Prisma error code:", error.code);
          return {
            success: false,
            error: "An error occurred. Please contact support",
          };
      }
    }

    // Handle authentication errors
    if (
      error.message?.includes("Unauthorized") ||
      error.message?.includes("admin")
    ) {
      return {
        success: false,
        error: "Admin authentication required",
      };
    }

    // Generic fallback for unknown errors
    return {
      success: false,
      error: "Failed to check in ticket. Please try again or contact support",
    };
  }
}

export async function exportGBCTickets() {
  try {
    await requireAdmin();

    const tickets = await prisma.gBCTicket.findMany({
      where: { paymentStatus: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: {
        ticketNumber: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        profession: true,
        ticketType: true,
        price: true,
        checkedIn: true,
        checkedInAt: true,
        createdAt: true,
      },
    });

    return { success: true, data: tickets };
  } catch (error) {
    console.error("Export tickets error:", error);
    return {
      success: false,
      error: "Failed to export tickets",
    };
  }
}

export async function getGBCTicketStats() {
  try {
    // await requireAdmin();

    // Optimize queries by combining related operations
    // Query 1: Get aggregated stats by payment status in a single query
    const [statusStats, checkedInCount] = await Promise.all([
      // Get ticket counts grouped by payment status AND total revenue in one query
      prisma.gBCTicket.groupBy({
        by: ["paymentStatus"],
        _count: { id: true },
        _sum: { price: true },
      }),
      // Query 2: Get checked-in tickets count
      prisma.gBCTicket.count({ where: { checkedIn: true } }),
    ]);

    // Process the grouped results to extract individual stats
    const totalTickets = statusStats.reduce(
      (sum, stat) => sum + stat._count.id,
      0
    );
    const completedStat = statusStats.find(
      (stat) => stat.paymentStatus === "COMPLETED"
    );
    const pendingStat = statusStats.find(
      (stat) => stat.paymentStatus === "PENDING"
    );

    const completedTickets = completedStat?._count.id || 0;
    const pendingTickets = pendingStat?._count.id || 0;
    const checkedInTickets = checkedInCount;
    const totalRevenue = completedStat?._sum.price || 0;

    const settingsResult = await getAllGBCSettings();
    const maxTickets =
      settingsResult.success && settingsResult.data
        ? settingsResult.data.tickets.maxCapacity
        : 1000;
    const availableTickets = maxTickets - completedTickets;

    return {
      success: true,
      data: {
        totalTickets,
        completedTickets,
        pendingTickets,
        checkedInTickets,
        availableTickets,
        totalRevenue,
        maxTickets,
      },
    };
  } catch (error) {
    console.error("Get ticket stats error:", error);
    return {
      success: false,
      error: "Failed to fetch ticket stats",
    };
  }
}

export async function deleteGBCTicket(id: string) {
  try {
    await requireAdmin();

    const ticket = await prisma.gBCTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    if (ticket.paymentStatus === "COMPLETED") {
      return {
        success: false,
        error: "Cannot delete completed ticket. Use refund instead.",
      };
    }

    await prisma.gBCTicket.delete({
      where: { id },
    });

    revalidatePath("/gbc/restricted/tickets");

    return { success: true, message: "Ticket deleted successfully" };
  } catch (error) {
    console.error("Delete ticket error:", error);
    return {
      success: false,
      error: "Failed to delete ticket",
    };
  }
}

export async function generateGBCTicketQRCode(ticketId: string) {
  try {
    await requireAdmin();

    const ticket = await prisma.gBCTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    // Generate QR code buffer
    const qrBuffer = await generateQRCodeBuffer({
      ticketNumber: ticket.ticketNumber,
      name: ticket.name,
      email: ticket.email,
      ticketType: ticket.ticketType,
    });

    // Upload to S3
    const { url, key } = await uploadQRCode(qrBuffer, ticket.ticketNumber);

    // Update ticket with QR code info
    await prisma.gBCTicket.update({
      where: { id: ticketId },
      data: {
        qrCode: url,
        qrCodeS3Key: key,
      },
    });

    revalidatePath("/gbc/restricted/tickets");

    return { success: true, data: { url, key } };
  } catch (error) {
    console.error("Generate QR code error:", error);
    return {
      success: false,
      error: "Failed to generate QR code",
    };
  }
}
